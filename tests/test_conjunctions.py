from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from pythonbackend.main import app
from pythonbackend.services.conjunction_detector import (
    ConjunctionDetector,
)
from pythonbackend.services.local_tle_provider import (
    LocalTLEProvider,
)
from pythonbackend.services.propagator import (
    SGP4PropagationError,
    SGP4Result,
    propagate_tle,
)
from pythonbackend.services.risk_calculator import RiskCalculator
from pythonbackend.services.tle_service import TLEService


ISS_TLE = (
    "1 25544U 98067A   26235.72586232  .00009235  00000+0  17193-3 0  9995",
    "2 25544  51.6333 325.8142 0007700  76.3746 283.8100 15.49592931582224",
)

NOAA15_TLE = (
    "1 25338U 98030A   26235.98161312  .00000090  00000+0  54101-4 0  9993",
    "2 25338  98.5066 254.7809 0010954 143.4018 216.7913 14.27163643470964",
)


def test_propagate_tle_returns_sgp4_result():
    timestamp = datetime(
        2026,
        8,
        24,
        14,
        0,
        0,
        tzinfo=timezone.utc,
    )

    result = propagate_tle(
        ISS_TLE[0],
        ISS_TLE[1],
        timestamp,
    )

    assert isinstance(result, SGP4Result)
    assert result.prediction_time_utc == timestamp

    assert len(result.position_km) == 3
    assert len(result.velocity_km_s) == 3

    for coordinate in result.position_km:
        assert isinstance(coordinate, float)

    for velocity in result.velocity_km_s:
        assert isinstance(velocity, float)


def test_propagate_tle_requires_timezone():
    timestamp = datetime(
        2026,
        8,
        24,
        14,
        0,
        0,
    )

    try:
        propagate_tle(
            ISS_TLE[0],
            ISS_TLE[1],
            timestamp,
        )
        assert False, "Expected ValueError"
    except ValueError as exc:
        assert "timezone" in str(exc)


def test_propagate_tle_invalid_tle():
    timestamp = datetime(
        2026,
        8,
        24,
        14,
        0,
        0,
        tzinfo=timezone.utc,
    )

    try:
        propagate_tle(
            "invalid line 1",
            "invalid line 2",
            timestamp,
        )
        assert False, "Expected SGP4PropagationError"
    except SGP4PropagationError as exc:
        assert str(exc) == "nm is less than zero"


def test_distance_calculation():
    detector = ConjunctionDetector()

    position_a = (0.0, 0.0, 0.0)
    position_b = (3.0, 4.0, 0.0)

    distance = detector.calculate_distance(
        position_a,
        position_b,
    )

    assert distance == 5.0


def test_find_closest_approach():
    detector = ConjunctionDetector()

    start_time = datetime(
        2026,
        8,
        24,
        14,
        0,
        0,
        tzinfo=timezone.utc,
    )

    minimum_distance, closest_time = (
        detector.find_closest_approach(
            tle_a=ISS_TLE,
            tle_b=NOAA15_TLE,
            start_time=start_time,
            duration_minutes=120,
            step_seconds=60,
        )
    )

    end_time = start_time + timedelta(
        minutes=120
    )

    assert minimum_distance > 0
    assert start_time <= closest_time <= end_time


def test_risk_calculator():
    calculator = RiskCalculator()

    assert calculator.calculate_risk(
        0.5,
        10.0,
    ) == "CRITICAL"

    assert calculator.calculate_risk(
        3.0,
        10.0,
    ) == "HIGH"

    assert calculator.calculate_risk(
        7.0,
        10.0,
    ) == "MEDIUM"

    assert calculator.calculate_risk(
        20.0,
        10.0,
    ) == "LOW"

    # Negligible relative velocity
    assert calculator.calculate_risk(
        0.5,
        0.0,
    ) == "LOW"

    probability = calculator.calculate_collision_probability(1.0)

    assert 0.0 <= probability <= 1.0
    assert round(probability, 4) == 0.6065

    assert calculator.calculate_collision_probability(0.0) == 1.0

    assert (
        calculator.calculate_collision_probability(100.0)
        < 0.000001
    )


