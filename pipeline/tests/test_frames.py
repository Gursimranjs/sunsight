# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P2: frames, local frames, the pole, and agreement with SPICE's own topocentric routines.

Independent derivation of the MOON_ME vs MOON_PA offset (moon_de440_250416.tf, TKFRAME_31009):
angles 67.8526", 78.6944", 0.2785" about axes 3, 2, 1. To first order the rotation vector has
magnitude sqrt(67.8526^2 + 78.6944^2 + 0.2785^2) = 103.91" = 0.028864 deg, so the largest
displacement on a 1737.4 km sphere is 1737.4e3 * 103.91 / 206264.8 = 875.3 m. The z component
is 67.8526/103.91 = 0.653 of it, so at either pole the displacement is 875.3 * sqrt(1-0.653^2) = 663 m.
"""

from __future__ import annotations

import math

import numpy as np
import pytest

from sunsight import frames as F
from sunsight import kernels as K
from sunsight import light as L

pytestmark = pytest.mark.skipif(not K.all_present(), reason="kernels not downloaded; run make kernels")

ET = None


@pytest.fixture(scope="module", autouse=True)
def _load():
    global ET
    K.load()
    ET = F.utc_to_et("2028-06-15T12:00:00")


def test_frame_is_moon_me():
    assert F.MOON_FRAME == "MOON_ME"
    import spiceypy as sp

    assert sp.cidfrm(301)[1] == "MOON_ME"


def test_me_pa_displacement_about_875_m():
    worst = 0.0
    for lat in range(-90, 91, 5):
        for lon in range(-180, 180, 5):
            worst = max(worst, F.pa_me_displacement_m(lat, lon, 0.0, ET))
    assert worst == pytest.approx(875.3, abs=3.0)
    assert F.pa_me_displacement_m(-90.0, 0.0, 0.0, ET) == pytest.approx(663.0, abs=3.0)


def test_utc_round_trip_and_tdb_offset():
    for utc in ("2027-01-01T00:00:00.000", "2028-12-31T16:13:07.250", "2030-12-31T23:00:00.000"):
        assert F.et_to_utc(F.utc_to_et(utc)) == utc
    # ET - UTC = 32.184 s + 37 leap seconds = 69.184 s (to within the periodic TDB term, < 2 ms)
    import spiceypy as sp

    et = F.utc_to_et("2028-01-01T00:00:00")
    assert sp.deltet(et, "ET") == pytest.approx(69.184, abs=0.002)


def angle_deg(a: np.ndarray, b: np.ndarray) -> float:
    """Angle between vectors without acos round-off (atan2 of |a x b| and a.b)."""
    return math.degrees(math.atan2(float(np.linalg.norm(np.cross(a, b))), float(np.dot(a, b))))


# Second-order aberration bound for the table design (Moon-centred apparent vector minus the site vector).
# Stellar aberration rotates a line of sight by ~v/c; the site's and the centre's lines of sight to a target
# at distance d differ by up to R/d, so the residual is at most (v/c)(R/d). With v <= 30.6 km/s (Earth's
# orbital speed plus the Moon's), v/c = 1.02e-4; R/d <= 1737.4/356400 = 4.87e-3 -> 4.98e-7 rad = 2.85e-5 deg.
# For the Sun R/d ~ 1.2e-5, so that term is ~7e-8 deg.
# A surface site also moves with the Moon's rotation (omega*R = 2.6617e-6 rad/s * 1737.4 km = 4.63 m/s at the
# equator), which changes the aberration by up to 4.63e-3/299792.458 = 1.55e-8 rad = 8.8e-7 deg for any target.
# Totals: Sun 7e-8 + 8.8e-7 = 9.5e-7 deg; Earth and stations 2.85e-5 + 8.8e-7 = 2.94e-5 deg.
# Both are far below the 0.001 deg pass mark; see docs/DECISIONS.md.
ABERRATION_BOUND_DEG = {"SUN": 9.5e-7, "EARTH": 2.94e-5, "DSS-14": 2.94e-5}


@pytest.mark.parametrize("lat,lon", [(-90.0, 0.0), (-89.45, -137.31), (-84.79, 29.2), (0.67, 23.47)])
@pytest.mark.parametrize("target", ["SUN", "EARTH", "DSS-14"])
def test_site_minus_moon_matches_spkcpo(lat, lon, target):
    """Moon-centred apparent position minus the site vector vs SPICE's own apparent position from a
    constant-position observer on the Moon: within the derived second-order aberration bound."""
    site = np.array(L.site_vector(lat, lon, 1500.0))
    for utc in ("2027-03-01T00:00:00", "2028-06-15T12:00:00", "2030-11-20T06:30:00"):
        et = F.utc_to_et(utc)
        ours = F.apparent_from_moon(target, et) - site
        ref = F.apparent_from_site(target, et, site)
        assert angle_deg(ours, ref) <= ABERRATION_BOUND_DEG[target]


@pytest.mark.parametrize("lat,lon", [(-89.45, -137.31), (-84.79, 29.2), (0.67, 23.47), (26.13, 3.63)])
def test_az_el_matches_spice_azlcpo(lat, lon):
    """Our local frame and azimuth convention (clockwise from north) agree with SPICE's AZLCPO."""
    site = np.array(L.site_vector(lat, lon, 0.0))
    frame = L.local_frame(lat, lon)
    for target in ("SUN", "EARTH"):
        az, el, _ = L.az_el(F.apparent_from_site(target, ET, site) + site, site, frame)
        az_ref, el_ref = F.spice_az_el(target, ET, site)
        assert el == pytest.approx(el_ref, abs=1e-6)
        assert L.wrap180(az - az_ref) == pytest.approx(0.0, abs=1e-6)


def test_pole_is_well_defined():
    site = np.array(L.site_vector(-90.0, 0.0, 2.0))
    frame = L.local_frame(-90.0, 0.0)
    sun = F.apparent_from_moon("SUN", ET)
    az, el, _ = L.az_el(sun, site, frame)
    assert 0.0 <= az < 360.0 and abs(el) < 2.0  # the Sun hugs the horizon at the pole
    # At the south pole local north is +x (toward 0 deg longitude), local east is +y.
    np.testing.assert_allclose(frame.north, (1.0, 0.0, 0.0), atol=1e-12)
    np.testing.assert_allclose(frame.east, (0.0, 1.0, 0.0), atol=1e-12)
