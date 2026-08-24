class RiskCalculator:
    """Classify conjunction risk based on miss distance."""

    def calculate_risk(self, distance_km: float) -> str:
        """
        Calculate a preliminary risk level from miss distance.

        These thresholds are MVP placeholders and should be
        replaced with the criteria defined by the SIH specification.
        """

        if distance_km < 1.0:
            return "CRITICAL"

        if distance_km < 5.0:
            return "HIGH"

        if distance_km < 10.0:
            return "MEDIUM"

        return "LOW"