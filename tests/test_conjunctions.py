from pathlib import Path

from pythonbackend.services.tle_service import TLEService

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from pythonbackend.main import app
from pythonbackend.services.conjunction_detector import (
    ConjunctionDetector,
)
from pythonbackend.services.propagator import Propagator
from pythonbackend.services.risk_calculator import RiskCalculator


# Fixed TLE fixtures for deterministic tests.
# These should not be fetched from the internet during tests.
ISS_TLE = (
    "1 25544U 98067A   26235.72586232  .00009235  00000+0  17193-3 0  9995",
    "2 25544  51.6333 325.8142 0007700  76.3746 283.8100 15.49592931582224",
)

NOAA15_TLE = (
    "1 25338U 98030A   26235.98161312  .00000090  00000+0  54101-4 0  9993",
    "2 25338  98.5066 254.7809 0010954 143.4018 216.7913 14.27163643470964",
)


def test_create_satellite_from_tle():
    propagator = Propagator()

    satellite = propagator.create_satellite(
        ISS_TLE[0],
        ISS_TLE[1],
    )

    assert satellite is not None


def test_propagate_returns_position():
    propagator = Propagator()

    satellite = propagator.create_satellite(
        ISS_TLE[0],
        ISS_TLE[1],
    )

    timestamp = datetime(
        2026,
        8,
        24,
        14,
        0,
        0,
        tzinfo=timezone.utc,
    )

    position = propagator.propagate(
        satellite,
        timestamp,
    )

    assert len(position) == 3

    for coordinate in position:
        assert isinstance(coordinate, float)


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
    propagator = Propagator()
    detector = ConjunctionDetector(propagator)

    satellite_a = propagator.create_satellite(
        ISS_TLE[0],
        ISS_TLE[1],
    )

    satellite_b = propagator.create_satellite(
        NOAA15_TLE[0],
        NOAA15_TLE[1],
    )

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
            satellite_a=satellite_a,
            satellite_b=satellite_b,
            start_time=start_time,
            duration_minutes=120,
            step_seconds=60,
        )
    )

    assert minimum_distance > 0
    assert closest_time >= start_time

    end_time = start_time.replace(
        minute=start_time.minute + 0
    )

    assert closest_time <= (
        start_time
        + __import__("datetime").timedelta(minutes=120)
    )


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
        assert str(exc) == "TLE not found for satellite ID: 99999"