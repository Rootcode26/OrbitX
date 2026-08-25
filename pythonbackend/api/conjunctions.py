from fastapi import APIRouter, HTTPException

from pythonbackend.schemas.conjunctions import (
    ConjunctionRequest,
    ConjunctionResponse,
    ScreeningRequest,
    ScreeningResponse,
)

from pythonbackend.services.conjunction_detector import (
    ConjunctionDetector,
)
from pythonbackend.services.conjunction_screening import (
    ConjunctionScreeningService,
)
from pythonbackend.services.propagator import (
    InvalidTLEError,
    SGP4PropagationError,
)
from pythonbackend.services.risk_calculator import RiskCalculator
from pythonbackend.services.tle_service import TLEService


router = APIRouter(
    prefix="/api/conjunctions",
    tags=["Conjunction"],
)


detector = ConjunctionDetector()
risk_calculator = RiskCalculator()
tle_service = TLEService()
screening_service = ConjunctionScreeningService()


@router.post(
    "/check",
    response_model=ConjunctionResponse,
)
def check_conjunction(
    request: ConjunctionRequest,
) -> ConjunctionResponse:

    try:
        # Get TLE data using NORAD IDs.
        name_a, line1_a, line2_a = tle_service.get_tle(
            request.satellite_a
        )

        name_b, line1_b, line2_b = tle_service.get_tle(
            request.satellite_b
        )

        # Find closest approach using the shared
        # SGP4 propagation implementation.
        minimum_distance, closest_time = (
            detector.find_closest_approach(
                tle_a=(line1_a, line2_a),
                tle_b=(line1_b, line2_b),
                start_time=request.start_time,
                duration_minutes=request.duration_minutes,
                step_seconds=request.step_seconds,
            )
        )

        # Calculate preliminary risk level.
        risk_level = risk_calculator.calculate_risk(
            minimum_distance
        )

        return ConjunctionResponse(
            satellite_a=name_a,
            satellite_b=name_b,
            minimum_distance_km=round(
                minimum_distance,
                3,
            ),
            time_of_closest_approach=closest_time,
            risk_level=risk_level,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except InvalidTLEError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except SGP4PropagationError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Conjunction calculation failed",
        ) from exc


@router.post(
    "/screen",
    response_model=ScreeningResponse,
)
def screen_conjunctions(
    request: ScreeningRequest,
) -> ScreeningResponse:

    try:
        results = screening_service.screen(
            satellite_ids=request.satellite_ids,
            start_time=request.start_time,
            duration_minutes=request.duration_minutes,
            step_seconds=request.step_seconds,
        )

        return ScreeningResponse(
            total_pairs_checked=len(results),
            results=results,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except InvalidTLEError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except SGP4PropagationError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Conjunction screening failed",
        ) from exc