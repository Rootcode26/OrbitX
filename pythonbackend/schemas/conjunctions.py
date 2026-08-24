from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ConjunctionRequest(BaseModel):
    satellite_a: str = Field(
        ...,
        min_length=1,
        description="NORAD catalog ID of satellite A",
    )

    satellite_b: str = Field(
        ...,
        min_length=1,
        description="NORAD catalog ID of satellite B",
    )

    start_time: datetime

    duration_minutes: int = Field(
        default=120,
        ge=1,
        le=1440,
    )

    step_seconds: int = Field(
        default=60,
        ge=1,
        le=3600,
    )


class ConjunctionResponse(BaseModel):
    satellite_a: str
    satellite_b: str

    minimum_distance_km: float
    time_of_closest_approach: datetime

    risk_level: Literal[
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    ]