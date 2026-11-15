# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Review note 004, item 1: the per-year ephemeris files are exact byte slices of the 2027-2030 table.

No SPICE is needed: the yearly files are cut from the committed table, never recomputed, so row k of the
full table is row k - first_row of its year file and the time origin (2027-01-01T00:00 UTC) is unchanged.
"""

from __future__ import annotations

import json

import pytest

from sunsight import ephemeris as E
from sunsight.contracts import DATA_OUT, EPHEMERIS_COLUMNS, EPHEMERIS_ROWS, EPHEMERIS_STEP_S
from sunsight.export import sha256_file

ROW_BYTES = len(EPHEMERIS_COLUMNS) * 4


def test_year_spans_tile_the_table_with_calendar_years():
    spans = E.year_spans()
    assert [s["year"] for s in spans] == [2027, 2028, 2029, 2030]
    # Hours per calendar year in UTC (2028 is a leap year); whole UTC hours, no leap seconds in 2027-2030.
    assert [s["row_count"] for s in spans] == [8760, 8784, 8760, 8760]
    assert [s["first_row"] for s in spans] == [0, 8760, 17544, 26304]
    assert sum(s["row_count"] for s in spans) == EPHEMERIS_ROWS
    for a, b in zip(spans, spans[1:], strict=False):
        assert a["first_row"] + a["row_count"] == b["first_row"]
    # Row first_row of each year is 00:00 UTC on 1 January of that year.
    assert spans[2]["first_row"] * EPHEMERIS_STEP_S == (365 + 366) * 86400
    assert all(s["bin"] == f"ephemeris/{s['year']}.bin" for s in spans)


def test_split_bytes_concatenate_to_the_original_exactly():
    # Synthetic table: every byte distinct enough that an off-by-one row shows up.
    raw = bytes((i * 7 + i // 251) % 256 for i in range(EPHEMERIS_ROWS * ROW_BYTES))
    parts = E.split_years(raw)
    assert [len(p) for _, p in parts] == [s["row_count"] * ROW_BYTES for s in E.year_spans()]
    assert b"".join(p for _, p in parts) == raw
    with pytest.raises(ValueError):
        E.split_years(raw[:-ROW_BYTES])


@pytest.mark.skipif(not E.BIN_PATH.exists(), reason="needs the committed table")
def test_shipped_year_files_are_exact_slices_of_the_shipped_table():
    full = E.BIN_PATH.read_bytes()
    joined = b""
    for s in E.year_spans():
        p = DATA_OUT / s["bin"]
        assert p.exists(), f"{p} missing; run make ephemeris-years"
        part = p.read_bytes()
        a = s["first_row"] * ROW_BYTES
        assert part == full[a : a + s["row_count"] * ROW_BYTES], s["year"]
        joined += part
    assert joined == full


@pytest.mark.skipif(not (DATA_OUT / "manifest.json").exists(), reason="no real manifest")
def test_manifest_lists_each_year_with_rows_and_checksum():
    man = json.loads((DATA_OUT / "manifest.json").read_text())
    eph = man["files"]["ephemeris"]
    # The full table stays the open dataset; the years are what the app fetches.
    assert eph["bin"] == "ephemeris/2027_2030.bin"
    assert eph["years"] == E.year_spans()
    outputs = {o["path"]: o for o in man["outputs"]}
    for s in eph["years"]:
        o = outputs[s["bin"]]
        assert o["size_bytes"] == s["row_count"] * ROW_BYTES
        assert o["sha256"] == sha256_file(DATA_OUT / s["bin"])
