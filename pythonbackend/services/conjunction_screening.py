from datetime import datetime
from itertools import combinations

from pythonbackend.services.conjunction_detector import (
    ConjunctionDetector,
)
from pythonbackend.services.risk_calculator import RiskCalculator
from pythonbackend.services.tle_service import TLEService


class ConjunctionScreeningService:
    """Screen multiple satellites for conjunctions."""

    def __init__(
        self,
        tle_service: TLEService | None = None,
        detector: ConjunctionDetector | None = None,
        risk_calculator: RiskCalculator | None = None,
    ):
        self.tle_service = tle_service or TLEService()
        self.detector = detector or ConjunctionDetector()
        self.risk_calculator = (
            risk_calculator or RiskCalculator()
        )

    @staticmethod
    def generate_pairs(
        satellite_ids: list[str],
    ) -> list[tuple[str, str]]:
        """Generate all unique satellite pairs."""

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
        satellite_ids: list[str],
        start_time: datetime,
        duration_minutes: int = 120,
        step_seconds: int = 60,
    ) -> list[dict]:
        """Run conjunction analysis for all satellite pairs."""

        results = []

        pairs = self.generate_pairs(
            satellite_ids
        )

        for satellite_a_id, satellite_b_id in pairs:

            name_a, line1_a, line2_a = (
                self.tle_service.get_tle(
                    satellite_a_id
                )
            )

            name_b, line1_b, line2_b = (
                self.tle_service.get_tle(
                    satellite_b_id
                )
            )

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

            risk_level = (
                self.risk_calculator.calculate_risk(
                    minimum_distance
                )
            )

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
                    "risk_level": risk_level,
                }
            )

        return results