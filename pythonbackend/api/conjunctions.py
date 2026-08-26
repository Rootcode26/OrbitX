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
        # -----------------------------------------------------
        # TLEs are provided directly by the calling backend.
        # We do NOT fetch them from TLEService here.
        # -----------------------------------------------------

        tle_a = (
            request.satellite_a.tle_line1,
            request.satellite_a.tle_line2,
        )

        tle_b = (
            request.satellite_b.tle_line1,
            request.satellite_b.tle_line2,
        )

        # -----------------------------------------------------
        # Calculate closest approach
        # -----------------------------------------------------

        minimum_distance, closest_time = (
            detector.find_closest_approach(
                tle_a=tle_a,
                tle_b=tle_b,
                start_time=request.start_time,
                duration_minutes=request.duration_minutes,
                step_seconds=request.step_seconds,
            )
        )

        # -----------------------------------------------------
        # Calculate risk
        # -----------------------------------------------------

        risk_status = risk_calculator.calculate_risk(
            minimum_distance
        )

        # -----------------------------------------------------
        # Current detector calculates minimum distance.
        #
        # Relative velocity and collision probability are
        # not currently calculated by ConjunctionDetector.
        #
        # Therefore these fields remain None until those
        # calculations are implemented.
        # -----------------------------------------------------

        return ConjunctionResponse(
            satellite_a=request.satellite_a.name,
            satellite_b=request.satellite_b.name,
            closest_approach_time=closest_time,
            miss_distance_km=round(
                minimum_distance,
                3,
            ),
            relative_speed_km_s=None,
            collision_probability=None,
            risk_status=risk_status,
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
            detail=str(exc),
        ) from exc


# =============================================================
# Multi-satellite screening
# =============================================================

@router.post(
    "/screen",
    response_model=ScreeningResponse,
)
def screen_conjunctions(
    request: ScreeningRequest,
) -> ScreeningResponse:

    try:
        satellites = [
            satellite.model_dump()
            for satellite in request.satellites
        ]

        results = screening_service.screen(
            satellites=satellites,
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