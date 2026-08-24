from datetime import datetime, timedelta

from pythonbackend.services.propagator import Propagator


class ConjunctionDetector:
    """Detect the closest approach between two satellites."""

    def __init__(self, propagator: Propagator | None = None):
        self.propagator = propagator or Propagator()

    @staticmethod
    def calculate_distance(
        position_a: tuple[float, float, float],
        position_b: tuple[float, float, float],
    ) -> float:
        """Calculate Euclidean distance between two positions in km."""

        dx = position_a[0] - position_b[0]
        dy = position_a[1] - position_b[1]
        dz = position_a[2] - position_b[2]

        return (dx * dx + dy * dy + dz * dz) ** 0.5

    def find_closest_approach(
        self,
        satellite_a,
        satellite_b,
        start_time: datetime,
        duration_minutes: int = 120,
        step_seconds: int = 60,
    ) -> tuple[float, datetime]:
        """
        Find the minimum distance between two satellites
        during the requested prediction window.

        Returns:
            (minimum_distance_km, time_of_closest_approach)
        """

        end_time = start_time + timedelta(
            minutes=duration_minutes
        )

        current_time = start_time

        minimum_distance = float("inf")
        closest_time = start_time

        while current_time <= end_time:

            position_a = self.propagator.propagate(
                satellite_a,
                current_time,
            )

            position_b = self.propagator.propagate(
                satellite_b,
                current_time,
            )

            distance = self.calculate_distance(
                position_a,
                position_b,
            )

            if distance < minimum_distance:
                minimum_distance = distance
                closest_time = current_time

            current_time += timedelta(
                seconds=step_seconds
            )

        return minimum_distance, closest_time