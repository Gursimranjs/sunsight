# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Compare our positions with the cached JPL Horizons answers (tests/golden/horizons, fetched by golden.py).

Our side uses exactly what the app uses: the hourly table, interpolated to the request time, minus the site
vector, in the site's local frame. Station rows compare the Moon's elevation column.
"""

from __future__ import annotations

import numpy as np

from . import ephemeris as E
from . import golden as G
from . import light as L
from .contracts import EPHEMERIS_START_UTC


def _table() -> np.ndarray:
    return np.frombuffer(E.BIN_PATH.read_bytes(), dtype="<f4").reshape(-1, 18).astype(np.float64)


def t_since_start_s(jd_ut: float) -> float:
    return (jd_ut - G.jd_ut(EPHEMERIS_START_UTC)) * 86400.0


def compare() -> tuple[list[dict], list[dict]]:
    table = _table()
    pos_rows = []
    for site, (lat, lon, h_km) in G.SITES.items():
        sv = L.site_vector(lat, lon, h_km * 1000.0)
        fr = L.local_frame(lat, lon)
        for tname, c0 in (("sun", 0), ("earth", 3)):
            for jd, az_h, el_h in G.parse(G.OUT / f"{site}__{tname}.json"):
                t_s = round(t_since_start_s(jd), 3)
                row = L.interp(table, t_s)
                az, el, _ = L.az_el(row[c0 : c0 + 3], sv, fr)
                pos_rows.append(
                    {
                        "site": site,
                        "target": tname,
                        "jd_ut": jd,
                        "az_horizons_deg": az_h,
                        "el_horizons_deg": el_h,
                        "az_ours_deg": az,
                        "el_ours_deg": el,
                        "d_az_deg": L.wrap180(az - az_h),
                        "d_el_deg": el - el_h,
                        "d_az_on_sky_deg": L.wrap180(az - az_h) * np.cos(np.radians(el_h)),
                    }
                )
    st_rows = []
    for k, name in enumerate(("goldstone", "madrid", "canberra")):
        for jd, _az_h, el_h in G.parse(G.OUT / f"station_{name}__moon.json"):
            row = L.interp(table, round(t_since_start_s(jd), 3))
            st_rows.append(
                {
                    "station": name,
                    "jd_ut": jd,
                    "el_horizons_deg": el_h,
                    "el_ours_deg": row[15 + k],
                    "d_el_deg": row[15 + k] - el_h,
                }
            )
    return pos_rows, st_rows
