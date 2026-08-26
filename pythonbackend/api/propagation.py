from datetime import datetime,timezone 

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from pythonbackend.services.propagator import (
    InvalidTLEError,
    SGP4PropagationError,
    propagate_tle,
)


router = APIRouter()


class PropagationRequest(BaseModel):
    tle_line1: str = Field(min_length=1)
    tle_line2: str = Field(min_length=1)
    prediction_time: datetime


class Vector3(BaseModel):
    x: float
    y: float
    z: float


class PropagationResponse(BaseModel):
    prediction_time_utc: datetime
    reference_frame: str = "TEME"
    position_km: Vector3
    velocity_km_s: Vector3


@router.post(
    "/propagation",
    response_model=PropagationResponse,
)
def propagate_satellite(
    request: PropagationRequest,
) -> PropagationResponse:

    try:
        result = propagate_tle(
            tle_line1=request.tle_line1,
            tle_line2=request.tle_line2,
            prediction_time=request.prediction_time,
        )

    except (InvalidTLEError, ValueError) as error:
        raise HTTPException(
            status_code=400,
            detail="Invalid Tle Format",
        ) from error

    except SGP4PropagationError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error

    x, y, z = result.position_km
    vx, vy, vz = result.velocity_km_s

    return PropagationResponse(
        prediction_time_utc=result.prediction_time_utc,
        position_km=Vector3(
            x=round(x,4),
            y=round(y,4),
            z=round(z,4)
        ),
        velocity_km_s=Vector3(
            x=round(vx,4),
            y=round(vy,4),
            z=round(vz,4)
        ),
    )
