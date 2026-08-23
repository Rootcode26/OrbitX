from dataclasses import dataclass
from datetime import datetime,timezone
from sgp4.api import SGP4_ERRORS,Satrec,jday

class InvalidTLEError(Exception):
    pass

class SGP4PropagationError(Exception):
    pass

@dataclass(frozen=True)
class SGP4Result:
    prediction_time_utc: datetime
    position_km: tuple[float, float, float]
    velocity_km_s: tuple[float, float, float]

def datetime_to_julian_date(
    prediction_time: datetime,
) -> tuple[float, float]:
    if prediction_time.tzinfo is None:
        raise ValueError(
            "prediction_time must include a timezone"
        )

    utc_time = prediction_time.astimezone(timezone.utc)

    seconds = (
        utc_time.second
        + utc_time.microsecond / 1_000_000
    )

    jd, fraction = jday(
        utc_time.year,
        utc_time.month,
        utc_time.day,
        utc_time.hour,
        utc_time.minute,
        seconds,
    )

    return float(jd), float(fraction)

def propagate_tle(
    tle_line1: str,
    tle_line2: str,
    prediction_time: datetime,
) -> SGP4Result:
    try:
        satellite = Satrec.twoline2rv(
            tle_line1,
            tle_line2,
        )
    except (TypeError, ValueError) as error:
        raise InvalidTLEError(
            "Invalid TLE format"
        ) from error

    jd, fraction = datetime_to_julian_date(
        prediction_time
    )

    error_code, position, velocity = satellite.sgp4(
        jd,
        fraction,
    )

    if error_code != 0:
        message = SGP4_ERRORS.get(
            error_code,
            "Unknown SGP4 propagation error",
        )

        raise SGP4PropagationError(message)

    return SGP4Result(
        prediction_time_utc=prediction_time.astimezone(
            timezone.utc
        ),
        position_km=tuple(float(value) for value in position),
        velocity_km_s=tuple(float(value) for value in velocity),
    )