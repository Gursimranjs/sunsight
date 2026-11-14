# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Horizon masks for one region (data contract `regions/<id>.json` and `.masks.bin`) and its 3D terrain cut.

Run: `make masks REGION=<id>` (regions are defined in pipeline/data/regions.json).
Terrain: 20 m map (read over HTTP in windows) for the near field and to 20 km, 80 m map to 60 km,
240 m map to 300 km (AGENTS.md "Horizon" ring distances).
"""

from __future__ import annotations

import argparse
import json
import time

import numpy as np

from . import dem as D
from . import horizon as Hz
from .contracts import (
    BIN_COUNT,
    DATA_OUT,
    MASK_SCALE_DEG,
    OBSERVER_HEIGHTS_M,
    REPO_ROOT,
    TERRAIN_SIZE,
    TERRAIN_SPACING_M,
)
from .export import encode_masks, encode_masks_dz, write_json

CONFIG = REPO_ROOT / "pipeline" / "data" / "regions.json"
RINGS = ((20, 5.0, 20.0), (80, 20.0, 60.0), (240, 60.0, 300.0))
NEAR_KM = 5.0


def load_config(region_id: str) -> dict:
    for r in json.loads(CONFIG.read_text())["regions"]:
        if r["id"] == region_id:
            return r
    raise KeyError(region_id)


def grid_points(cx_m: float, cy_m: float, half_m: float, spacing_m: float) -> tuple[np.ndarray, np.ndarray]:
    n = int(round(2 * half_m / spacing_m)) + 1
    offs = -half_m + spacing_m * np.arange(n)
    xs, ys = np.meshgrid(cx_m + offs, cy_m - offs)  # row 0 = largest y
    return xs.ravel(), ys.ravel()


def grid_from_window(w: D.Window2D) -> Hz.Grid:
    return Hz.Grid(
        z_m=np.ascontiguousarray(w.z_m),
        x0_m=w.x0_m,
        y0_m=w.y0_m,
        pixel_m=w.info.pixel_m,
        sphere_r_m=w.info.sphere_r_m,
    )


def load_terrain(x: np.ndarray, y: np.ndarray, near_map_m: int) -> tuple[Hz.Grid, list[Hz.Ring]]:
    """Windows covering every observer plus each ring's reach (10% map-stretch margin)."""
    xmin, xmax, ymin, ymax = x.min(), x.max(), y.min(), y.max()
    near_info = D.dem_info(D.source_for(near_map_m))
    pad = NEAR_KM * 1000 * 1.1 + 500
    near = grid_from_window(D.read_window(near_info, xmin - pad, xmax + pad, ymin - pad, ymax + pad))
    rings = []
    for px, rmin, rmax in RINGS:
        info = D.dem_info(D.source_for(px))
        pad = rmax * 1000 * 1.1 + 2 * px
        w = D.read_window(info, xmin - pad, xmax + pad, ymin - pad, ymax + pad)
        rings.append(Hz.Ring(grid_from_window(w), rmin, rmax))
    return near, rings


def terrain_cut(cx_m: float, cy_m: float) -> np.ndarray:
    """512 x 512 heights at 20 m spacing centred on (cx, cy), map axes (row 0 = largest y), int16 metres."""
    info = D.dem_info(D.source_for(20))
    half = TERRAIN_SIZE * TERRAIN_SPACING_M / 2
    w = D.read_window(info, cx_m - half, cx_m + half, cy_m - half, cy_m + half)
    xs = cx_m - half + TERRAIN_SPACING_M * (np.arange(TERRAIN_SIZE) + 0.5)
    ys = cy_m + half - TERRAIN_SPACING_M * (np.arange(TERRAIN_SIZE) + 0.5)
    out = np.empty((TERRAIN_SIZE, TERRAIN_SIZE))
    for r, yy in enumerate(ys):
        for c, xx in enumerate(xs):
            out[r, c] = D.bilinear(w.z_m, w.x0_m, w.y0_m, info.pixel_m, xx, yy)
    return np.round(out).astype("<i2")


