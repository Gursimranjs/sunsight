# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""The eight validation checks (docs/PROJECT_PLAN.md "Validation plan"). Run: `make validate`.

Writes web/public/data/validation/<check>.csv and summary.json. Every number comes from a run here; a check
that misses its pass mark is reported with its likely cause, never tuned until it passes.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import subprocess
import sys
import time
from datetime import UTC, datetime

import numpy as np
import rasterio
import spiceypy as sp

from . import dem as D
from . import ephemeris as E
from . import horizon as Hz
from . import horizons_check as HC
from . import kernels as K
from . import light as L
from . import lightfast as F
from .contracts import BIN_COUNT, DATA_OUT, DATA_RAW, EPHEMERIS_START_UTC, REPO_ROOT
from .export import decode_masks, write_json

OUT = DATA_OUT / "validation"
CACHE = DATA_RAW / "validation"
ILLUM = DATA_RAW / "illum"
PGDA_SUN = ILLUM / "AVGVISIB_85S_060M_201608.TIF"
PGDA_EARTH = ILLUM / "AVGVISIB_85S_060M_201608_EARTH.TIF"
PGDA_LPSR = ILLUM / "LPSR_85S_060M_201608.TIF"
PGDA_URL = "https://pgda.gsfc.nasa.gov/products/69"
LONG_START_UTC = (
    "2009-07-13T00:00:00"  # start of the LOLA data span in the PGDA label; the label gives no period start
)
LONG_YEARS = 18.6
N_RANDOM = 200
ECLIPSES = [  # NASA lunar eclipse table 2021-2030 (TD of greatest eclipse, duration of totality)
    ("2028 Dec 31", "2028-12-31T16:53:15", 71),
    ("2029 Jun 26", "2029-06-26T03:23:22", 102),
    ("2029 Dec 20", "2029-12-20T22:43:12", 54),
]
ECLIPSE_URL = "https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html"


def ensure_illum() -> None:
    """Download the three PGDA 69 maps used for validation (the plain TIFs; the COG links were broken on
    2026-11-14). Each file must start with a TIFF signature."""
    ILLUM.mkdir(parents=True, exist_ok=True)
    for p in (PGDA_SUN, PGDA_EARTH, PGDA_LPSR):
        if p.exists() and p.read_bytes()[:2] in (b"II", b"MM"):
            continue
        url = "https://pgda.gsfc.nasa.gov/data/MoonIllumination/" + p.name
        subprocess.run(["curl", "-sSfL", "--retry", "3", "-o", str(p), url], check=True)
        if p.read_bytes()[:2] not in (b"II", b"MM"):
            raise RuntimeError(f"{url} did not return a TIFF")


def _write_csv(name: str, rows: list[dict]) -> str:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.csv"
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in rows:
            w.writerow({k: (repr(float(v)) if isinstance(v, float) else v) for k, v in r.items()})
    return f"validation/{name}.csv"


def _table() -> np.ndarray:
    return np.frombuffer(E.BIN_PATH.read_bytes(), dtype="<f4").reshape(-1, 18).astype(np.float64)


# ---------------------------------------------------------------------------------------------------------
# 1 and 6: JPL Horizons
# ---------------------------------------------------------------------------------------------------------


def check_ephemeris() -> tuple[dict, dict]:
    pos, st = HC.compare()
    worst = max(max(abs(r["d_el_deg"]), abs(r["d_az_on_sky_deg"])) for r in pos)
    c1 = {
        "id": "ephemeris_horizons",
        "title": "Sun and Earth positions vs JPL Horizons",
        "what": "Azimuth and elevation of the Sun and Earth's centre from 3 lunar sites at 20 random times in 2027-2030: our interpolated table vs JPL Horizons (airless, apparent).",
        "value": worst,
        "unit": "deg",
        "value_label": "largest difference (elevation, or azimuth x cos elevation)",
        "pass_mark": "≤ 0.001°",
        "status": "pass" if worst <= 0.001 else "fail",
        "explanation": "Sun to 2e-6°, Earth to 3e-5°. The Earth residual is the expected second-order aberration term of a Moon-centred table, (v/c)(R/d) ≤ 2.9e-5° (DECISIONS #20).",
        "data": _write_csv("ephemeris_horizons", pos),
        "rows": len(pos),
    }
    K.load()
    et0 = sp.str2et(EPHEMERIS_START_UTC)
    names = ["goldstone", "madrid", "canberra"]
    rows = []
    for r in st:
        direct = E.compute_row(et0 + HC.t_since_start_s(r["jd_ut"]))[15 + names.index(r["station"])]
        rows.append({**r, "el_spice_deg": direct, "d_el_spice_deg": direct - r["el_horizons_deg"]})
    geo = max(abs(r["d_el_spice_deg"]) for r in rows)
    band = max(abs(r["d_el_deg"]) for r in rows if 0 <= r["el_horizons_deg"] <= 20)
    outside = max(abs(r["d_el_deg"]) for r in rows if not 0 <= r["el_horizons_deg"] <= 20)
    c6 = {
        "id": "station_geometry",
        "title": "Moon's elevation at Goldstone, Madrid and Canberra vs JPL Horizons",
        "what": "Elevation of the Moon above each Deep Space Network complex's horizon at 20 times each.",
        "value": geo,
        "unit": "deg",
        "value_label": "largest difference, SPICE geometry",
        "pass_mark": "≤ 0.01°",
        "status": "pass" if geo <= 0.01 and band <= 0.01 else "fail",
        "explanation": f"Geometry agrees to {geo:.1e}°. The app interpolates the hourly column; where the 10° contact rule decides (0-20° up) that adds at most {band:.1e}°. Near a station's zenith or nadir (|elevation| above about 60°) interpolation is poor (up to {outside:.2f}°); the app caps the station rule at 20° so this never decides contact. Horizons' Earth-orientation data are measured to 2026-11-13 and predicted only to 2027-02-08; later times use extrapolated orientation.",
        "data": _write_csv("station_geometry", rows),
        "rows": len(rows),
    }
    return c1, c6


# ---------------------------------------------------------------------------------------------------------
# 5: eclipses
# ---------------------------------------------------------------------------------------------------------


