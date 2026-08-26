import math


class RiskCalculator:
    """Classify conjunction risk and estimate collision probability."""

    RELATIVE_SPEED_THRESHOLD_KM_S = 0.001

    # Assumed positional uncertainty for MVP estimation.
    # This is NOT covariance-based uncertainty.
    ASSUMED_UNCERTAINTY_KM = 1.0

    def calculate_risk(
        self,
        distance_km: float,
        relative_speed_km_s: float,
    ) -> str:
        """
        Calculate preliminary conjunction risk.

        Negligible relative speed means the objects are effectively
        moving together, so a small separation alone should not
        classify them as a conjunction.
        """

        if (
            relative_speed_km_s
            <= self.RELATIVE_SPEED_THRESHOLD_KM_S
        ):
            return "LOW"

        if distance_km < 1.0:
            return "CRITICAL"

        if distance_km < 5.0:
            return "HIGH"

        if distance_km < 10.0:
            return "MEDIUM"

        return "LOW"

    def calculate_collision_probability(
        self,
        distance_km: float,
    ) -> float:
        """
        Calculate an estimated collision probability.

        This is an MVP estimate based on miss distance and an
        assumed positional uncertainty.

        It is NOT a covariance-based collision probability.
        """

        sigma = self.ASSUMED_UNCERTAINTY_KM

        probability = math.exp(
            -(distance_km ** 2)
            / (2 * sigma ** 2)
        )

        return max(
            0.0,
            min(1.0, probability),
        )