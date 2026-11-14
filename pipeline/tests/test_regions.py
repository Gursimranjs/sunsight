# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P7: hero region masks. Built in under 10 minutes; Shackleton's floor is about 0% lit; the Shackleton end of
the connecting ridge ranks among the best-lit points. Sunlight here is the share of hourly samples in
2027-2030 with at least half the Sun's disc visible (BUILD_PLAN default rule)."""

from __future__ import annotations

import json
import math

import numpy as np
import pytest

from sunsight import ephemeris as E
from sunsight import light as L
from sunsight import lightfast as F
from sunsight.contracts import BIN_COUNT, DATA_OUT, REPO_ROOT
from sunsight.export import decode_masks

META = DATA_OUT / "regions" / "shackleton.json"
MASKS = DATA_OUT / "regions" / "shackleton.masks.bin"
pytestmark = pytest.mark.skipif(
    not (META.exists() and E.BIN_PATH.exists()), reason="run make masks REGION=shackleton"
)
SITES = {
    s["id"]: s
    for s in json.loads((REPO_ROOT / "pipeline" / "data" / "curated_sites.json").read_text())["sites"]
}


@pytest.fixture(scope="module")
def region():
    meta = json.loads(META.read_text())
    n = len(meta["points"])
    masks = decode_masks(MASKS.read_bytes(), n, 2, BIN_COUNT)
    table = np.frombuffer(E.BIN_PATH.read_bytes(), dtype="<f4").reshape(-1, 18).astype(np.float64)
    lat = np.array([p["lat_deg"] for p in meta["points"]])
    lon = np.array([p["lon_deg"] for p in meta["points"]])
    hgt = np.array([p["height_m"] for p in meta["points"]])
    shares = []
    for hh, h_m in enumerate(meta["observer_heights_m"]):
        sites = np.array([L.site_vector(a, b, c + h_m) for a, b, c in zip(lat, lon, hgt, strict=True)])
        frames = [L.local_frame(a, b) for a, b in zip(lat, lon, strict=True)]
        sf, _ = F.series(
            np.ascontiguousarray(masks[:, hh, :]),
            sites,
            np.array([f.east for f in frames]),
            np.array([f.north for f in frames]),
            np.array([f.up for f in frames]),
            np.ascontiguousarray(table[:, 0:3]),
            np.ascontiguousarray(table[:, 3:6]),
        )
        shares.append((sf >= 0.5).mean(axis=1))
    return meta, masks, lat, lon, np.array(shares)


def nearest(lat, lon, la0, lo0):
    c = np.sin(np.radians(la0)) * np.sin(np.radians(lat)) + np.cos(np.radians(la0)) * np.cos(
        np.radians(lat)
    ) * np.cos(np.radians(lon - lo0))
    k = int(np.argmax(c))
    return k, 1737.4 * math.acos(min(1.0, c[k]))


def test_contract_and_timing(region):
    meta, masks, *_ = region
    assert meta["bin_count"] == 1440 and meta["observer_heights_m"] == [2.0, 10.0]
    assert MASKS.stat().st_size == len(meta["points"]) * 2 * 1440 * 2
    assert np.all(np.isfinite(masks)) and masks.min() > -10 and masks.max() <= 32.767  # contract clamp
    assert np.all(masks[:, 1] <= masks[:, 0] + 0.0011)  # 10 m never sees higher terrain (int16 rounding)
    assert meta["timing_s"]["read"] + meta["timing_s"]["masks"] < 600.0


def test_shackleton_floor_is_dark(region):
    meta, _, lat, lon, shares = region
    s = SITES["shackleton_crater"]
    k, d_km = nearest(lat, lon, s["lat_deg"], s["lon_deg"])
    print(
        f"Shackleton floor: point {k} at {d_km:.2f} km from the gazetteer centre, lit {100 * shares[0, k]:.2f}% (2 m), {100 * shares[1, k]:.2f}% (10 m)"
    )
    assert d_km < 0.5
    assert shares[0, k] < 0.01 and shares[1, k] < 0.01


def test_ridge_ranks_among_the_best(region):
    meta, _, lat, lon, shares = region
    s = SITES["shackleton_ridge_rim"]
    k, d_km = nearest(lat, lon, s["lat_deg"], s["lon_deg"])
    for hh in (0, 1):
        rank_pct = 100.0 * (shares[hh] > shares[hh, k]).mean()
        print(
            f"ridge/rim point {k} ({d_km:.2f} km from LROC point): lit {100 * shares[hh, k]:.1f}%, top {rank_pct:.1f}% of {len(lat)} points, region best {100 * shares[hh].max():.1f}%"
        )
        assert d_km < 0.5
        assert rank_pct <= 10.0


ALL_REGIONS = sorted((DATA_OUT / "regions").glob("*.json")) if (DATA_OUT / "regions").exists() else []


@pytest.mark.parametrize("path", ALL_REGIONS, ids=lambda p: p.stem)
def test_every_region_contract_size_and_timing(path):
    """P16: masks for every region; each region's compressed mask file under 3 MB; built in under 10 minutes."""
    meta = json.loads(path.read_text())
    n = len(meta["points"])
    raw = (path.parent / f"{path.stem}.masks.bin").stat().st_size
    dz = (path.parent / f"{path.stem}.masks.dz").stat().st_size
    assert raw == n * 2 * BIN_COUNT * 2
    assert dz < 3_000_000, f"{path.stem}: {dz} bytes compressed"
    assert meta["timing_s"]["read"] + meta["timing_s"]["masks"] < 600.0
    assert all(math.isfinite(p["height_m"]) for p in meta["points"])
