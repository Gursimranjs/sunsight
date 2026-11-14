# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Horizon masks: the highest terrain elevation in each of 1,440 azimuth bins, for two observer heights.

Bin rule (review note 001, DECISIONS #16): mask[k] is the highest terrain elevation anywhere in the azimuth
window [k*0.25 - 0.25, k*0.25 + 0.25] degrees, the support of bin k's weight in light.horizon_at. Linear
read-back can then never under-read a peak; obstacles widen by up to 0.25 degrees (the safe direction).

Geometry is 3D in MOON_ME: map position -> latitude/longitude (the file's own projection) -> point at
1737.4 km + height. Azimuth is clockwise from local north in each observer's east-north-up frame.

- Near field (< near_km, default 5 km): rays every 0.05 degrees, stepped every quarter pixel through the finest
  map with bilinear heights. A ray at azimuth a raises bins whose window contains [a - 0.025, a + 0.025].
- Far field: every pixel centre in a ring raises every bin its angular extent touches. The extent is the
  pixel's circumscribed half-width (sqrt(2)/2 * true pixel size / horizontal distance), true size being the
  map pixel divided by the projection's scale factor.
- Both observer heights come from one pass: raising the observer moves it along local up only, so azimuths
  are shared and elevation angles are recomputed.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from numba import njit, prange

from .contracts import BIN_COUNT, MOON_RADIUS_KM

BIN_DEG = 360.0 / BIN_COUNT
WINDOW_DEG = BIN_DEG  # half-width of a bin's support in horizon_at
RAY_STEP_DEG = 0.05
NEG = -90.0


@dataclass
class Grid:
    """A terrain grid in south polar stereographic metres. z_m[0, 0] is centred at (x0_m, y0_m); columns
    go +x, rows go -y. Heights in metres above the 1737.4 km sphere; NaN = no data."""

    z_m: np.ndarray
    x0_m: float
    y0_m: float
    pixel_m: float
    sphere_r_m: float = MOON_RADIUS_KM * 1000.0


@dataclass
class Ring:
    grid: Grid
    rmin_km: float
    rmax_km: float


# ---------------------------------------------------------------------------------------------------------
# Small geometry kernels (scalar, numba)
# ---------------------------------------------------------------------------------------------------------


@njit(cache=True)
def _unit_to_xy(ux: float, uy: float, uz: float, r_m: float) -> tuple[float, float]:
    lat = math.asin(max(-1.0, min(1.0, uz)))
    lon = math.atan2(uy, ux)
    rho = 2.0 * r_m * math.tan(math.pi / 4.0 + lat / 2.0)
    return rho * math.sin(lon), rho * math.cos(lon)


@njit(cache=True)
def _bilinear(z: np.ndarray, x0: float, y0: float, p: float, x: float, y: float) -> float:
    fc = (x - x0) / p
    fr = (y0 - y) / p
    c = int(math.floor(fc))
    r = int(math.floor(fr))
    if r < 0 or c < 0 or r + 1 >= z.shape[0] or c + 1 >= z.shape[1]:
        return math.nan
    u = fc - c
    v = fr - r
    return (
        (1 - u) * (1 - v) * z[r, c]
        + u * (1 - v) * z[r, c + 1]
        + (1 - u) * v * z[r + 1, c]
        + u * v * z[r + 1, c + 1]
    )


@njit(cache=True)
def _raise_bins(mask: np.ndarray, i: int, az_deg: float, half_deg: float, el_a: float, el_b: float) -> None:
    lo = int(math.ceil((az_deg - half_deg - WINDOW_DEG) / BIN_DEG))
    hi = int(math.floor((az_deg + half_deg + WINDOW_DEG) / BIN_DEG))
    for k in range(lo, hi + 1):
        kk = k % BIN_COUNT
        if el_a > mask[i, 0, kk]:
            mask[i, 0, kk] = el_a
        if el_b > mask[i, 1, kk]:
            mask[i, 1, kk] = el_b


# ---------------------------------------------------------------------------------------------------------
# Near field: ray marching with bilinear heights
# ---------------------------------------------------------------------------------------------------------


@njit(parallel=True, cache=True)
def _near_field(
    mask: np.ndarray,
    up: np.ndarray,
    east: np.ndarray,
    north: np.ndarray,
    r_obs_km: np.ndarray,  # (n, 2) observer radius for the two heights
    z: np.ndarray,
    x0: float,
    y0: float,
    p_m: float,
    sphere_r_m: float,
    near_km: float,
) -> None:
    n_obs = up.shape[0]
    n_rays = int(round(360.0 / RAY_STEP_DEG))
    r_ref_km = MOON_RADIUS_KM
    ds_km = 0.25 * p_m / 1000.0
    s0_km = 0.5 * p_m / 1000.0
    n_steps = int((near_km - s0_km) / ds_km) + 1
    for i in prange(n_obs):
        ux, uy, uz = up[i, 0], up[i, 1], up[i, 2]
        for r in range(n_rays):
            a = math.radians(r * RAY_STEP_DEG)
            dx = math.cos(a) * north[i, 0] + math.sin(a) * east[i, 0]
            dy = math.cos(a) * north[i, 1] + math.sin(a) * east[i, 1]
            dz = math.cos(a) * north[i, 2] + math.sin(a) * east[i, 2]
            best_a = NEG
            best_b = NEG
            for j in range(n_steps):
                s = s0_km + j * ds_km
                th = s / r_ref_km
                c = math.cos(th)
                sn = math.sin(th)
                vx = c * ux + sn * dx
                vy = c * uy + sn * dy
                vz = c * uz + sn * dz
                mx, my = _unit_to_xy(vx, vy, vz, sphere_r_m)
                h = _bilinear(z, x0, y0, p_m, mx, my)
                if math.isnan(h):
                    continue
                rr = r_ref_km + h / 1000.0
                qx, qy, qz = rr * vx, rr * vy, rr * vz
                for hh in range(2):
                    ro = r_obs_km[i, hh]
                    ex = qx - ro * ux
                    ey = qy - ro * uy
                    ez = qz - ro * uz
                    dist = math.sqrt(ex * ex + ey * ey + ez * ez)
                    el = math.degrees(math.asin((ex * ux + ey * uy + ez * uz) / dist))
                    if hh == 0:
                        if el > best_a:
                            best_a = el
                    elif el > best_b:
                        best_b = el
            if best_a > NEG:
                _raise_bins(mask, i, r * RAY_STEP_DEG, 0.5 * RAY_STEP_DEG, best_a, best_b)


# ---------------------------------------------------------------------------------------------------------
# Far field: every pixel raises every bin it covers
# ---------------------------------------------------------------------------------------------------------


def pixel_points(g: Grid) -> tuple[np.ndarray, np.ndarray]:
    """3D points (km) of every valid pixel centre and their circumscribed half-size in km (true size)."""
    ny, nx = g.z_m.shape
    xs = g.x0_m + g.pixel_m * np.arange(nx)
    ys = g.y0_m - g.pixel_m * np.arange(ny)
    x, y = np.meshgrid(xs, ys)
    ok = np.isfinite(g.z_m)
    x, y, z = x[ok], y[ok], g.z_m[ok]
    rho = np.hypot(x, y)
    lat = 2.0 * np.arctan(rho / (2.0 * g.sphere_r_m)) - np.pi / 2.0
    lon = np.arctan2(x, y)
    rr = MOON_RADIUS_KM + z / 1000.0
    pts = np.stack([rr * np.cos(lat) * np.cos(lon), rr * np.cos(lat) * np.sin(lon), rr * np.sin(lat)], axis=1)
    k = 2.0 / (1.0 - np.sin(lat))  # stereographic scale factor (true scale at the south pole)
    half_km = (math.sqrt(2.0) / 2.0) * (g.pixel_m / k) / 1000.0
    return np.ascontiguousarray(pts), np.ascontiguousarray(half_km)


@njit(parallel=True, cache=True)
def _far_field(
    mask: np.ndarray,
    up: np.ndarray,
    east: np.ndarray,
    north: np.ndarray,
    r_obs_km: np.ndarray,
    pts: np.ndarray,
    half_km: np.ndarray,
    rmin_km: float,
    rmax_km: float,
) -> None:
    n_obs = up.shape[0]
    n_pts = pts.shape[0]
    rmin2 = rmin_km * rmin_km
    rmax2 = rmax_km * rmax_km
    for i in prange(n_obs):
        ux, uy, uz = up[i, 0], up[i, 1], up[i, 2]
        px, py, pz = r_obs_km[i, 0] * ux, r_obs_km[i, 0] * uy, r_obs_km[i, 0] * uz
        dh = r_obs_km[i, 1] - r_obs_km[i, 0]
        for j in range(n_pts):
            ex = pts[j, 0] - px
            ey = pts[j, 1] - py
            ez = pts[j, 2] - pz
            d2 = ex * ex + ey * ey + ez * ez
            if d2 < rmin2 or d2 > rmax2:
                continue
            e = ex * east[i, 0] + ey * east[i, 1] + ez * east[i, 2]
            nn = ex * north[i, 0] + ey * north[i, 1] + ez * north[i, 2]
            u = ex * ux + ey * uy + ez * uz
            hor = math.sqrt(e * e + nn * nn)
            dist = math.sqrt(d2)
            el_a = math.degrees(math.asin(u / dist))
            u2 = u - dh
            el_b = math.degrees(math.asin(u2 / math.sqrt(hor * hor + u2 * u2)))
            az = math.degrees(math.atan2(e, nn))
            half_deg = math.degrees(half_km[j] / hor)
            _raise_bins(mask, i, az, half_deg, el_a, el_b)


def pixel_grid_points(g: Grid) -> tuple[np.ndarray, np.ndarray]:
    """Like pixel_points but kept on the grid: (ny, nx, 3) points in km (NaN where no data) and (ny, nx)
    half-sizes in km, so a kernel can visit only the pixels near each observer."""
    ny, nx = g.z_m.shape
    xs = g.x0_m + g.pixel_m * np.arange(nx)
    ys = g.y0_m - g.pixel_m * np.arange(ny)
    x, y = np.meshgrid(xs, ys)
    rho = np.hypot(x, y)
    lat = 2.0 * np.arctan(rho / (2.0 * g.sphere_r_m)) - np.pi / 2.0
    lon = np.arctan2(x, y)
    rr = MOON_RADIUS_KM + g.z_m / 1000.0  # NaN propagates
    pts = np.stack([rr * np.cos(lat) * np.cos(lon), rr * np.cos(lat) * np.sin(lon), rr * np.sin(lat)], axis=2)
    k = 2.0 / (1.0 - np.sin(lat))
    half_km = (math.sqrt(2.0) / 2.0) * (g.pixel_m / k) / 1000.0
    return np.ascontiguousarray(pts), np.ascontiguousarray(half_km)


@njit(parallel=True, cache=True)
def _far_field_grid(
    mask: np.ndarray,
    up: np.ndarray,
    east: np.ndarray,
    north: np.ndarray,
    r_obs_km: np.ndarray,
    obs_xy: np.ndarray,
    pts: np.ndarray,
    half_km: np.ndarray,
    x0: float,
    y0: float,
    p_m: float,
    rmin_km: float,
    rmax_km: float,
) -> None:
    """Same maths as _far_field, visiting only the grid rows and columns within rmax of each observer.
    The map bound is padded by 10% (the stereographic stretch is under 8% north to 60S) plus a pixel."""
    n_obs = up.shape[0]
    ny, nx = half_km.shape
    rmin2 = rmin_km * rmin_km
    rmax2 = rmax_km * rmax_km
    pad_m = rmax_km * 1000.0 * 1.10 + 2.0 * p_m
    for i in prange(n_obs):
        ux, uy, uz = up[i, 0], up[i, 1], up[i, 2]
        px, py, pz = r_obs_km[i, 0] * ux, r_obs_km[i, 0] * uy, r_obs_km[i, 0] * uz
        dh = r_obs_km[i, 1] - r_obs_km[i, 0]
        c0 = max(0, int(math.floor((obs_xy[i, 0] - pad_m - x0) / p_m)))
        c1 = min(nx, int(math.ceil((obs_xy[i, 0] + pad_m - x0) / p_m)) + 1)
        r0 = max(0, int(math.floor((y0 - (obs_xy[i, 1] + pad_m)) / p_m)))
        r1 = min(ny, int(math.ceil((y0 - (obs_xy[i, 1] - pad_m)) / p_m)) + 1)
        for r in range(r0, r1):
            for c in range(c0, c1):
                qx = pts[r, c, 0]
                if math.isnan(qx):
                    continue
                ex = qx - px
                ey = pts[r, c, 1] - py
                ez = pts[r, c, 2] - pz
                d2 = ex * ex + ey * ey + ez * ez
                if d2 < rmin2 or d2 > rmax2:
                    continue
                e = ex * east[i, 0] + ey * east[i, 1] + ez * east[i, 2]
                nn = ex * north[i, 0] + ey * north[i, 1] + ez * north[i, 2]
                u = ex * ux + ey * uy + ez * uz
                hor = math.sqrt(e * e + nn * nn)
                dist = math.sqrt(d2)
                el_a = math.degrees(math.asin(u / dist))
                u2 = u - dh
                el_b = math.degrees(math.asin(u2 / math.sqrt(hor * hor + u2 * u2)))
                az = math.degrees(math.atan2(e, nn))
                half_deg = math.degrees(half_km[r, c] / hor)
                _raise_bins(mask, i, az, half_deg, el_a, el_b)


# ---------------------------------------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------------------------------------


def observer_frames(lat_deg: np.ndarray, lon_deg: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    la, lo = np.radians(lat_deg), np.radians(lon_deg)
    east = np.stack([-np.sin(lo), np.cos(lo), np.zeros_like(lo)], axis=1)
    north = np.stack([-np.sin(la) * np.cos(lo), -np.sin(la) * np.sin(lo), np.cos(la)], axis=1)
    up = np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], axis=1)
    return np.ascontiguousarray(up), np.ascontiguousarray(east), np.ascontiguousarray(north)


def ground_heights(near: Grid, lat_deg: np.ndarray, lon_deg: np.ndarray) -> np.ndarray:
    out = np.empty(len(lat_deg))
    for k, (la, lo) in enumerate(zip(lat_deg, lon_deg, strict=True)):
        u = (
            math.cos(math.radians(la)) * math.cos(math.radians(lo)),
            math.cos(math.radians(la)) * math.sin(math.radians(lo)),
            math.sin(math.radians(la)),
        )
        x, y = _unit_to_xy(u[0], u[1], u[2], near.sphere_r_m)
        out[k] = _bilinear(near.z_m, near.x0_m, near.y0_m, near.pixel_m, x, y)
    return out


def compute_masks(
    lat_deg: np.ndarray,
    lon_deg: np.ndarray,
    near: Grid,
    rings: list[Ring],
    heights_m: tuple[float, float] = (2.0, 10.0),
    near_km: float = 5.0,
    ground_m: np.ndarray | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Masks in degrees, shape (n_points, 2, 1440), and the ground heights used (m)."""
    lat_deg = np.asarray(lat_deg, dtype=np.float64)
    lon_deg = np.asarray(lon_deg, dtype=np.float64)
    up, east, north = observer_frames(lat_deg, lon_deg)
    g = ground_heights(near, lat_deg, lon_deg) if ground_m is None else np.asarray(ground_m, dtype=np.float64)
    if not np.all(np.isfinite(g)):
        raise ValueError("an observer has no ground height in the near-field map")
    r_obs = np.stack(
        [MOON_RADIUS_KM + (g + heights_m[0]) / 1000.0, MOON_RADIUS_KM + (g + heights_m[1]) / 1000.0], axis=1
    )
    mask = np.full((len(lat_deg), 2, BIN_COUNT), NEG)
    _near_field(
        mask, up, east, north, r_obs, near.z_m, near.x0_m, near.y0_m, near.pixel_m, near.sphere_r_m, near_km
    )
    for ring in rings:
        gr = ring.grid
        obs_xy = np.array([_unit_to_xy(up[i, 0], up[i, 1], up[i, 2], gr.sphere_r_m) for i in range(len(up))])
        pts, half = pixel_grid_points(gr)
        _far_field_grid(
            mask,
            up,
            east,
            north,
            r_obs,
            obs_xy,
            pts,
            half,
            gr.x0_m,
            gr.y0_m,
            gr.pixel_m,
            ring.rmin_km,
            ring.rmax_km,
        )
    return mask, g
