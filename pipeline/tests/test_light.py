# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P8: reference light maths. Expected values are derived independently (closed forms), not from the code."""

from __future__ import annotations

import math

import numpy as np
import pytest

from sunsight import light as L
from sunsight.contracts import BIN_COUNT, MOON_RADIUS_KM

R_SUN = 0.2665  # typical apparent radius, degrees
R_EARTH = 0.95


def circle_overlap_area(r1: float, r2: float, d: float) -> float:
    """Area of intersection of two circles (standard lens formula), written independently of light.py."""
    if d >= r1 + r2:
        return 0.0
    if d <= abs(r1 - r2):
        return math.pi * min(r1, r2) ** 2
    a1 = r1 * r1 * math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1))
    a2 = r2 * r2 * math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2))
    a3 = 0.5 * math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2))
    return a1 + a2 - a3


FAR = (180.0, -60.0)  # Earth well away from the Sun


def test_full_sun():
    mask = L.flat_mask(-5.0)
    assert L.sun_fraction(mask, 10.0, 3.0, R_SUN, *FAR, R_EARTH) == pytest.approx(1.0, abs=1e-12)


def test_half_sun_flat_horizon_through_centre():
    mask = L.flat_mask(1.234)
    assert L.sun_fraction(mask, 77.0, 1.234, R_SUN, *FAR, R_EARTH) == pytest.approx(0.5, abs=1e-12)


def test_sun_below_horizon():
    mask = L.flat_mask(2.0)
    assert L.sun_fraction(mask, 10.0, 1.0, R_SUN, *FAR, R_EARTH) == 0.0


def test_earth_centred_on_sun_hides_it():
    mask = L.flat_mask(-5.0)
    assert L.sun_fraction(mask, 40.0, 3.0, R_SUN, 40.0, 3.0, R_EARTH) == 0.0


@pytest.mark.parametrize("offset_deg", [0.5, 0.8, 1.0, 1.15])
def test_partial_eclipse_matches_lens_area(offset_deg):
    """Earth offset vertically from the Sun; fraction = 1 - lens area / Sun area (strip rule, 1% tolerance)."""
    mask = L.flat_mask(-10.0)
    el_s = 5.0
    got = L.sun_fraction(mask, 100.0, el_s, R_SUN, 100.0, el_s + offset_deg, R_EARTH)
    want = 1.0 - circle_overlap_area(R_SUN, R_EARTH, offset_deg) / (math.pi * R_SUN**2)
    assert got == pytest.approx(want, abs=0.01)


def test_tilted_horizon_through_centre_is_half():
    """A straight terrain line through the disc centre at any tilt hides half the disc."""
    az_s, el_s = 200.0, 0.8
    slope = 0.7  # degrees of elevation per degree of azimuth
    az = np.arange(BIN_COUNT) * 360.0 / BIN_COUNT
    mask = list(el_s + slope * np.vectorize(L.wrap180)(az - az_s))
    assert L.sun_fraction(mask, az_s, el_s, R_SUN, *FAR, R_EARTH) == pytest.approx(0.5, abs=0.01)


def test_smooth_horizon_dip():
    for h_m, want_deg in ((2.0, 0.0869), (10.0, 0.1944)):
        closed_form = math.degrees(math.sqrt(2 * h_m / 1000.0 / MOON_RADIUS_KM))
        assert closed_form == pytest.approx(want_deg, abs=5e-4)
        assert -L.smooth_horizon_deg(h_m) == pytest.approx(closed_form, rel=1e-5)


def test_horizon_at_interpolates_and_wraps():
    mask = [0.0] * BIN_COUNT
    mask[BIN_COUNT - 1] = 1.0
    assert L.horizon_at(mask, 359.875) == pytest.approx(0.5)
    assert L.horizon_at(mask, -0.125) == pytest.approx(0.5)
    assert L.horizon_at(mask, 360.0) == pytest.approx(0.0)
    mask[3] = 2.0
    assert L.horizon_at(mask, 0.75) == pytest.approx(2.0)
    assert L.horizon_at(mask, 0.625) == pytest.approx(1.0)


def test_station_contact_grades():
    assert L.station_contact(5.0, 1.0, 30.0) == "clear"
    assert L.station_contact(2.5, 1.0, 30.0) == "grazing"
    assert L.station_contact(0.9, 1.0, 30.0) == "blocked"
    assert L.station_contact(5.0, 1.0, 9.99) == "blocked"
    assert L.station_contact(5.0, 1.0, 10.0) == "clear"


def test_local_frame_is_orthonormal_including_pole():
    for lat, lon in ((-90.0, 0.0), (-90.0, 123.0), (-89.5, -137.0), (0.0, 0.0), (45.0, 270.0)):
        f = L.local_frame(lat, lon)
        m = np.array([f.east, f.north, f.up])
        np.testing.assert_allclose(m @ m.T, np.eye(3), atol=1e-12)
        # right-handed: east x north = up
        np.testing.assert_allclose(np.cross(f.east, f.north), f.up, atol=1e-12)


