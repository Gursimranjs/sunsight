# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Constants shared by every file the pipeline writes (the data contracts in docs/BUILD_PLAN.md).

The web app mirrors these values in web/src/data/contracts.ts. A test checks that both agree.
"""

from __future__ import annotations

from pathlib import Path

FORMAT_VERSION = 1
GENERATED_WITH = "SunSight pipeline; code written by Claude Code (Anthropic)"

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_OUT = REPO_ROOT / "web" / "public" / "data"
DATA_RAW = REPO_ROOT / "data_raw"

# Physical constants used by the function contracts.
MOON_RADIUS_KM = 1737.4
SUN_RADIUS_KM = 695_700.0
EARTH_RADIUS_KM = 6_371.0

# Ephemeris table.
EPHEMERIS_START_UTC = "2027-01-01T00:00:00"
EPHEMERIS_STEP_S = 3600
EPHEMERIS_ROWS = 35_064  # 2027-01-01 00:00 to 2030-12-31 23:00 UTC, hourly
EPHEMERIS_FRAME = "MOON_ME"
EPHEMERIS_CORRECTION = "LT+S"
STATIONS = {"goldstone": "DSS-14", "madrid": "DSS-63", "canberra": "DSS-43"}
EPHEMERIS_COLUMNS = [
    "sun_x_km",
    "sun_y_km",
    "sun_z_km",
    "earth_x_km",
    "earth_y_km",
    "earth_z_km",
    "goldstone_x_km",
    "goldstone_y_km",
    "goldstone_z_km",
    "madrid_x_km",
    "madrid_y_km",
    "madrid_z_km",
    "canberra_x_km",
    "canberra_y_km",
    "canberra_z_km",
    "moon_el_goldstone_deg",
    "moon_el_madrid_deg",
    "moon_el_canberra_deg",
]

# Horizon masks.
BIN_COUNT = 1440  # 0.25 degree bins; bin 0 is local north, clockwise
MASK_SCALE_DEG = 0.001  # int16 unit
MASK_CLAMP_DEG = 32.767
OBSERVER_HEIGHTS_M = (2.0, 10.0)

# 3D terrain cut.
TERRAIN_SIZE = 512
TERRAIN_SPACING_M = 20.0
