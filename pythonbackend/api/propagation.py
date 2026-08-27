from datetime import timezone

from fastapi import APIRouter, HTTPException

from pythonbackend.schemas.propagation import (
    PropagationRequest,
    PropagationResponse,
    PropagationResult,
    SatelliteError,
    Vector3,
)
from pythonbackend.services.propagator import (
    InvalidTLEError,
    SGP4PropagationError,
    propagate_tle,
    validate_tle_pair,
)


router = APIRouter(tags=["Propagation"])


@router.post(
    "/propagation",
    response_model=PropagationResponse,
    summary="Propagate a batch of satellite TLEs",
)
def propagate_satellites(request: PropagationRequest) -> PropagationResponse:
    if request.prediction_time.tzinfo is None:
        raise HTTPException(
            status_code=400,
            detail="prediction_time must include a timezone",
        )

    prediction_time = request.prediction_time.astimezone(timezone.utc)
    results: list[PropagationResult] = []
    errors: list[SatelliteError] = []

    for satellite in request.satellites:
        try:
            tle_line1, tle_line2 = validate_tle_pair(
                satellite.tle_line1,
                satellite.tle_line2,
                satellite.norad_cat_id,
            )
            state = propagate_tle(
                tle_line1=tle_line1,
                tle_line2=tle_line2,
                prediction_time=prediction_time,
            )
            x, y, z = state.position_km
            vx, vy, vz = state.velocity_km_s
            results.append(
                PropagationResult(
                    norad_cat_id=satellite.norad_cat_id,
                    position_km=Vector3(
                        x=round(x, 4),
                        y=round(y, 4),
                        z=round(z, 4),
                    ),
                    velocity_km_s=Vector3(
                        x=round(vx, 4),
                        y=round(vy, 4),
                        z=round(vz, 4),
                    ),
                )
            )
        except InvalidTLEError:
            errors.append(
                SatelliteError(
                    norad_cat_id=satellite.norad_cat_id,
                    code="INVALID_TLE",
                    message="The supplied TLE is invalid",
                )
            )
        except SGP4PropagationError as error:
            errors.append(
                SatelliteError(
                    norad_cat_id=satellite.norad_cat_id,
                    code="PROPAGATION_FAILED",
                    message=str(error),
                )
            )

    return PropagationResponse(
        prediction_time_utc=prediction_time,
        results=results,
        errors=errors,
    )
