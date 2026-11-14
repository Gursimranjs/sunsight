# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P5: terrain access. Projection against pyproj, map stretch against the closed form, 3D distance and
bearing against spherical formulas, named craters on the right features, and a 1 km window in < 5 s."""

from __future__ import annotations

import json
import math
import time

import numpy as np
import pytest

from sunsight import dem as D
from sunsight import light as L
from sunsight.contracts import REPO_ROOT

R = 1_737_400.0
GAZ = json.loads((REPO_ROOT / "pipeline" / "data" / "gazetteer_south.json").read_text())["features"]
HAVE_80 = (D.TERRAIN_DIR / D.MAPS[80]).exists()
HAVE_240 = (D.TERRAIN_DIR / D.MAPS[240]).exists()


def test_projection_matches_pyproj():
    from pyproj import Transformer

    tr = Transformer.from_crs(
        "+proj=longlat +R=1737400 +no_defs",
        "+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +R=1737400 +units=m",
        always_xy=True,
    )
    rnd = np.random.default_rng(1)
    for _ in range(200):
        lat, lon = rnd.uniform(-90, -60), rnd.uniform(-180, 180)
        x, y = D.ll_to_xy(lat, lon, R)
        xr, yr = tr.transform(lon, lat)
        assert x == pytest.approx(xr, abs=1e-6) and y == pytest.approx(yr, abs=1e-6)
        lat2, lon2 = D.xy_to_ll(x, y, R)
        assert lat2 == pytest.approx(lat, abs=1e-10) and L.wrap180(lon2 - lon) == pytest.approx(0, abs=1e-8)


@pytest.mark.parametrize("lat,stretch_pct,digits", [(-80.0, 0.8, 1), (-75.0, 1.7, 1), (-60.0, 7.0, 0)])
def test_map_stretch_key_numbers(lat, stretch_pct, digits):
    """REFERENCE.md key numbers, at the precision they are quoted: 0.8% at 80S, 1.7% at 75S, 7% at 60S.
    Closed form k = 2 / (1 + sin|lat|) gives 0.766%, 1.734%, 7.180%."""
    assert round(100 * (D.scale_factor(lat) - 1), digits) == stretch_pct
    # and the projection really stretches by k: a short east-west step on the map vs on the sphere
    x, y = D.ll_to_xy(lat, 30.0, R)
    x2, y2 = D.ll_to_xy(lat, 30.001, R)
    true_m = R * math.cos(math.radians(lat)) * math.radians(0.001)
    assert math.hypot(x2 - x, y2 - y) / true_m == pytest.approx(D.scale_factor(lat), rel=1e-6)


def test_distance_and_bearing_in_3d_match_spherical_formulas():
    """Two points given as map positions: chord -> great-circle distance and local azimuth must match
    the haversine distance and the spherical initial bearing; the map-grid distance must not."""
    a_ll, b_ll = (-72.0, 29.2), (-71.0, 10.0)  # near 72S the map stretch is about 2.6%
    ax, ay = D.ll_to_xy(*a_ll, R)
    bx, by = D.ll_to_xy(*b_ll, R)
    va = np.array(D.xy_to_vec_km(ax, ay, 0.0, R))
    vb = np.array(D.xy_to_vec_km(bx, by, 0.0, R))
    gc_3d_km = 1737.4 * 2 * math.asin(np.linalg.norm(vb - va) / (2 * 1737.4))
    p1, p2 = math.radians(a_ll[0]), math.radians(b_ll[0])
    dl = math.radians(b_ll[1] - a_ll[1])
    hav_km = (
        2
        * 1737.4
        * math.asin(
            math.sqrt(math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2)
        )
    )
    assert gc_3d_km == pytest.approx(hav_km, rel=1e-9)
    bearing = (
        math.degrees(
            math.atan2(
                math.sin(dl) * math.cos(p2),
                math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl),
            )
        )
        % 360
    )
    az, _, _ = L.az_el(vb, va, L.local_frame(*a_ll))
    assert L.wrap180(az - bearing) == pytest.approx(0.0, abs=1e-9)
    grid_km = math.hypot(bx - ax, by - ay) / 1000
    assert abs(grid_km / hav_km - 1) > 0.02  # the grid distance is stretched; never use it


@pytest.mark.skipif(not HAVE_240, reason="240 m map not downloaded")
def test_file_metadata_as_expected():
    for px in (80, 240):
        info = D.dem_info(D.source_for(px))
        assert info.pixel_m == px and info.sphere_r_m == R and info.nodata_is_nan


@pytest.mark.skipif(not HAVE_240, reason="240 m map not downloaded")
def test_named_craters_land_on_depressions():
    """Orientation test: every IAU crater (D >= 15 km) south of 82S sits in a bowl in our map: its centre is
    lower than the median height on a ring at 0.75 D/2. A mirrored grid (lon -> -lon) must fail clearly.
    Thresholds were set after a first run (true: min depth 280 m, median ~1.1 km over 23 craters; mirrored:
    10 of 23 are domes); see STATUS.md log for P5."""
    info = D.dem_info(D.source_for(240))

    def depth(lat, lon, d_km):
        r_m = 0.75 * d_km * 500.0
        x, y = D.ll_to_xy(lat, lon, R)
        w = D.read_window(info, x - r_m - 1000, x + r_m + 1000, y - r_m - 1000, y + r_m + 1000)
        h0 = D.bilinear(w.z_m, w.x0_m, w.y0_m, info.pixel_m, x, y)
        ring = [
            D.bilinear(w.z_m, w.x0_m, w.y0_m, info.pixel_m, x + r_m * math.cos(t), y + r_m * math.sin(t))
            for t in np.linspace(0, 2 * math.pi, 72, endpoint=False)
        ]
        return float(np.nanmedian(ring) - h0)

    craters = [f for f in GAZ if f["type"].startswith("Crater") and f["diameter_km"] >= 15]
    assert len(craters) >= 10
    true_d = [depth(f["lat_deg"], f["lon_deg"], f["diameter_km"]) for f in craters]
    mirr_d = [depth(f["lat_deg"], -f["lon_deg"], f["diameter_km"]) for f in craters]
    assert min(true_d) > 0.0, list(zip([f["name"] for f in craters], true_d, strict=True))
    assert np.median(true_d) > 1000.0
    assert sum(d < 0 for d in mirr_d) >= 5 and np.median(mirr_d) < 0.5 * np.median(true_d)


@pytest.mark.skipif(not HAVE_80, reason="80 m map not downloaded")
def test_shackleton_deep_bowl_in_80m_map():
    sh = next(f for f in GAZ if f["name"] == "Shackleton")
    info = D.dem_info(D.source_for(80))
    x, y = D.ll_to_xy(sh["lat_deg"], sh["lon_deg"], R)
    w = D.read_window(info, x - 15000, x + 15000, y - 15000, y + 15000)
    h0 = D.bilinear(w.z_m, w.x0_m, w.y0_m, 80.0, x, y)
    rim = max(
        D.bilinear(w.z_m, w.x0_m, w.y0_m, 80.0, x + 10500 * math.cos(t), y + 10500 * math.sin(t))
        for t in np.linspace(0, 6.28, 90)
    )
    assert rim - h0 > 3000.0  # Shackleton is about 4 km deep


@pytest.mark.network
def test_one_km_window_over_http_under_5_s():
    info = D.dem_info("/vsicurl/" + D.PGDA_BASE + D.MAPS[20])
    x, y = D.ll_to_xy(-84.79, 29.2, R)
    t0 = time.time()
    w = D.read_window(info, x - 500, x + 500, y - 500, y + 500, cache=False)
    dt = time.time() - t0
    print(f"1 km window from the 20 m map over HTTP: {dt:.2f} s, shape {w.z_m.shape}")
    assert w.z_m.shape[0] >= 50 and np.isfinite(w.z_m).all()
    assert dt < 5.0
