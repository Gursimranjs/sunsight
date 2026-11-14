# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Made-up fixture data in the final file formats, so the web app can be built before real data exists.

Everything here is invented. Every file name starts with `fixture_` and every JSON carries
`"fixture": true`; the web app shows a "fixture data" banner whenever it loads any of it.
Run: `uv run python -m sunsight.fixtures`.
"""

from __future__ import annotations

import math

import numpy as np

from .contracts import (
    BIN_COUNT,
    DATA_OUT,
    EPHEMERIS_COLUMNS,
    EPHEMERIS_CORRECTION,
    EPHEMERIS_FRAME,
    EPHEMERIS_START_UTC,
    EPHEMERIS_STEP_S,
    MASK_SCALE_DEG,
    OBSERVER_HEIGHTS_M,
    STATIONS,
    TERRAIN_SIZE,
    TERRAIN_SPACING_M,
)
from .export import build_manifest, encode_masks, write_json

FIXTURE_ROWS = 24 * 60  # 60 days, hourly
NOTE = "MADE-UP FIXTURE DATA for development only. Not real geometry or terrain."


def _unit(lat_deg: np.ndarray, lon_deg: np.ndarray) -> np.ndarray:
    la, lo = np.radians(lat_deg), np.radians(lon_deg)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], axis=-1)


def fixture_ephemeris() -> np.ndarray:
    """An invented, roughly Moon-like Sun/Earth/station model. Shape (rows, 18), float32."""
    t_h = np.arange(FIXTURE_ROWS, dtype=np.float64)
    sun_lon = 180.0 - 360.0 * t_h / (29.530589 * 24.0)
    sun_lat = 1.54 * np.sin(2 * math.pi * t_h / (346.62 * 24.0))
    sun = 1.496e8 * _unit(sun_lat, sun_lon)
    earth_lon = 7.0 * np.sin(2 * math.pi * t_h / (27.55 * 24.0))
    earth_lat = 6.7 * np.sin(2 * math.pi * t_h / (27.21 * 24.0))
    earth_dist = 384_400.0 + 20_000.0 * np.sin(2 * math.pi * t_h / (27.55 * 24.0))
    earth = earth_dist[:, None] * _unit(earth_lat, earth_lon)
    cols = [sun, earth]
    els = []
    for i, phase_deg in enumerate((0.0, 120.0, 240.0)):
        theta = 360.0 * t_h / 23.934 + phase_deg
        off = 6371.0 * _unit(np.full_like(t_h, 35.0 - 35.0 * i), theta)
        cols.append(earth + off)
        els.append(40.0 * np.sin(np.radians(360.0 * t_h / 24.84 + phase_deg)) + 10.0)
    table = np.concatenate(cols + [np.stack(els, axis=-1)], axis=1)
    return table.astype("<f4")


def fixture_mask(az_deg: np.ndarray, base_deg: float, phase_deg: float, bump_deg: float) -> np.ndarray:
    a = np.radians(az_deg)
    m = base_deg + 1.1 * np.sin(2 * a + math.radians(phase_deg)) + 0.6 * np.cos(3 * a)
    m += bump_deg * np.exp(-0.5 * ((az_deg - 200.0) / 6.0) ** 2)
    return m


def main() -> None:
    out = DATA_OUT
    files: dict = {}

    # Ephemeris.
    eph = fixture_ephemeris()
    (out / "ephemeris").mkdir(parents=True, exist_ok=True)
    (out / "ephemeris" / "fixture_2027_2030.bin").write_bytes(eph.tobytes())
    write_json(
        out / "ephemeris" / "fixture_2027_2030.json",
        {
            "fixture": True,
            "note": NOTE,
            "start_utc": EPHEMERIS_START_UTC,
            "step_s": EPHEMERIS_STEP_S,
            "row_count": FIXTURE_ROWS,
            "columns": EPHEMERIS_COLUMNS,
            "frame": EPHEMERIS_FRAME,
            "correction": EPHEMERIS_CORRECTION,
            "observer": "MOON",
            "stations": STATIONS,
            "dtype": "float32",
            "endianness": "little",
        },
    )
    files["ephemeris"] = {
        "meta": "ephemeris/fixture_2027_2030.json",
        "bin": "ephemeris/fixture_2027_2030.bin",
    }

    az = np.arange(BIN_COUNT) * 360.0 / BIN_COUNT

    # One region: a 3 x 3 grid of invented points.
    pts: list[dict] = []
    masks: list = []
    k = 0
    for j in range(3):
        for i in range(3):
            pts.append(
                {
                    "id": f"p{k}",
                    "lat_deg": -89.40 - 0.01 * j,
                    "lon_deg": -137.0 + 0.5 * i,
                    "map_x_m": -12_000.0 + 300.0 * i,
                    "map_y_m": 11_000.0 + 300.0 * j,
                    "height_m": 1500.0 + 40 * k,
                }
            )
            m2 = fixture_mask(az, 0.4 + 0.15 * k, 30.0 * k, 2.0)
            masks.append([m2, m2 - 0.12])
            k += 1
    (out / "regions").mkdir(parents=True, exist_ok=True)
    (out / "regions" / "fixture_ridge.masks.bin").write_bytes(encode_masks(np.array(masks)))
    write_json(
        out / "regions" / "fixture_ridge.json",
        {
            "fixture": True,
            "note": NOTE,
            "id": "fixture_ridge",
            "name": "Fixture ridge (made-up)",
            "observer_heights_m": list(OBSERVER_HEIGHTS_M),
            "bin_count": BIN_COUNT,
            "scale_deg": MASK_SCALE_DEG,
            "spacing_m": 300.0,
            "points": pts,
        },
    )
    files["regions"] = [
        {
            "id": "fixture_ridge",
            "meta": "regions/fixture_ridge.json",
            "masks": "regions/fixture_ridge.masks.bin",
        }
    ]

    # One miss-test grid: 100 m spacing out to 500 m around an invented target.
    gpts: list[dict] = []
    gmasks: list = []
    for n in range(-5, 6):
        for e in range(-5, 6):
            east_m, north_m = 100.0 * e, 100.0 * n
            if math.hypot(east_m, north_m) > 500.0:
                continue
            crater = 4.0 * math.exp(-((east_m - 250.0) ** 2 + (north_m + 100.0) ** 2) / (2 * 120.0**2))
            m2 = fixture_mask(az, 0.6 + crater, 15.0, 1.5)
            gpts.append(
                {
                    "id": f"g{len(gpts)}",
                    "east_m": east_m,
                    "north_m": north_m,
                    "lat_deg": -84.79 + north_m / 30_323.0,
                    "lon_deg": 29.2 + east_m / 2_746.0,
                    "map_x_m": 0.0,
                    "map_y_m": 0.0,
                    "height_m": 5000.0 - 10 * crater,
                }
            )
            gmasks.append([m2, m2 - 0.1])
    (out / "miss").mkdir(parents=True, exist_ok=True)
    (out / "miss" / "fixture_target.masks.bin").write_bytes(encode_masks(np.array(gmasks)))
    write_json(
        out / "miss" / "fixture_target.json",
        {
            "fixture": True,
            "note": NOTE,
            "id": "fixture_target",
            "target_site_id": "fixture_target",
            "target": {"lat_deg": -84.79, "lon_deg": 29.2},
            "spacing_m": 100.0,
            "radius_m": 500.0,
            "observer_heights_m": list(OBSERVER_HEIGHTS_M),
            "bin_count": BIN_COUNT,
            "scale_deg": MASK_SCALE_DEG,
            "points": gpts,
        },
    )
    files["miss"] = [
        {"id": "fixture_target", "meta": "miss/fixture_target.json", "masks": "miss/fixture_target.masks.bin"}
    ]

    # 3D terrain cut: a bowl and a ridge.
    c = (np.arange(TERRAIN_SIZE) - TERRAIN_SIZE / 2) * TERRAIN_SPACING_M
    xx, yy = np.meshgrid(c, c)
    r = np.hypot(xx - 1500, yy + 800)
    z = (
        1500.0
        + 0.04 * yy
        - 600.0 * np.exp(-((r / 1800.0) ** 2))
        + 300.0 * np.exp(-(((xx + 2500) / 900.0) ** 2))
    )
    (out / "terrain").mkdir(parents=True, exist_ok=True)
    (out / "terrain" / "fixture_target.bin").write_bytes(np.round(z).astype("<i2").tobytes())
    write_json(
        out / "terrain" / "fixture_target.json",
        {
            "fixture": True,
            "note": NOTE,
            "site_id": "fixture_target",
            "size": TERRAIN_SIZE,
            "spacing_m": TERRAIN_SPACING_M,
            "center": {"lat_deg": -84.79, "lon_deg": 29.2},
            "row_order": "north to south",
            "col_order": "west to east",
            "dtype": "int16",
            "units": "m",
        },
    )
    files["terrain"] = [
        {"id": "fixture_target", "meta": "terrain/fixture_target.json", "bin": "terrain/fixture_target.bin"}
    ]

    # Sites.
    write_json(
        out / "fixture_sites.json",
        {
            "fixture": True,
            "note": NOTE,
            "sites": [
                {
                    "id": "fixture_ridge",
                    "name": "Fixture ridge (made-up)",
                    "lat_deg": -89.42,
                    "lon_deg": -136.5,
                    "height_m": 1600.0,
                    "category": "fixture",
                    "region_id": "fixture_ridge",
                    "miss_target_id": None,
                    "terrain_id": None,
                    "source_url": None,
                    "fixture": True,
                },
                {
                    "id": "fixture_target",
                    "name": "Fixture target (made-up)",
                    "lat_deg": -84.79,
                    "lon_deg": 29.2,
                    "height_m": 5000.0,
                    "category": "fixture",
                    "region_id": None,
                    "miss_target_id": "fixture_target",
                    "terrain_id": "fixture_target",
                    "source_url": None,
                    "fixture": True,
                },
                {
                    "id": "fixture_equator",
                    "name": "Fixture equator site (made-up)",
                    "lat_deg": 0.67,
                    "lon_deg": 23.47,
                    "height_m": 0.0,
                    "category": "fixture",
                    "region_id": None,
                    "miss_target_id": None,
                    "terrain_id": None,
                    "source_url": None,
                    "fixture": True,
                },
            ],
        },
    )
    files["sites"] = "fixture_sites.json"

    # Validation summary.
    checks = [
        "ephemeris_horizons",
        "sunlight_pgda",
        "earth_pgda",
        "glaser_ridge",
        "eclipses",
        "station_geometry",
        "physics_sanity",
        "known_places",
    ]
    (out / "validation").mkdir(parents=True, exist_ok=True)
    write_json(
        out / "validation" / "fixture_summary.json",
        {
            "fixture": True,
            "note": NOTE,
            "checks": [
                {
                    "id": c_id,
                    "title": c_id.replace("_", " "),
                    "value": None,
                    "unit": "",
                    "pass_mark": "fixture",
                    "status": "not run",
                    "explanation": "Fixture placeholder; no check has been run.",
                }
                for c_id in checks
            ],
        },
    )
    files["validation"] = "validation/fixture_summary.json"

    manifest = build_manifest(files, inputs=[], kernels=[], fixture=True)
    manifest["note"] = NOTE
    write_json(out / "fixture_manifest.json", manifest)
    print(f"Wrote fixture data to {out}")


if __name__ == "__main__":
    main()
