import unittest
from datetime import datetime, timezone

from fastapi import HTTPException

from propagation import PropagationRequest, propagate_satellite


TLE_LINE_1 = (
    "1 00005U 58002B   00179.78495062  .00000023  "
    "00000-0  28098-4 0  4753"
)
TLE_LINE_2 = (
    "2 00005  34.2682 348.7242 1859667 331.7664  "
    "19.3264 10.82419157413667"
)


class PropagationTests(unittest.TestCase):
    def test_vanguard_position_and_velocity_at_tle_epoch(self):
        request = PropagationRequest(
            tle_line1=TLE_LINE_1,
            tle_line2=TLE_LINE_2,
            prediction_time=datetime(
                2000,
                6,
                27,
                18,
                50,
                19,
                733568,
                tzinfo=timezone.utc,
            ),
        )

        response = propagate_satellite(request)

        expected_position = (7022.46529266, -1400.08296755, 0.03995155)
        expected_velocity = (1.893841015, 6.405893759, 4.534807250)
        actual_position = (
            response.position_km.x,
            response.position_km.y,
            response.position_km.z,
        )
        actual_velocity = (
            response.velocity_km_s.x,
            response.velocity_km_s.y,
            response.velocity_km_s.z,
        )

        for actual, expected in zip(actual_position, expected_position):
            self.assertAlmostEqual(actual, expected, places=5)

        for actual, expected in zip(actual_velocity, expected_velocity):
            self.assertAlmostEqual(actual, expected, places=7)

    def test_prediction_time_requires_timezone(self):
        request = PropagationRequest(
            tle_line1=TLE_LINE_1,
            tle_line2=TLE_LINE_2,
            prediction_time=datetime(2000, 6, 27, 18, 50, 19),
        )

        with self.assertRaises(HTTPException) as context:
            propagate_satellite(request)

        self.assertEqual(context.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
