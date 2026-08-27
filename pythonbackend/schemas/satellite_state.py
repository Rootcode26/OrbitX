from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SatelliteStateInput(BaseModel):
    norad_cat_id: int = Field(gt=0)
    tle_line1: str = Field(min_length=1)
    tle_line2: str = Field(min_length=1)


class SatelliteStateRequest(BaseModel):
    observation_time: datetime
    satellites: list[SatelliteStateInput] = Field(
        min_length=1,
        max_length=500,
    )


class SatelliteStateResult(BaseModel):
    norad_cat_id: int
    tle_epoch: datetime
    current_speed_km_s: float
    current_height_km: float
    latitude_degrees: float
    longitude_degrees: float
    apogee_height_km: float
    perigee_height_km: float
    orbital_period_minutes: float
    inclination_degrees: float
    raan_degrees: float
    revolution_number: int


class SatelliteStateError(BaseModel):
    norad_cat_id: int
    code: Literal["INVALID_TLE", "PROPAGATION_FAILED"]
    message: str


class SatelliteStateResponse(BaseModel):
    observation_time_utc: datetime
    results: list[SatelliteStateResult]
    errors: list[SatelliteStateError]
