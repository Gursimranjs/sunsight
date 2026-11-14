# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""The Numba light kernels equal the reference light.py to 1e-12."""

from __future__ import annotations

import json
import random

import numpy as np
import pytest

from sunsight import light as L
from sunsight import lightfast as F
from sunsight.vectors import OUT


def test_sun_fraction_equals_reference_on_shared_vectors():
    v = json.loads(OUT.read_text())
    for c in v["sun_fraction"]:
        m = v["masks"]["rugged"] if c["mask"] == "rugged" else L.flat_mask(0.0)
        assert F.sun_fraction(np.array(m), *c["args"]) == pytest.approx(
            L.sun_fraction(m, *c["args"]), abs=1e-12
        )
    for c in v["disc_fraction"]:
        m = v["masks"]["rugged"]
        assert F.disc_fraction(np.array(m), *c["args"]) == pytest.approx(
            L.disc_fraction(m, *c["args"]), abs=1e-12
        )


def test_series_equals_reference_per_sample():
    v = json.loads(OUT.read_text())
    table = np.array(v["table"]["rows"], dtype=np.float32).astype(np.float64)
    mask = np.array(v["masks"]["rugged"])
    rnd = random.Random(3)
    lat, lon, h = -86.0, 10.0, 1600.0
    site = np.array(L.site_vector(lat, lon, h))
    fr = L.local_frame(lat, lon)
    sf, ef = F.series(
        mask[None, :],
        site[None, :],
        np.array([fr.east]),
        np.array([fr.north]),
        np.array([fr.up]),
        np.ascontiguousarray(table[:, 0:3]),
        np.ascontiguousarray(table[:, 3:6]),
    )
    for t in rnd.sample(range(table.shape[0]), 40):
        s = L.sample_at(table, t * 3600.0, site, fr, list(mask), L.Rules())
        assert sf[0, t] == pytest.approx(s.sun_frac, abs=1e-9)
        assert ef[0, t] == pytest.approx(s.earth_frac, abs=1e-9)
