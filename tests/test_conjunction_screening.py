from datetime import datetime, timezone

from pythonbackend.services.conjunction_screening import (
    ConjunctionScreeningService,
)


def test_generate_pairs():
    service = ConjunctionScreeningService()

    pairs = service.generate_pairs(
        ["25544", "25338", "12345"]
    )

    assert pairs == [
        ("25544", "25338"),
        ("25544", "12345"),
        ("25338", "12345"),
    ]


def test_generate_pairs_with_two_satellites():
    service = ConjunctionScreeningService()

    pairs = service.generate_pairs(
        ["25544", "25338"]
    )

    assert pairs == [
        ("25544", "25338"),
    ]


def test_generate_pairs_with_one_satellite():
    service = ConjunctionScreeningService()

    pairs = service.generate_pairs(
        ["25544"]
    )

    assert pairs == []


def test_generate_pairs_with_no_satellites():
    service = ConjunctionScreeningService()

    pairs = service.generate_pairs([])

    assert pairs == []


def test_screen_multiple_satellites():
    service = ConjunctionScreeningService()

    start_time = datetime(
        2026,
        8,
        24,
        14,
        0,
        0,
        tzinfo=timezone.utc,
    )

    results = service.screen(
        satellite_ids=[
            "25544",
            "25338",
        ],
        start_time=start_time,
        duration_minutes=10,
        step_seconds=60,
    )

    assert len(results) == 1

    result = results[0]

    assert result["satellite_a"] == "ISS (ZARYA)"
    assert result["satellite_b"] == "NOAA 15"

    assert result["minimum_distance_km"] > 0

    assert result["time_of_closest_approach"] >= start_time

    assert result["risk_level"] in {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

from fastapi.testclient import TestClient

from pythonbackend.main import app


def test_conjunction_screening_api():
    client = TestClient(app)

    payload = {
        "satellite_ids": [
            "25544",
            "25338",
        ],
        "start_time": "2026-08-24T14:00:00Z",
        "duration_minutes": 10,
        "step_seconds": 60,
    }

    response = client.post(
        "/api/conjunctions/screen",
        json=payload,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["total_pairs_checked"] == 1

    assert len(data["results"]) == 1

    result = data["results"][0]

    assert result["satellite_a"] == "ISS (ZARYA)"
    assert result["satellite_b"] == "NOAA 15"

    assert result["satellite_a_id"] == "25544"
    assert result["satellite_b_id"] == "25338"

    assert result["minimum_distance_km"] > 0

    assert "time_of_closest_approach" in result

    assert result["risk_level"] in {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

def test_conjunction_screening_api_requires_two_satellites():
    client = TestClient(app)

    payload = {
        "satellite_ids": ["25544"],
        "start_time": "2026-08-24T14:00:00Z",
        "duration_minutes": 10,
        "step_seconds": 60,
    }

    response = client.post(
        "/api/conjunctions/screen",
        json=payload,
    )

    assert response.status_code == 422


def test_conjunction_screening_api_unknown_satellite():
    client = TestClient(app)

    payload = {
        "satellite_ids": [
            "25544",
            "99999",
        ],
        "start_time": "2026-08-24T14:00:00Z",
        "duration_minutes": 10,
        "step_seconds": 60,
    }

    response = client.post(
        "/api/conjunctions/screen",
        json=payload,
    )

    assert response.status_code == 400
    assert "TLE not found" in response.json()["detail"]


def test_conjunction_screening_api_invalid_duration():
    client = TestClient(app)

    payload = {
        "satellite_ids": [
            "25544",
            "25338",
        ],
        "start_time": "2026-08-24T14:00:00Z",
        "duration_minutes": 0,
        "step_seconds": 60,
    }

    response = client.post(
        "/api/conjunctions/screen",
        json=payload,
    )

    assert response.status_code == 422


def test_conjunction_screening_api_invalid_step():
    client = TestClient(app)

    payload = {
        "satellite_ids": [
            "25544",
            "25338",
        ],
        "start_time": "2026-08-24T14:00:00Z",
        "duration_minutes": 10,
        "step_seconds": 0,
    }

    response = client.post(
        "/api/conjunctions/screen",
        json=payload,
    )

    assert response.status_code == 422