def check_eclipses() -> dict:
    K.load()
    table = _table()
    et0 = sp.str2et(EPHEMERIS_START_UTC)
    sites = json.loads((DATA_OUT / "sites.json").read_text())["sites"]
    no_terrain = np.full(BIN_COUNT, -90.0)
    rows = []
    worst = 0.0
    for label, td, minutes in ECLIPSES:
        et_mid = sp.str2et(td.replace("T", " ") + " TDT")
        half = minutes * 30.0
        ts = np.arange(et_mid - half, et_mid + half + 1, 60.0) - et0
        # our own totality span at the sub-Earth point, for context
        for s in sites:
            site = L.site_vector(s["lat_deg"], s["lon_deg"], s["height_m"])
            fr = L.local_frame(s["lat_deg"], s["lon_deg"])
            fr_max = 0.0
            for t in ts:
                smp = L.sample_at(table, float(t), site, fr, list(no_terrain), L.Rules())
                fr_max = max(fr_max, smp.sun_frac)
            worst = max(worst, fr_max)
            rows.append(
                {
                    "eclipse": label,
                    "nasa_greatest_td": td,
                    "nasa_totality_min": minutes,
                    "site": s["id"],
                    "max_sun_fraction_during_totality": fr_max,
                }
            )
        # how long our geometry keeps the Sun fully hidden from the Moon's centre direction
    status = "pass" if worst == 0.0 else "fail"
    bad = [r for r in rows if r["max_sun_fraction_during_totality"] > 0]
    detail = []
    for r in bad:
        label, td, minutes = next(e for e in ECLIPSES if e[0] == r["eclipse"])
        s = next(x for x in sites if x["id"] == r["site"])
        site = L.site_vector(s["lat_deg"], s["lon_deg"], s["height_m"])
        fr = L.local_frame(s["lat_deg"], s["lon_deg"])
        em = sp.str2et(td.replace("T", " ") + " TDT")
        ts = np.arange(em - minutes * 30 - 1200, em + minutes * 30 + 1201, 30.0)
        hid = [
            t
            for t in ts
            if L.sample_at(table, float(t - et0), site, fr, list(no_terrain), L.Rules()).sun_frac == 0
        ]
        span = f"{(hid[0] - em) / 60:+.1f} to {(hid[-1] - em) / 60:+.1f} min" if hid else "never fully hidden"
        detail.append(
            f"{s['name']}, {label}: up to {100 * r['max_sun_fraction_during_totality']:.2f}% of the disc; our full cover runs {span} around greatest eclipse vs NASA's ±{minutes / 2:.1f} min"
        )
    expl = (
        "The Sun stays fully behind Earth at every site through all three totalities."
        if not bad
        else f"{len(bad)} of {len(rows)} site-eclipse pairs show a sliver of the Sun at the edge of NASA's totality: "
        + "; ".join(detail)
        + ". NASA's eclipse predictions enlarge Earth's shadow to allow for its atmosphere; our Earth disc is the bare 6,371 km sphere, so our geometric totality is about a minute shorter at some sites."
    )
    return {
        "id": "eclipses",
        "title": "Total lunar eclipses: Sun hidden at every site",
        "what": "Share of the Sun's disc visible (terrain ignored) at all 28 curated sites, every minute through NASA's listed totality of the three total lunar eclipses in 2027-2030.",
        "value": worst,
        "unit": "fraction",
        "value_label": "largest visible share of the Sun's disc",
        "pass_mark": "0 at every site and minute",
        "status": status,
        "explanation": expl,
        "source": ECLIPSE_URL,
        "data": _write_csv("eclipses", rows),
        "rows": len(rows),
    }


# ---------------------------------------------------------------------------------------------------------
# Long table (18.6 years, Sun and Earth only) and masks at arbitrary points
# ---------------------------------------------------------------------------------------------------------


def long_table() -> tuple[np.ndarray, np.ndarray]:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / "long_sun_earth.npy"
    if path.exists():
        a = np.load(path)
        return a[:, 0:3], a[:, 3:6]
    K.load()
    et0 = sp.str2et(LONG_START_UTC)
    n = int(LONG_YEARS * 365.25 * 24)
    ets = et0 + 3600.0 * np.arange(n)
    sun = np.asarray(sp.spkpos("SUN", ets, "MOON_ME", "LT+S", "MOON")[0])
    earth = np.asarray(sp.spkpos("EARTH", ets, "MOON_ME", "LT+S", "MOON")[0])
    np.save(path, np.concatenate([sun, earth], axis=1))
    return sun, earth


