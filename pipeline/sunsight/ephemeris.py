# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Build the hourly Sun, Earth and station table for 2027-2030 (data contract `ephemeris/2027_2030.*`).

Columns 1-15: apparent (LT+S) positions of the Sun, Earth's centre, DSS-14 (Goldstone), DSS-63 (Madrid)
and DSS-43 (Canberra) from the Moon's centre in MOON_ME, km. Columns 16-18: the Moon's apparent elevation
above each station's local horizon (the station's _TOPO frame, +Z = zenith), degrees, no refraction.
Row i is at 2027-01-01T00:00:00 UTC + i hours; UTC goes through str2et. Run: `make ephemeris`.
"""

from __future__ import annotations

import math

import numpy as np
import spiceypy as sp

from . import kernels
from .contracts import (
    DATA_OUT,
    EPHEMERIS_COLUMNS,
    EPHEMERIS_CORRECTION,
    EPHEMERIS_FRAME,
    EPHEMERIS_ROWS,
    EPHEMERIS_START_UTC,
    EPHEMERIS_STEP_S,
    STATIONS,
)
from .export import write_json

BIN_PATH = DATA_OUT / "ephemeris" / "2027_2030.bin"
META_PATH = DATA_OUT / "ephemeris" / "2027_2030.json"
TARGETS = ["SUN", "EARTH", *STATIONS.values()]


def row_ets(n_rows: int = EPHEMERIS_ROWS) -> np.ndarray:
    """ET of each row: str2et of the start, then whole UTC hours (no leap second falls in 2027-2030)."""
    et0 = sp.str2et(EPHEMERIS_START_UTC)
    # Check the UTC-hour assumption against SPICE at the end of the table.
    end = sp.et2utc(et0 + (n_rows - 1) * EPHEMERIS_STEP_S, "ISOC", 3)
    expected = "2030-12-31T23:00:00.000" if n_rows == EPHEMERIS_ROWS else None
    if expected and end != expected:
        raise RuntimeError(f"a leap second falls inside the table: last row is {end}")
    return et0 + EPHEMERIS_STEP_S * np.arange(n_rows, dtype=np.float64)


def compute_row(et: float) -> np.ndarray:
    """One row in float64, straight from SPICE."""
    out = np.empty(len(EPHEMERIS_COLUMNS))
    for k, tgt in enumerate(TARGETS):
        pos, _ = sp.spkpos(tgt, et, EPHEMERIS_FRAME, EPHEMERIS_CORRECTION, "MOON")
        out[3 * k : 3 * k + 3] = pos
    for k, code in enumerate(STATIONS.values()):
        pos, _ = sp.spkpos("MOON", et, f"{code}_TOPO", EPHEMERIS_CORRECTION, code)
        out[15 + k] = math.degrees(math.asin(pos[2] / math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2)))
    return out


def compute_table(ets: np.ndarray) -> np.ndarray:
    table = np.empty((len(ets), len(EPHEMERIS_COLUMNS)))
    for k, tgt in enumerate(TARGETS):
        pos, _ = sp.spkpos(tgt, ets, EPHEMERIS_FRAME, EPHEMERIS_CORRECTION, "MOON")
        table[:, 3 * k : 3 * k + 3] = np.asarray(pos)
    for k, code in enumerate(STATIONS.values()):
        pos, _ = sp.spkpos("MOON", ets, f"{code}_TOPO", EPHEMERIS_CORRECTION, code)
        pos = np.asarray(pos)
        table[:, 15 + k] = np.degrees(np.arcsin(pos[:, 2] / np.linalg.norm(pos, axis=1)))
    return table


def main() -> None:
    kernels.load()
    ets = row_ets()
    table = compute_table(ets).astype("<f4")
    BIN_PATH.parent.mkdir(parents=True, exist_ok=True)
    BIN_PATH.write_bytes(table.tobytes())
    write_json(
        META_PATH,
        {
            "start_utc": EPHEMERIS_START_UTC,
            "step_s": EPHEMERIS_STEP_S,
            "row_count": int(table.shape[0]),
            "columns": EPHEMERIS_COLUMNS,
            "frame": EPHEMERIS_FRAME,
            "correction": EPHEMERIS_CORRECTION,
            "observer": "MOON",
            "stations": STATIONS,
            "station_elevation": "Moon's apparent elevation in each station's _TOPO frame, no refraction",
            "time_scale": "UTC; each row is a whole UTC hour, converted to ET with naif0012.tls",
            "dtype": "float32",
            "endianness": "little",
            "kernels": [k.split("/")[-1] for k in kernels.KERNELS],
        },
    )
    print(f"wrote {BIN_PATH} ({BIN_PATH.stat().st_size} bytes, {table.shape[0]} rows)")


if __name__ == "__main__":
    main()
