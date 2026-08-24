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