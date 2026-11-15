# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Find the site's default scenario from computed data (review note 003 B), not by hand.

Among the three miss-grid targets and every daily start 2027-2030 (UTC midnight), find a stay where the
target point passes the preset's rules and the share of passing ground within 250 m is well below 90%.

1. Screen: hourly lit / contact booleans for every grid point (sun fraction from lightfast.series, station
   contact from the table's station columns and each point's mask), longest dark spell and contact gap per
   daily window, pass = both within the limits. Hourly steps are coarse; this only ranks candidates.
2. Verify: the best candidates are recomputed exactly with light.window_metrics and light.verdict (the
   reference the browser engine matches to 1e-6) for the target and every point within 250 m, in order of
   rising screened share. Per target, the first candidate whose exact target verdict is "go" (a clear pass,
   not "marginal") and whose exact 250 m share is in (0, 0.9) is kept; across targets the lowest share wins,
   ties to the earliest date. The robotic preset is searched first; if it has no such case, crew, then long.

Run: `uv run python -m sunsight.default_scenario` (about a minute). Writes docs/submission/default_scenario.json.
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import UTC, datetime, timedelta

import numpy as np
from numba import njit

from . import light as L
from . import validate as V
from .contracts import BIN_COUNT, DATA_OUT, REPO_ROOT
from .export import decode_masks, write_json

OUT = REPO_ROOT / "docs" / "submission" / "default_scenario.json"
TARGETS = ("shackleton_ridge_rim", "a3_malapert_massif", "im2_athena_target")
RADIUS_M = 250.0
MAX_SHARE = 0.9
EPOCH = datetime(2027, 1, 1, tzinfo=UTC)
STEP_S = 3600.0


@njit(cache=True)
def _longest_false_runs_h(ok: np.ndarray, starts_h: np.ndarray, length_h: int) -> np.ndarray:
    """For each (point, start), the longest run of False samples in ok[point, start : start + length + 1]."""
    n_p = ok.shape[0]
    out = np.zeros((n_p, starts_h.shape[0]), dtype=np.int32)
    for i in range(n_p):
        for j in range(starts_h.shape[0]):
            s = starts_h[j]
            run = 0
            best = 0
            for t in range(s, s + length_h + 1):
                if ok[i, t]:
                    run = 0
                else:
                    run += 1
                    if run > best:
                        best = run
            out[i, j] = best
    return out


def _contact_hourly(table: np.ndarray, masks: np.ndarray, pts: list[dict], h_m: float, rules: L.Rules):
    """Station contact (any station not blocked) per point per hourly row, as in light.sample_at."""
    n_t = table.shape[0]
    out = np.zeros((len(pts), n_t), dtype=np.bool_)
    for i, p in enumerate(pts):
        site = np.array(L.site_vector(p["lat_deg"], p["lon_deg"], p["height_m"] + h_m))
        fr = L.local_frame(p["lat_deg"], p["lon_deg"])
        e, n, u = (np.array(v) for v in (fr.east, fr.north, fr.up))
        mask = masks[i]
        for k in range(3):
            d = table[:, 6 + 3 * k : 9 + 3 * k] - site
            dist = np.linalg.norm(d, axis=1)
            el = np.degrees(np.arcsin(np.clip(d @ u / dist, -1.0, 1.0)))
            az = np.degrees(np.arctan2(d @ e, d @ n)) % 360.0
            x = az * BIN_COUNT / 360.0
            k0 = np.floor(x).astype(np.int64)
            f = x - k0
            k0 %= BIN_COUNT
            terrain = (1.0 - f) * mask[k0] + f * mask[(k0 + 1) % BIN_COUNT]
            out[i] |= (el > terrain) & (table[:, 15 + k] >= rules.min_moon_el_deg)
    return out


