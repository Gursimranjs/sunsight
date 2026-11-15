# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Validation check 9, "Real missions" (review notes 004 and 007): SunSight's predictions beside what landers reported.

Events and their sources are in pipeline/data/real_missions.json. Geometry: the same reference light code the
browser matches to 1e-6 (light.py), on an hourly Sun/Earth table computed with SPICE for the dates of the
landings (validate.long_table: 18.6 years from 2009-07-13, apparent LT+S positions in MOON_ME). Station
columns are not needed here and are left at zero (they only make every station "blocked"; lit events never
read them). Sites without a computed terrain horizon use the smooth horizon for a 2 m observer, as the app
does, and every row says which horizon was used. Sunsets are given for both readings (half the disc hidden,
last of the disc hidden), because the missions do not say which they mean (note 007).

No pass mark (note 004: the owner's default): the reported value is shown beside ours with its source.
An independent re-derivation with raw SPICE (no light.py) agreed with every row to rounding (STATUS log).
"""

from __future__ import annotations

import json
from dataclasses import replace
from datetime import UTC, datetime

import numpy as np
import spiceypy as sp

from . import kernels as K
from . import light as L
from . import validate as V
from .contracts import BIN_COUNT, DATA_OUT, REPO_ROOT
from .export import decode_masks

MISSIONS = REPO_ROOT / "pipeline" / "data" / "real_missions.json"
RULES = L.PRESETS["robotic"]  # 2 m observer, lit = at least half the Sun's disc
RULES_ANY = replace(RULES, lit_threshold=1e-9)  # lit while any part of the disc is above the horizon
POLAR_SMOOTH_LAT_DEG = 75.0
POLAR_WARNING = "; WARNING: near the pole a smooth horizon can move sunset by a day or more, so this row is not a fair test"
MAX_GRID_OFFSET_M = 40.0  # same rule as the app (DECISIONS #38)
SEARCH_DAYS = 40.0  # long enough to reach the next sunrise
ECLIPSE_STEP_S = 10.0
LANDING_EVENT = "Sun at the reported landing time"


def _table() -> tuple[np.ndarray, float]:
    sun, earth = V.long_table()
    t = np.zeros((sun.shape[0], 18))
    t[:, 0:3] = sun
    t[:, 3:6] = earth
    K.load()
    return t, sp.str2et(V.LONG_START_UTC)


def _t_s(utc: str, et0_s: float) -> float:
    return sp.str2et(utc) - et0_s


def _utc(t_s: float, et0_s: float) -> str:
    """UTC rounded to the nearest minute."""
    return sp.et2utc(et0_s + t_s + 30.0, "ISOC", 0).replace("T", " ")[:16] + " UTC"


def _place(site: dict) -> tuple[float, float, float, list[float], str]:
    """Coordinates, ground height, horizon mask and its label, chosen like the app's resolveSite (a, d)."""
    grid = site.get("miss_grid_id")
    off_m = site.get("miss_point_offset_m")
    if grid and site.get("miss_point_id") and off_m is not None and off_m <= MAX_GRID_OFFSET_M:
        meta = json.loads((DATA_OUT / "miss" / f"{grid}.json").read_text())
        pts = meta["points"]
        i = next(k for k, p in enumerate(pts) if p["id"] == site["miss_point_id"])
        masks = decode_masks((DATA_OUT / "miss" / f"{grid}.masks.bin").read_bytes(), len(pts), 2, BIN_COUNT)
        hh = list(meta["observer_heights_m"]).index(RULES.observer_height_m)
        p = pts[i]
        label = f"terrain horizon (10 m map), grid point {off_m:.0f} m from the cited coordinates"
        return p["lat_deg"], p["lon_deg"], p["height_m"], [float(x) for x in masks[i, hh]], label
    smooth = L.flat_mask(L.smooth_horizon_deg(RULES.observer_height_m))
    if str(site.get("height_source", "none")).startswith("none"):
        label = "smooth horizon (no terrain map here)"
    else:
        label = (
            "smooth horizon (terrain maps cover this point, but no terrain horizon has been computed for it)"
        )
    return site["lat_deg"], site["lon_deg"], site["height_m"], smooth, label


def _lit_events(
    table, lat_deg, lon_deg, h_m, mask, start_s: float, days: float, rules: L.Rules = RULES
) -> list[dict]:
    m = L.window_metrics(table, lat_deg, lon_deg, h_m, mask, start_s, start_s + days * 86400.0, rules)
    return m["lit_events"]


def _sample(table, lat_deg, lon_deg, h_m, mask, t_s: float) -> L.Sample:
    site = L.site_vector(lat_deg, lon_deg, h_m + RULES.observer_height_m)
    return L.sample_at(table, t_s, site, L.local_frame(lat_deg, lon_deg), mask, RULES)


def _days_between(t_s: float, et0_s: float, date: str) -> float:
    d0 = datetime.fromisoformat(date).replace(tzinfo=UTC)
    when = datetime.fromisoformat(sp.et2utc(et0_s + t_s, "ISOC", 0)).replace(tzinfo=UTC)
    return (when - d0).total_seconds() / 86400.0


def _horizon_sensitivity(t_half_s: float, t_any_s: float, sun_r_deg: float) -> str:
    """Hours by which 1° of real horizon would move this sunset: the disc's lower half sets in (t_any - t_half)."""
    h_per_deg = (t_any_s - t_half_s) / 3600.0 / sun_r_deg
    return f"; here 1° of real horizon would move this sunset by about {h_per_deg:.0f} h"


def run() -> tuple[list[dict], list[str]]:
    table, et0_s = _table()
    sites = {s["id"]: s for s in json.loads((DATA_OUT / "sites.json").read_text())["sites"]}
    data = json.loads(MISSIONS.read_text())
    rows: list[dict] = []
    words: list[str] = []
    for ms in data["missions"]:
        lat_deg, lon_deg, h_m, mask, horizon = _place(sites[ms["site_id"]])
        smooth = horizon.startswith("smooth")
        polar_smooth = smooth and abs(lat_deg) >= POLAR_SMOOTH_LAT_DEG
        if polar_smooth:
            horizon += POLAR_WARNING
        t_land_s = _t_s(ms["landing_utc"], et0_s)
        s0 = _sample(table, lat_deg, lon_deg, h_m, mask, t_land_s)
        if not any(ev["kind"] == "sun_at_landing" for ev in ms["events"]):
            rows.append(
                {
                    "mission": ms["name"],
                    "event": LANDING_EVENT,
                    "reported": f"Landed {ms['landing_utc'].replace('T', ' ')[:16]} UTC",
                    "sunsight": f"Sun {s0.sun_el_deg:.1f}° up at azimuth {s0.sun_az_deg:.0f}°; {100 * s0.sun_frac:.0f}% of its disc above the horizon",
                    "difference": "",
                    "horizon": horizon,
                    "source": ms["landing_source"],
                    "quote": ms["landing_quote"]
                    + (f" ({ms['landing_note']})" if ms.get("landing_note") else ""),
                }
            )
        evs = _lit_events(table, lat_deg, lon_deg, h_m, mask, t_land_s, SEARCH_DAYS)
        evs_any = _lit_events(table, lat_deg, lon_deg, h_m, mask, t_land_s, SEARCH_DAYS, RULES_ANY)
        sunset_s = next((e["t_s"] for e in evs if not e["to"]), None)
        sunset_any_s = next((e["t_s"] for e in evs_any if not e["to"]), None)
        sunrise_s = next(
            (e["t_s"] for e in evs if e["to"] and sunset_s is not None and e["t_s"] > sunset_s), None
        )
        for ev in ms["events"]:
            row = {
                "mission": ms["name"],
                "event": ev["label"],
                "reported": ev["reported"],
                "sunsight": "",
                "difference": "",
                "horizon": horizon,
                "source": ev["source"] + (f" ; {ev['source2']}" if ev.get("source2") else ""),
                "quote": ev["quote"] + (f" / {ev['quote2']}" if ev.get("quote2") else ""),
            }
            k = ev["kind"]
            if k == "eclipse":
                u2_s, u3_s = _t_s(ev["u2_utc"], et0_s), _t_s(ev["u3_utc"], et0_s)
                ts_s = np.arange(u2_s - 7200.0, u3_s + 7200.0 + 1.0, ECLIPSE_STEP_S)  # U1 to U4 inside ±2 h
                fr = np.array([_sample(table, lat_deg, lon_deg, h_m, mask, float(t)).sun_frac for t in ts_s])
                inside = (ts_s >= u2_s) & (ts_s <= u3_s)
                hidden_s = ts_s[fr == 0.0]
                row["sunsight"] = (
                    f"At most {100 * fr[inside].max():.2f}% of the Sun's disc visible from U2 to U3; Sun fully hidden "
                    + (
                        f"from {_utc(float(hidden_s[0]), et0_s)[11:16]} to {_utc(float(hidden_s[-1]), et0_s)[11:16]} UT "
                        f"(from {ECLIPSE_STEP_S:.0f} s samples; geometry only, Earth's atmosphere not modelled)"
                        if hidden_s.size
                        else "never"
                    )
                )
                if hidden_s.size:
                    row["difference"] = (
                        f"full cover starts {(u2_s - hidden_s[0]) / 60:.0f} min before U2 and ends "
                        f"{(hidden_s[-1] - u3_s) / 60:.0f} min after U3"
                    )
                words.append(
                    f"Blue Ghost: Earth hides the whole Sun at the landing site through NASA's totality ({row['difference']}; "
                    "geometry only: Earth's atmosphere, which lit the ring in Blue Ghost's photo, is not modelled)."
                    if fr[inside].max() == 0.0
                    else f"Blue Ghost: up to {100 * fr[inside].max():.2f}% of the Sun visible during NASA's totality."
                )
            elif k == "last_contact_after_sunset":
                t_contact_s = _t_s(ev["last_contact_utc"], et0_s)
                # the last change to dark before the final contact (an eclipse is an earlier dark spell)
                t_set_half_s = max(
                    (e["t_s"] for e in evs if not e["to"] and e["t_s"] < t_contact_s), default=None
                )
                t_set_any_s = max(
                    (e["t_s"] for e in evs_any if not e["to"] and e["t_s"] < t_contact_s), default=None
                )
                if t_set_half_s is not None and t_set_any_s is not None:
                    row["sunsight"] = (
                        f"Half the disc hidden {_utc(t_set_half_s, et0_s)}; last of the disc hidden {_utc(t_set_any_s, et0_s)}"
                    )
                    after_half_h = (t_contact_s - t_set_half_s) / 3600
                    after_any_h = (t_contact_s - t_set_any_s) / 3600
                    row["difference"] = (
                        f"last data {after_half_h:.1f} h after half the disc set, {after_any_h:.1f} h after the last of it "
                        f"(reported: {ev['reported_hours_after_sunset']} h; the mission does not say which sunset it means)"
                    )
                    if smooth:
                        row["horizon"] += _horizon_sensitivity(t_set_half_s, t_set_any_s, s0.sun_r_deg)
                    words.append(
                        f"Blue Ghost: last data {after_half_h:.1f} h after our half-disc sunset and {after_any_h:.1f} h "
                        "after the last of the disc set; Firefly said just over 5 h into the lunar night without defining its start."
                    )
            elif k in ("sunset_vs_date", "sleep_before_sunset") and sunset_s is not None:
                row["sunsight"] = (
                    f"First sunset after landing: half the disc hidden {_utc(sunset_s, et0_s)}"
                    + (
                        f"; last of the disc hidden {_utc(sunset_any_s, et0_s)}"
                        if sunset_any_s is not None
                        else ""
                    )
                )
                if smooth and sunset_any_s is not None:
                    row["horizon"] += _horizon_sensitivity(sunset_s, sunset_any_s, s0.sun_r_deg)
                if k == "sunset_vs_date":
                    d_days = _days_between(sunset_s, et0_s, ev["reported_date"])
                    row["difference"] = (
                        f"our sunset is {d_days:+.2f} days from the start of {ev['reported_date']} (UTC)"
                    )
                    words.append(
                        f"{ms['name'].split(' (')[0]}: our first sunset {_utc(sunset_s, et0_s)}; standby reported on {ev['reported_date']}"
                        + (" (smooth horizon near the pole: not a fair test)." if polar_smooth else ".")
                    )
                else:
                    t_sleep_s = _t_s(ev["sleep_utc"], et0_s)
                    row["difference"] = f"sleep was {(sunset_s - t_sleep_s) / 3600:.1f} h before our sunset"
                    words.append(
                        f"Chandrayaan-3: put to sleep {(sunset_s - t_sleep_s) / 3600:.0f} h before our sunset."
                    )
            elif k == "sunrise_vs_date" and sunrise_s is not None:
                d_days = _days_between(sunrise_s, et0_s, ev["reported_date"])
                row["sunsight"] = f"Next sunrise {_utc(sunrise_s, et0_s)}"
                row["difference"] = (
                    f"our sunrise is {d_days:+.2f} days from the start of {ev['reported_date']} (UTC)"
                )
                words.append(
                    f"Chandrayaan-3: our next sunrise {_utc(sunrise_s, et0_s)[:10]}; ISRO expected awakening around {ev['reported_date']}."
                )
            elif k == "sun_at_landing":
                row["sunsight"] = (
                    f"Sun {s0.sun_el_deg:.1f}° up at azimuth {s0.sun_az_deg:.0f}° at {ms['landing_utc'].replace('T', ' ')[:16]} UTC; "
                    f"{100 * s0.sun_frac:.0f}% of its disc above our terrain horizon"
                )
                row["difference"] = (
                    "our 10 m terrain map cannot see the 20 m crater, so we cannot reproduce the shading"
                )
                words.append(
                    f"Athena: at landing our model has the Sun {s0.sun_el_deg:.1f}° up and {100 * s0.sun_frac:.0f}% visible at its "
                    "resting place; the 20 m crater that, per SpacePolicyOnline, kept sunlight off its solar cells is below our map's resolution."
                )
            if not row["sunsight"]:
                row["sunsight"] = "not computed (no such event in the search window)"
            rows.append(row)
    return rows, words


def check() -> dict:
    rows, words = run()
    n_events = sum(1 for r in rows if r["event"] != LANDING_EVENT)
    return {
        "id": "real_missions",
        "title": "Real missions: our predictions beside what landers reported",
        "what": "For four landings (Blue Ghost 1, IM-1, Chandrayaan-3, IM-2), the Sun at the reported landing time and the reported sunset, eclipse and sleep events, against SunSight's geometry for the same place and time.",
        "value": float(n_events),
        "unit": "events",
        "value_label": "events compared",
        "pass_mark": "None set: reported and predicted values are shown side by side with their sources (review note 004)",
        "status": "reported",
        "explanation": " ".join(words)
        + " Sites without a computed terrain horizon use a smooth horizon; a real local horizon can move a sunset by hours "
        "(each row says by how much per degree). Reported times are from mission, NASA, ISRO and news pages (links in the data).",
        "data": V._write_csv("real_missions", rows),
        "rows": len(rows),
        "source": "https://www.nasa.gov/blogs/missions/2025/03/14/nasa-science-data-received-blue-ghost-captures-eclipse-from-moon",
    }


def _main() -> None:
    rows, words = run()
    for r in rows:
        print(
            f"{r['mission'][:28]:28s} | {r['event'][:50]:50s} | {r['sunsight']} | {r['difference']} | {r['horizon']}"
        )
    print("\n".join(words))


if __name__ == "__main__":
    _main()
