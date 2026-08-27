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


# =============================================================
# Pair generation tests
# =============================================================

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


# =============================================================
# Multi-satellite screening
# =============================================================

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

    # ---------------------------------------------------------
    # Satellite A
    # ---------------------------------------------------------

    assert result["satellite_a"]["name"] == "ISS (ZARYA)"
    assert result["satellite_a"]["norad_cat_id"] == 25544

    assert "position_at_tca_km" in result["satellite_a"]
    assert "velocity_at_tca_km_s" in result["satellite_a"]

    # ---------------------------------------------------------
    # Satellite B
    # ---------------------------------------------------------

    assert result["satellite_b"]["name"] == "NOAA 15"
    assert result["satellite_b"]["norad_cat_id"] == 25338

    assert "position_at_tca_km" in result["satellite_b"]
    assert "velocity_at_tca_km_s" in result["satellite_b"]

    # ---------------------------------------------------------
    # Main conjunction values
    # ---------------------------------------------------------

    assert result["minimum_separation_km"] > 0

    assert (
        result["closest_approach_time_utc"]
        >= start_time
    )

    assert result["relative_velocity_km_s"] >= 0

    assert 0.0 <= result["collision_probability"] <= 1.0

    assert result["risk_level"] in {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

    # ---------------------------------------------------------
    # Additional response fields
    # ---------------------------------------------------------

    assert "calculated_at" in result
    assert "reference_frame" in result
    assert "screening_start_time" in result
    assert "screening_duration_minutes" in result
    assert "step_seconds" in result

    assert "current_separation_km" in result
    assert "current_closing_rate_km_s" in result
    assert "encounter_angle_degrees" in result
    assert "risk_score" in result
    assert "separation_samples" in result


# =============================================================
# Screening API
# =============================================================

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

    # ---------------------------------------------------------
    # Satellite A
    # ---------------------------------------------------------

    assert result["satellite_a"]["name"] == "ISS (ZARYA)"
    assert result["satellite_a"]["norad_cat_id"] == 25544

    assert "position_at_tca_km" in result["satellite_a"]
    assert "velocity_at_tca_km_s" in result["satellite_a"]

    # ---------------------------------------------------------
    # Satellite B
    # ---------------------------------------------------------

    assert result["satellite_b"]["name"] == "NOAA 15"
    assert result["satellite_b"]["norad_cat_id"] == 25338

    assert "position_at_tca_km" in result["satellite_b"]
    assert "velocity_at_tca_km_s" in result["satellite_b"]

    # ---------------------------------------------------------
    # Conjunction values
    # ---------------------------------------------------------

    assert result["minimum_separation_km"] > 0
    assert result["relative_velocity_km_s"] >= 0

    assert 0.0 <= result["collision_probability"] <= 1.0

    assert result["risk_level"] in {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

    # ---------------------------------------------------------
    # Additional fields
    # ---------------------------------------------------------

    assert "calculated_at" in result
    assert "reference_frame" in result
    assert "screening_start_time" in result
    assert "screening_duration_minutes" in result
    assert "step_seconds" in result

    assert "current_separation_km" in result
    assert "current_closing_rate_km_s" in result
    assert "closest_approach_time_utc" in result
    assert "minimum_separation_km" in result
    assert "relative_velocity_km_s" in result
    assert "encounter_angle_degrees" in result
    assert "collision_probability" in result
    assert "risk_score" in result
    assert "separation_samples" in result


# =============================================================
# Invalid TLE
# =============================================================

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


# =============================================================
# Requires at least two satellites
# =============================================================

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


# =============================================================
# Invalid duration
# =============================================================

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


# =============================================================
# Invalid step
# =============================================================

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