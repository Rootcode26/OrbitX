from datetime import datetime, timezone

from fastapi.testclient import TestClient

from pythonbackend.main import app
from pythonbackend.services.conjunction_screening import (
    ConjunctionScreeningService,
)


ISS_TLE = (
    "1 25544U 98067A   26235.72586232  .00009235  00000+0  17193-3 0  9995",
    "2 25544  51.6333 325.8142 0007700  76.3746 283.8100 15.49592931582224",
)

NOAA15_TLE = (
    "1 25338U 98030A   26235.98161312  .00000090  00000+0  54101-4 0  9993",
    "2 25338  98.5066 254.7809 0010954 143.4018 216.7913 14.27163643470964",
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

    satellites = [
        {
            "norad_id": "25544",
            "name": "ISS (ZARYA)",
            "tle_line1": ISS_TLE[0],
            "tle_line2": ISS_TLE[1],
        },
        {
            "norad_id": "25338",
            "name": "NOAA 15",
            "tle_line1": NOAA15_TLE[0],
            "tle_line2": NOAA15_TLE[1],
        },
    ]

    results = service.screen(
        satellites=satellites,
        start_time=start_time,
        duration_minutes=10,
        step_seconds=60,
    )

    assert len(results) == 1

    result = results[0]

    assert result["satellite_a"] == "ISS (ZARYA)"
    assert result["satellite_b"] == "NOAA 15"

    assert result["satellite_a_id"] == "25544"
    assert result["satellite_b_id"] == "25338"

    assert result["minimum_distance_km"] > 0

    assert (
        result["time_of_closest_approach"]
        >= start_time
    )

    assert result["risk_level"] in {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }


def test_conjunction_screening_api():
    client = TestClient(app)

    payload = {
        "satellites": [
            {
                "norad_id": "25544",
                "name": "ISS (ZARYA)",
                "tle_line1": ISS_TLE[0],
                "tle_line2": ISS_TLE[1],
            },
            {
                "norad_id": "25338",
                "name": "NOAA 15",
                "tle_line1": NOAA15_TLE[0],
                "tle_line2": NOAA15_TLE[1],
            },
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


def test_conjunction_screening_api_invalid_tle():
    client = TestClient(app)

    payload = {
        "satellites": [
            {
                "norad_id": "25544",
                "name": "ISS (ZARYA)",
                "tle_line1": "invalid line 1",
                "tle_line2": "invalid line 2",
            },
            {
                "norad_id": "25338",
                "name": "NOAA 15",
                "tle_line1": NOAA15_TLE[0],
                "tle_line2": NOAA15_TLE[1],
            },
        ],
        "start_time": "2026-08-24T14:00:00Z",
        "duration_minutes": 10,
        "step_seconds": 60,
    }

    response = client.post(
        "/api/conjunctions/screen",
        json=payload,
    )

    assert response.status_code in {
        400,
        422,
    }


def test_conjunction_screening_api_requires_two_satellites():
    client = TestClient(app)

    payload = {
        "satellites": [
            {
                "norad_id": "25544",
                "name": "ISS (ZARYA)",
                "tle_line1": ISS_TLE[0],
                "tle_line2": ISS_TLE[1],
            }
        ],
        "start_time": "2026-08-24T14:00:00Z",
        "duration_minutes": 10,
        "step_seconds": 60,
    }

    response = client.post(
        "/api/conjunctions/screen",
        json=payload,
    )

    assert response.status_code == 422


def test_conjunction_screening_api_invalid_duration():
    client = TestClient(app)

    payload = {
        "satellites": [
            {
                "norad_id": "25544",
                "name": "ISS (ZARYA)",
                "tle_line1": ISS_TLE[0],
                "tle_line2": ISS_TLE[1],
            },
            {
                "norad_id": "25338",
                "name": "NOAA 15",
                "tle_line1": NOAA15_TLE[0],
                "tle_line2": NOAA15_TLE[1],
            },
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
        "satellites": [
            {
                "norad_id": "25544",
                "name": "ISS (ZARYA)",
                "tle_line1": ISS_TLE[0],
                "tle_line2": ISS_TLE[1],
            },
            {
                "norad_id": "25338",
                "name": "NOAA 15",
                "tle_line1": NOAA15_TLE[0],
                "tle_line2": NOAA15_TLE[1],
            },
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