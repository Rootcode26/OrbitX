from fastapi import APIRouter, HTTPException

from pythonbackend.schemas.satellite_state import (
    SatelliteStateRequest,
    SatelliteStateResponse,
)
from pythonbackend.services.propagator import (
    InvalidTLEError,
    SGP4PropagationError,
)
from pythonbackend.services.satellite_state import (
    calculate_satellite_state,
)


router = APIRouter(
    prefix="/api/satellite-state",
    tags=["Satellite State"],
)


@router.post(
    "/current",
    response_model=SatelliteStateResponse,
)
def get_current_satellite_state(
    request: SatelliteStateRequest,
) -> SatelliteStateResponse:
    try:
        result = calculate_satellite_state(
            tle_line1=request.tle_line1,
            tle_line2=request.tle_line2,
            observation_time=request.observation_time,
        )

        return SatelliteStateResponse(
            observation_time_utc=(
                result.observation_time_utc
            ),
            current_speed_km_s=round(
                result.current_speed_km_s,
                4,
            ),
            current_height_km=round(
                result.current_height_km,
                3,
            ),
            latitude_degrees=round(
                result.latitude_degrees,
                6,
            ),
            longitude_degrees=round(
                result.longitude_degrees,
                6,
            ),
            apogee_height_km=round(
                result.apogee_height_km,
                3,
            ),
            perigee_height_km=round(
                result.perigee_height_km,
                3,
            ),
            orbital_period_minutes=round(
                result.orbital_period_minutes,
                3,
            ),
        )

    except (
        InvalidTLEError,
        ValueError,
    ) as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except SGP4PropagationError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error