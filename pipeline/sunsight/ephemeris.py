# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Build the hourly Sun, Earth and station table for 2027-2030 (data contract `ephemeris/2027_2030.*`).

Columns 1-15: apparent (LT+S) positions of the Sun, Earth's centre, DSS-14 (Goldstone), DSS-63 (Madrid)
and DSS-43 (Canberra) from the Moon's centre in MOON_ME, km. Columns 16-18: the Moon's apparent elevation
above each station's local horizon (the station's _TOPO frame, +Z = zenith), degrees, no refraction.
Row i is at 2027-01-01T00:00:00 UTC + i hours; UTC goes through str2et. Run: `make ephemeris`.

The web app fetches the table one calendar year at a time (review note 004): `ephemeris/<year>.bin` holds
rows first_row .. first_row + row_count - 1 of the full table, byte for byte, with the same time origin.
`make ephemeris-years` cuts them from the committed table without SPICE.
"""

from __future__ import annotations

import argparse
import math
from datetime import datetime

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
ROW_BYTES = len(EPHEMERIS_COLUMNS) * 4  # float32


def year_spans() -> list[dict]:
    """The calendar years the table covers: {year, bin, first_row, row_count}, in row order.

    Rows are whole UTC hours from EPHEMERIS_START_UTC (row_ets checks no leap second falls inside), so a
    year's first row is the number of hours from the table start to 1 January 00:00 UTC of that year.
    """
    t0 = datetime.fromisoformat(EPHEMERIS_START_UTC)
    if (t0.month, t0.day, t0.hour, t0.minute, t0.second) != (1, 1, 0, 0, 0):
        raise ValueError(f"the table must start on 1 January 00:00 UTC, not {EPHEMERIS_START_UTC}")
    spans = []
    year = t0.year
    first_row = 0
    while first_row < EPHEMERIS_ROWS:
        span_s = (datetime(year + 1, 1, 1) - datetime(year, 1, 1)).total_seconds()
        row_count = min(int(span_s) // EPHEMERIS_STEP_S, EPHEMERIS_ROWS - first_row)
        spans.append(
            {"year": year, "bin": f"ephemeris/{year}.bin", "first_row": first_row, "row_count": row_count}
        )
        first_row += row_count
        year += 1
    return spans


def split_years(raw: bytes) -> list[tuple[dict, bytes]]:
    """Cut the full table's bytes into one exact slice per calendar year (no recomputation)."""
    if len(raw) != EPHEMERIS_ROWS * ROW_BYTES:
        raise ValueError(f"table is {len(raw)} bytes, expected {EPHEMERIS_ROWS * ROW_BYTES}")
    return [
        (s, raw[s["first_row"] * ROW_BYTES : (s["first_row"] + s["row_count"]) * ROW_BYTES])
        for s in year_spans()
    ]


def write_years() -> list[dict]:
    """Write ephemeris/<year>.bin next to the full table, sliced from it."""
    spans = []
    for s, part in split_years(BIN_PATH.read_bytes()):
        (DATA_OUT / s["bin"]).write_bytes(part)
        print(
            f"wrote {s['bin']} (rows {s['first_row']}..{s['first_row'] + s['row_count'] - 1}, {len(part)} bytes)"
        )
        spans.append(s)
    return spans


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
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--years", action="store_true", help="only cut the yearly files from the existing table")
    if ap.parse_args().years:
        write_years()
        return
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
    write_years()


if __name__ == "__main__":
    main()