def test_conjunction_api():
    client = TestClient(app)

    payload = {
        "satellite_a": {
            "norad_id": "25544",
            "name": "ISS (ZARYA)",
            "tle_line1": ISS_TLE[0],
            "tle_line2": ISS_TLE[1],
        },
        "satellite_b": {
            "norad_id": "25338",
            "name": "NOAA 15",
            "tle_line1": NOAA15_TLE[0],
            "tle_line2": NOAA15_TLE[1],
        },
        "start_time": "2026-08-24T14:00:00Z",
        "duration_minutes": 120,
        "step_seconds": 60,
    }

    response = client.post(
        "/api/conjunctions/check",
        json=payload,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["satellite_a"] == "ISS (ZARYA)"
    assert data["satellite_b"] == "NOAA 15"

    assert data["miss_distance_km"] > 0
    assert "closest_approach_time" in data
    assert "relative_speed_km_s" in data
    assert "collision_probability" in data
    assert "risk_status" in data

    assert data["risk_status"] in {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }


def test_local_provider_loads_iss_tle():
    provider = LocalTLEProvider(
        tle_directory="tests/fixtures",
        catalog_path="data/satellites.json",
    )

    name, line1, line2 = provider.load_from_file(
        "tests/fixtures/iss.tle"
    )

    assert name == "ISS (ZARYA)"
    assert line1.startswith("1 25544")
    assert line2.startswith("2 25544")


def test_local_provider_loads_noaa15_tle():
    provider = LocalTLEProvider(
        tle_directory="tests/fixtures",
        catalog_path="data/satellites.json",
    )

    name, line1, line2 = provider.load_from_file(
        "tests/fixtures/noaa15.tle"
    )

    assert name == "NOAA 15"
    assert line1.startswith("1 25338")
    assert line2.startswith("2 25338")


def test_get_tle_by_satellite_id():
    service = TLEService()

    name, line1, line2 = service.get_tle("25544")

    assert name == "ISS (ZARYA)"
    assert line1.startswith("1 25544")
    assert line2.startswith("2 25544")


def test_get_noaa15_tle_by_satellite_id():
    service = TLEService()

    name, line1, line2 = service.get_tle("25338")

    assert name == "NOAA 15"
    assert line1.startswith("1 25338")
    assert line2.startswith("2 25338")


def test_unknown_satellite_id():
    service = TLEService()

    try:
        service.get_tle("99999")
        assert False, "Expected ValueError"
    except ValueError as exc:
        assert str(exc) == (
            "TLE not found for satellite ID: 99999"
        )


def test_find_closest_approach_invalid_duration():
    detector = ConjunctionDetector()

    start_time = datetime(
        2026,
        8,
        24,
        14,
        0,
        0,
        tzinfo=timezone.utc,
    )

    try:
        detector.find_closest_approach(
            tle_a=ISS_TLE,
            tle_b=NOAA15_TLE,
            start_time=start_time,
            duration_minutes=0,
            step_seconds=60,
        )
        assert False, "Expected ValueError"
    except ValueError as exc:
        assert str(exc) == (
            "duration_minutes must be greater than 0"
        )


def test_find_closest_approach_invalid_step():
    detector = ConjunctionDetector()

    start_time = datetime(
        2026,
        8,
        24,
        14,
        0,
        0,
        tzinfo=timezone.utc,
    )

    try:
        detector.find_closest_approach(
            tle_a=ISS_TLE,
            tle_b=NOAA15_TLE,
            start_time=start_time,
            duration_minutes=120,
            step_seconds=0,
        )
        assert False, "Expected ValueError"
    except ValueError as exc:
        assert str(exc) == (
            "step_seconds must be greater than 0"
        )


def test_conjunction_api_invalid_tle():
    client = TestClient(app)

    payload = {
        "satellite_a": {
            "norad_id": "25544",
            "name": "ISS (ZARYA)",
            "tle_line1": "invalid line 1",
            "tle_line2": "invalid line 2",
        },
        "satellite_b": {
            "norad_id": "25338",
            "name": "NOAA 15",
            "tle_line1": NOAA15_TLE[0],
            "tle_line2": NOAA15_TLE[1],
        },
        "start_time": "2026-08-24T14:00:00Z",
        "duration_minutes": 120,
        "step_seconds": 60,
    }

    response = client.post(
        "/api/conjunctions/check",
        json=payload,
    )

    assert response.status_code in {
        400,
        422,
    }