from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from pythonbackend.main import app
from pythonbackend.services.conjunction_detector import (
    ConjunctionDetector,
)
from pythonbackend.services.propagator import (
    SGP4Result,
    SGP4PropagationError,
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

    assert calculator.calculate_risk(0.5) == "CRITICAL"
    assert calculator.calculate_risk(3.0) == "HIGH"
    assert calculator.calculate_risk(7.0) == "MEDIUM"
    assert calculator.calculate_risk(20.0) == "LOW"


def test_conjunction_api():
    client = TestClient(app)

    payload = {
        "satellite_a": "25544",
        "satellite_b": "25338",
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

    assert data["minimum_distance_km"] > 0

    assert "time_of_closest_approach" in data

    assert data["risk_level"] in {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }


def test_load_iss_tle():
    service = TLEService()

    fixture_path = (
        Path(__file__).parent
        / "fixtures"
        / "iss.tle"
    )

    name, line1, line2 = service.load_from_file(
        str(fixture_path)
    )

    assert name == "ISS (ZARYA)"
    assert line1.startswith("1 ")
    assert line2.startswith("2 ")


def test_load_noaa15_tle():
    service = TLEService()

    fixture_path = (
        Path(__file__).parent
        / "fixtures"
        / "noaa15.tle"
    )

    name, line1, line2 = service.load_from_file(
        str(fixture_path)
    )

    assert name == "NOAA 15"
    assert line1.startswith("1 ")
    assert line2.startswith("2 ")


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


def test_conjunction_api_unknown_satellite():
    client = TestClient(app)

    payload = {
        "satellite_a": "99999",
        "satellite_b": "25338",
        "start_time": "2026-08-24T14:00:00Z",
        "duration_minutes": 120,
        "step_seconds": 60,
    }

    response = client.post(
        "/api/conjunctions/check",
        json=payload,
    )

    assert response.status_code == 400
    assert "TLE not found" in response.json()["detail"]