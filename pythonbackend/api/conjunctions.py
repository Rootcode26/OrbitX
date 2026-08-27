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
from pythonbackend.services.risk_calculator import (
    RiskCalculator,
)


router = APIRouter(
    prefix="/api/conjunctions",
    tags=["Conjunction"],
)


detector = ConjunctionDetector()
risk_calculator = RiskCalculator()
screening_service = ConjunctionScreeningService()


# =============================================================
# Single conjunction check
# =============================================================

@router.post(
    "/check",
    response_model=ConjunctionResponse,
)
def check_conjunction(
    request: ConjunctionRequest,
) -> ConjunctionResponse:

    try:
        # -----------------------------------------------------
        # TLEs are supplied directly by the calling backend.
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
        # 1. Find closest approach
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
        # 2. Get satellite states at TCA
        # -----------------------------------------------------

        result_a, result_b = detector.get_states_at_time(
            tle_a=tle_a,
            tle_b=tle_b,
            current_time=closest_time,
        )

        # -----------------------------------------------------
        # 3. Relative velocity at TCA
        # -----------------------------------------------------

        relative_speed = detector.relative_velocity_at_time(
            tle_a=tle_a,
            tle_b=tle_b,
            current_time=closest_time,
        )

        # -----------------------------------------------------
        # 4. Current satellite states
        # -----------------------------------------------------

        current_a, current_b = detector.get_states_at_time(
            tle_a=tle_a,
            tle_b=tle_b,
            current_time=request.start_time,
        )

        # -----------------------------------------------------
        # 5. Current separation
        # -----------------------------------------------------

        current_separation = detector.calculate_distance(
            current_a.position_km,
            current_b.position_km,
        )

        # -----------------------------------------------------
        # 6. Current closing rate
        # -----------------------------------------------------

        current_closing_rate = (
            detector.calculate_closing_rate(
                current_a.position_km,
                current_b.position_km,
                current_a.velocity_km_s,
                current_b.velocity_km_s,
            )
        )

        # -----------------------------------------------------
        # 7. Encounter angle
        # -----------------------------------------------------

        encounter_angle = (
            detector.calculate_encounter_angle(
                result_a.velocity_km_s,
                result_b.velocity_km_s,
            )
        )

        # -----------------------------------------------------
        # 8. Estimated collision probability
        # -----------------------------------------------------

        collision_probability = (
            risk_calculator.calculate_collision_probability(
                minimum_distance,
            )
        )

        # -----------------------------------------------------
        # 9. Risk level
        # -----------------------------------------------------

        risk_level = risk_calculator.calculate_risk(
            minimum_distance,
            relative_speed,
        )

        # -----------------------------------------------------
        # 10. Risk score
        # -----------------------------------------------------

        risk_score = risk_calculator.calculate_risk_score(
            minimum_distance,
            relative_speed,
            collision_probability,
        )

        # -----------------------------------------------------
        # 11. Separation samples
        # -----------------------------------------------------

        separation_samples = (
            detector.generate_separation_samples(
                tle_a=tle_a,
                tle_b=tle_b,
                start_time=request.start_time,
                duration_minutes=request.duration_minutes,
                step_seconds=request.step_seconds,
            )
        )

        # -----------------------------------------------------
        # 12. Return final response
        # -----------------------------------------------------

        return ConjunctionResponse(
            calculated_at=detector.current_utc_time(),

            reference_frame="TEME",

            screening_start_time=request.start_time,
            screening_duration_minutes=request.duration_minutes,
            step_seconds=request.step_seconds,

            satellite_a={
                "norad_cat_id": int(
                    request.satellite_a.norad_id
                ),
                "name": request.satellite_a.name,
                "position_at_tca_km": {
                    "x": round(
                        result_a.position_km[0],
                        6,
                    ),
                    "y": round(
                        result_a.position_km[1],
                        6,
                    ),
                    "z": round(
                        result_a.position_km[2],
                        6,
                    ),
                },
                "velocity_at_tca_km_s": {
                    "x": round(
                        result_a.velocity_km_s[0],
                        6,
                    ),
                    "y": round(
                        result_a.velocity_km_s[1],
                        6,
                    ),
                    "z": round(
                        result_a.velocity_km_s[2],
                        6,
                    ),
                },
            },

            satellite_b={
                "norad_cat_id": int(
                    request.satellite_b.norad_id
                ),
                "name": request.satellite_b.name,
                "position_at_tca_km": {
                    "x": round(
                        result_b.position_km[0],
                        6,
                    ),
                    "y": round(
                        result_b.position_km[1],
                        6,
                    ),
                    "z": round(
                        result_b.position_km[2],
                        6,
                    ),
                },
                "velocity_at_tca_km_s": {
                    "x": round(
                        result_b.velocity_km_s[0],
                        6,
                    ),
                    "y": round(
                        result_b.velocity_km_s[1],
                        6,
                    ),
                    "z": round(
                        result_b.velocity_km_s[2],
                        6,
                    ),
                },
            },

            current_separation_km=round(
                current_separation,
                3,
            ),

            current_closing_rate_km_s=round(
                current_closing_rate,
                6,
            ),

            closest_approach_time_utc=closest_time,

            minimum_separation_km=round(
                minimum_distance,
                3,
            ),

            relative_velocity_km_s=round(
                relative_speed,
                6,
            ),

            encounter_angle_degrees=round(
                encounter_angle,
                3,
            ),

            collision_probability=round(
                collision_probability,
                8,
            ),

            risk_level=risk_level,

            risk_score=round(
                risk_score,
                3,
            ),

            separation_samples=separation_samples,
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