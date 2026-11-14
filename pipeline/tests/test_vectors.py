# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P8: the committed shared vectors are reproduced by the reference engine and cover the required cases."""

from __future__ import annotations

import json

import numpy as np
import pytest

from sunsight import light as L
from sunsight.vectors import OUT

V = json.loads(OUT.read_text())
TOL = V["tolerance"]


def _mask(ref):
    if ref == "rugged":
        return V["masks"]["rugged"]
    if ref == "flat0":
        return L.flat_mask(0.0)
    return ref


def test_required_cases_present():
    names = {c["name"] for c in V["sun_fraction"]}
    assert {"full sun", "half sun on flat horizon", "total eclipse", "partial eclipse"} <= names
    grades = {c["expected"] for c in V["station_contact"]}
    assert grades == {"clear", "grazing", "blocked"}
    by = {c["name"]: c["expected"] for c in V["sun_fraction"]}
    assert (
        by["full sun"] == pytest.approx(1.0)
        and by["half sun on flat horizon"] == pytest.approx(0.5)
        and by["total eclipse"] == 0.0
    )


def test_sun_fraction_vectors():
    for c in V["sun_fraction"]:
        assert L.sun_fraction(_mask(c["mask"]), *c["args"]) == pytest.approx(c["expected"], abs=TOL), c[
            "name"
        ]


def test_window_vectors():
    table = np.array(V["table"]["rows"], dtype=np.float32).astype(np.float64)
    for w in V["window"]:
        rules = L.PRESETS[w["preset"]]
        m = L.window_metrics(
            table, w["lat_deg"], w["lon_deg"], w["h_m"], V["masks"]["rugged"], w["start_s"], w["end_s"], rules
        )
        for k, v in w["metrics"].items():
            if isinstance(v, float):
                assert m[k] == pytest.approx(v, abs=TOL), k
            else:
                assert m[k] == v, k
        assert L.verdict(m, rules) == w["verdict"]
