from datetime import datetime, timedelta, timezone
from math import acos, degrees

from pythonbackend.services.propagator import (
    calculate_relative_velocity,
    propagate_tle,
)


class ConjunctionDetector:
    """Detect and analyze the closest approach between two satellites."""

    # =========================================================
    # Basic distance calculation
    # =========================================================

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

    # =========================================================
    # Current UTC time
    # =========================================================

    @staticmethod
    def current_utc_time() -> datetime:
        """Return the current UTC time."""

        return datetime.now(timezone.utc)

    # =========================================================
    # Get satellite state at a specific time
    # =========================================================

    @staticmethod
    def state_at_time(
        tle: tuple[str, str],
        current_time: datetime,
    ):
        """
        Propagate one satellite to a specific time.

        Returns:
            SGP4Result containing position and velocity.
        """

        line1, line2 = tle

        return propagate_tle(
            line1,
            line2,
            current_time,
        )

    # =========================================================
    # Get states of both satellites
    # =========================================================

    @staticmethod
    def get_states_at_time(
        tle_a: tuple[str, str],
        tle_b: tuple[str, str],
        current_time: datetime,
    ):
        """Get propagated states for both satellites."""

        result_a = ConjunctionDetector.state_at_time(
            tle_a,
            current_time,
        )

        result_b = ConjunctionDetector.state_at_time(
            tle_b,
            current_time,
        )

        return result_a, result_b

    # =========================================================
    # Distance at a specific time
    # =========================================================

    @staticmethod
    def _distance_at_time(
        tle_a: tuple[str, str],
        tle_b: tuple[str, str],
        current_time: datetime,
    ) -> float:
        """Calculate satellite separation at a specific time."""

        result_a, result_b = (
            ConjunctionDetector.get_states_at_time(
                tle_a,
                tle_b,
                current_time,
            )
        )

        return ConjunctionDetector.calculate_distance(
            result_a.position_km,
            result_b.position_km,
        )

    # =========================================================
    # Relative velocity
    # =========================================================

    @staticmethod
    def relative_velocity_at_time(
        tle_a: tuple[str, str],
        tle_b: tuple[str, str],
        current_time: datetime,
    ) -> float:
        """Calculate relative speed between two satellites."""

        result_a, result_b = (
            ConjunctionDetector.get_states_at_time(
                tle_a,
                tle_b,
                current_time,
            )
        )

        return calculate_relative_velocity(
            result_a.velocity_km_s,
            result_b.velocity_km_s,
        )

    # =========================================================
    # Relative velocity vector
    # =========================================================

    @staticmethod
    def relative_velocity_vector(
        velocity_a: tuple[float, float, float],
        velocity_b: tuple[float, float, float],
    ) -> tuple[float, float, float]:
        """Calculate relative velocity vector."""

        return (
            velocity_a[0] - velocity_b[0],
            velocity_a[1] - velocity_b[1],
            velocity_a[2] - velocity_b[2],
        )

    # =========================================================
    # Closing rate
    # =========================================================

    @staticmethod
    def calculate_closing_rate(
        position_a: tuple[float, float, float],
        position_b: tuple[float, float, float],
        velocity_a: tuple[float, float, float],
        velocity_b: tuple[float, float, float],
    ) -> float:
        """
        Calculate instantaneous closing rate.

        Positive:
            Satellites are approaching.

        Negative:
            Satellites are separating.

        Unit:
            km/s
        """

        relative_position = (
            position_a[0] - position_b[0],
            position_a[1] - position_b[1],
            position_a[2] - position_b[2],
        )

        relative_velocity = (
            velocity_a[0] - velocity_b[0],
            velocity_a[1] - velocity_b[1],
            velocity_a[2] - velocity_b[2],
        )

        distance = (
            relative_position[0] ** 2
            + relative_position[1] ** 2
            + relative_position[2] ** 2
        ) ** 0.5

        if distance == 0:
            return 0.0

        radial_velocity = (
            relative_position[0] * relative_velocity[0]
            + relative_position[1] * relative_velocity[1]
            + relative_position[2] * relative_velocity[2]
        ) / distance

        return -radial_velocity

    # =========================================================
    # Encounter angle
    # =========================================================

    @staticmethod
    def calculate_encounter_angle(
        velocity_a: tuple[float, float, float],
        velocity_b: tuple[float, float, float],
    ) -> float:
        """
        Calculate angle between the two satellite velocity vectors.

        Returns:
            Angle in degrees from 0 to 180.
        """

        magnitude_a = (
            velocity_a[0] ** 2
            + velocity_a[1] ** 2
            + velocity_a[2] ** 2
        ) ** 0.5

        magnitude_b = (
            velocity_b[0] ** 2
            + velocity_b[1] ** 2
            + velocity_b[2] ** 2
        ) ** 0.5

        if magnitude_a == 0 or magnitude_b == 0:
            return 0.0

        dot_product = (
            velocity_a[0] * velocity_b[0]
            + velocity_a[1] * velocity_b[1]
            + velocity_a[2] * velocity_b[2]
        )

        cos_angle = dot_product / (
            magnitude_a * magnitude_b
        )

        # Protect acos from floating-point rounding errors.
        cos_angle = max(
            -1.0,
            min(1.0, cos_angle),
        )

        return degrees(acos(cos_angle))

    # =========================================================
    # State at closest approach
    # =========================================================

    @staticmethod
    def state_at_tca(
        tle_a: tuple[str, str],
        tle_b: tuple[str, str],
        closest_time: datetime,
    ):
        """
        Get position and velocity of both satellites
        at the time of closest approach.
        """

        return ConjunctionDetector.get_states_at_time(
            tle_a,
            tle_b,
            closest_time,
        )

    # =========================================================
    # Separation samples
    # =========================================================

    def generate_separation_samples(
        self,
        tle_a: tuple[str, str],
        tle_b: tuple[str, str],
        start_time: datetime | None = None,
        duration_minutes: int = 120,
        step_seconds: int = 60,
        closest_time: datetime | None = None,
    ) -> list[dict]:
        """
        Generate separation samples.

        If closest_time is supplied, samples are generated around
        closest approach.

        Otherwise samples are generated throughout the requested
        screening period.
        """

        if duration_minutes <= 0:
            raise ValueError(
                "duration_minutes must be greater than 0"
            )

        if step_seconds <= 0:
            raise ValueError(
                "step_seconds must be greater than 0"
            )

        # -----------------------------------------------------
        # Mode 1:
        # Generate samples around TCA.
        #
        # Kept for compatibility with previous implementation.
        # -----------------------------------------------------

        if closest_time is not None:

            offsets = (
                -step_seconds,
                0,
                step_seconds,
            )

            samples = []

            for offset in offsets:

                timestamp = (
                    closest_time
                    + timedelta(seconds=offset)
                )

                result_a, result_b = (
                    self.get_states_at_time(
                        tle_a,
                        tle_b,
                        timestamp,
                    )
                )

                separation = self.calculate_distance(
                    result_a.position_km,
                    result_b.position_km,
                )

                closing_rate = self.calculate_closing_rate(
                    result_a.position_km,
                    result_b.position_km,
                    result_a.velocity_km_s,
                    result_b.velocity_km_s,
                )

                samples.append(
                    {
                        "timestamp": timestamp,
                        "separation_km": round(
                            separation,
                            3,
                        ),
                        "closing_rate_km_s": round(
                            closing_rate,
                            6,
                        ),
                    }
                )

            return samples

        # -----------------------------------------------------
        # Mode 2:
        # Generate samples throughout screening period.
        # -----------------------------------------------------

        if start_time is None:
            raise ValueError(
                "start_time is required when closest_time is not provided"
            )

        end_time = (
            start_time
            + timedelta(minutes=duration_minutes)
        )

        samples = []

        current_time = start_time

        while current_time <= end_time:

            result_a, result_b = (
                self.get_states_at_time(
                    tle_a,
                    tle_b,
                    current_time,
                )
            )

            separation = self.calculate_distance(
                result_a.position_km,
                result_b.position_km,
            )

            closing_rate = self.calculate_closing_rate(
                result_a.position_km,
                result_b.position_km,
                result_a.velocity_km_s,
                result_b.velocity_km_s,
            )

            samples.append(
                {
                    "timestamp": current_time,
                    "separation_km": round(
                        separation,
                        3,
                    ),
                    "closing_rate_km_s": round(
                        closing_rate,
                        6,
                    ),
                }
            )

            current_time += timedelta(
                seconds=step_seconds
            )

        return samples

    # =========================================================
    # Encounter track
    # =========================================================

    def generate_encounter_track(
        self,
        tle_a: tuple[str, str],
        tle_b: tuple[str, str],
        closest_time: datetime,
        half_window_minutes: int = 10,
        step_seconds: int = 20,
    ) -> list[dict]:
        """
        Dense, TCA-centered track of both satellites' absolute positions and
        their separation, for high-fidelity encounter visualisation.

        Returns one sample per step across
        [closest_time - half_window, closest_time + half_window], each with the
        absolute TEME position of both objects and their separation.
        """

        if half_window_minutes <= 0:
            raise ValueError(
                "half_window_minutes must be greater than 0"
            )

        if step_seconds <= 0:
            raise ValueError(
                "step_seconds must be greater than 0"
            )

        total_steps = int(
            (half_window_minutes * 60) / step_seconds
        )

        samples = []

        for index in range(-total_steps, total_steps + 1):

            offset = index * step_seconds

            timestamp = (
                closest_time
                + timedelta(seconds=offset)
            )

            result_a, result_b = self.get_states_at_time(
                tle_a,
                tle_b,
                timestamp,
            )

            separation = self.calculate_distance(
                result_a.position_km,
                result_b.position_km,
            )

            samples.append(
                {
                    "offset_seconds": offset,
                    "timestamp": timestamp,
                    "position_a_km": {
                        "x": round(result_a.position_km[0], 6),
                        "y": round(result_a.position_km[1], 6),
                        "z": round(result_a.position_km[2], 6),
                    },
                    "position_b_km": {
                        "x": round(result_b.position_km[0], 6),
                        "y": round(result_b.position_km[1], 6),
                        "z": round(result_b.position_km[2], 6),
                    },
                    "separation_km": round(separation, 3),
                }
            )

        return samples

    # =========================================================
    # Closest approach
    # =========================================================

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

        Returns:
            (
                minimum_distance_km,
                time_of_closest_approach,
            )
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

        # -----------------------------------------------------
        # Stage 1: Coarse search
        # -----------------------------------------------------

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

        # -----------------------------------------------------
        # Stage 2: Fine search
        # -----------------------------------------------------

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