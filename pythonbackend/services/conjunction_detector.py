from datetime import datetime, timedelta

from pythonbackend.services.propagator import (
    calculate_relative_velocity,
    propagate_tle,
)


class ConjunctionDetector:
    """Detect the closest approach between two satellites."""

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

    @staticmethod
    def _distance_at_time(
        tle_a: tuple[str, str],
        tle_b: tuple[str, str],
        current_time: datetime,
    ) -> float:
        """Calculate satellite separation at a specific time."""

        line1_a, line2_a = tle_a
        line1_b, line2_b = tle_b

        result_a = propagate_tle(
            line1_a,
            line2_a,
            current_time,
        )

        result_b = propagate_tle(
            line1_b,
            line2_b,
            current_time,
        )

        return ConjunctionDetector.calculate_distance(
            result_a.position_km,
            result_b.position_km,
        )

    @staticmethod
    def relative_velocity_at_time(
        tle_a: tuple[str, str],
        tle_b: tuple[str, str],
        current_time: datetime,
    ) -> float:
        """Calculate relative speed between two satellites at a specific time."""

        line1_a, line2_a = tle_a
        line1_b, line2_b = tle_b

        result_a = propagate_tle(
            line1_a,
            line2_a,
            current_time,
        )

        result_b = propagate_tle(
            line1_b,
            line2_b,
            current_time,
        )

        return calculate_relative_velocity(
            result_a.velocity_km_s,
            result_b.velocity_km_s,
        )

    def find_closest_approach(
        self,
        tle_a: tuple[str, str],
        tle_b: tuple[str, str],
        start_time: datetime,
        duration_minutes: int = 120,
        step_seconds: int = 60,
    ) -> tuple[float, datetime]:
        """
        Find closest approach using a coarse-to-fine search.

        tle_a:
            (TLE line 1, TLE line 2) for satellite A.

        tle_b:
            (TLE line 1, TLE line 2) for satellite B.

        Returns:
            (minimum_distance_km, time_of_closest_approach)
        """

        if duration_minutes <= 0:
            raise ValueError(
                "duration_minutes must be greater than 0"
            )

        if step_seconds <= 0:
            raise ValueError(
                "step_seconds must be greater than 0"
            )

        end_time = start_time + timedelta(
            minutes=duration_minutes
        )

        # ---------------------------------------------------------
        # Stage 1: Coarse search
        # ---------------------------------------------------------

        current_time = start_time

        minimum_distance = float("inf")
        closest_time = start_time

        while current_time <= end_time:

            distance = self._distance_at_time(
                tle_a,
                tle_b,
                current_time,
            )

            if distance < minimum_distance:
                minimum_distance = distance
                closest_time = current_time

            current_time += timedelta(
                seconds=step_seconds
            )

        # ---------------------------------------------------------
        # Stage 2: Fine search
        # ---------------------------------------------------------

        coarse_step = timedelta(
            seconds=step_seconds
        )

        fine_start = max(
            start_time,
            closest_time - coarse_step,
        )

        fine_end = min(
            end_time,
            closest_time + coarse_step,
        )

        fine_step_seconds = max(
            1,
            step_seconds // 10,
        )

        current_time = fine_start

        while current_time <= fine_end:

            distance = self._distance_at_time(
                tle_a,
                tle_b,
                current_time,
            )

            if distance < minimum_distance:
                minimum_distance = distance
                closest_time = current_time

            current_time += timedelta(
                seconds=fine_step_seconds
            )

        return minimum_distance, closest_time