# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P14: miss-test grids. About 320 points per target (50 m to 500 m); one target in under 20 minutes; each
point sits at its stated east/north offset (checked in 3D against the spherical distance and bearing)."""

from __future__ import annotations

import json
import math

import numpy as np
import pytest

from sunsight import light as L
from sunsight import missgrid as M
from sunsight.contracts import BIN_COUNT, DATA_OUT
from sunsight.export import decode_masks

GRIDS = sorted(p for p in (DATA_OUT / "miss").glob("*.json")) if (DATA_OUT / "miss").exists() else []


def test_offsets_count_and_radius():
    o = M.offsets(50.0, 500.0)
    assert len(o) == 317  # lattice points with i^2 + j^2 <= 100 (Gauss circle count N(10) = 317)
    assert (0.0, 0.0) in o and max(math.hypot(e, n) for e, n in o) == pytest.approx(500.0)


def test_destination_distance_and_bearing_in_3d():
    lat0, lon0 = -84.78, 29.13
    p0 = np.array(L.site_vector(lat0, lon0, 0.0))
    fr = L.local_frame(lat0, lon0)
    for e, n in ((0.0, 500.0), (350.0, -350.0), (-500.0, 0.0), (50.0, 0.0)):
        la, lo = M.destination(lat0, lon0, e, n)
        p = np.array(L.site_vector(la, lo, 0.0))
        chord = np.linalg.norm(p - p0) * 1000.0
        arc_m = 2 * 1_737_400.0 * math.asin(chord / 2 / 1_737_400.0)
        assert arc_m == pytest.approx(math.hypot(e, n), rel=1e-9)
        az, _, _ = L.az_el(p, p0, fr)
        assert L.wrap180(az - math.degrees(math.atan2(e, n))) == pytest.approx(0.0, abs=1e-6)


@pytest.mark.parametrize("path", GRIDS, ids=lambda p: p.stem)
def test_grid_contract_and_timing(path):
    meta = json.loads(path.read_text())
    n = len(meta["points"])
    assert 300 <= n <= 340
    assert meta["spacing_m"] == 50.0 and meta["radius_m"] == 500.0
    raw = (DATA_OUT / "miss" / f"{path.stem}.masks.bin").read_bytes()
    assert len(raw) == n * 2 * BIN_COUNT * 2
    masks = decode_masks(raw, n, 2, BIN_COUNT)
    assert np.all(np.isfinite(masks)) and masks.max() <= 32.767
    assert np.all(masks[:, 1] <= masks[:, 0] + 0.0011)
    assert meta["timing_s"]["read"] + meta["timing_s"]["masks"] < 20 * 60
    centre = [p for p in meta["points"] if p["east_m"] == 0.0 and p["north_m"] == 0.0]
    assert len(centre) == 1
    assert centre[0]["lat_deg"] == pytest.approx(meta["target"]["lat_deg"], abs=1e-9)
