# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P6: horizon engine on synthetic terrain. Expected values use closed-form 3D geometry written here,
independent of horizon.py:

    For a terrain point at height H and great-circle ground distance s from an observer standing h above
    a sphere of radius R (here R = 1737.4 km, everything in km), with theta = s / R:
        elevation = atan2((R+H) cos(theta) - (R+h),  (R+H) sin(theta))
    The smooth-Moon horizon is the tangent elevation -acos(R / (R+h)).
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from sunsight import horizon as Hz
from sunsight import light as L

R_KM = 1737.4
R_M = R_KM * 1000.0


def closed_form_el_deg(h_obs_m: float, H_m: float, s_km: float) -> float:
    th = s_km / R_KM
    a = (R_KM + H_m / 1000.0) * math.cos(th) - (R_KM + h_obs_m / 1000.0)
    b = (R_KM + H_m / 1000.0) * math.sin(th)
    return math.degrees(math.atan2(a, b))


def make_grid(cx_m: float, cy_m: float, half_m: float, p_m: float, f) -> Hz.Grid:
    n = int(round(2 * half_m / p_m))
    xs = cx_m - half_m + p_m * (np.arange(n) + 0.5)
    ys = cy_m + half_m - p_m * (np.arange(n) + 0.5)
    x, y = np.meshgrid(xs, ys)
    return Hz.Grid(z_m=np.ascontiguousarray(f(x, y), dtype=np.float64), x0_m=xs[0], y0_m=ys[0], pixel_m=p_m)


def ground_dist_km(x, y, lat0_deg, lon0_deg):
    """Great-circle distance (km) from (lat0, lon0) to map points, via the inverse projection."""
    rho = np.hypot(x, y)
    lat = 2 * np.arctan(rho / (2 * R_M)) - np.pi / 2
    lon = np.arctan2(x, y)
    la0, lo0 = math.radians(lat0_deg), math.radians(lon0_deg)
    c = np.sin(la0) * np.sin(lat) + np.cos(la0) * np.cos(lat) * np.cos(lon - lo0)
    return R_KM * np.arccos(np.clip(c, -1, 1))


def xy_of(lat, lon):
    rho = 2 * R_M * math.tan(math.pi / 4 + math.radians(lat) / 2)
    return rho * math.sin(math.radians(lon)), rho * math.cos(math.radians(lon))


def flat(x, y):
    return np.zeros_like(x)


@pytest.mark.parametrize("lat,lon", [(-90.0, 0.0), (-85.0, 30.0)])
def test_smooth_moon_dip(lat, lon):
    cx, cy = xy_of(lat, lon)
    near = make_grid(cx, cy, 7_000, 20.0, flat)
    ring = Hz.Ring(make_grid(cx, cy, 22_000, 20.0, flat), 5.0, 20.0)
    mask, g = Hz.compute_masks(np.array([lat]), np.array([lon]), near, [ring])
    assert g[0] == pytest.approx(0.0, abs=1e-9)
    for hh, h_m, plan_deg in ((0, 2.0, 0.087), (1, 10.0, 0.194)):
        want = -math.degrees(math.acos(R_KM / (R_KM + h_m / 1000.0)))
        assert round(-want, 3) == plan_deg  # BUILD_PLAN P6: 0.087 deg at 2 m and 0.194 deg at 10 m
        assert np.max(np.abs(mask[0, hh] - want)) < 0.001, (h_m, mask[0, hh].min(), mask[0, hh].max(), want)


@pytest.mark.parametrize("s_wall_km,H_m,near", [(10.0, 500.0, False), (4.0, 40.0, True)])
def test_wall_within_0_01_deg(s_wall_km, H_m, near):
    lat, lon = -88.0, 60.0
    cx, cy = xy_of(lat, lon)

    def wall(x, y):
        s = ground_dist_km(x, y, lat, lon)
        return np.where((s >= s_wall_km) & (s <= s_wall_km + 2.0), H_m, 0.0)

    near_g = make_grid(cx, cy, 7_000, 20.0, wall)
    ring = Hz.Ring(make_grid(cx, cy, 15_000, 20.0, wall), 5.0, 20.0)
    mask, _ = Hz.compute_masks(np.array([lat]), np.array([lon]), near_g, [ring])
    for hh, h_m in ((0, 2.0), (1, 10.0)):
        want = closed_form_el_deg(h_m, H_m, s_wall_km)
        err = np.max(np.abs(mask[0, hh] - want))
        assert err < 0.01, (near, h_m, err)


