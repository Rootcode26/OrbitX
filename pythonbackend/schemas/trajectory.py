from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


ObjectType = Literal["satellite", "debris", "unknown"]
ObjectSource = Literal["user", "database"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class TrajectoryObject(BaseModel):
    satellite_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    object_type: ObjectType = "unknown"
    source: ObjectSource
    tle_line1: str = Field(min_length=1)
    tle_line2: str = Field(min_length=1)


class TrajectoryConjunctionRequest(BaseModel):
    satellites: list[TrajectoryObject] = Field(
        min_length=2,
        max_length=50,
        description=(
            "The user satellite and database satellites/debris. "
            "Every unique pair is screened."
        ),
    )
    start_time: datetime
    duration_minutes: int = Field(default=120, ge=1, le=1440)
    step_seconds: int = Field(default=60, ge=1, le=3600)


class CompactRiskResult(BaseModel):
    satellite_a: str
    satellite_b: str
    minimum_distance_km: float
    relative_velocity_km_s: float
    time_of_closest_approach: datetime
    risk_level: RiskLevel


class TrajectoryConjunctionResponse(BaseModel):
    pairs_checked: int
    overall_risk: RiskLevel
    risk_results: list[CompactRiskResult]
