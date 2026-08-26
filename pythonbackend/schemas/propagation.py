from datetime import datetime

from pydantic import BaseModel, Field

from pythonbackend.services.propagator import (
    InvalidTLEError,
    SGP4PropagationError,
    propagate_tle,
)

class PropagationRequest(BaseModel):
    satellite_id: str = Field(
        ...,
        min_length=1,
        description="NORAD catalog ID of the satellite",
    )

    prediction_time: datetime


class PropagationResponse(BaseModel):
    satellite_id: str
    satellite_name: str

    prediction_time_utc: datetime

    position_km: tuple[
        float,
        float,
        float,
    ]

    velocity_km_s: tuple[
        float,
        float,
        float,
    ]