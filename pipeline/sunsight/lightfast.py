# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Numba versions of light.py's sun_fraction and disc_fraction for long runs (masks, validation).

The arithmetic is copied from light.py line by line; tests/test_lightfast.py holds them equal to 1e-12.
"""

from __future__ import annotations

import math

import numpy as np
from numba import njit, prange

from .contracts import EARTH_RADIUS_KM, SUN_RADIUS_KM

D2R = math.pi / 180.0
R2D = 180.0 / math.pi


@njit(cache=True)
def horizon_at(mask: np.ndarray, az_deg: float) -> float:
    n = mask.shape[0]
    x = (az_deg % 360.0) * n / 360.0
    k0 = int(math.floor(x))
    f = x - k0
    k0 %= n
    k1 = (k0 + 1) % n
    return (1.0 - f) * mask[k0] + f * mask[k1]


@njit(cache=True)
def wrap180(x: float) -> float:
    return (x + 180.0) % 360.0 - 180.0


@njit(cache=True)
def sun_fraction(mask, az_s, el_s, r_sun, az_e, el_e, r_earth) -> float:
    cos_el = max(math.cos(el_s * D2R), 1e-9)
    delta = wrap180(az_e - az_s) * cos_el
    visible = 0.0
    total = 0.0
    for i in range(15):
        x = r_sun * (2.0 * (i + 0.5) / 15.0 - 1.0)
        c = math.sqrt(max(0.0, r_sun * r_sun - x * x))
        h = horizon_at(mask, az_s + x / cos_el)
        lo = max(el_s - c, h)
        hi = el_s + c
        lit = max(0.0, hi - lo)
        if abs(x - delta) < r_earth:
            ce = math.sqrt(r_earth * r_earth - (x - delta) * (x - delta))
            lit = lit - max(0.0, min(hi, el_e + ce) - max(lo, el_e - ce))
        visible += max(0.0, lit)
        total += 2.0 * c
    return visible / total


@njit(cache=True)
def disc_fraction(mask, az, el, r) -> float:
    cos_el = max(math.cos(el * D2R), 1e-9)
    visible = 0.0
    total = 0.0
    for i in range(15):
        x = r * (2.0 * (i + 0.5) / 15.0 - 1.0)
        c = math.sqrt(max(0.0, r * r - x * x))
        h = horizon_at(mask, az + x / cos_el)
        visible += max(0.0, el + c - max(el - c, h))
        total += 2.0 * c
    return visible / total


@njit(cache=True)
def _az_el(tx, ty, tz, sx, sy, sz, e, n, u):
    dx, dy, dz = tx - sx, ty - sy, tz - sz
    d = math.sqrt(dx * dx + dy * dy + dz * dz)
    s = (dx * u[0] + dy * u[1] + dz * u[2]) / d
    el = math.asin(max(-1.0, min(1.0, s))) * R2D
    az = math.atan2(dx * e[0] + dy * e[1] + dz * e[2], dx * n[0] + dy * n[1] + dz * n[2]) * R2D
    if az < 0.0:
        az += 360.0
    return az, el, d


@njit(parallel=True, cache=True)
def series(masks, sites, east, north, up, sun, earth):
    """Sun fraction and Earth-disc fraction for every point (rows of masks/sites) at every time (rows of
    sun/earth, km from the Moon's centre in MOON_ME). Returns two (n_points, n_times) arrays."""
    n_pts = masks.shape[0]
    n_t = sun.shape[0]
    sf = np.empty((n_pts, n_t))
    ef = np.empty((n_pts, n_t))
    for i in prange(n_pts):
        sx, sy, sz = sites[i, 0], sites[i, 1], sites[i, 2]
        for t in range(n_t):
            az_s, el_s, d_s = _az_el(sun[t, 0], sun[t, 1], sun[t, 2], sx, sy, sz, east[i], north[i], up[i])
            az_e, el_e, d_e = _az_el(
                earth[t, 0], earth[t, 1], earth[t, 2], sx, sy, sz, east[i], north[i], up[i]
            )
            r_s = math.asin(min(1.0, SUN_RADIUS_KM / d_s)) * R2D
            r_e = math.asin(min(1.0, EARTH_RADIUS_KM / d_e)) * R2D
            sf[i, t] = sun_fraction(masks[i], az_s, el_s, r_s, az_e, el_e, r_e)
            ef[i, t] = disc_fraction(masks[i], az_e, el_e, r_e)
    return sf, ef
