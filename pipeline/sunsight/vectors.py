# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Write tests/vectors/light_vectors.json: the shared test vectors both engines must reproduce to 1e-6.

The window case embeds its own float32 table rows (made-up fixture geometry), so the file stands alone.
Run: `uv run python -m sunsight.vectors`.
"""

from __future__ import annotations

import json
import math
import random

import numpy as np

from . import light as L
from .contracts import BIN_COUNT, REPO_ROOT
from .fixtures import fixture_ephemeris, fixture_mask

OUT = REPO_ROOT / "tests" / "vectors" / "light_vectors.json"


def rugged_mask() -> list[float]:
    az = np.arange(BIN_COUNT) * 360.0 / BIN_COUNT
    m = fixture_mask(az, 0.5, 40.0, 2.5)
    m += 0.4 * np.sin(np.radians(az) * 17.0)
    return [round(float(v), 3) for v in m]  # multiples of 0.001, as decoded from int16


def build() -> dict:
    rnd = random.Random(20261114)
    mask = rugged_mask()
    flat0 = L.flat_mask(0.0)

    geometry = []
    for lat, lon, h in (
        (-90.0, 0.0, 0.0),
        (-89.45, -137.31, 1800.0),
        (-84.79, 29.2, 5000.0),
        (0.67, 23.47, -1900.0),
        (26.13, 3.63, 0.0),
    ):
        site = L.site_vector(lat, lon, h)
        f = L.local_frame(lat, lon)
        target = (1.4e8 * math.cos(0.3), -1.4e8 * math.sin(0.3), 3.1e6)
        az, el, d = L.az_el(target, site, f)
        geometry.append(
            {
                "lat_deg": lat,
                "lon_deg": lon,
                "h_m": h,
                "site_km": list(site),
                "east": list(f.east),
                "north": list(f.north),
                "up": list(f.up),
                "target_km": list(target),
                "az_deg": az,
                "el_deg": el,
                "dist_km": d,
            }
        )

    horizon = [
        {"az_deg": a, "expected": L.horizon_at(mask, a)} for a in (0.0, 0.1, 359.9, 123.456, -10.0, 720.3)
    ]

    sun_cases = []

    def add(name, m, args):
        sun_cases.append(
            {
                "name": name,
                "mask": "rugged" if m is mask else ("flat0" if m is flat0 else list(m)),
                "args": list(args),
                "expected": L.sun_fraction(m, *args),
            }
        )

    add("full sun", flat0, (30.0, 4.0, 0.2665, 210.0, -3.0, 0.95))
    add("half sun on flat horizon", flat0, (30.0, 0.0, 0.2665, 210.0, -3.0, 0.95))
    add("below horizon", flat0, (30.0, -1.0, 0.2665, 210.0, -3.0, 0.95))
    add("total eclipse", flat0, (30.0, 2.0, 0.2665, 30.0, 2.1, 0.95))
    add("partial eclipse", flat0, (30.0, 2.0, 0.2665, 30.8, 2.6, 0.95))
    add("partial eclipse across azimuth zero", flat0, (359.9, 2.0, 0.2665, 0.5, 2.3, 0.95))
    for k in range(24):
        az_s = rnd.uniform(0, 360)
        el_s = L.horizon_at(mask, az_s) + rnd.uniform(-0.4, 0.4)
        add(
            f"rugged {k}",
            mask,
            (
                az_s,
                el_s,
                rnd.uniform(0.258, 0.272),
                rnd.uniform(0, 360),
                rnd.uniform(-7, 7),
                rnd.uniform(0.9, 1.0),
            ),
        )

    disc_cases = []
    for _ in range(10):
        az = rnd.uniform(0, 360)
        el = L.horizon_at(mask, az) + rnd.uniform(-1.2, 1.2)
        r = rnd.uniform(0.9, 1.0)
        disc_cases.append({"args": [az, el, r], "expected": L.disc_fraction(mask, az, el, r)})

    contact = [
        {"name": "clear", "args": [5.0, 1.0, 30.0], "expected": L.station_contact(5.0, 1.0, 30.0)},
        {"name": "grazing", "args": [2.5, 1.0, 30.0], "expected": L.station_contact(2.5, 1.0, 30.0)},
        {
            "name": "blocked by terrain",
            "args": [0.9, 1.0, 30.0],
            "expected": L.station_contact(0.9, 1.0, 30.0),
        },
        {
            "name": "blocked, Moon low at station",
            "args": [5.0, 1.0, 9.0],
            "expected": L.station_contact(5.0, 1.0, 9.0),
        },
    ]

    # Window case: 10 days of the made-up fixture table, as float32.
    table32 = fixture_ephemeris()[:240].astype(np.float32)
    table = table32.astype(np.float64)
    interp_cases = [
        {"t_s": t, "expected": L.interp(table, t)} for t in (0.0, 1234.5, 86400.0 * 3.3, 3600.0 * 238.5)
    ]
    windows = []
    for preset in ("robotic", "crew"):
        rules = L.PRESETS[preset]
        m = L.window_metrics(table, -86.0, 10.0, 1600.0, mask, 86400.0, 86400.0 * 8, rules)
        v = L.verdict(m, rules)
        windows.append(
            {
                "preset": preset,
                "rules": L.rules_dict(rules),
                "lat_deg": -86.0,
                "lon_deg": 10.0,
                "h_m": 1600.0,
                "start_s": 86400.0,
                "end_s": 86400.0 * 8,
                "metrics": m,
                "verdict": v,
            }
        )

    return {
        "note": "Shared vectors for pipeline/sunsight/light.py and web/src/engine. Made-up inputs; tolerance 1e-6.",
        "tolerance": 1e-6,
        "masks": {"rugged": mask},
        "geometry": geometry,
        "angular_radius": [
            {"args": [695700.0, 1.496e8], "expected": L.angular_radius(695700.0, 1.496e8)},
            {"args": [6371.0, 384400.0], "expected": L.angular_radius(6371.0, 384400.0)},
        ],
        "smooth_horizon": [{"h_m": h, "expected": L.smooth_horizon_deg(h)} for h in (2.0, 10.0)],
        "horizon_at": horizon,
        "sun_fraction": sun_cases,
        "disc_fraction": disc_cases,
        "station_contact": contact,
        "table": {"rows": [[float(x) for x in r] for r in table32], "step_s": 3600.0},
        "interp": interp_cases,
        "window": windows,
        "miss_share": [
            {
                "passes": [True, False, True, True],
                "east_m": [0, 100, 200, 600],
                "north_m": [0, 0, 0, 0],
                "radius_m": 250.0,
                "expected": L.miss_share([True, False, True, True], [0, 100, 200, 600], [0, 0, 0, 0], 250.0),
            }
        ],
    }


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(build(), indent=None) + "\n")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