def screen(table: np.ndarray, target: str, rules: L.Rules) -> dict:
    meta = json.loads((DATA_OUT / "miss" / f"{target}.json").read_text())
    pts = meta["points"]
    n = len(pts)
    hh = list(meta["observer_heights_m"]).index(rules.observer_height_m)
    masks = np.ascontiguousarray(
        decode_masks((DATA_OUT / "miss" / f"{target}.masks.bin").read_bytes(), n, 2, BIN_COUNT)[:, hh, :]
    )
    lat = np.array([q["lat_deg"] for q in pts])
    lon = np.array([q["lon_deg"] for q in pts])
    hgt = np.array([q["height_m"] for q in pts])
    sf, _ = V.series_for(masks, lat, lon, hgt, rules.observer_height_m, table[:, 0:3], table[:, 3:6])
    lit = sf >= rules.lit_threshold
    con = _contact_hourly(table, masks, pts, rules.observer_height_m, rules)
    if rules.contact_mode != "stations":
        raise ValueError("screen supports station contact only")
    length_h = int(rules.stay_s // STEP_S)
    starts_h = np.arange(0, table.shape[0] - 2 - length_h, 24, dtype=np.int64)
    dark_h = _longest_false_runs_h(lit, starts_h, length_h)
    gap_h = _longest_false_runs_h(con, starts_h, length_h)
    # A run of k false hourly samples spans between (k-1) and (k+1) hours; screen with k hours.
    ok = (dark_h * STEP_S <= rules.max_dark_s) & (gap_h * STEP_S <= rules.max_gap_s)
    r = np.array([math.hypot(q["east_m"], q["north_m"]) for q in pts])
    c = int(np.argmin(r))
    inside = r <= RADIUS_M + 1e-9
    return {
        "meta": meta,
        "masks": masks,
        "centre": c,
        "inside": np.flatnonzero(inside),
        "starts_h": starts_h,
        "target_ok": ok[c],
        "target_dark_h": dark_h[c],
        "target_gap_h": gap_h[c],
        "share": ok[inside].mean(axis=0),
    }


def exact(table: np.ndarray, sc: dict, start_s: float, rules: L.Rules) -> dict:
    pts = sc["meta"]["points"]

    def run(i: int) -> dict:
        p = pts[i]
        m = L.window_metrics(
            table,
            p["lat_deg"],
            p["lon_deg"],
            p["height_m"],
            list(sc["masks"][i]),
            start_s,
            start_s + rules.stay_s,
            rules,
        )
        return {"metrics": m, "verdict": L.verdict(m, rules)}

    tgt = run(sc["centre"])
    if tgt["verdict"]["verdict"] == "no-go":
        return {"target": tgt, "share": None}
    passes = [run(int(i))["verdict"]["verdict"] != "no-go" for i in sc["inside"]]
    return {"target": tgt, "share": sum(passes) / len(passes), "n_inside": len(passes)}


PRESET_ORDER = ("robotic", "crew", "long")


def search(table: np.ndarray, preset: str, verify: int) -> dict:
    rules = L.PRESETS[preset]
    found: list[dict] = []
    summary: dict = {}
    for target in TARGETS:
        sc = screen(table, target, rules)
        cand = np.flatnonzero(sc["target_ok"] & (sc["share"] > 0.0) & (sc["share"] < MAX_SHARE))
        summary[target] = {
            "screened_starts": int(sc["starts_h"].size),
            "target_passes_screen": int(sc["target_ok"].sum()),
            "candidates_share_below_90pct": int(cand.size),
        }
        print(preset, target, summary[target])
        order = sorted(cand, key=lambda j: (sc["share"][j], j))
        verified = []
        for j in order[:verify]:
            start_s = float(sc["starts_h"][j] * STEP_S)
            ex = exact(table, sc, start_s, rules)
            row = {
                "target": target,
                "preset": preset,
                "start_utc": (EPOCH + timedelta(seconds=start_s)).strftime("%Y-%m-%dT%H:%MZ"),
                "start_s": start_s,
                "screen_share_250m": float(sc["share"][j]),
                "exact_target_verdict": ex["target"]["verdict"],
                "exact_target_longest_dark_s": ex["target"]["metrics"]["longest_dark_s"],
                "exact_target_longest_gap_s": ex["target"]["metrics"]["longest_gap_s"],
                "exact_share_250m": ex["share"],
                "points_within_250m": ex.get("n_inside"),
            }
            verified.append(row)
            if (
                ex["target"]["verdict"]["verdict"] == "go"
                and ex["share"] is not None
                and 0.0 < ex["share"] < MAX_SHARE
            ):
                found.append(row)
                break
        summary[target]["verified"] = verified
    best = min(found, key=lambda x: (x["exact_share_250m"], x["start_s"])) if found else None
    return {"per_target": summary, "chosen": best}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--verify", type=int, default=60, help="candidates per target to verify exactly")
    args = ap.parse_args()
    table = V._table()
    presets: dict = {}
    chosen = None
    for preset in PRESET_ORDER:
        presets[preset] = search(table, preset, args.verify)
        chosen = presets[preset]["chosen"]
        print(preset, "chosen:", chosen)
        if chosen:
            break
    write_json(
        OUT,
        {
            "note": "Computed by pipeline/sunsight/default_scenario.py from web/public/data (review note 003 B).",
            "radius_m": RADIUS_M,
            "rule": "presets in the order robotic, crew, long; per target, in rising screened share: first exact target "
            "verdict 'go' with exact share of passing points within 250 m in (0, 0.9); lowest share across targets, ties earliest",
            "presets": presets,
            "chosen": chosen,
        },
    )


if __name__ == "__main__":
    main()