def _rand_terrain(seed: int, scale_m: float):
    rnd = np.random.default_rng(seed)
    k = rnd.normal(size=(6, 4))

    def f(x, y):
        z = np.zeros_like(x)
        for a, b, c, d in k:
            z += scale_m * a * np.sin(x / (3000 + 900 * abs(b)) + c) * np.cos(y / (2500 + 700 * abs(d)) - b)
        return z

    return f


def test_rotating_terrain_by_90_deg_rotates_mask_by_90_deg():
    """Observer at the pole: rotating the terrain +90 deg in longitude moves every feature +90 deg in
    azimuth (seen from the south pole, azimuth equals longitude), so mask_rot[k] = mask[k - 360]."""
    f = _rand_terrain(3, 300.0)

    def f_rot(x, y):  # new(x', y') = old(-y', x')  <=>  terrain moved +90 deg in longitude
        return f(-y, x)

    def run(func):
        near = make_grid(0.0, 0.0, 7_000, 20.0, func)
        ring = Hz.Ring(make_grid(0.0, 0.0, 22_000, 40.0, func), 5.0, 20.0)
        return Hz.compute_masks(np.array([-90.0]), np.array([0.0]), near, [ring])[0]

    m0, m1 = run(f), run(f_rot)
    np.testing.assert_allclose(m1[0], np.roll(m0[0], 360, axis=1), atol=1e-6)
    assert np.max(np.abs(m1[0] - m0[0])) > 0.1  # the terrain is not rotationally symmetric


@pytest.mark.parametrize("offset_deg", np.linspace(-0.125, 0.125, 9))
@pytest.mark.parametrize("shift_frac", [0.0, 0.37, 0.81])
def test_far_spike_appears_at_its_direction_and_height(offset_deg, shift_frac):
    """Review note 001 test 1: a one-pixel spike 100 km away in the 240 m ring, at sub-bin azimuth offsets
    and sub-pixel grid shifts, is never under-read at its own azimuth, and distant bins keep the background."""
    lat, lon = -89.0, 0.0
    cx, cy = xy_of(lat, lon)
    p = 240.0
    # target spike position: 100 km away at azimuth 30 + offset (destination on the sphere)
    az = math.radians(30.0 + offset_deg)
    up = np.array(L.site_vector(lat, lon, 0.0)) / R_KM
    fr = L.local_frame(lat, lon)
    d = math.cos(az) * np.array(fr.north) + math.sin(az) * np.array(fr.east)
    th = 100.0 / R_KM
    v = math.cos(th) * up + math.sin(th) * d
    sx, sy = xy_of(math.degrees(math.asin(v[2])), math.degrees(math.atan2(v[1], v[0])))
    g = make_grid(cx + shift_frac * p, cy - shift_frac * p, 130_000, p, flat)
    xs = g.x0_m + p * np.arange(g.z_m.shape[1])
    ys = g.y0_m - p * np.arange(g.z_m.shape[0])
    ci, ri = int(np.argmin(np.abs(xs - sx))), int(np.argmin(np.abs(ys - sy)))
    H = 6000.0
    g.z_m[ri, ci] = H
    near = make_grid(cx, cy, 7_000, 20.0, flat)
    mid = Hz.Ring(
        make_grid(cx, cy, 22_000, 40.0, flat), 5.0, 20.0
    )  # holds the 10 m observer's tangent at 5.9 km
    mask, _ = Hz.compute_masks(np.array([lat]), np.array([lon]), near, [mid, Hz.Ring(g, 60.0, 300.0)])
    # expected from the spike pixel's actual centre
    px, py = xs[ci], ys[ri]
    s_km = float(ground_dist_km(np.array(px), np.array(py), lat, lon))
    q = np.array(L.site_vector(*_ll(px, py), 0.0)) / R_KM
    spike_az, _, _ = L.az_el(q * 1e6, up * 0.0, fr)
    for hh, h_m in ((0, 2.0), (1, 10.0)):
        want = closed_form_el_deg(h_m, H, s_km)
        got = L.horizon_at(list(mask[0, hh]), spike_az)
        assert got >= want - 0.001, (hh, got, want)
        assert got <= want + 1e-6
        bg = -math.degrees(math.acos(R_KM / (R_KM + h_m / 1000.0)))
        far = [k for k in range(1440) if abs(L.wrap180(k * 0.25 - spike_az)) > 0.5 + 0.2]
        assert np.max(np.abs(mask[0, hh, far] - bg)) < 0.001


