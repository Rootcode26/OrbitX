import unittest
from datetime import datetime, timezone

from fastapi import HTTPException

from pythonbackend.api.propagation import propagate_satellites
from pythonbackend.schemas.propagation import (
    PropagationRequest,
    SatellitePropagationInput,
)


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
            satellites=[
                SatellitePropagationInput(
                    norad_cat_id=5,
                    tle_line1=TLE_LINE_1,
                    tle_line2=TLE_LINE_2,
                ),
            ],
        )

        response = propagate_satellites(request)
        result = response.results[0]

        expected_position = (7022.4653, -1400.0830, 0.0400)
        expected_velocity = (1.8938, 6.4059, 4.5348)
        actual_position = (
            result.position_km.x,
            result.position_km.y,
            result.position_km.z,
        )
        actual_velocity = (
            result.velocity_km_s.x,
            result.velocity_km_s.y,
            result.velocity_km_s.z,
        )

        self.assertEqual(result.norad_cat_id, 5)
        self.assertEqual(response.errors, [])
        for actual, expected in zip(actual_position, expected_position):
            self.assertAlmostEqual(actual, expected, places=4)

        for actual, expected in zip(actual_velocity, expected_velocity):
            self.assertAlmostEqual(actual, expected, places=4)

    def test_prediction_time_requires_timezone(self):
        request = PropagationRequest(
            prediction_time=datetime(2000, 6, 27, 18, 50, 19),
            satellites=[
                SatellitePropagationInput(
                    norad_cat_id=5,
                    tle_line1=TLE_LINE_1,
                    tle_line2=TLE_LINE_2,
                ),
            ],
        )

        with self.assertRaises(HTTPException) as context:
            propagate_satellites(request)

        self.assertEqual(context.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
