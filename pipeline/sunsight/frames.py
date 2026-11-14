# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""SPICE-side frames and positions. Everything is in MOON_ME (see AGENTS.md, "Physics that is easy to
get wrong"). The pure-geometry contracts (site_vector, local_frame, az_el) live in light.py."""

from __future__ import annotations

import math

import numpy as np
import spiceypy as sp

from . import light as L

MOON_FRAME = "MOON_ME"
ABCORR = "LT+S"


def utc_to_et(utc: str) -> float:
    return float(sp.str2et(utc))


def et_to_utc(et: float, prec: int = 3) -> str:
    return str(sp.et2utc(et, "ISOC", prec))


def pa_me_displacement_m(lat_deg: float, lon_deg: float, h_m: float, et: float) -> float:
    """How far apart the same latitude/longitude lands if read in MOON_PA instead of MOON_ME."""
    v = np.array(L.site_vector(lat_deg, lon_deg, h_m))
    rot = np.array(sp.pxform("MOON_PA", MOON_FRAME, et))
    return float(np.linalg.norm(rot @ v - v) * 1000.0)


def apparent_from_moon(target: str, et: float) -> np.ndarray:
    """Apparent (LT+S) position of target from the Moon's centre in MOON_ME, km."""
    pos, _ = sp.spkpos(target, et, MOON_FRAME, ABCORR, "MOON")
    return np.array(pos)


def apparent_from_site(target: str, et: float, site_km: np.ndarray) -> np.ndarray:
    """Apparent position of target from a fixed point on the Moon (SPICE SPKCPO), km, MOON_ME."""
    state, _ = sp.spkcpo(target, et, MOON_FRAME, "OBSERVER", ABCORR, site_km, "MOON", MOON_FRAME)
    return np.array(state[:3])


def spice_az_el(target: str, et: float, site_km: np.ndarray) -> tuple[float, float]:
    """Azimuth (clockwise from north) and elevation from SPICE AZLCPO on the Moon's reference sphere."""
    azlsta, _ = sp.azlcpo("ELLIPSOID", target, et, ABCORR, False, True, site_km, "MOON", MOON_FRAME)
    az = math.degrees(azlsta[1]) % 360.0
    el = math.degrees(azlsta[2])
    return az, el