def _ll(x, y):
    rho = math.hypot(x, y)
    return math.degrees(2 * math.atan(rho / (2 * R_M)) - math.pi / 2), math.degrees(math.atan2(x, y))


def test_far_field_never_under_reads_brute_force():
    """Review note 001 test 2: random far terrain; true horizon at 0.01 deg steps (max over pixels whose
    extent covers the azimuth) vs the linear read-back of the mask."""
    lat, lon = -88.5, -40.0
    cx, cy = xy_of(lat, lon)
    rnd = np.random.default_rng(7)
    g = make_grid(cx, cy, 70_000, 240.0, flat)
    g.z_m[:] = rnd.normal(0, 1, g.z_m.shape) ** 3 * 400.0  # spiky terrain
    near = make_grid(cx, cy, 7_000, 20.0, flat)
    mask, _ = Hz.compute_masks(np.array([lat]), np.array([lon]), near, [Hz.Ring(g, 60.0, 70.0)])
    pts, half = Hz.pixel_points(g)
    obs = np.array(L.site_vector(lat, lon, 2.0))
    fr = L.local_frame(lat, lon)
    d = pts - obs
    dist = np.linalg.norm(d, axis=1)
    keep = (dist >= 60.0) & (dist <= 70.0)
    d, dist, half = d[keep], dist[keep], half[keep]
    e, n, u = d @ np.array(fr.east), d @ np.array(fr.north), d @ np.array(fr.up)
    el = np.degrees(np.arcsin(u / dist))
    az = np.degrees(np.arctan2(e, n)) % 360
    hw = np.degrees(half / np.hypot(e, n))
    order = np.argsort(-el)
    a_grid = np.arange(0, 360, 0.01)
    true = np.full(a_grid.size, -90.0)
    for j in order[:4000]:  # the highest pixels decide the horizon
        lo = np.searchsorted(a_grid, (az[j] - hw[j]) % 360)
        hi = np.searchsorted(a_grid, (az[j] + hw[j]) % 360, side="right")
        idx = np.r_[lo:hi] if lo <= hi else np.r_[lo : a_grid.size, 0:hi]
        true[idx] = np.maximum(true[idx], el[j])
    m = list(mask[0, 0])
    read = np.array([L.horizon_at(m, a) for a in a_grid])
    assert np.all(read >= true - 0.001), float(np.min(read - true))


def test_ten_metre_observer_never_sees_higher_terrain():
    lat, lon = -87.0, 100.0
    cx, cy = xy_of(lat, lon)
    f = _rand_terrain(11, 500.0)
    near = make_grid(cx, cy, 7_000, 20.0, f)
    ring = Hz.Ring(make_grid(cx, cy, 22_000, 40.0, f), 5.0, 20.0)
    mask, _ = Hz.compute_masks(np.array([lat, lat + 0.01]), np.array([lon, lon]), near, [ring])
    assert np.all(mask[:, 1, :] <= mask[:, 0, :] + 1e-9)


def test_grid_kernel_equals_flat_kernel():
    """The bounded grid kernel used by compute_masks gives exactly the flat all-pixel kernel's result."""
    lat, lon = -88.2, 140.0
    cx, cy = xy_of(lat, lon)
    f = _rand_terrain(5, 800.0)
    g = make_grid(cx, cy, 40_000, 240.0, f)
    g.z_m[5:9, 3:30] = np.nan
    lats, lons = np.array([lat, lat + 0.02, lat - 0.03]), np.array([lon, lon + 1.0, lon - 2.0])
    up, east, north = Hz.observer_frames(lats, lons)
    r_obs = np.stack([np.full(3, R_KM + 0.5), np.full(3, R_KM + 0.508)], axis=1)
    m_flat = np.full((3, 2, 1440), Hz.NEG)
    pts, half = Hz.pixel_points(g)
    Hz._far_field(m_flat, up, east, north, r_obs, pts, half, 5.0, 30.0)
    m_grid = np.full((3, 2, 1440), Hz.NEG)
    obs_xy = np.array([Hz._unit_to_xy(*up[i], g.sphere_r_m) for i in range(3)])
    gp, gh = Hz.pixel_grid_points(g)
    Hz._far_field_grid(m_grid, up, east, north, r_obs, obs_xy, gp, gh, g.x0_m, g.y0_m, g.pixel_m, 5.0, 30.0)
    np.testing.assert_array_equal(m_flat, m_grid)