def _block_mean(z: np.ndarray, k: int) -> np.ndarray:
    ny, nx = (z.shape[0] // k) * k, (z.shape[1] // k) * k
    return z[:ny, :nx].reshape(ny // k, k, nx // k, k).mean(axis=(1, 3))


class FarRings:
    """80 m and 240 m rings, loaded once over the area the points need."""

    def __init__(self, xs: np.ndarray, ys: np.ndarray) -> None:
        self.rings = []
        for px, rmin, rmax in ((80, 20.0, 60.0), (240, 60.0, 300.0)):
            info = D.dem_info(D.source_for(px))
            pad = rmax * 1100 + 2 * px
            w = D.read_window(
                info, xs.min() - pad, xs.max() + pad, ys.min() - pad, ys.max() + pad, cache=False
            )
            g = Hz.Grid(np.ascontiguousarray(w.z_m), w.x0_m, w.y0_m, info.pixel_m, info.sphere_r_m)
            pts, half = Hz.pixel_grid_points(g)
            self.rings.append((g, pts, half, rmin, rmax))


def masks_at(
    lat: float, lon: float, heights_m: tuple[float, float], far: FarRings, near_block: int
) -> tuple[np.ndarray, float]:
    """Masks (2, 1440) for one point; near field and the 5-20 km ring from the 20 m map averaged into
    near_block x near_block blocks (3 -> 60 m, matching the PGDA maps; 1 -> our native 20 m)."""
    info = D.dem_info(D.source_for(20))
    x, y = D.ll_to_xy(lat, lon, D.R_REF_M)
    w = D.read_window(info, x - 22_500, x + 22_500, y - 22_500, y + 22_500, cache=False)
    z = _block_mean(w.z_m, near_block) if near_block > 1 else w.z_m
    p = info.pixel_m * near_block
    x0 = w.x0_m + (near_block - 1) * info.pixel_m / 2
    y0 = w.y0_m - (near_block - 1) * info.pixel_m / 2
    near = Hz.Grid(np.ascontiguousarray(z), x0, y0, p, info.sphere_r_m)
    up, east, north = Hz.observer_frames(np.array([lat]), np.array([lon]))
    g = Hz.ground_heights(near, np.array([lat]), np.array([lon]))
    r_obs = np.stack([1737.4 + (g + heights_m[0]) / 1000.0, 1737.4 + (g + heights_m[1]) / 1000.0], axis=1)
    mask = np.full((1, 2, BIN_COUNT), Hz.NEG)
    Hz._near_field(
        mask, up, east, north, r_obs, near.z_m, near.x0_m, near.y0_m, near.pixel_m, near.sphere_r_m, 5.0
    )
    obs_xy = np.array([[x, y]])
    pts, half = Hz.pixel_grid_points(near)
    Hz._far_field_grid(
        mask, up, east, north, r_obs, obs_xy, pts, half, near.x0_m, near.y0_m, near.pixel_m, 5.0, 20.0
    )
    for gr, pts, half, rmin, rmax in far.rings:
        Hz._far_field_grid(
            mask, up, east, north, r_obs, obs_xy, pts, half, gr.x0_m, gr.y0_m, gr.pixel_m, rmin, rmax
        )
    return mask[0], float(g[0])


def series_for(
    masks: np.ndarray, lat: np.ndarray, lon: np.ndarray, ground_m: np.ndarray, h_m: float, sun, earth
):
    sites = np.array([L.site_vector(a, b, c + h_m) for a, b, c in zip(lat, lon, ground_m, strict=True)])
    frames = [L.local_frame(a, b) for a, b in zip(lat, lon, strict=True)]
    return F.series(
        np.ascontiguousarray(masks),
        sites,
        np.array([f.east for f in frames]),
        np.array([f.north for f in frames]),
        np.array([f.up for f in frames]),
        np.ascontiguousarray(sun),
        np.ascontiguousarray(earth),
    )


# ---------------------------------------------------------------------------------------------------------
# 2 and 3: PGDA maps, like for like
# ---------------------------------------------------------------------------------------------------------


def aligned_60m(xmin: float, xmax: float, ymin: float, ymax: float) -> Hz.Grid:
    """Our 20 m map averaged into 3 x 3 blocks whose centres are PGDA's 60 m pixel centres (x, y = 30 + 60 k)."""
    info = D.dem_info(D.source_for(20))
    w = D.read_window(info, xmin, xmax, ymin, ymax)
    c0 = next(c for c in range(3) if abs(((w.info.col_x(w.col0 + c + 1)) - 30.0) % 60.0) < 1e-6)
    r0 = next(r for r in range(3) if abs(((w.info.row_y(w.row0 + r + 1)) - 30.0) % 60.0) < 1e-6)
    z = _block_mean(w.z_m[r0:, c0:], 3)
    return Hz.Grid(
        np.ascontiguousarray(z),
        w.info.col_x(w.col0 + c0 + 1),
        w.info.row_y(w.row0 + r0 + 1),
        60.0,
        info.sphere_r_m,
    )


def node_masks(
    lat: np.ndarray,
    lon: np.ndarray,
    x: np.ndarray,
    y: np.ndarray,
    h_m: float,
    grid60: Hz.Grid,
    far: FarRings,
    hz=Hz,
) -> tuple[np.ndarray, np.ndarray]:
    """PGDA-style horizons: observers on 60 m nodes at the node's own height (+h_m), horizon from other nodes
    only (no sub-pixel near field) out to 20 km, then the 80 m and 240 m rings."""
    up, east, north = Hz.observer_frames(lat, lon)
    c = np.round((x - grid60.x0_m) / 60.0).astype(int)
    r = np.round((grid60.y0_m - y) / 60.0).astype(int)
    g = grid60.z_m[r, c]
    r_obs = np.stack([1737.4 + (g + h_m) / 1000.0, 1737.4 + (g + h_m + 2.0) / 1000.0], axis=1)
    mask = np.full((lat.size, 2, BIN_COUNT), Hz.NEG)
    pts, half = Hz.pixel_grid_points(grid60)
    hz._far_field_grid(
        mask,
        up,
        east,
        north,
        r_obs,
        np.stack([x, y], axis=1),
        pts,
        half,
        grid60.x0_m,
        grid60.y0_m,
        60.0,
        0.001,
        20.0,
    )
    for gr, p2, h2, rmin, rmax in far.rings:
        hz._far_field_grid(
            mask,
            up,
            east,
            north,
            r_obs,
            np.stack([x, y], axis=1),
            p2,
            h2,
            gr.x0_m,
            gr.y0_m,
            gr.pixel_m,
            rmin,
            rmax,
        )
    return mask[:, 0, :], g


def check_pgda() -> tuple[dict, dict]:
    """Like for like with PGDA 69 (review note 002 A): 200 random 60 m reference pixels in the Shackleton hero
    region; our 2023 terrain averaged onto the same 60 m nodes; surface observer on the node; horizon from other
    nodes only; hourly over 18.6 years; average visible fraction of the Sun's disc; Earth visible if any part."""
    sun_t, earth_t = long_table()
    reg = json.loads((DATA_OUT / "regions" / "shackleton.json").read_text())
    xs_r = [p["map_x_m"] for p in reg["points"]]
    ys_r = [p["map_y_m"] for p in reg["points"]]
    with rasterio.open(PGDA_SUN) as ds:
        sun_map, tr, scale = ds.read(1), ds.transform, ds.scales[0]
    with rasterio.open(PGDA_EARTH) as ds:
        earth_map = ds.read(1)
    rnd = np.random.default_rng(20261114)
    picks: list[tuple[int, int, float, float]] = []
    seen = set()
    while len(picks) < N_RANDOM:
        x = rnd.uniform(min(xs_r), max(xs_r))
        y = rnd.uniform(min(ys_r), max(ys_r))
        c, r = int((x - tr.c) / tr.a), int((y - tr.f) / tr.e)
        if (r, c) in seen or sun_map[r, c] == -32768 or earth_map[r, c] == -32768:
            continue
        seen.add((r, c))
        picks.append((r, c, tr.c + (c + 0.5) * tr.a, tr.f + (r + 0.5) * tr.e))
    xs = np.array([p[2] for p in picks])
    ys = np.array([p[3] for p in picks])
    lat = np.empty(N_RANDOM)
    lon = np.empty(N_RANDOM)
    for k in range(N_RANDOM):
        lat[k], lon[k] = D.xy_to_ll(xs[k], ys[k], D.R_REF_M)
    t0 = time.time()
    grid60 = aligned_60m(xs.min() - 23_000, xs.max() + 23_000, ys.min() - 23_000, ys.max() + 23_000)
    far = FarRings(xs, ys)
    masks, ground = node_masks(lat, lon, xs, ys, 0.0, grid60, far)
    t_masks = time.time() - t0
    sf, ef = series_for(masks, lat, lon, ground, 0.0, sun_t, earth_t)
    m0, _ = node_masks(lat, lon, xs, ys, 0.0, grid60, far, hz_variant(0.0))
    sf0, _ = series_for(m0, lat, lon, ground, 0.0, sun_t, earth_t)
    bin_rule_points = float(100.0 * (sf.mean() - sf0.mean()))
    ours_mean = sf.mean(axis=1)
    ours_any = (sf > 0).mean(axis=1)
    ours_earth = (ef > 0).mean(axis=1)
    ref_sun = np.array([sun_map[r, c] for r, c, _, _ in picks]) * scale
    ref_earth = np.array([earth_map[r, c] for r, c, _, _ in picks]) * scale
    rows = [
        {
            "point": k,
            "lat_deg": lat[k],
            "lon_deg": lon[k],
            "map_x_m": xs[k],
            "map_y_m": ys[k],
            "ground_m": ground[k],
            "pgda_sun": ref_sun[k],
            "ours_sun_mean_fraction": ours_mean[k],
            "ours_sun_any_part": ours_any[k],
            "pgda_earth": ref_earth[k],
            "ours_earth_any_part": ours_earth[k],
        }
        for k in range(N_RANDOM)
    ]
    path = _write_csv("pgda_points", rows)
    out = []
    for cid, title, ours, ref, alt, what in (
        (
            "sunlight_pgda",
            "Average sunlight vs NASA Goddard's maps (PGDA)",
            ours_mean,
            ref_sun,
            ours_any,
            "Average visible fraction of the Sun's disc, hourly over 18.6 years, surface observer on PGDA's own 60 m nodes, horizon from other nodes only, our 2023 terrain averaged to those nodes; 200 random reference pixels in the Shackleton hero region; vs AVGVISIB_85S_060M_201608.",
        ),
        (
            "earth_pgda",
            "Earth visibility vs NASA Goddard's maps (PGDA)",
            ours_earth,
            ref_earth,
            None,
            "Share of hourly steps over 18.6 years with any part of Earth's disc above the terrain (PGDA's rule), same nodes and settings; vs AVGVISIB_85S_060M_201608_EARTH.",
        ),
    ):
        ref_map = sun_map if cid == "sunlight_pgda" else earth_map
        d = 100.0 * (ours - ref)
        mean, spread = float(d.mean()), float(d.std())
        big = np.argsort(-np.abs(d))[:5]
        # Measured evidence for each large outlier: is the PGDA pixel itself out of line with its 3x3 neighbours?
        notes = []
        isolated = 0
        for k in big:
            r0, c0 = picks[int(k)][0], picks[int(k)][1]
            nb = ref_map[r0 - 1 : r0 + 2, c0 - 1 : c0 + 2].astype(float) * scale
            med = float(np.median(nb))
            iso = abs(ref[k] - med) > 0.20
            isolated += iso
            notes.append(
                f"pixel {int(k)} ({d[k]:+.1f}; PGDA {100 * ref[k]:.0f}%, its 3x3 median {100 * med:.0f}%, ours {100 * ours[k]:.0f}%{', isolated in PGDA' if iso else ''})"
            )
        all_explained = isolated == len(big)
        status = ("pass" if all_explained else "partial") if abs(mean) <= 2.0 else "fail"
        expl = (
            f"Mean difference {mean:+.2f} points, spread {spread:.2f} points over {N_RANDOM} pixels. Largest: "
            + ", ".join(notes)
            + f". {isolated} of the {len(big)} largest differences {'sits on a PGDA pixel that differs' if isolated == 1 else 'sit on PGDA pixels that differ'} from {'its' if isolated == 1 else 'their'} own 3x3 neighbourhood median by more than 20 points (isolated values in the 2016 map)"
            + (
                "."
                if all_explained
                else "; the others are not explained by that test, so the outliers are only partly explained."
            )
            + " "
        )
        if alt is not None:
            da = 100.0 * (alt - ref)
            expl += (
                f"The PDS label also describes the values as the share of time sunlit by any fraction of the disc; read that way "
                f"the mean difference is {da.mean():+.2f} points. Our bin rule (review note 001, obstacles widened by up to 0.25°) "
                f"changes the mean by {bin_rule_points:+.2f} points on these pixels (measured by rerunning without widening); "
                "it stays in the shipped engine because it never under-reads a peak. "
            )
        expl += (
            "PGDA used the 2016 60 m elevation map and we use the 2023 maps averaged to 60 m, so part of the scatter is real "
            "terrain change. The label does not give the period start (we use 2009-07-13) or the observer height (we use the surface)."
        )
        out.append(
            {
                "id": cid,
                "title": title,
                "what": what,
                "value": mean,
                "unit": "points",
                "value_label": "mean difference (ours - PGDA)",
                "pass_mark": "mean within ±2 points; outliers explained",
                "status": status,
                "explanation": expl,
                "spread_points": spread,
                "source": PGDA_URL,
                "data": path,
                "rows": N_RANDOM,
                "timing_s": round(t_masks, 1),
            }
        )
    return out[0], out[1]


# ---------------------------------------------------------------------------------------------------------
# 4: Gläser et al. 2014, connecting ridge
# ---------------------------------------------------------------------------------------------------------


def check_glaser() -> dict:
    """Best point on the Shackleton-de Gerlache connecting ridge (LROC ridge DTM extent: lat -89.63 to -89.37,
    lon 209.81E to 239.10E) vs Glaser et al. 2014: 92.27% at 2 m, 95.65% at 10 m over 19 years."""
    sun_t, earth_t = long_table()
    cache = CACHE / "ridge_masks.npz"
    if cache.exists():
        z = np.load(cache)
        lat, lon, ground, masks = z["lat"], z["lon"], z["ground"], z["masks"]
    else:
        lats = np.linspace(-89.63, -89.37, 14)
        lons = np.linspace(209.81, 239.10, 14) - 360.0
        lat, lon = (a.ravel() for a in np.meshgrid(lats, lons))
        xs = np.array([D.ll_to_xy(a, b, D.R_REF_M)[0] for a, b in zip(lat, lon, strict=True)])
        ys = np.array([D.ll_to_xy(a, b, D.R_REF_M)[1] for a, b in zip(lat, lon, strict=True)])
        from . import regions as R

        near, rings = R.load_terrain(xs, ys, 20)
        masks, ground = Hz.compute_masks(lat, lon, near, rings, (2.0, 10.0), R.NEAR_KM)
        np.savez(cache, lat=lat, lon=lon, ground=ground, masks=masks)
    from . import regions as R

    rows = []
    best = {}
    for hh, h_m, pub in ((0, 2.0, 92.27), (1, 10.0, 95.65)):
        sf, _ = series_for(masks[:, hh, :], lat, lon, ground, h_m, sun_t, earth_t)
        lit = 100.0 * (sf >= 0.5).mean(axis=1)
        seeds = np.argsort(-lit)[:2]
        coarse_best = float(lit[seeds[0]])
        # 25 m search, +-300 m around the two best coarse points (cached)
        cand = []
        for k in seeds:
            fpath = CACHE / f"ridge_fine_{hh}_{int(k)}.npz"
            if fpath.exists():
                z = np.load(fpath)
                ll, fm, fg = z["ll"], z["m"], z["g"]
            else:
                cx, cy = D.ll_to_xy(lat[k], lon[k], D.R_REF_M)
                off = np.arange(-300.0, 301.0, 25.0)
                xs, ys = (a.ravel() for a in np.meshgrid(cx + off, cy + off))
                ll = np.array([D.xy_to_ll(x, y, D.R_REF_M) for x, y in zip(xs, ys, strict=True)])
                near, rings = R.load_terrain(xs, ys, 20)
                fm, fg = Hz.compute_masks(ll[:, 0], ll[:, 1], near, rings, (2.0, 10.0), R.NEAR_KM)
                np.savez(fpath, ll=ll, m=fm, g=fg)
            fsf, _ = series_for(fm[:, hh, :], ll[:, 0], ll[:, 1], fg, h_m, sun_t, earth_t)
            flit = 100.0 * (fsf >= 0.5).mean(axis=1)
            j = int(np.argmax(flit))
            cand.append(
                (flit[j], 100.0 * (fsf[j] > 0).mean(), 100.0 * fsf[j].mean(), ll[j], fm[j, hh], fg[j])
            )
        b = max(cand, key=lambda c: c[0])
        best[h_m] = b
        rows.append(
            {
                "observer_m": h_m,
                "published_pct": pub,
                "coarse_grid_best_half_disc_pct": coarse_best,
                "fine_search_best_half_disc_pct": float(b[0]),
                "same_point_any_part_pct": float(b[1]),
                "same_point_mean_disc_pct": float(b[2]),
                "best_lat_deg": float(b[3][0]),
                "best_lon_deg": float(b[3][1]),
                "coarse_points": int(lat.size),
                "fine_points": 2 * 625,
            }
        )
    # Review note 001, test 3: bias of the +-0.25 deg bin rule at the best points (rule vs no widening)
    bias = {}
    for h_m, b in best.items():
        lat1, lon1 = np.array([b[3][0]]), np.array([b[3][1]])
        x1, y1 = D.ll_to_xy(lat1[0], lon1[0], D.R_REF_M)
        near, rings = R.load_terrain(np.array([x1]), np.array([y1]), 20)
        hh = 0 if h_m == 2.0 else 1
        out = []
        for window in (Hz.WINDOW_DEG, 0.0):
            mm = _masks_with_window(window, lat1, lon1, near, rings)
            fsf, _ = series_for(mm[:, hh, :], lat1, lon1, np.array([b[5]]), h_m, sun_t, earth_t)
            out.append(100.0 * (fsf >= 0.5).mean())
        bias[h_m] = out[1] - out[0]
        rows[hh]["bin_rule_bias_points"] = float(-bias[h_m])
    d2 = best[2.0][0] - 92.27
    d10 = best[10.0][0] - 95.65
    a2 = best[2.0][1] - 92.27
    a10 = best[10.0][1] - 95.65
    ok = abs(d2) <= 2 and abs(d10) <= 2
    return {
        "id": "glaser_ridge",
        "title": "Best point on the connecting ridge vs Gläser et al. (2014)",
        "what": f"Highest share of hours lit over 18.6 years on LROC's connecting-ridge terrain-model extent ({lat.size} points, then a 25 m search around the two best), at 2 m and 10 m; vs 92.27% and 95.65% (Gläser et al. 2014, 19 years, 20 m terrain).",
        "value": float(max(abs(d2), abs(d10))),
        "unit": "points",
        "value_label": "largest gap to the published value (half-disc rule)",
        "pass_mark": "within 2 points at both heights, or the gap explained",
        "status": "pass" if ok else "partial",
        "explanation": (
            f"Half the disc visible (our 'lit' rule): {best[2.0][0]:.2f}% at 2 m ({d2:+.2f}), {best[10.0][0]:.2f}% at 10 m ({d10:+.2f}). "
            f"Any part of the disc visible, same points: {best[2.0][1]:.2f}% ({a2:+.2f}) and {best[10.0][1]:.2f}% ({a10:+.2f}). "
            f"Gläser's exact definition of 'sunlit' was not checked (the paper was not accessible here), so both are shown. "
            f"The coarse grid alone gave {rows[0]['coarse_grid_best_half_disc_pct']:.1f}% and {rows[1]['coarse_grid_best_half_disc_pct']:.1f}%: a 2 m observer is very sensitive to standing exactly on the crest. "
            f"Our bin rule (review note 001) lowers the lit share by only {bias[2.0]:.2f} and {bias[10.0]:.2f} points here. "
            "Other differences: newer 2023 terrain, an 18.6-year period starting 2009-07-13, and a search limited to two neighbourhoods."
        ),
        "source": "https://ui.adsabs.harvard.edu/abs/2014Icar..243...78G",
        "data": _write_csv("glaser_ridge", rows),
        "rows": len(rows),
    }


def hz_variant(window_deg: float | None = None, s0_px: float | None = None):
    """The horizon engine recompiled with a different bin-window half-width or near-field start (measurement
    only, for sensitivity runs; the shipped engine is never changed)."""
    import inspect
    import sys
    import types

    if window_deg is None and s0_px is None:
        return Hz
    name = f"sunsight._hz_w{window_deg}_s{s0_px}".replace(".", "_").replace("-", "m")
    mod = sys.modules.get(name)
    if mod is None:
        src = inspect.getsource(Hz).replace("cache=True", "cache=False")
        if window_deg is not None:
            src = src.replace("WINDOW_DEG = BIN_DEG", f"WINDOW_DEG = {window_deg}")
        if s0_px is not None:
            src = src.replace("s0_km = 0.5 * p_m / 1000.0", f"s0_km = {s0_px} * p_m / 1000.0")
        mod = types.ModuleType(name)
        mod.__dict__["__package__"] = "sunsight"
        sys.modules[name] = mod
        exec(compile(src, name, "exec"), mod.__dict__)
    return mod


def _masks_with_window(window_deg: float, lat, lon, near, rings) -> np.ndarray:
    mod = hz_variant(None if window_deg == Hz.WINDOW_DEG else window_deg)
    return mod.compute_masks(lat, lon, near, rings, (2.0, 10.0), 5.0)[0]


# ---------------------------------------------------------------------------------------------------------
# Review note 002 B and C: refined best-lit point and a sensitivity budget
# ---------------------------------------------------------------------------------------------------------


def refine_point(lat0: float, lon0: float, radius_m: float = 300.0, step_m: float = 20.0) -> dict:
    """Highest 10 m sunlight (half-disc rule, 18.6 years) on a 20 m grid within radius_m of a nominal point."""
    from . import missgrid as MG
    from . import regions as R

    sun_t, earth_t = long_table()
    offs = [
        (e, n)
        for e in np.arange(-radius_m, radius_m + 1, step_m)
        for n in np.arange(-radius_m, radius_m + 1, step_m)
        if math.hypot(e, n) <= radius_m + 1e-9
    ]
    ll = np.array([MG.destination(lat0, lon0, e, n) for e, n in offs])
    xs = np.array([D.ll_to_xy(a, b, D.R_REF_M)[0] for a, b in ll])
    ys = np.array([D.ll_to_xy(a, b, D.R_REF_M)[1] for a, b in ll])
    near, rings = R.load_terrain(xs, ys, 20)
    m, g = Hz.compute_masks(ll[:, 0], ll[:, 1], near, rings, (2.0, 10.0), R.NEAR_KM)
    lit = {}
    for hh, h_m in ((0, 2.0), (1, 10.0)):
        sf, _ = series_for(m[:, hh, :], ll[:, 0], ll[:, 1], g, h_m, sun_t, earth_t)
        lit[h_m] = 100.0 * (sf >= 0.5).mean(axis=1)
    k = int(np.argmax(lit[10.0]))
    centre = int(np.argmin([math.hypot(e, n) for e, n in offs]))
    return {
        "lat_deg": float(ll[k, 0]),
        "lon_deg": float(ll[k, 1]),
        "east_m": float(offs[k][0]),
        "north_m": float(offs[k][1]),
        "offset_m": float(math.hypot(*offs[k])),
        "ground_m": float(g[k]),
        "lit_10m_pct": float(lit[10.0][k]),
        "lit_2m_pct": float(lit[2.0][k]),
        "nominal_lit_10m_pct": float(lit[10.0][centre]),
        "nominal_lit_2m_pct": float(lit[2.0][centre]),
        "min_lit_10m_pct_within_radius": float(lit[10.0].min()),
        "points": len(offs),
        "method": f"highest share of hours with at least half the Sun's disc visible at 10 m over 18.6 years, on a {step_m:.0f} m grid within {radius_m:.0f} m of the cited point",
    }


def sensitivity(lat: float, lon: float, coarse_pct: float) -> list[dict]:
    """Points of sunlight (2 m, half-disc, 18.6 years) at one point when one setting changes."""
    from . import regions as R

    sun_t, earth_t = long_table()
    table = _table()
    x, y = D.ll_to_xy(lat, lon, D.R_REF_M)
    near, rings = R.load_terrain(np.array([x]), np.array([y]), 20)
    la, lo = np.array([lat]), np.array([lon])

    def lit(hz, rule="half", span="long") -> float:
        m, g = hz.compute_masks(la, lo, near, rings, (2.0, 10.0), 5.0)
        if span == "long":
            sf, _ = series_for(m[:, 0, :], la, lo, g, 2.0, sun_t, earth_t)
        else:
            sf, _ = series_for(m[:, 0, :], la, lo, g, 2.0, table[:, 0:3], table[:, 3:6])
        return float(100.0 * ((sf > 0) if rule == "any" else (sf >= 0.5)).mean())

    base = lit(Hz)
    rows = [
        {
            "change": "Baseline: shipped engine, 2 m, half the disc, 18.6 years from 2009-07-13",
            "lit_pct": base,
            "delta_points": 0.0,
        }
    ]
    for label, hz, rule, span in (
        ("Near-field rays start 1 pixel out (baseline 0.5)", hz_variant(s0_px=1.0), "half", "long"),
        ("Near-field rays start 2 pixels out", hz_variant(s0_px=2.0), "half", "long"),
        (
            "Bin rule: nearest-bin filling (±0.125°) instead of review note 001's ±0.25°",
            hz_variant(window_deg=0.125),
            "half",
            "long",
        ),
        ("Bin rule: no widening at all", hz_variant(window_deg=0.0), "half", "long"),
        ("Threshold: any part of the disc counts as lit", Hz, "any", "long"),
        ("Time span: 2027-2030 (the app's table) instead of 18.6 years", Hz, "half", "table"),
    ):
        v = lit(hz, rule, span)
        rows.append({"change": label, "lit_pct": v, "delta_points": v - base})
    # Search limited to 100 km (the 240 m ring stops at 100 km instead of 300 km)
    short = [Hz.Ring(r.grid, r.rmin_km, min(r.rmax_km, 100.0)) for r in rings]
    m, g = Hz.compute_masks(la, lo, near, short, (2.0, 10.0), 5.0)
    sf, _ = series_for(m[:, 0, :], la, lo, g, 2.0, sun_t, earth_t)
    v = float(100.0 * (sf >= 0.5).mean())
    rows.append(
        {"change": "Terrain search stops at 100 km instead of 300 km", "lit_pct": v, "delta_points": v - base}
    )
    # Coarser terrain: the 80 m map for the near field and out to 20 km
    near80, rings80 = R.load_terrain(np.array([x]), np.array([y]), 80)
    rings80 = [Hz.Ring(rings80[1].grid, 5.0, 20.0), *rings80[1:]]
    m, g = Hz.compute_masks(la, lo, near80, rings80, (2.0, 10.0), 5.0)
    sf, _ = series_for(m[:, 0, :], la, lo, g, 2.0, sun_t, earth_t)
    v = float(100.0 * (sf >= 0.5).mean())
    rows.append(
        {
            "change": "Coarser terrain: 80 m map near the site instead of 20 m",
            "lit_pct": v,
            "delta_points": v - base,
        }
    )
    rows.append(
        {
            "change": "Grid: best point of the ~240 m validation grid instead of this refined point",
            "lit_pct": coarse_pct,
            "delta_points": coarse_pct - base,
        }
    )
    return rows


def run_refinement() -> dict:
    sites = {
        s["id"]: s
        for s in json.loads((REPO_ROOT / "pipeline" / "data" / "curated_sites.json").read_text())["sites"]
    }
    out = {}
    for sid in ("shackleton_ridge_rim",):
        s = sites[sid]
        out[sid] = refine_point(s["lat_deg"], s["lon_deg"])
    write_json(
        REPO_ROOT / "pipeline" / "data" / "refined_points.json",
        {
            "note": "SI-generated by the SunSight pipeline (validate.run_refinement). Computed, not cited: the cited coordinates stay in curated_sites.json.",
            "points": out,
        },
    )
    return out


def check_sensitivity() -> dict:
    g = list(csv.DictReader((OUT / "glaser_ridge.csv").open()))[0]
    rows = sensitivity(
        float(g["best_lat_deg"]), float(g["best_lon_deg"]), float(g["coarse_grid_best_half_disc_pct"])
    )
    _write_csv("sensitivity", rows)
    return {
        "point": {
            "lat_deg": float(g["best_lat_deg"]),
            "lon_deg": float(g["best_lon_deg"]),
            "label": "best 2 m point found on the connecting ridge (check 4)",
        },
        "data": "validation/sensitivity.csv",
        "rows": rows,
    }


# ---------------------------------------------------------------------------------------------------------
# 7: physics sanity, 8: known places
# ---------------------------------------------------------------------------------------------------------


def _short(label: str) -> str:
    """Drop a trailing explanatory parenthesis, but keep (min) and (max)."""
    if label.endswith(("(min)", "(max)")) or " (" not in label:
        return label
    return label.rsplit(" (", 1)[0]


def _crossings(t_h: np.ndarray, v: np.ndarray) -> np.ndarray:
    s = np.sign(v)
    k = np.where((s[:-1] < 0) & (s[1:] >= 0))[0]
    return t_h[k] - v[k] * (t_h[k + 1] - t_h[k]) / (v[k + 1] - v[k])


def check_sanity() -> dict:
    table = _table()
    t_h = np.arange(table.shape[0], dtype=float)
    pole = np.array(L.site_vector(-90.0, 0.0, 0.0))
    rows = []

    def add(name, value, unit, mark, ok):
        rows.append(
            {
                "check": name,
                "value": value,
                "unit": unit,
                "pass_mark": mark,
                "status": "pass" if ok else "fail",
            }
        )

    d = table[:, 0:3] - pole
    sun_el = np.degrees(np.arcsin(-d[:, 2] / np.linalg.norm(d, axis=1)))
    add(
        "Sun centre at the pole stays within about ±1.6° (flat terrain)",
        float(np.abs(sun_el).max()),
        "deg",
        "≤ 1.6",
        np.abs(sun_el).max() <= 1.6,
    )
    sub_lat = np.degrees(np.arcsin(table[:, 2] / np.linalg.norm(table[:, 0:3], axis=1)))
    per = float(np.diff(_crossings(t_h, sub_lat)).mean() / 24)
    add(
        "Sun's seasonal cycle at the pole (sub-solar latitude period)",
        per,
        "days",
        "about 346.6",
        abs(per - 346.6) < 3,
    )
    sun_lon = np.arctan2(table[:, 1], table[:, 0])
    syn = float(np.diff(_crossings(t_h, np.sin(sun_lon))).mean() / 24) * 1.0
    # sin(lon) crosses upward once per lunar day
    add("Sun's azimuth makes a full circle (lunar day)", syn, "days", "about 29.53", abs(syn - 29.53) < 0.3)
    e = table[:, 3:6] - pole
    earth_el = np.degrees(np.arcsin(-e[:, 2] / np.linalg.norm(e, axis=1)))
    sub_e = np.degrees(np.arcsin(table[:, 5] / np.linalg.norm(table[:, 3:6], axis=1)))
    drac = float(np.diff(_crossings(t_h, sub_e)).mean() / 24)
    add(
        "Earth's elevation at the pole: swing",
        float(earth_el.max() - earth_el.min()) / 2,
        "deg (half range)",
        "about 6.7",
        6.0 < (earth_el.max() - earth_el.min()) / 2 < 7.5,
    )
    add("Earth's elevation at the pole: period", drac, "days", "about 27.2", abs(drac - 27.21) < 0.3)
    rs = 2 * np.degrees(np.arcsin(695_700.0 / np.linalg.norm(d, axis=1)))
    re_ = 2 * np.degrees(np.arcsin(6371.0 / np.linalg.norm(e, axis=1)))
    add("Sun's apparent width (min)", float(rs.min()), "deg", "≥ 0.52", rs.min() >= 0.52)
    add("Sun's apparent width (max)", float(rs.max()), "deg", "≤ 0.545", rs.max() <= 0.545)
    add(
        "Earth's apparent width (min)",
        float(re_.min()),
        "deg",
        "≈ 1.8 (1.794 at the 407,000 km envelope)",
        re_.min() >= 1.7937,
    )
    add("Earth's apparent width (max)", float(re_.max()), "deg", "≤ 2.05", re_.max() <= 2.051)
    # synthetic terrain and light-maths tests from the test suite
    res = subprocess.run(
        [
            sys.executable,
            "-m",
            "pytest",
            "-q",
            "tests/test_horizon.py",
            "tests/test_light.py",
            "tests/test_frames.py",
        ],
        cwd=REPO_ROOT / "pipeline",
        capture_output=True,
        text=True,
    )
    last = res.stdout.strip().splitlines()[-1] if res.stdout.strip() else res.stderr[-200:]
    add(
        f"Synthetic terrain, light maths and frame tests ({last})",
        0.0 if res.returncode == 0 else 1.0,
        "failures",
        "0",
        res.returncode == 0,
    )
    fails = [r for r in rows if r["status"] != "pass"]
    return {
        "id": "physics_sanity",
        "title": "Physics sanity tests",
        "what": "Seasons, lunar day, Earth's wobble, apparent sizes from the 2027-2030 table, plus the synthetic-terrain, light and frame test suites (smooth-Moon dip, walls, 90° rotation, far spike, MOON_ME vs MOON_PA, SPICE agreement).",
        "value": float(len(rows) - len(fails)),
        "unit": f"of {len(rows)} pass",
        "value_label": "checks passed",
        "pass_mark": "all pass",
        "status": "pass" if not fails else "fail",
        "explanation": (
            "All pass. " if not fails else "Failed: " + "; ".join(r["check"] for r in fails) + ". "
        )
        + "Measured: "
        + "; ".join(f"{_short(r['check'])}: {r['value']:.3f} {r['unit']}" for r in rows[:-1])
        + ".",
        "data": _write_csv("physics_sanity", rows),
        "rows": len(rows),
    }


def check_known_places() -> dict:
    meta = json.loads((DATA_OUT / "regions" / "shackleton.json").read_text())
    n = len(meta["points"])
    masks = decode_masks((DATA_OUT / "regions" / "shackleton.masks.bin").read_bytes(), n, 2, BIN_COUNT)
    sun_t, earth_t = long_table()
    lat = np.array([p["lat_deg"] for p in meta["points"]])
    lon = np.array([p["lon_deg"] for p in meta["points"]])
    hgt = np.array([p["height_m"] for p in meta["points"]])
    sf, _ = series_for(masks[:, 0, :], lat, lon, hgt, 2.0, sun_t, earth_t)
    lit = (sf >= 0.5).mean(axis=1)
    sites = {s["id"]: s for s in json.loads((DATA_OUT / "sites.json").read_text())["sites"]}
    floor = int(sites["shackleton_crater"]["region_point_id"][1:])
    rim = int(sites["shackleton_ridge_rim"]["region_point_id"][1:])
    with rasterio.open(PGDA_LPSR) as ds:
        lpsr = ds.read(1)
        tr = ds.transform
        scale, offset = ds.scales[0], ds.offsets[0]
    agree = 0
    psr_n = 0
    for k, p in enumerate(meta["points"]):
        c = int((p["map_x_m"] - tr.c) / tr.a)
        r = int((p["map_y_m"] - tr.f) / tr.e)
        v = lpsr[r, c] * scale + offset
        if v >= 0.5:  # permanent shadow in PGDA's map
            psr_n += 1
            agree += lit[k] == 0.0
    # The cited ridge/rim coordinate is the centre of its miss grid (the region point p{rim} is a stand-in nearby).
    mg = json.loads((DATA_OUT / "miss" / "shackleton_ridge_rim.json").read_text())
    centre = next(i for i, p in enumerate(mg["points"]) if p["east_m"] == 0.0 and p["north_m"] == 0.0)
    cp = mg["points"][centre]
    mm = decode_masks(
        (DATA_OUT / "miss" / "shackleton_ridge_rim.masks.bin").read_bytes(), len(mg["points"]), 2, BIN_COUNT
    )
    csf, _ = series_for(
        mm[centre : centre + 1, 0, :],
        np.array([cp["lat_deg"]]),
        np.array([cp["lon_deg"]]),
        np.array([cp["height_m"]]),
        2.0,
        sun_t,
        earth_t,
    )
    cited_lit = float((csf >= 0.5).mean())
    rank = 100.0 * (lit > cited_lit).mean()
    floor_off = sites["shackleton_crater"].get("region_point_offset_m", 0.0)
    rim_off = sites["shackleton_ridge_rim"].get("region_point_offset_m", 0.0)
    rows = [
        {
            "place": f"Shackleton crater floor (region point {floor_off:.0f} m from the USGS Gazetteer centre)",
            "point": f"p{floor}",
            "our_lit_pct_18_6_years_2m": 100 * lit[floor],
            "expectation": "about 0%",
        },
        {
            "place": "Shackleton-de Gerlache ridge at Shackleton's rim, at the LROC coordinates (miss-grid centre, 10 m map)",
            "point": f"miss grid {cp['id']}",
            "our_lit_pct_18_6_years_2m": 100 * cited_lit,
            "expectation": f"among the best; higher than all but {rank:.1f}% of the {n} region points",
        },
        {
            "place": f"Nearest Shackleton-region point to that ridge site ({rim_off:.0f} m away)",
            "point": f"p{rim}",
            "our_lit_pct_18_6_years_2m": 100 * lit[rim],
            "expectation": "context: a few hundred metres changes sunlight a lot here",
        },
        {
            "place": "Region points in PGDA permanent shadow (LPSR map)",
            "point": f"{psr_n} points",
            "our_lit_pct_18_6_years_2m": 100.0 * agree / max(psr_n, 1),
            "expectation": "share of those points we also find never lit",
        },
    ]
    ok = lit[floor] < 0.01 and rank <= 10.0 and (psr_n == 0 or agree / psr_n >= 0.9)
    return {
        "id": "known_places",
        "title": "Known places: shadowed floors and lit ridges",
        "what": "Shackleton's floor, the Shackleton end of the connecting ridge, and every Shackleton-region point that NASA's permanent-shadow map (LPSR_85S_060M) marks as shadowed.",
        "value": 100.0 * agree / max(psr_n, 1),
        "unit": "%",
        "value_label": "PGDA shadowed points we also find never lit",
        "pass_mark": "floor ~0%; ridge in the top 10%; ≥ 90% agreement on permanent shadow",
        "status": "pass" if ok else "fail",
        "explanation": f"Floor point lit {100 * lit[floor]:.2f}% of 18.6 years; the ridge at LROC's coordinates {100 * cited_lit:.1f}% (above all but {rank:.1f}% of region points; the nearest region point, {rim_off:.0f} m away, only {100 * lit[rim]:.1f}%); {agree} of {psr_n} PGDA permanently shadowed points are never lit in our run.",
        "data": _write_csv("known_places", rows),
        "rows": len(rows),
    }


LIMITS = [
    "Terrain maps cannot see boulders or craters smaller than a few pixels (20 m map; 10 m near miss-test targets).",
    "Earth contact is geometry only: line of sight and elevation, not signal strength or data rate.",
    "The Deep Space Network is a reference choice; commercial landers often use other stations.",
    "Sites outside the south polar terrain grids use a smooth horizon and say so.",
    "NASA's terrain error maps are not yet folded into error bars.",
    "The miss-test share treats every point in the circle as equally likely; it is not a landing probability.",
    "Horizon bins are widened by up to 0.25° so no peak is missed (review note 001); this biases sunlight slightly low.",
]


ORDER = [
    "ephemeris_horizons",
    "sunlight_pgda",
    "earth_pgda",
    "glaser_ridge",
    "eclipses",
    "station_geometry",
    "physics_sanity",
    "known_places",
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--only", nargs="*", default=None, help="check groups: ephemeris eclipses sanity known glaser pgda"
    )
    groups = ap.parse_args().only or ["ephemeris", "eclipses", "sanity", "known", "glaser", "pgda"]
    path = OUT / "summary.json"
    have = {c["id"]: c for c in json.loads(path.read_text())["checks"]} if path.exists() else {}
    ensure_illum()
    t0 = time.time()
    sens = json.loads(path.read_text()).get("sensitivity") if path.exists() else None
    if "sensitivity" in groups:
        sens = check_sensitivity()
        groups = [g for g in groups if g != "sensitivity"]
    if "refine" in groups:
        print(json.dumps(run_refinement(), indent=1))
        groups = [g for g in groups if g != "refine"]
    runners = {
        "ephemeris": check_ephemeris,
        "eclipses": check_eclipses,
        "sanity": check_sanity,
        "known": check_known_places,
        "glaser": check_glaser,
        "pgda": check_pgda,
    }
    for g in groups:
        res = runners[g]()
        for c in res if isinstance(res, tuple) else (res,):
            have[c["id"]] = c
        print(g, "done", round(time.time() - t0), "s")
    checks = [
        have.get(
            i,
            {
                "id": i,
                "title": i.replace("_", " "),
                "what": "",
                "value": None,
                "unit": "",
                "value_label": "",
                "pass_mark": "",
                "status": "not run",
                "explanation": "Not run yet.",
                "data": None,
                "rows": 0,
            },
        )
        for i in ORDER
    ]
    summary = {
        "generated_utc": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "checks": checks,
        "limits": LIMITS,
    }
    if sens:
        summary["sensitivity"] = sens
    write_json(OUT / "summary.json", summary)
    for c in checks:
        print(f"{c['id']:20s} {c['status']:8s} {c['value']!r} {c['unit']}")


if __name__ == "__main__":
    main()
