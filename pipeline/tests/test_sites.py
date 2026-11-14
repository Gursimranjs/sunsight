# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""sites.json: every site cited; polar heights agree with a published elevation (height-reference check)."""

from __future__ import annotations

import json

import pytest

from sunsight.contracts import DATA_OUT

PATH = DATA_OUT / "sites.json"
pytestmark = pytest.mark.skipif(not PATH.exists(), reason="run python -m sunsight.sites")


def test_every_site_has_a_source_and_valid_coordinates():
    sites = json.loads(PATH.read_text())["sites"]
    assert len(sites) >= 20
    for s in sites:
        assert s["source_url"].startswith("https://"), s["id"]
        assert -90 <= s["lat_deg"] <= 90 and -180 <= s["lon_deg"] <= 180
        assert s.get("fixture") is not True


def test_odysseus_height_matches_nasa():
    """NASA: Odysseus rests at 2,579 m elevation (nasa.gov LRO article). Our 20 m LOLA height at the same
    coordinates must agree to within 30 m, which confirms the 1737.4 km height reference (DECISIONS #27)."""
    s = {x["id"]: x for x in json.loads(PATH.read_text())["sites"]}["im1_odysseus_actual"]
    assert s["height_m"] == pytest.approx(2579.0, abs=30.0)
