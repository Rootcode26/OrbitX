from datetime import datetime

from pydantic import BaseModel, Field


class SatelliteStateRequest(BaseModel):
    tle_line1: str = Field(
        ...,
        min_length=1,
        description="First line of the satellite TLE",
    )

    tle_line2: str = Field(
        ...,
        min_length=1,
        description="Second line of the satellite TLE",
    )

    observation_time: datetime | None = Field(
        default=None,
        description=(
            "Optional UTC observation time. "
            "Current UTC time is used when omitted."
        ),
    )


class SatelliteStateResponse(BaseModel):
    observation_time_utc: datetime

    current_speed_km_s: float
    current_height_km: float

    latitude_degrees: float
    longitude_degrees: float

    apogee_height_km: float
    perigee_height_km: float

    orbital_period_minutes: float