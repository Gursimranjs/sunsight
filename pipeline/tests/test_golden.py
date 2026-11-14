# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P4: Sun and Earth within 0.001 deg of JPL Horizons at 3 sites x 20 times; station elevations within 0.01 deg.
Uses only committed cached answers (no network)."""

from __future__ import annotations

import pytest
import spiceypy as sp

from sunsight import ephemeris as E
from sunsight import golden as G
from sunsight import horizons_check as HC
from sunsight import kernels as K
from sunsight.contracts import EPHEMERIS_START_UTC

pytestmark = pytest.mark.skipif(
    not (E.BIN_PATH.exists() and (G.OUT / "apollo_11__sun.json").exists()),
    reason="needs the table and cached answers",
)


@pytest.fixture(scope="module")
def rows():
    return HC.compare()


def test_counts(rows):
    pos, st = rows
    assert len(pos) == 3 * 2 * 20 and len(st) == 3 * 20


def test_sun_and_earth_within_0_001_deg(rows):
    pos, _ = rows
    for tgt in ("sun", "earth"):
        r = [x for x in pos if x["target"] == tgt]
        d_el = max(abs(x["d_el_deg"]) for x in r)
        d_az = max(abs(x["d_az_on_sky_deg"]) for x in r)
        print(f"{tgt}: max |d_el| {d_el:.2e} deg, max |d_az * cos el| {d_az:.2e} deg")
        assert d_el <= 0.001 and d_az <= 0.001


@pytest.mark.skipif(not K.all_present(), reason="needs kernels")
def test_station_geometry_within_0_01_deg_at_every_time(rows):
    """The station geometry (SPICE at the exact request time, as stored in the table's rows) vs Horizons."""
    _, st = rows
    K.load()
    et0 = sp.str2et(EPHEMERIS_START_UTC)
    names = ["goldstone", "madrid", "canberra"]
    d = [
        abs(
            E.compute_row(et0 + HC.t_since_start_s(x["jd_ut"]))[15 + names.index(x["station"])]
            - x["el_horizons_deg"]
        )
        for x in st
    ]
    print(f"stations, SPICE at the request time: max |d_el| {max(d):.2e} deg over {len(d)} times")
    assert max(d) <= 0.01


def test_interpolated_station_elevation_within_0_01_deg_where_the_rule_decides(rows):
    """The app interpolates the hourly column. It is trusted only while the Moon is 0-20 deg up at the
    station (DECISIONS #24); above that the zenith cusp breaks cubic interpolation (reported, not tested)."""
    _, st = rows
    band = [abs(x["d_el_deg"]) for x in st if 0.0 <= x["el_horizons_deg"] <= 20.0]
    out = [abs(x["d_el_deg"]) for x in st if not 0.0 <= x["el_horizons_deg"] <= 20.0]
    print(
        f"interpolated, 0-20 deg: max {max(band):.2e} deg over {len(band)}; outside the band: max {max(out):.2e} deg over {len(out)}"
    )
    assert len(band) >= 10 and max(band) <= 0.01