def test_az_el_cardinal_directions():
    site = L.site_vector(0.0, 0.0, 0.0)
    f = L.local_frame(0.0, 0.0)
    far = 1e6
    az, el, _ = L.az_el((site[0], 0.0, far), site, f)  # +z is north at the equator
    assert az == pytest.approx(0.0, abs=1e-9) and el == pytest.approx(0.0, abs=1e-3)
    az, el, _ = L.az_el((site[0], far, 0.0), site, f)  # +y is east at lon 0
    assert az == pytest.approx(90.0, abs=1e-9)
    az, el, _ = L.az_el((far, 0.0, 0.0), site, f)
    assert el == pytest.approx(90.0, abs=1e-9)


def test_angular_radius_ranges():
    au_km = 149_597_870.7
    assert 2 * L.angular_radius(695_700.0, au_km) == pytest.approx(0.5330, abs=2e-4)
    assert 2 * L.angular_radius(6371.0, 384_400.0) == pytest.approx(1.899, abs=2e-3)


def test_interp_is_exact_for_cubics():
    t_h = np.arange(48, dtype=np.float64)
    table = np.stack([1 + 2 * t_h - 0.3 * t_h**2 + 0.01 * t_h**3, 5 - t_h], axis=1)
    for t_s in (0.0, 1800.0, 3600 * 7.25, 3600 * 46.5, 3600 * 47.0):
        th = t_s / 3600.0
        want = [1 + 2 * th - 0.3 * th**2 + 0.01 * th**3, 5 - th]
        assert L.interp(table, t_s) == pytest.approx(want, rel=1e-12, abs=1e-9)


def _polar_table(n_hours: int, el_fn, earth_el_deg: float = 5.0) -> np.ndarray:
    """Table seen from the south pole: the Sun at elevation el_fn(t_h) and azimuth 0 (toward +x)."""
    rows = []
    for k in range(n_hours):
        el = math.radians(el_fn(float(k)))
        sun = 1.496e8 * np.array([math.cos(el), 0.0, -math.sin(el)])
        e = math.radians(earth_el_deg)
        earth = 384_400.0 * np.array([-math.cos(e), 0.0, -math.sin(e)])
        st = earth  # stations at Earth's centre; Moon high at every station
        rows.append(np.concatenate([sun, earth, st, st, st, [45.0, 45.0, 45.0]]))
    return np.array(rows, dtype=np.float64)


def test_sunset_event_time_by_bisection():
    """Sun elevation falls 0.5 deg per hour and crosses the flat horizon at t = 10.3 h; observer at the pole."""
    t_cross_h = 10.3
    rules = L.Rules(observer_height_m=0.0, stay_s=86400.0)
    table = _polar_table(30, lambda th: -0.5 * (th - t_cross_h))
    mask = L.flat_mask(0.0)
    m = L.window_metrics(table, -90.0, 0.0, 0.0, mask, 3600.0, 3600.0 * 20, rules)
    assert m["next_sunset_s"] is not None
    assert m["next_sunset_s"] + 3600.0 == pytest.approx(t_cross_h * 3600.0, abs=60.0)
    assert m["longest_dark_s"] == pytest.approx((20 - t_cross_h) * 3600.0, abs=60.0)
    assert m["sun_el_now_deg"] == pytest.approx(0.5 * (t_cross_h - 1.0), abs=1e-3)


def test_miss_share():
    passes = [True, False, True, True]
    e = [0.0, 100.0, 200.0, 600.0]
    n = [0.0, 0.0, 0.0, 0.0]
    assert L.miss_share(passes, e, n, 250.0) == pytest.approx(2 / 3)
    assert L.miss_share(passes, e, n, 100.0) == pytest.approx(0.5)


def test_verdicts():
    base = {
        "longest_dark_s": 0.0,
        "longest_gap_s": 0.0,
        "min_sun_fraction": 1.0,
        "contact_share": 1.0,
        "grazing_share": 0.0,
    }
    crew = L.PRESETS["crew"]
    assert L.verdict(base, crew)["verdict"] == "go"
    assert L.verdict({**base, "longest_dark_s": 600.0}, crew)["verdict"] == "no-go"
    assert L.verdict({**base, "min_sun_fraction": 0.6}, crew)["verdict"] == "marginal"
    robotic = L.PRESETS["robotic"]
    assert L.verdict({**base, "longest_gap_s": 11 * 3600.0}, robotic)["verdict"] == "marginal"
    assert L.verdict({**base, "longest_gap_s": 13 * 3600.0}, robotic)["verdict"] == "no-go"
