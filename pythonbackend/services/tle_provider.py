from abc import ABC, abstractmethod


class TLEProvider(ABC):
    """Interface for obtaining satellite TLE data."""

    @abstractmethod
    def get_tle(
        self,
        satellite_id: str,
    ) -> tuple[str, str, str]:
        """
        Return:
            (satellite_name, tle_line1, tle_line2)
        """
        raise NotImplementedError