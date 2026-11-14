# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Windowed terrain reads and map position <-> 3D point conversion for the LOLA south polar maps (PGDA 90).

Facts read from each file's own metadata (checked in tests): south polar stereographic on a sphere of
R = 1,737,400 m, true scale at the pole (lat_ts = -90), lon_0 = 0, metres; float32 heights in metres;
no-data NaN. Heights are relative to a 1,737.4 km radius: the PGDA 90 page gives heights in metres in the
MOON_ME frame of DE421 but does not name the radius; the LOLA PDS gridded-product labels state "Map values
are relative to a radius of 1737.4 km" (see docs/DECISIONS.md #27).
All distances and directions are measured in 3D (map -> lat/lon -> 3D point), never on the map grid.
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import rasterio
from numba import njit
from rasterio.windows import Window

from .contracts import DATA_RAW, MOON_RADIUS_KM

PGDA_BASE = "https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/"
MAPS = {
    10: "LDEM_83S_10MPP_ADJ.TIF",
    20: "LDEM_80S_20MPP_ADJ.TIF",
    40: "LDEM_80S_40MPP_ADJ.TIF",
    80: "LDEM_80S_80MPP_ADJ.TIF",
    240: "LDEM_60S_240MPP_ADJ.TIF",
}
TERRAIN_DIR = DATA_RAW / "terrain"
CACHE_DIR = DATA_RAW / "cache"
R_REF_M = MOON_RADIUS_KM * 1000.0

os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".TIF,.tif")
os.environ.setdefault("VSI_CACHE", "TRUE")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "4")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "2")


@dataclass(frozen=True)
class DemInfo:
    name: str
    source: str
    width: int
    height: int
    left_m: float  # x of the left edge
    top_m: float  # y of the top edge
    pixel_m: float
    sphere_r_m: float
    nodata_is_nan: bool

    def col_x(self, col: float) -> float:
        return self.left_m + (col + 0.5) * self.pixel_m

    def row_y(self, row: float) -> float:
        return self.top_m - (row + 0.5) * self.pixel_m


def source_for(pixel_m: int) -> str:
    name = MAPS[pixel_m]
    local = TERRAIN_DIR / name
    return str(local) if local.exists() else "/vsicurl/" + PGDA_BASE + name


def dem_info(src: str) -> DemInfo:
    with rasterio.open(src) as ds:
        crs = ds.crs.to_dict()
        if (
            crs.get("proj") != "stere"
            or crs.get("lat_0") != -90
            or crs.get("lat_ts", -90) != -90
            or crs.get("lon_0", 0) != 0
        ):
            raise ValueError(f"unexpected projection {crs}")
        t = ds.transform
        if abs(t.a + t.e) > 1e-9 or t.b != 0 or t.d != 0:
            raise ValueError(f"non-square or rotated pixels: {t}")
        if ds.dtypes[0] != "float32":
            raise ValueError(f"unexpected dtype {ds.dtypes}")
        nod = ds.nodata
        return DemInfo(
            name=Path(src).name,
            source=src,
            width=ds.width,
            height=ds.height,
            left_m=t.c,
            top_m=t.f,
            pixel_m=t.a,
            sphere_r_m=float(crs["R"]),
            nodata_is_nan=nod is None or (isinstance(nod, float) and math.isnan(nod)),
        )


# --- Polar stereographic on a sphere, south aspect, true scale at the pole ---------------------------------


@njit(cache=True)
def ll_to_xy(lat_deg: float, lon_deg: float, r_m: float) -> tuple[float, float]:
    lat = math.radians(lat_deg)
    lon = math.radians(lon_deg)
    rho = 2.0 * r_m * math.tan(math.pi / 4.0 + lat / 2.0)
    return rho * math.sin(lon), rho * math.cos(lon)


@njit(cache=True)
def xy_to_ll(x_m: float, y_m: float, r_m: float) -> tuple[float, float]:
    rho = math.hypot(x_m, y_m)
    lat = 2.0 * math.atan(rho / (2.0 * r_m)) - math.pi / 2.0
    lon = math.atan2(x_m, y_m)
    return math.degrees(lat), math.degrees(lon)


@njit(cache=True)
def xy_to_vec_km(x_m: float, y_m: float, h_m: float, r_m: float) -> tuple[float, float, float]:
    """Map position and height -> 3D MOON_ME point, km, on the 1737.4 km reference sphere plus height."""
    lat_deg, lon_deg = xy_to_ll(x_m, y_m, r_m)
    la = math.radians(lat_deg)
    lo = math.radians(lon_deg)
    rr = MOON_RADIUS_KM + h_m / 1000.0
    return rr * math.cos(la) * math.cos(lo), rr * math.cos(la) * math.sin(lo), rr * math.sin(la)


def scale_factor(lat_deg: float) -> float:
    """Map stretch k of the south polar stereographic projection (true scale at the pole)."""
    return 2.0 / (1.0 - math.sin(math.radians(lat_deg)))


# --- Windows ---------------------------------------------------------------------------------------------


@dataclass
class Window2D:
    info: DemInfo
    z_m: np.ndarray  # float64 heights, rows from north... rows top (max y) to bottom
    row0: int
    col0: int

    @property
    def x0_m(self) -> float:  # x of column 0's centre
        return self.info.col_x(self.col0)

    @property
    def y0_m(self) -> float:  # y of row 0's centre
        return self.info.row_y(self.row0)


def read_window(
    info: DemInfo, xmin_m: float, xmax_m: float, ymin_m: float, ymax_m: float, cache: bool = True
) -> Window2D:
    """Read the pixels whose centres cover [xmin, xmax] x [ymin, ymax], plus one pixel of margin."""
    p = info.pixel_m
    c0 = max(0, int(math.floor((xmin_m - info.left_m) / p)) - 1)
    c1 = min(info.width, int(math.ceil((xmax_m - info.left_m) / p)) + 1)
    r0 = max(0, int(math.floor((info.top_m - ymax_m) / p)) - 1)
    r1 = min(info.height, int(math.ceil((info.top_m - ymin_m) / p)) + 1)
    key = CACHE_DIR / f"{Path(info.name).stem}_{r0}_{r1}_{c0}_{c1}.npy"
    if cache and key.exists():
        return Window2D(info, np.load(key), r0, c0)
    with rasterio.open(info.source) as ds:
        z = ds.read(1, window=Window(c0, r0, c1 - c0, r1 - r0)).astype(np.float64)
    if cache:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        np.save(key, z)
    return Window2D(info, z, r0, c0)


@njit(cache=True)
def bilinear(z: np.ndarray, x0_m: float, y0_m: float, p_m: float, x_m: float, y_m: float) -> float:
    """Bilinear height at (x, y); z[0, 0] is centred at (x0, y0), columns go +x, rows go -y. NaN outside."""
    fc = (x_m - x0_m) / p_m
    fr = (y0_m - y_m) / p_m
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


def height_at(lat_deg: float, lon_deg: float, pixel_m: int = 20, half_m: float = 200.0) -> float:
    """Ground height (m above the 1737.4 km sphere) from the given map by bilinear interpolation."""
    info = dem_info(source_for(pixel_m))
    x, y = ll_to_xy(lat_deg, lon_deg, info.sphere_r_m)
    w = read_window(info, x - half_m, x + half_m, y - half_m, y + half_m)
    return float(bilinear(w.z_m, w.x0_m, w.y0_m, info.pixel_m, x, y))
