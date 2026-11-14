# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Miss-test grids (data contract `miss/<target>.json` and `.masks.bin`): points every 50 m out to 500 m
around a target, each with its own horizon masks at both observer heights. Run: `make miss TARGET=<site id>`.

Offsets are east/north metres in the target's local tangent plane, mapped onto the sphere along the great
circle at that azimuth. Terrain: the 10 m map for the near field where it exists (south of 83S), else 20 m.
"""

from __future__ import annotations

import argparse
import json
import math
import time

import numpy as np

from . import dem as D
from . import horizon as Hz
from . import regions as R
from .contracts import BIN_COUNT, DATA_OUT, MASK_SCALE_DEG, OBSERVER_HEIGHTS_M, REPO_ROOT
from .export import encode_masks, encode_masks_dz, write_json

CONFIG = REPO_ROOT / "pipeline" / "data" / "miss_targets.json"
CURATED = REPO_ROOT / "pipeline" / "data" / "curated_sites.json"
MOON_R_M = 1_737_400.0


def offsets(spacing_m: float, radius_m: float) -> list[tuple[float, float]]:
    n = int(radius_m // spacing_m)
    return [
        (i * spacing_m, j * spacing_m)
        for j in range(n, -n - 1, -1)
        for i in range(-n, n + 1)
        if math.hypot(i, j) * spacing_m <= radius_m + 1e-9
    ]


def destination(lat_deg: float, lon_deg: float, east_m: float, north_m: float) -> tuple[float, float]:
    d = math.hypot(east_m, north_m) / MOON_R_M
    if d == 0.0:
        return lat_deg, lon_deg
    az = math.atan2(east_m, north_m)
    la1, lo1 = math.radians(lat_deg), math.radians(lon_deg)
    la2 = math.asin(math.sin(la1) * math.cos(d) + math.cos(la1) * math.sin(d) * math.cos(az))
    lo2 = lo1 + math.atan2(
        math.sin(az) * math.sin(d) * math.cos(la1), math.cos(d) - math.sin(la1) * math.sin(la2)
    )
    return math.degrees(la2), (math.degrees(lo2) + 180.0) % 360.0 - 180.0


def build(site_id: str) -> dict:
    cfg = json.loads(CONFIG.read_text())
    site = {s["id"]: s for s in json.loads(CURATED.read_text())["sites"]}[site_id]
    t0 = time.time()
    offs = offsets(cfg["spacing_m"], cfg["radius_m"])
    lat = np.empty(len(offs))
    lon = np.empty(len(offs))
    x = np.empty(len(offs))
    y = np.empty(len(offs))
    for k, (e, n) in enumerate(offs):
        lat[k], lon[k] = destination(site["lat_deg"], site["lon_deg"], e, n)
        x[k], y[k] = D.ll_to_xy(lat[k], lon[k], D.R_REF_M)
    near_px = 10 if site["lat_deg"] <= -83.5 else 20
    near, rings = R.load_terrain(x, y, near_px)
    t_read = time.time() - t0
    masks, ground = Hz.compute_masks(lat, lon, near, rings, OBSERVER_HEIGHTS_M, R.NEAR_KM)
    t_mask = time.time() - t0 - t_read
    out = DATA_OUT / "miss"
    out.mkdir(parents=True, exist_ok=True)
    raw = encode_masks(masks)
    (out / f"{site_id}.masks.bin").write_bytes(raw)
    (out / f"{site_id}.masks.dz").write_bytes(encode_masks_dz(raw, BIN_COUNT))
    meta = {
        "id": site_id,
        "target_site_id": site_id,
        "name": site["name"],
        "target": {"lat_deg": site["lat_deg"], "lon_deg": site["lon_deg"], "source_url": site["source_url"]},
        "spacing_m": cfg["spacing_m"],
        "radius_m": cfg["radius_m"],
        "observer_heights_m": list(OBSERVER_HEIGHTS_M),
        "bin_count": BIN_COUNT,
        "scale_deg": MASK_SCALE_DEG,
        "terrain": {
            "near_field": f"{D.MAPS[near_px]} rays to {R.NEAR_KM} km",
            "rings": [f"{D.MAPS[px]} from {a} to {b} km" for px, a, b in R.RINGS],
            "source": "LOLA south polar DEMs, PGDA product 90 (Barker et al. 2023), https://pgda.gsfc.nasa.gov/products/90",
        },
        "note": "A robustness share, not a landing probability: every grid point is treated as equally likely.",
        "timing_s": {"read": round(t_read, 1), "masks": round(t_mask, 1)},
        "points": [
            {
                "id": f"g{k}",
                "east_m": e,
                "north_m": n,
                "lat_deg": round(float(lat[k]), 8),
                "lon_deg": round(float(lon[k]), 8),
                "map_x_m": round(float(x[k]), 2),
                "map_y_m": round(float(y[k]), 2),
                "height_m": round(float(ground[k]), 2),
            }
            for k, (e, n) in enumerate(offs)
        ],
    }
    write_json(out / f"{site_id}.json", meta)
    # 3D terrain cut centred on the target, unless a region with its own cut is centred there already
    cx, cy = D.ll_to_xy(site["lat_deg"], site["lon_deg"], D.R_REF_M)
    tdir = DATA_OUT / "terrain"
    for reg in json.loads(R.CONFIG.read_text())["regions"]:
        if (
            math.hypot(reg["center_x_m"] - cx, reg["center_y_m"] - cy) < 30.0
            and (tdir / f"{reg['id']}.json").exists()
        ):
            print(f"{site_id}: terrain cut of region {reg['id']} is centred here; no separate cut")
            print(
                f"{site_id}: {len(offs)} points, near map {near_px} m, read {t_read:.1f} s, masks {t_mask:.1f} s"
            )
            return meta
    (tdir / f"{site_id}.bin").write_bytes(R.terrain_cut(cx, cy).tobytes())
    write_json(
        tdir / f"{site_id}.json",
        {
            "site_id": site_id,
            "size": 512,
            "spacing_m": 20.0,
            "center": {
                "lat_deg": site["lat_deg"],
                "lon_deg": site["lon_deg"],
                "map_x_m": round(cx, 2),
                "map_y_m": round(cy, 2),
            },
            "row_order": "decreasing map y",
            "col_order": "increasing map x",
            "map_note": "Map +y points from the south pole toward 0 deg longitude; +x toward 90 deg E.",
            "dtype": "int16",
            "units": "m above the 1737.4 km sphere",
            "source": D.MAPS[20],
            "note": "For the illustrative 3D view only; numbers come from the horizon masks.",
        },
    )
    print(f"{site_id}: {len(offs)} points, near map {near_px} m, read {t_read:.1f} s, masks {t_mask:.1f} s")
    return meta


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", required=True)
    build(ap.parse_args().target)


if __name__ == "__main__":
    main()
