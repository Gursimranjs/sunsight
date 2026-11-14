# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Extra parity answers from the Python reference (pipeline/sunsight/light.py) for the web unit tests.

Lane B may not edit tests/vectors/, so these lane-B checks live in web/tests/unit/fixtures/py_reference.json.
They cover what the shared vectors leave out: the 'go' and 'marginal' verdict branches, windows on the
committed fixture table with the smooth horizon (Anywhere mode) and a region mask, 'earth' contact mode,
and the miss-test shares on the fixture grid. Everything here is computed from made-up fixture data and is
flagged so.

Run from the repository root with the pipeline's environment:
    pipeline/.venv/bin/python web/scripts/py_reference.py
"""

from __future__ import annotations

import json
import sys
from dataclasses import replace
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))

import numpy as np  # noqa: E402

from sunsight import light as L  # noqa: E402
from sunsight.export import decode_masks  # noqa: E402

DATA = ROOT / "web" / "public" / "data"
OUT = ROOT / "web" / "tests" / "unit" / "fixtures" / "py_reference.json"


def load(rel: str):
    return json.loads((DATA / rel).read_text())


def main() -> None:
    man = load("fixture_manifest.json")
    meta = load(man["files"]["ephemeris"]["meta"])
    table = (
        np.frombuffer((DATA / man["files"]["ephemeris"]["bin"]).read_bytes(), dtype="<f4")
        .reshape(meta["row_count"], 18)
        .astype(np.float64)
    )

    # Verdict branches from synthetic metrics.
    base = {
        "longest_dark_s": 0.0,
        "longest_gap_s": 0.0,
        "min_sun_fraction": 1.0,
        "contact_share": 1.0,
        "grazing_share": 0.0,
    }
    verdict_cases = []
    for preset, over in [
        ("robotic", {}),
        ("robotic", {"longest_dark_s": 6300.0}),  # 1.75 h: thin margin, exact tie when formatted
        ("robotic", {"longest_dark_s": 8100.0}),  # 2.25 h: no-go, exact tie when formatted
        ("robotic", {"longest_gap_s": 40000.0}),
        ("robotic", {"grazing_share": 0.8}),
        ("crew", {"min_sun_fraction": 0.625}),
        ("crew", {"min_sun_fraction": 0.125}),
        ("crew", {"longest_dark_s": 900.0}),
        ("long", {"longest_dark_s": 90 * 3600.0, "longest_gap_s": 20 * 3600.0, "grazing_share": 0.6}),
    ]:
        m = dict(base, **over)
        verdict_cases.append({"preset": preset, "metrics": m, "expected": L.verdict(m, L.PRESETS[preset])})

    windows = []
    for name, lat, lon, h, start_d, days, preset in [
        ("equator smooth", 0.67, 23.47, 0.0, 3.0, 14.0, "robotic"),
        ("polar smooth", -89.5, 45.0, 0.0, 10.0, 6.5, "crew"),
    ]:
        rules = L.PRESETS[preset]
        mask = L.flat_mask(L.smooth_horizon_deg(rules.observer_height_m))
        m = L.window_metrics(table, lat, lon, h, mask, start_d * 86400.0, (start_d + days) * 86400.0, rules)
        windows.append(
            {
                "name": name,
                "mask": {"smooth_m": rules.observer_height_m},
                "preset": preset,
                "lat_deg": lat,
                "lon_deg": lon,
                "h_m": h,
                "start_s": start_d * 86400.0,
                "end_s": (start_d + days) * 86400.0,
                "metrics": m,
                "verdict": L.verdict(m, rules),
            }
        )

    reg = man["files"]["regions"][0]
    rmeta = load(reg["meta"])
    rm = decode_masks(
        (DATA / reg["masks"]).read_bytes(),
        len(rmeta["points"]),
        len(rmeta["observer_heights_m"]),
        rmeta["bin_count"],
    )
    p = rmeta["points"][4]
    rules = L.PRESETS["robotic"]
    m = L.window_metrics(
        table, p["lat_deg"], p["lon_deg"], p["height_m"], list(rm[4, 0]), 86400.0 * 5, 86400.0 * 19, rules
    )
    windows.append(
        {
            "name": "region point p4",
            "mask": {"region": reg["id"], "point": 4, "height_index": 0},
            "preset": "robotic",
            "lat_deg": p["lat_deg"],
            "lon_deg": p["lon_deg"],
            "h_m": p["height_m"],
            "start_s": 86400.0 * 5,
            "end_s": 86400.0 * 19,
            "metrics": m,
            "verdict": L.verdict(m, rules),
        }
    )

    rules_e = replace(L.PRESETS["robotic"], contact_mode="earth")
    m = L.window_metrics(table, -89.5, 45.0, 0.0, L.flat_mask(-0.5), 0.0, 14 * 86400.0, rules_e)
    windows.append(
        {
            "name": "earth contact mode",
            "mask": {"flat": -0.5},
            "preset": "robotic",
            "rules_over": {"contact_mode": "earth"},
            "lat_deg": -89.5,
            "lon_deg": 45.0,
            "h_m": 0.0,
            "start_s": 0.0,
            "end_s": 14 * 86400.0,
            "metrics": m,
            "verdict": L.verdict(m, rules_e),
        }
    )

    # Miss-test grid: verdict at every point, then shares at 100, 250 and 500 m.
    miss = man["files"]["miss"][0]
    mmeta = load(miss["meta"])
    pts = mmeta["points"]
    mm = decode_masks(
        (DATA / miss["masks"]).read_bytes(), len(pts), len(mmeta["observer_heights_m"]), mmeta["bin_count"]
    )
    miss_cases = []
    short = {"stay_s": 3 * 86400.0, "max_gap_s": 1e9}  # a 3-day stay that ignores contact: mixed pass/fail
    for preset, hi, start_d, over in [
        ("robotic", 0, 2.0, {}),
        ("crew", 1, 4.0, {}),
        ("robotic", 0, 6.0, short),
        ("robotic", 0, 36.0, short),
        ("robotic", 1, 45.0, {**short, "observer_height_m": 10.0}),
    ]:
        rules = replace(L.PRESETS[preset], **over)
        start_s = start_d * 86400.0
        end_s = start_s + rules.stay_s
        verdicts = []
        for i, q in enumerate(pts):
            mt = L.window_metrics(
                table, q["lat_deg"], q["lon_deg"], q["height_m"], list(mm[i, hi]), start_s, end_s, rules
            )
            verdicts.append(L.verdict(mt, rules)["verdict"])
        ok = [v != "no-go" for v in verdicts]
        east = [q["east_m"] for q in pts]
        north = [q["north_m"] for q in pts]
        miss_cases.append(
            {
                "preset": preset,
                "rules_over": over,
                "height_index": hi,
                "start_s": start_s,
                "end_s": end_s,
                "verdicts": verdicts,
                "shares": {str(r): L.miss_share(ok, east, north, float(r)) for r in (100, 250, 500)},
            }
        )

    out = {
        "fixture": True,
        "note": "Answers from pipeline/sunsight/light.py on MADE-UP fixture data, for web parity tests only.",
        "tolerance": 1e-6,
        "verdict": verdict_cases,
        "windows": windows,
        "miss": {"id": miss["id"], "cases": miss_cases},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out) + "\n")
    print(f"Wrote {OUT}")
    for c in miss_cases:
        counts = {v: c["verdicts"].count(v) for v in set(c["verdicts"])}
        print(c["preset"], c["start_s"] / 86400, c["shares"], counts)
    for w in windows:
        print(w["name"], w["verdict"])


if __name__ == "__main__":
    main()
