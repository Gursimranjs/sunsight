# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P3: the table has 35,064 rows and interpolated rows match fresh SPICE values.

Pass marks: Sun and Earth directions from a surface site within 0.001 deg (BUILD_PLAN P3); station
directions within 0.001 deg; the Moon's elevation at each station within 0.01 deg (the station pass mark in
the validation plan) while it is 0-20 deg high, where the contact rule decides. Elevation has a cusp at the
station's zenith, so a cubic cannot follow it there (measured up to 0.69 deg above 70 deg; see DECISIONS). Plus physics sanity numbers from docs/REFERENCE.md and PROJECT_PLAN Quality checks.
"""

from __future__ import annotations

import json
import math
import random

import numpy as np
import pytest

from sunsight import ephemeris as E
from sunsight import kernels as K
from sunsight import light as L
from sunsight.contracts import EPHEMERIS_COLUMNS, EPHEMERIS_ROWS

pytestmark = pytest.mark.skipif(
    not (K.all_present() and E.BIN_PATH.exists()), reason="needs kernels and the table; run make ephemeris"
)


@pytest.fixture(scope="module")
def table():
    K.load()
    t = np.frombuffer(E.BIN_PATH.read_bytes(), dtype="<f4").reshape(-1, len(EPHEMERIS_COLUMNS))
    return t.astype(np.float64)


def angle_deg(a, b) -> float:
    a, b = np.asarray(a), np.asarray(b)
    return math.degrees(math.atan2(float(np.linalg.norm(np.cross(a, b))), float(np.dot(a, b))))


def test_shape_and_meta(table):
    assert table.shape == (EPHEMERIS_ROWS, 18) == (35_064, 18)
    meta = json.loads(E.META_PATH.read_text())
    assert meta["row_count"] == 35_064 and meta["frame"] == "MOON_ME" and meta["correction"] == "LT+S"


def test_interpolation_matches_spice_at_100_random_times(table):
    rnd = random.Random(42)
    ets = E.row_ets()
    sites = [
        L.site_vector(-89.45, -137.31, 1800.0),
        L.site_vector(-84.79, 29.2, 5000.0),
        L.site_vector(0.67, 23.47, 0.0),
    ]
    worst = {"sun": 0.0, "earth": 0.0, "station": 0.0, "moon_el": 0.0}
    for _ in range(100):
        t_s = rnd.uniform(0.0, (EPHEMERIS_ROWS - 1) * 3600.0)
        got = np.array(L.interp(table, t_s))
        ref = E.compute_row(ets[0] + t_s)
        for s in sites:
            s = np.array(s)
            worst["sun"] = max(worst["sun"], angle_deg(got[0:3] - s, ref[0:3] - s))
            worst["earth"] = max(worst["earth"], angle_deg(got[3:6] - s, ref[3:6] - s))
            for k in range(3):
                c = 6 + 3 * k
                worst["station"] = max(worst["station"], angle_deg(got[c : c + 3] - s, ref[c : c + 3] - s))
        for k in range(15, 18):
            if 0.0 <= ref[k] <= 20.0:  # the band where the station rule (10 deg, adjustable to 20) decides
                worst["moon_el"] = max(worst["moon_el"], abs(float(got[k] - ref[k])))
    print("worst interpolation errors (deg):", worst)
    assert worst["sun"] <= 0.001
    assert worst["earth"] <= 0.001
    assert worst["station"] <= 0.001
    assert worst["moon_el"] <= 0.01


def _pole_series(table, col0: int, radius_km: float):
    site = np.array(L.site_vector(-90.0, 0.0, 0.0))
    d = table[:, col0 : col0 + 3] - site
    dist = np.linalg.norm(d, axis=1)
    el = np.degrees(np.arcsin(-d[:, 2] / dist))  # up at the south pole is -z
    r = np.degrees(np.arcsin(radius_km / dist))
    return el, r


def test_pole_sun_and_earth_sanity(table):
    sun_el, sun_r = _pole_series(table, 0, 695_700.0)
    earth_el, earth_r = _pole_series(table, 3, 6_371.0)
    # Sun centre within about +-1.6 deg of the level horizon at the pole (axis tilt 1.54 deg)
    assert np.max(np.abs(sun_el)) < 1.6
    # Apparent widths. The plan quotes Sun 0.52-0.54 deg and Earth 1.8-2.0 (or 1.80-2.05) deg, rounded.
    # Derived bounds: Sun 2*asin(695700/d), d = Earth's perihelion/aphelion 147.098e6/152.100e6 km -/+ the Moon's
    # apogee 0.4067e6 km -> 0.5226..0.5436 deg;
    # Earth 2*asin(6371/d), d within the conservative lunar-distance envelope 356000..407000 km -> 1.7937..2.0510 deg.
    assert 0.5226 <= 2 * sun_r.min() and 2 * sun_r.max() <= 0.5436
    assert 1.7937 <= 2 * earth_r.min() and 2 * earth_r.max() <= 2.0510
    # Earth swings roughly +-6.7 deg (libration in latitude), measured against the level horizon at the pole.
    assert 6.0 < earth_el.max() < 7.5 and -7.5 < earth_el.min() < -6.0
    # Site parallax: from the pole Earth sits lower than seen from the Moon's centre by asin(R cos(el)/d).
    # With d in 356000..407000 km and |el| < 7.5 deg the shift lies in 0.242..0.280 deg for every row.
    # (The plan's "average near -0.26 deg" assumes a zero mean sub-Earth latitude, true over 18.6 years but
    # not for 2027-2030, where SPICE gives -0.163 deg; see DECISIONS #25.)
    centre = np.degrees(np.arcsin(-table[:, 5] / np.linalg.norm(table[:, 3:6], axis=1)))
    shift = centre - earth_el
    assert shift.min() >= 0.242 and shift.max() <= 0.280
