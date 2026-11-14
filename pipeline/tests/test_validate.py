# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P17: every check shows a number, a pass mark and a status; any miss is explained in words; data files exist."""

from __future__ import annotations

import json

import pytest

from sunsight.contracts import DATA_OUT

PATH = DATA_OUT / "validation" / "summary.json"
pytestmark = pytest.mark.skipif(not PATH.exists(), reason="run make validate")
IDS = [
    "ephemeris_horizons",
    "sunlight_pgda",
    "earth_pgda",
    "glaser_ridge",
    "eclipses",
    "station_geometry",
    "physics_sanity",
    "known_places",
]


def test_eight_checks_with_number_mark_status_and_words():
    s = json.loads(PATH.read_text())
    assert [c["id"] for c in s["checks"]] == IDS
    for c in s["checks"]:
        assert c["status"] in {"pass", "fail", "partial"}, c["id"]
        assert isinstance(c["value"], (int, float)), c["id"]
        assert c["pass_mark"] and c["title"] and c["what"], c["id"]
        assert len(c["explanation"]) > 20, c["id"]
        if c.get("data"):
            assert (DATA_OUT / c["data"]).exists(), c["data"]
    assert s["limits"]


def test_sensitivity_budget_present():
    s = json.loads(PATH.read_text())
    rows = s["sensitivity"]["rows"]
    assert rows[0]["delta_points"] == 0.0 and len(rows) >= 6
