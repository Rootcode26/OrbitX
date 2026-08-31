from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, ConfigDict


# =========================================================
# Satellite input
# =========================================================

class SatelliteTLE(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True
    )

    norad_id: str = Field(
        ...,
        min_length=1,
        alias="norad_cat_id",
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


# =========================================================
# Single conjunction request
# =========================================================

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

    include_separation_profile: bool = False


# =========================================================
# State vector
# =========================================================

class Vector3D(BaseModel):
    x: float
    y: float
    z: float


# =========================================================
# Satellite state at TCA
# =========================================================

class SatelliteTCAState(BaseModel):
    norad_cat_id: int
    name: str

    position_at_tca_km: Vector3D
    velocity_at_tca_km_s: Vector3D


# =========================================================
# Separation sample
# =========================================================

class SeparationSample(BaseModel):
    timestamp: datetime
    separation_km: float
    closing_rate_km_s: float


# =========================================================
# Encounter track sample
# =========================================================

class EncounterTrackSample(BaseModel):
    offset_seconds: float
    timestamp: datetime
    position_a_km: Vector3D
    position_b_km: Vector3D
    separation_km: float


# =========================================================
# Single conjunction response
# =========================================================

class ConjunctionResponse(BaseModel):
    calculated_at: datetime

    reference_frame: str

    screening_start_time: datetime
    screening_duration_minutes: int
    step_seconds: int

    satellite_a: SatelliteTCAState
    satellite_b: SatelliteTCAState

    current_separation_km: float
    current_closing_rate_km_s: float

    closest_approach_time_utc: datetime
    minimum_separation_km: float

    relative_velocity_km_s: float

    encounter_angle_degrees: float

    collision_probability: float | None = None

    risk_level: Literal[
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    ]

    risk_score: float

    separation_samples: list[SeparationSample]

    encounter_track: list[EncounterTrackSample] = []


# =========================================================
# Multi-satellite screening request
# =========================================================

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


# =========================================================
# Multi-satellite screening response
# =========================================================

class ScreeningResponse(BaseModel):
    total_pairs_checked: int
    results: list[ConjunctionResponse]