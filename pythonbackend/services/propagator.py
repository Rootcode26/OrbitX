from datetime import datetime, timezone

from sgp4.api import Satrec
from sgp4.conveniences import jday_datetime


class Propagator:
    """Propagate satellite TLE data using SGP4."""

    def create_satellite(self, line1: str, line2: str) -> Satrec:
        """Create an SGP4 satellite object from two TLE lines."""
        return Satrec.twoline2rv(line1, line2)

    def propagate(
        self,
        satellite: Satrec,
        timestamp: datetime,
    ) -> tuple[float, float, float]:
        """
        Propagate the satellite to a given UTC timestamp.

        Returns:
            (x, y, z) position in TEME coordinates, kilometres.
        """

        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

        timestamp = timestamp.astimezone(timezone.utc)

        jd, fr = jday_datetime(timestamp)

        error_code, position, _velocity = satellite.sgp4(jd, fr)

        if error_code != 0:
            raise ValueError(
                f"SGP4 propagation failed with error code {error_code}"
            )

        return tuple(position)