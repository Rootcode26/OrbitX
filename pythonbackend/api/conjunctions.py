from fastapi import APIRouter, HTTPException

from pythonbackend.schemas.conjunctions import (
    ConjunctionRequest,
    ConjunctionResponse,
)

from pythonbackend.services.conjunction_detector import (
    ConjunctionDetector,
)

from pythonbackend.services.risk_calculator import (
    RiskCalculator,
)


router = APIRouter(
    prefix="/api/conjunctions",
    tags=["Conjunction"],
)

detector = ConjunctionDetector()
risk_calculator = RiskCalculator()


@router.post(
    "/check",
    response_model=ConjunctionResponse,
)
def check_conjunction(
    request: ConjunctionRequest,
) -> ConjunctionResponse:

    try:
        satellite_a = detector.propagator.create_satellite(
            request.satellite_a.line1,
            request.satellite_a.line2,
        )

        satellite_b = detector.propagator.create_satellite(
            request.satellite_b.line1,
            request.satellite_b.line2,
        )

        minimum_distance, closest_time = (
            detector.find_closest_approach(
                satellite_a=satellite_a,
                satellite_b=satellite_b,
                start_time=request.start_time,
                duration_minutes=request.duration_minutes,
                step_seconds=request.step_seconds,
            )
        )

        risk_level = risk_calculator.calculate_risk(
            minimum_distance
        )

        return ConjunctionResponse(
            satellite_a=request.satellite_a.name,
            satellite_b=request.satellite_b.name,
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

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Conjunction calculation failed",
        ) from exc