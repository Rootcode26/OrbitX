from datetime import timezone

from fastapi import APIRouter, HTTPException

from pythonbackend.schemas.satellite_state import (
    SatelliteStateError,
    SatelliteStateRequest,
    SatelliteStateResponse,
    SatelliteStateResult,
)
from pythonbackend.services.propagator import (
    InvalidTLEError,
    SGP4PropagationError,
    validate_tle_pair,
)
from pythonbackend.services.satellite_state import calculate_satellite_state


router = APIRouter(
    prefix="/api/satellite-state",
    tags=["Satellite State"],
)


@router.post(
    "/current",
    response_model=SatelliteStateResponse,
    summary="Calculate orbital state for a batch of satellites",
)
def get_current_satellite_states(
    request: SatelliteStateRequest,
) -> SatelliteStateResponse:
    if request.observation_time.tzinfo is None:
        raise HTTPException(
            status_code=400,
            detail="observation_time must include a timezone",
        )

    observation_time = request.observation_time.astimezone(timezone.utc)
    results: list[SatelliteStateResult] = []
    errors: list[SatelliteStateError] = []

    for satellite in request.satellites:
        try:
            tle_line1, tle_line2 = validate_tle_pair(
                satellite.tle_line1,
                satellite.tle_line2,
                satellite.norad_cat_id,
            )
            state = calculate_satellite_state(
                tle_line1=tle_line1,
                tle_line2=tle_line2,
                observation_time=observation_time,
            )
            results.append(
                SatelliteStateResult(
                    norad_cat_id=satellite.norad_cat_id,
                    tle_epoch=state.tle_epoch,
                    current_speed_km_s=round(state.current_speed_km_s, 4),
                    current_height_km=round(state.current_height_km, 3),
                    latitude_degrees=round(state.latitude_degrees, 6),
                    longitude_degrees=round(state.longitude_degrees, 6),
                    apogee_height_km=round(state.apogee_height_km, 3),
                    perigee_height_km=round(state.perigee_height_km, 3),
                    orbital_period_minutes=round(
                        state.orbital_period_minutes,
                        3,
                    ),
                    inclination_degrees=round(state.inclination_degrees, 4),
                    raan_degrees=round(state.raan_degrees, 4),
                    revolution_number=state.revolution_number,
                )
            )
        except InvalidTLEError:
            errors.append(
                SatelliteStateError(
                    norad_cat_id=satellite.norad_cat_id,
                    code="INVALID_TLE",
                    message="The supplied TLE is invalid",
                )
            )
        except SGP4PropagationError as error:
            errors.append(
                SatelliteStateError(
                    norad_cat_id=satellite.norad_cat_id,
                    code="PROPAGATION_FAILED",
                    message=str(error),
                )
            )

    return SatelliteStateResponse(
        observation_time_utc=observation_time,
        results=results,
        errors=errors,
    )
