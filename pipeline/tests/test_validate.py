# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P17: every check shows a number, a pass mark and a status; any miss is explained in words; data files exist."""

from __future__ import annotations

import json

import pytest

from sunsight import validate as V
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
    "real_missions",  # review note 004: no pass mark, status "reported"
]


def test_eight_checks_with_number_mark_status_and_words():
    s = json.loads(PATH.read_text())
    assert [c["id"] for c in s["checks"]] == IDS
    for c in s["checks"]:
        allowed = {"reported"} if c["id"] == "real_missions" else {"pass", "fail", "partial"}
        assert c["status"] in allowed, c["id"]
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


def test_csv_times_keep_full_precision():
    """Validation CSVs must let anyone reproduce a comparison: Julian dates keep at least 9 decimals."""
    import csv

    rows = list(csv.DictReader((DATA_OUT / "validation" / "station_geometry.csv").open()))
    assert all(len(r["jd_ut"].split(".")[1]) >= 9 for r in rows)


def test_manifest_lists_the_pgda_reference_maps():
    man = json.loads((DATA_OUT / "manifest.json").read_text())
    names = {i["name"] for i in man["inputs"]}
    assert {
        "AVGVISIB_85S_060M_201608.TIF",
        "AVGVISIB_85S_060M_201608_EARTH.TIF",
        "LPSR_85S_060M_201608.TIF",
    } <= names


def test_glaser_horizon_limit_sentence_note_006():
    sens = {"rows": [{"change": V.HORIZON_LIMIT_ROW, "lit_pct": 90.0, "delta_points": 3.678}]}
    c = {"id": "glaser_ridge", "explanation": "Base text."}
    once = V.annotate_glaser(c, sens)
    assert once["explanation"].startswith(
        "Base text. The horizon search distance used in the 2014 study is not stated"
    )
    assert "raise our figure by 3.7 points" in once["explanation"]
    assert V.annotate_glaser(once, sens) == once  # idempotent
    assert V.annotate_glaser(c, None)["explanation"] == "Base text."


def test_real_missions_data_is_cited_note_004():
    from sunsight import missions_check as M

    data = json.loads(M.MISSIONS.read_text())
    sites = {s["id"] for s in json.loads((DATA_OUT / "sites.json").read_text())["sites"]}
    assert len(data["missions"]) == 4
    for ms in data["missions"]:
        assert ms["site_id"] in sites
        assert ms["landing_source"].startswith("https://") and ms["landing_quote"]
        for ev in ms["events"]:
            assert ev["source"].startswith("https://"), ev
            assert ev["quote"] and ev["reported"], ev


def test_real_missions_check_in_summary_note_004():
    s = json.loads(PATH.read_text())
    c = next(c for c in s["checks"] if c["id"] == "real_missions")
    assert c["status"] == "reported"
    assert "None set" in c["pass_mark"]
    rows = (DATA_OUT / c["data"]).read_text().splitlines()
    assert len(rows) == c["rows"] + 1
    text = (DATA_OUT / c["data"]).read_text()
    assert (
        "half the disc" in text.lower() and "last of the disc" in text.lower()
    )  # review note 007, caution 1
    assert "not a fair test" in text  # review note 007, caution 2 (Odysseus, smooth horizon near the pole)
