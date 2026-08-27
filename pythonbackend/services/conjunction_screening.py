from datetime import datetime
from itertools import combinations

from pythonbackend.services.conjunction_detector import (
    ConjunctionDetector,
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
            # -------------------------------------------------
            # Satellite information
            # -------------------------------------------------

            satellite_a_id = satellite_a["norad_id"]
            satellite_b_id = satellite_b["norad_id"]

            name_a = satellite_a["name"]
            name_b = satellite_b["name"]

            tle_a = (
                satellite_a["tle_line1"],
                satellite_a["tle_line2"],
            )

            tle_b = (
                satellite_b["tle_line1"],
                satellite_b["tle_line2"],
            )

            # -------------------------------------------------
            # 1. Find closest approach
            # -------------------------------------------------

            minimum_distance, closest_time = (
                self.detector.find_closest_approach(
                    tle_a=tle_a,
                    tle_b=tle_b,
                    start_time=start_time,
                    duration_minutes=duration_minutes,
                    step_seconds=step_seconds,
                )
            )

            # -------------------------------------------------
            # 2. Get satellite states at TCA
            # -------------------------------------------------

            result_a, result_b = (
                self.detector.get_states_at_time(
                    tle_a=tle_a,
                    tle_b=tle_b,
                    current_time=closest_time,
                )
            )

            # -------------------------------------------------
            # 3. Relative velocity at TCA
            # -------------------------------------------------

            relative_speed = (
                self.detector.relative_velocity_at_time(
                    tle_a=tle_a,
                    tle_b=tle_b,
                    current_time=closest_time,
                )
            )

            # -------------------------------------------------
            # 4. Current satellite states
            # -------------------------------------------------

            current_a, current_b = (
                self.detector.get_states_at_time(
                    tle_a=tle_a,
                    tle_b=tle_b,
                    current_time=start_time,
                )
            )

            # -------------------------------------------------
            # 5. Current separation
            # -------------------------------------------------

            current_separation = (
                self.detector.calculate_distance(
                    current_a.position_km,
                    current_b.position_km,
                )
            )

            # -------------------------------------------------
            # 6. Current closing rate
            # -------------------------------------------------

            current_closing_rate = (
                self.detector.calculate_closing_rate(
                    current_a.position_km,
                    current_b.position_km,
                    current_a.velocity_km_s,
                    current_b.velocity_km_s,
                )
            )

            # -------------------------------------------------
            # 7. Encounter angle
            # -------------------------------------------------

            encounter_angle = (
                self.detector.calculate_encounter_angle(
                    result_a.velocity_km_s,
                    result_b.velocity_km_s,
                )
            )

            # -------------------------------------------------
            # 8. Collision probability
            # -------------------------------------------------

            collision_probability = (
                self.risk_calculator.calculate_collision_probability(
                    minimum_distance
                )
            )

            # -------------------------------------------------
            # 9. Risk level
            # -------------------------------------------------

            risk_level = (
                self.risk_calculator.calculate_risk(
                    minimum_distance,
                    relative_speed,
                )
            )

            # -------------------------------------------------
            # 10. Risk score
            # -------------------------------------------------

            risk_score = (
                self.risk_calculator.calculate_risk_score(
                    minimum_distance,
                    relative_speed,
                    collision_probability,
                )
            )

            # -------------------------------------------------
            # 11. Separation samples
            # -------------------------------------------------

            separation_samples = (
                self.detector.generate_separation_samples(
                    tle_a=tle_a,
                    tle_b=tle_b,
                    start_time=start_time,
                    duration_minutes=duration_minutes,
                    step_seconds=step_seconds,
                )
            )

            # -------------------------------------------------
            # 12. Store complete result
            # -------------------------------------------------

            results.append(
                {
                    "calculated_at": self.detector.current_utc_time(),

                    "reference_frame": "TEME",

                    "screening_start_time": start_time,

                    "screening_duration_minutes": (
                        duration_minutes
                    ),

                    "step_seconds": step_seconds,

                    "satellite_a": {
                        "norad_cat_id": int(
                            satellite_a_id
                        ),
                        "name": name_a,
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

                    "satellite_b": {
                        "norad_cat_id": int(
                            satellite_b_id
                        ),
                        "name": name_b,
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

                    "current_separation_km": round(
                        current_separation,
                        3,
                    ),

                    "current_closing_rate_km_s": round(
                        current_closing_rate,
                        6,
                    ),

                    "closest_approach_time_utc": (
                        closest_time
                    ),

                    "minimum_separation_km": round(
                        minimum_distance,
                        3,
                    ),

                    "relative_velocity_km_s": round(
                        relative_speed,
                        6,
                    ),

                    "encounter_angle_degrees": round(
                        encounter_angle,
                        3,
                    ),

                    "collision_probability": round(
                        collision_probability,
                        8,
                    ),

                    "risk_level": risk_level,

                    "risk_score": round(
                        risk_score,
                        3,
                    ),

                    "separation_samples": (
                        separation_samples
                    ),
                }
            )

        return results