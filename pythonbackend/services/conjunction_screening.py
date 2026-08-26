from datetime import datetime
from itertools import combinations

from pythonbackend.services.conjunction_detector import (
    ConjunctionDetector,
)
from pythonbackend.services.propagator import (
    InvalidTLEError,
    SGP4PropagationError,
)
from pythonbackend.services.risk_calculator import RiskCalculator


class ConjunctionScreeningService:
    """Screen multiple satellites for conjunctions using supplied TLE data."""

    def __init__(
        self,
        detector: ConjunctionDetector | None = None,
        risk_calculator: RiskCalculator | None = None,
    ):
        self.detector = detector or ConjunctionDetector()
        self.risk_calculator = (
            risk_calculator or RiskCalculator()
        )

    @staticmethod
    def generate_pairs(
        satellite_ids: list[str],
    ) -> list[tuple[str, str]]:
        """Generate all unique satellite ID pairs."""

        if len(satellite_ids) < 2:
            return []

        return list(
            combinations(
                satellite_ids,
                2,
            )
        )

    def screen(
        self,
        satellites: list[dict],
        start_time: datetime,
        duration_minutes: int = 120,
        step_seconds: int = 60,
    ) -> list[dict]:
        """
        Run conjunction analysis for all supplied satellites.

        Each satellite must contain:
            norad_id
            name
            tle_line1
            tle_line2
        """

        if len(satellites) < 2:
            raise ValueError(
                "At least two satellites are required"
            )

        results = []

        for satellite_a, satellite_b in combinations(
            satellites,
            2,
        ):
            satellite_a_id = satellite_a["norad_id"]
            satellite_b_id = satellite_b["norad_id"]

            name_a = satellite_a["name"]
            name_b = satellite_b["name"]

            line1_a = satellite_a["tle_line1"]
            line2_a = satellite_a["tle_line2"]

            line1_b = satellite_b["tle_line1"]
            line2_b = satellite_b["tle_line2"]

            # -------------------------------------------------
            # Find closest approach
            # -------------------------------------------------

            minimum_distance, closest_time = (
                self.detector.find_closest_approach(
                    tle_a=(
                        line1_a,
                        line2_a,
                    ),
                    tle_b=(
                        line1_b,
                        line2_b,
                    ),
                    start_time=start_time,
                    duration_minutes=duration_minutes,
                    step_seconds=step_seconds,
                )
            )

            # -------------------------------------------------
            # Calculate relative velocity at closest approach
            # -------------------------------------------------

            relative_speed = (
                self.detector.relative_velocity_at_time(
                    tle_a=(
                        line1_a,
                        line2_a,
                    ),
                    tle_b=(
                        line1_b,
                        line2_b,
                    ),
                    current_time=closest_time,
                )
            )

            # -------------------------------------------------
            # Calculate collision probability
            # -------------------------------------------------

            collision_probability = (
                self.risk_calculator.calculate_collision_probability(
                    minimum_distance
                )
            )

            # -------------------------------------------------
            # Calculate risk
            # -------------------------------------------------

            risk_level = (
                self.risk_calculator.calculate_risk(
                    minimum_distance,
                    relative_speed,
                )
            )


            # -------------------------------------------------
            # Store result
            # -------------------------------------------------

            results.append(
                {
                    "satellite_a": name_a,
                    "satellite_b": name_b,
                    "satellite_a_id": satellite_a_id,
                    "satellite_b_id": satellite_b_id,
                    "minimum_distance_km": round(
                        minimum_distance,
                        3,
                    ),
                    "time_of_closest_approach": closest_time,
                    "relative_speed_km_s": round(
                        relative_speed,
                        6,
                    ),
                    "collision_probability": round(
                        collision_probability,
                        6,
                    ),
                    "risk_level": risk_level,
                }
            )
        return results