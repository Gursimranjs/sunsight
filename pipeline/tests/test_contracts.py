# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P0: files under web/public/data follow the data contracts, and fixture data is always marked."""

from __future__ import annotations

import json

import numpy as np
import pytest

from sunsight.contracts import BIN_COUNT, DATA_OUT, EPHEMERIS_COLUMNS, TERRAIN_SIZE
from sunsight.export import decode_masks, encode_masks


def _manifests():
    return [p for p in (DATA_OUT / "manifest.json", DATA_OUT / "fixture_manifest.json") if p.exists()]


def test_mask_round_trip_and_clamp():
    m = np.array([[[0.0, 1.2345, -0.0004, 40.0, -50.0, 32.767]]])
    raw = encode_masks(m)
    assert len(raw) == 2 * m.size
    back = decode_masks(raw, 1, 1, 6)
    np.testing.assert_allclose(back[0, 0], [0.0, 1.234, -0.0, 32.767, -32.767, 32.767], atol=6e-4)


def test_at_least_one_manifest_exists():
    assert _manifests(), "neither manifest.json nor fixture_manifest.json exists; run make fixtures"


@pytest.mark.parametrize("manifest_path", _manifests(), ids=lambda p: p.name)
def test_manifest_outputs_exist_and_sizes_match_contracts(manifest_path):
    man = json.loads(manifest_path.read_text())
    assert man["format_version"] >= 1
    assert "Claude Code" in man["generated_with"]
    for entry in man["outputs"]:
        p = DATA_OUT / entry["path"]
        assert p.exists(), entry["path"]
        assert p.stat().st_size == entry["size_bytes"], entry["path"]

    files = man["files"]
    meta = json.loads((DATA_OUT / files["ephemeris"]["meta"]).read_text())
    assert meta["columns"] == EPHEMERIS_COLUMNS
    assert meta["frame"] == "MOON_ME" and meta["correction"] == "LT+S"
    size = (DATA_OUT / files["ephemeris"]["bin"]).stat().st_size
    assert size == meta["row_count"] * len(EPHEMERIS_COLUMNS) * 4

    for group in ("regions", "miss"):
        for item in files.get(group, []):
            m = json.loads((DATA_OUT / item["meta"]).read_text())
            assert m["bin_count"] == BIN_COUNT
            n = len(m["points"]) * len(m["observer_heights_m"]) * BIN_COUNT * 2
            assert (DATA_OUT / item["masks"]).stat().st_size == n, item["masks"]
            if group == "miss":
                assert all("east_m" in p and "north_m" in p for p in m["points"])

    for item in files.get("terrain", []):
        assert (DATA_OUT / item["bin"]).stat().st_size == TERRAIN_SIZE * TERRAIN_SIZE * 2


def test_fixture_files_are_marked():
    """Hard rule 5: fixture file names start with fixture_ and every fixture JSON says so."""
    for p in DATA_OUT.rglob("*"):
        if not p.is_file():
            continue
        if p.name.startswith("fixture_") and p.suffix == ".json":
            assert json.loads(p.read_text()).get("fixture") is True, p
        if p.suffix == ".json" and not p.name.startswith("fixture_"):
            assert json.loads(p.read_text()).get("fixture") is not True, (
                f"{p} says fixture but is not named fixture_"
            )
