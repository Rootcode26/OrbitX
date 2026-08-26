from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class SatelliteTLE(BaseModel):
    norad_id: str = Field(
        ...,
        min_length=1,
        description="NORAD catalog ID",
    )

    name: str = Field(
        ...,
        min_length=1,
        description="Satellite name",
    )

    tle_line1: str = Field(
        ...,
        min_length=1,
        description="TLE line 1",
    )

    tle_line2: str = Field(
        ...,
        min_length=1,
        description="TLE line 2",
    )


class ConjunctionRequest(BaseModel):
    satellite_a: SatelliteTLE
    satellite_b: SatelliteTLE

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

    closest_approach_time: datetime
    miss_distance_km: float
    relative_speed_km_s: float | None = None

    collision_probability: float | None = None

    risk_status: Literal[
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    ]


# ---------------------------------------------------------
# Multi-satellite screening
# ---------------------------------------------------------

class ScreeningRequest(BaseModel):
    satellites: list[SatelliteTLE] = Field(
        ...,
        min_length=2,
        description="Satellites with TLE data to screen",
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


class ScreeningResponse(BaseModel):
    total_pairs_checked: int
    results: list[dict]