def build(region_id: str) -> dict:
    cfg = load_config(region_id)
    t0 = time.time()
    x, y = grid_points(cfg["center_x_m"], cfg["center_y_m"], cfg["half_m"], cfg["spacing_m"])
    lat = np.empty(x.size)
    lon = np.empty(x.size)
    for k in range(x.size):
        lat[k], lon[k] = D.xy_to_ll(x[k], y[k], D.R_REF_M)
    near, rings = load_terrain(x, y, cfg["near_map_m"])
    t_read = time.time() - t0
    masks, ground = Hz.compute_masks(lat, lon, near, rings, OBSERVER_HEIGHTS_M, NEAR_KM)
    t_mask = time.time() - t0 - t_read
    out_dir = DATA_OUT / "regions"
    out_dir.mkdir(parents=True, exist_ok=True)
    raw = encode_masks(masks)
    (out_dir / f"{region_id}.masks.bin").write_bytes(raw)
    (out_dir / f"{region_id}.masks.dz").write_bytes(encode_masks_dz(raw, BIN_COUNT))
    points = [
        {
            "id": f"p{k}",
            "lat_deg": round(float(lat[k]), 7),
            "lon_deg": round(float(lon[k]), 7),
            "map_x_m": round(float(x[k]), 2),
            "map_y_m": round(float(y[k]), 2),
            "height_m": round(float(ground[k]), 2),
        }
        for k in range(x.size)
    ]
    n_side = int(round(2 * cfg["half_m"] / cfg["spacing_m"])) + 1
    meta = {
        "id": region_id,
        "name": cfg["name"],
        "observer_heights_m": list(OBSERVER_HEIGHTS_M),
        "bin_count": BIN_COUNT,
        "scale_deg": MASK_SCALE_DEG,
        "spacing_m": cfg["spacing_m"],
        "grid": {
            "rows": n_side,
            "cols": n_side,
            "row_order": "decreasing map y",
            "col_order": "increasing map x",
        },
        "projection": "south polar stereographic, sphere R = 1737.4 km, true scale at the pole, lon_0 = 0",
        "terrain": {
            "near_field": f"{D.MAPS[cfg['near_map_m']]} rays to {NEAR_KM} km",
            "rings": [f"{D.MAPS[px]} from {a} to {b} km" for px, a, b in RINGS],
            "source": "LOLA south polar DEMs, PGDA product 90 (Barker et al. 2023), https://pgda.gsfc.nasa.gov/products/90",
        },
        "bin_rule": "bin k = highest terrain elevation in azimuth [k*0.25-0.25, k*0.25+0.25] deg, clockwise from local north",
        "timing_s": {"read": round(t_read, 1), "masks": round(t_mask, 1)},
        "points": points,
    }
    write_json(out_dir / f"{region_id}.json", meta)
    # 3D terrain cut centred on the region
    tdir = DATA_OUT / "terrain"
    tdir.mkdir(parents=True, exist_ok=True)
    (tdir / f"{region_id}.bin").write_bytes(terrain_cut(cfg["center_x_m"], cfg["center_y_m"]).tobytes())
    clat, clon = D.xy_to_ll(cfg["center_x_m"], cfg["center_y_m"], D.R_REF_M)
    write_json(
        tdir / f"{region_id}.json",
        {
            "site_id": region_id,
            "size": TERRAIN_SIZE,
            "spacing_m": TERRAIN_SPACING_M,
            "center": {
                "lat_deg": round(clat, 7),
                "lon_deg": round(clon, 7),
                "map_x_m": cfg["center_x_m"],
                "map_y_m": cfg["center_y_m"],
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
    print(f"{region_id}: {x.size} points, read {t_read:.1f} s, masks {t_mask:.1f} s")
    return meta


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--region", required=True)
    build(ap.parse_args().region)


if __name__ == "__main__":
    main()
