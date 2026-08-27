from inspect import signature
from math import sqrt

from fastapi import APIRouter, HTTPException

from pythonbackend.schemas.trajectory import (
    CompactRiskResult,
    TrajectoryConjunctionRequest,
    TrajectoryConjunctionResponse,
    TrajectoryObject,
)
from pythonbackend.services.conjunction_screening import (
    ConjunctionScreeningService,
)
from pythonbackend.services.propagator import (
    InvalidTLEError,
    SGP4PropagationError,
    propagate_tle,
)
from pythonbackend.services.risk_calculator import RiskCalculator
from pythonbackend.services.tle_provider import TLEProvider
from pythonbackend.services.tle_service import TLEService


router = APIRouter(
    prefix="/api/trajectory",
    tags=["Trajectory"],
)

risk_calculator = RiskCalculator()


class RequestTLEProvider(TLEProvider):
    def __init__(self, satellites: list[TrajectoryObject]):
        self.satellites = {
            satellite.satellite_id: satellite
            for satellite in satellites
        }

    def get_tle(self, satellite_id: str) -> tuple[str, str, str]:
        satellite = self.satellites.get(satellite_id)
        if satellite is None:
            raise ValueError(f"TLE not found for satellite ID: {satellite_id}")
        return satellite.name, satellite.tle_line1, satellite.tle_line2


class ScreeningRiskAdapter:
    @staticmethod
    def calculate_risk(distance_km: float) -> str:
        return "LOW"


def _relative_velocity_km_s(
    satellite_a: TrajectoryObject,
    satellite_b: TrajectoryObject,
    timestamp,
) -> float:
    state_a = propagate_tle(
        satellite_a.tle_line1,
        satellite_a.tle_line2,
        timestamp,
    )
    state_b = propagate_tle(
        satellite_b.tle_line1,
        satellite_b.tle_line2,
        timestamp,
    )

    return sqrt(
        sum(
            (velocity_a - velocity_b) ** 2
            for velocity_a, velocity_b in zip(
                state_a.velocity_km_s,
                state_b.velocity_km_s,
            )
        )
    )


def _calculate_risk(
    minimum_distance_km: float,
    relative_velocity_km_s: float,
) -> str:
    parameter_count = len(signature(risk_calculator.calculate_risk).parameters)
    if parameter_count >= 2:
        return risk_calculator.calculate_risk(
            minimum_distance_km,
            relative_velocity_km_s,
        )
    return risk_calculator.calculate_risk(minimum_distance_km)


@router.post(
    "/conjunction-risk",
    response_model=TrajectoryConjunctionResponse,
    summary="Return a compact nC2 conjunction-risk result",
)
def calculate_trajectory_conjunction_risk(
    request: TrajectoryConjunctionRequest,
) -> TrajectoryConjunctionResponse:
    satellite_ids = [satellite.satellite_id for satellite in request.satellites]
    if len(satellite_ids) != len(set(satellite_ids)):
        raise HTTPException(
            status_code=400,
            detail="Every satellite must have a unique satellite_id",
        )

    satellite_details = {
        satellite.satellite_id: satellite
        for satellite in request.satellites
    }

    try:
        screening_service = ConjunctionScreeningService(
            tle_service=TLEService(
                provider=RequestTLEProvider(request.satellites)
            ),
            risk_calculator=ScreeningRiskAdapter(),
        )
        raw_results = screening_service.screen(
            satellite_ids=satellite_ids,
            start_time=request.start_time,
            duration_minutes=request.duration_minutes,
            step_seconds=request.step_seconds,
        )

        results = []
        for result in raw_results:
            satellite_a = satellite_details[result["satellite_a_id"]]
            satellite_b = satellite_details[result["satellite_b_id"]]
            relative_velocity = _relative_velocity_km_s(
                satellite_a,
                satellite_b,
                result["time_of_closest_approach"],
            )
            results.append(
                CompactRiskResult(
                    satellite_a=result["satellite_a"],
                    satellite_b=result["satellite_b"],
                    minimum_distance_km=result["minimum_distance_km"],
                    relative_velocity_km_s=round(relative_velocity, 6),
                    time_of_closest_approach=result[
                        "time_of_closest_approach"
                    ],
                    risk_level=_calculate_risk(
                        result["minimum_distance_km"],
                        relative_velocity,
                    ),
                )
            )

        risk_rank = {
            "LOW": 0,
            "MEDIUM": 1,
            "HIGH": 2,
            "CRITICAL": 3,
        }
        results.sort(
            key=lambda result: (
                -risk_rank[result.risk_level],
                result.minimum_distance_km,
            )
        )
        high_risk_results = [
            result
            for result in results
            if result.risk_level in {"HIGH", "CRITICAL"}
        ]
        important_results = high_risk_results or results[:1]
        total_objects = len(request.satellites)

        return TrajectoryConjunctionResponse(
            pairs_checked=total_objects * (total_objects - 1) // 2,
            overall_risk=(
                results[0].risk_level if results else "LOW"
            ),
            risk_results=important_results,
        )

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except (InvalidTLEError, SGP4PropagationError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
