from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SatellitePropagationInput(BaseModel):
    norad_cat_id: int = Field(gt=0)
    tle_line1: str = Field(min_length=1)
    tle_line2: str = Field(min_length=1)


class PropagationRequest(BaseModel):
    prediction_time: datetime
    satellites: list[SatellitePropagationInput] = Field(
        min_length=1,
        max_length=500,
    )


class Vector3(BaseModel):
    x: float
    y: float
    z: float


class PropagationResult(BaseModel):
    norad_cat_id: int
    position_km: Vector3
    velocity_km_s: Vector3


class SatelliteError(BaseModel):
    norad_cat_id: int
    code: Literal["INVALID_TLE", "PROPAGATION_FAILED"]
    message: str


class PropagationResponse(BaseModel):
    prediction_time_utc: datetime
    reference_frame: Literal["TEME"] = "TEME"
    results: list[PropagationResult]
    errors: list[SatelliteError]
