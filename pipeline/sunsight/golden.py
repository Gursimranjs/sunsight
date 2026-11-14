# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Fetch and cache JPL Horizons answers (run once, then commit): `make golden`.

Sun and Earth apparent azimuth/elevation (QUANTITIES=4, airless) seen from three lunar surface sites, and the
Moon's apparent elevation seen from the three DSN stations, each at the same 20 random UTC times in 2027-2030.
Station coordinates are taken from the SPICE station kernel (ITRF93) and given to Horizons as geodetic
coordinates on Earth (WGS-84 per the Horizons manual's default for Earth sites). One request per series,
with a pause between requests.
"""

from __future__ import annotations

import json
import random
import subprocess
import time
import urllib.parse

import numpy as np
import spiceypy as sp

from . import kernels
from .contracts import REPO_ROOT, STATIONS

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
OUT = REPO_ROOT / "tests" / "golden" / "horizons"
SITES = {  # lat, lon (deg, east), height above the 1737.4 km sphere (km)
    "shackleton_ridge": (-89.684, -163.261, 0.0),
    "athena_target": (-84.78, 29.13, 0.0),
    "apollo_11": (0.67416, 23.47314, 0.0),
}
TARGETS = {"sun": "10", "earth": "399"}
N_TIMES = 20
SEED = 2027


def times_utc() -> list[str]:
    rnd = random.Random(SEED)
    out = []
    t0 = np.datetime64("2027-01-01T00:00:00")
    for _ in range(N_TIMES):
        s = rnd.randrange(0, 4 * 365 * 86400)
        out.append(str(t0 + np.timedelta64(s, "s")))
    return sorted(out)


def jd_ut(utc: str) -> float:
    """Julian date in UT (UTC) of an ISO string, without SPICE: Unix epoch is JD 2440587.5."""
    t = np.datetime64(utc).astype("datetime64[s]").astype(np.int64)
    return 2440587.5 + float(t) / 86400.0


def request(params: dict) -> dict:
    url = API + "?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    txt = subprocess.run(
        ["curl", "-sSf", "--max-time", "120", url], check=True, capture_output=True, text=True
    ).stdout
    return {"url": url, "response": json.loads(txt)}


def station_geodetic() -> dict[str, tuple[float, float, float]]:
    """DSN station geodetic lon/lat/height on the WGS-84 ellipsoid from the SPICE station positions (ITRF93)."""
    kernels.load()
    et = sp.str2et("2028-01-01")
    out = {}
    for name, code in STATIONS.items():
        pos, _ = sp.spkpos(code, et, "ITRF93", "NONE", "EARTH")
        lon, lat, alt = sp.recgeo(pos, 6378.137, 1.0 / 298.257223563)
        out[name] = (float(np.degrees(lon)), float(np.degrees(lat)), float(alt))
    return out


def fetch_all() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    tl = " ".join(f"{jd_ut(t):.9f}" for t in times_utc())
    common = {
        "format": "json",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "OBSERVER",
        "QUANTITIES": "'4'",
        "ANG_FORMAT": "DEG",
        "CAL_FORMAT": "JD",
        "TIME_TYPE": "UT",
        "APPARENT": "AIRLESS",
        "EXTRA_PREC": "YES",
        "CSV_FORMAT": "YES",
        "TLIST": tl,
        "TLIST_TYPE": "JD",
    }
    jobs = []
    for site, (lat, lon, h) in SITES.items():
        for tname, tcode in TARGETS.items():
            p = dict(
                common,
                COMMAND=f"'{tcode}'",
                CENTER="'coord@301'",
                COORD_TYPE="'GEODETIC'",
                SITE_COORD=f"'{lon:.6f},{lat:.6f},{h:.4f}'",
            )
            jobs.append((f"{site}__{tname}", p))
    for name, (lon, lat, h) in station_geodetic().items():
        p = dict(
            common,
            COMMAND="'301'",
            CENTER="'coord@399'",
            COORD_TYPE="'GEODETIC'",
            SITE_COORD=f"'{lon:.8f},{lat:.8f},{h:.6f}'",
        )
        jobs.append((f"station_{name}__moon", p))
    for name, p in jobs:
        path = OUT / f"{name}.json"
        if path.exists():
            continue
        print("fetching", name)
        res = request(p)
        res["times_utc"] = times_utc()
        path.write_text(json.dumps(res, indent=1) + "\n")
        time.sleep(3.0)


def parse(path) -> list[tuple[float, float, float]]:
    """(jd_ut, az_deg, el_deg) rows from a cached Horizons answer."""
    res = json.loads(path.read_text())["response"]["result"]
    body = res.split("$$SOE")[1].split("$$EOE")[0]
    rows = []
    for line in body.strip().splitlines():
        f = [x.strip() for x in line.split(",")]
        nums = [x for x in f[1:] if x and _isnum(x)]
        rows.append((float(f[0]), float(nums[-2]), float(nums[-1])))
    return rows


def _isnum(x: str) -> bool:
    try:
        float(x)
        return True
    except ValueError:
        return False


if __name__ == "__main__":
    fetch_all()
