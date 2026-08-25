from dataclasses import dataclass
from datetime import datetime, timezone
from math import (
    atan2,
    cos,
    degrees,
    hypot,
    isfinite,
    pi,
    radians,
    sin,
    sqrt,
)

from sgp4.api import Satrec

from pythonbackend.services.propagator import (
    InvalidTLEError,
    propagate_tle,
)



EARTH_GRAVITATIONAL_PARAMETER = 398600.4418
EARTH_EQUATORIAL_RADIUS_KM = 6378.137
EARTH_ECCENTRICITY_SQUARED = 6.69437999014e-3
MINUTES_PER_DAY = 1440.0


@dataclass(frozen=True)
class SatelliteStateResult:
    observation_time_utc: datetime
    current_speed_km_s: float
    current_height_km: float
    latitude_degrees: float
    longitude_degrees: float
    apogee_height_km: float
    perigee_height_km: float
    orbital_period_minutes: float


def calculate_gmst_degrees(
    julian_date: float,
) -> float:

    centuries = (
        julian_date - 2451545.0
    ) / 36525.0

    gmst = (
        280.46061837
        + 360.98564736629
        * (julian_date - 2451545.0)
        + 0.000387933 * centuries**2
        - centuries**3 / 38710000.0
    )

    return gmst % 360.0


def teme_to_ecef(
    position_teme_km: tuple[float, float, float],
    julian_date: float,
) -> tuple[float, float, float]:

    x_teme, y_teme, z_teme = position_teme_km

    gmst_radians = radians(
        calculate_gmst_degrees(julian_date)
    )

    x_ecef = (
        cos(gmst_radians) * x_teme
        + sin(gmst_radians) * y_teme
    )

    y_ecef = (
        -sin(gmst_radians) * x_teme
        + cos(gmst_radians) * y_teme
    )

    return (
        x_ecef,
        y_ecef,
        z_teme,
    )


def ecef_to_geodetic(
    position_ecef_km: tuple[float, float, float],
) -> tuple[float, float, float]:

    x, y, z = position_ecef_km

    horizontal_distance = hypot(x, y)

    longitude = atan2(y, x)

    semi_major_axis = EARTH_EQUATORIAL_RADIUS_KM

    semi_minor_axis = (
        semi_major_axis
        * sqrt(
            1.0 - EARTH_ECCENTRICITY_SQUARED
        )
    )

    second_eccentricity_squared = (
        (
            semi_major_axis**2
            - semi_minor_axis**2
        )
        / semi_minor_axis**2
    )

    auxiliary_angle = atan2(
        z * semi_major_axis,
        horizontal_distance * semi_minor_axis,
    )

    latitude = atan2(
        z
        + (
            second_eccentricity_squared
            * semi_minor_axis
            * sin(auxiliary_angle) ** 3
        ),
        horizontal_distance
        - (
            EARTH_ECCENTRICITY_SQUARED
            * semi_major_axis
            * cos(auxiliary_angle) ** 3
        ),
    )

    prime_vertical_radius = (
        semi_major_axis
        / sqrt(
            1.0
            - EARTH_ECCENTRICITY_SQUARED
            * sin(latitude) ** 2
        )
    )

    if abs(cos(latitude)) > 1e-12:
        height = (
            horizontal_distance / cos(latitude)
            - prime_vertical_radius
        )
    else:
        height = (
            abs(z)
            - semi_minor_axis
        )

    return (
        degrees(latitude),
        degrees(longitude),
        height,
    )


def calculate_satellite_state(
    tle_line1: str,
    tle_line2: str,
    observation_time: datetime | None = None,
) -> SatelliteStateResult:

    line1 = tle_line1.strip()
    line2 = tle_line2.strip()

    if not line1.startswith("1 "):
        raise InvalidTLEError(
            "Invalid TLE line 1"
        )

    if not line2.startswith("2 "):
        raise InvalidTLEError(
            "Invalid TLE line 2"
        )

    if observation_time is None:
        observation_time = datetime.now(
            timezone.utc
        )

    if observation_time.tzinfo is None:
        raise ValueError(
            "observation_time must include a timezone"
        )

    observation_time = observation_time.astimezone(
        timezone.utc
    )

    try:
        satellite = Satrec.twoline2rv(
            line1,
            line2,
        )
    except (TypeError, ValueError) as error:
        raise InvalidTLEError(
            "Unable to read the provided TLE"
        ) from error

    propagation_result = propagate_tle(
        tle_line1=line1,
        tle_line2=line2,
        prediction_time=observation_time,
    )

    velocity_x, velocity_y, velocity_z = (
        propagation_result.velocity_km_s
    )

    current_speed = sqrt(
        velocity_x**2
        + velocity_y**2
        + velocity_z**2
    )

    julian_date = (
        satellite.jdsatepoch
        + satellite.jdsatepochF
    )

    from sgp4.api import jday

    second_with_fraction = (
        observation_time.second
        + observation_time.microsecond / 1_000_000
    )

    jd, jd_fraction = jday(
        observation_time.year,
        observation_time.month,
        observation_time.day,
        observation_time.hour,
        observation_time.minute,
        second_with_fraction,
    )

    julian_date = float(jd + jd_fraction)

    position_ecef = teme_to_ecef(
        position_teme_km=(
            propagation_result.position_km
        ),
        julian_date=julian_date,
    )

    latitude, longitude, current_height = (
        ecef_to_geodetic(position_ecef)
    )

    # SGP4 stores mean motion in radians per minute.
    mean_motion_radians_per_minute = float(
        satellite.no_kozai
    )

    if (
        not isfinite(mean_motion_radians_per_minute)
        or mean_motion_radians_per_minute <= 0
    ):
        raise InvalidTLEError(
            "TLE mean motion must be greater than zero"
        )

    mean_motion_radians_per_second = (
        mean_motion_radians_per_minute / 60.0
    )

    semi_major_axis_km = (
        EARTH_GRAVITATIONAL_PARAMETER
        / mean_motion_radians_per_second**2
    ) ** (1.0 / 3.0)

    eccentricity = float(satellite.ecco)

    if not 0 <= eccentricity < 1:
        raise InvalidTLEError(
            "TLE eccentricity must be between 0 and 1"
        )

    apogee_radius_km = (
        semi_major_axis_km
        * (1.0 + eccentricity)
    )

    perigee_radius_km = (
        semi_major_axis_km
        * (1.0 - eccentricity)
    )

    apogee_height_km = (
        apogee_radius_km
        - EARTH_EQUATORIAL_RADIUS_KM
    )

    perigee_height_km = (
        perigee_radius_km
        - EARTH_EQUATORIAL_RADIUS_KM
    )

    mean_motion_revolutions_per_day = (
        mean_motion_radians_per_minute
        * MINUTES_PER_DAY
        / (2.0 * pi)
    )

    orbital_period_minutes = (
        MINUTES_PER_DAY
        / mean_motion_revolutions_per_day
    )

    return SatelliteStateResult(
        observation_time_utc=observation_time,
        current_speed_km_s=current_speed,
        current_height_km=current_height,
        latitude_degrees=latitude,
        longitude_degrees=longitude,
        apogee_height_km=apogee_height_km,
        perigee_height_km=perigee_height_km,
        orbital_period_minutes=orbital_period_minutes,
    )