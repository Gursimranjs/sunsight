# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""P1: all nine kernels load with no SPICE error, frames and coverage are as required, checksums are recorded."""

from __future__ import annotations

import json

import pytest

from sunsight import kernels as K

pytestmark = pytest.mark.skipif(not K.all_present(), reason="kernels not downloaded; run make kernels")


def test_lock_file_lists_nine_kernels_with_sizes_and_checksums():
    lock = json.loads(K.LOCK.read_text())
    assert len(lock["kernels"]) == 9
    for k in lock["kernels"]:
        assert k["url"].startswith("https://naif.jpl.nasa.gov/pub/naif/generic_kernels/")
        assert k["size_bytes"] > 0 and len(k["sha256"]) == 64


def test_checksums_match_lock():
    K.verify()  # raises on mismatch


def test_load_and_assert_frames_and_coverage():
    info = K.load()
    assert info["moon_frame"] == "MOON_ME"
    assert info["earth_orientation_covers"] is True
    assert set(info["stations"]) == {"DSS-14", "DSS-63", "DSS-43"}
    assert set(info["topo_frames"]) == {"DSS-14_TOPO", "DSS-63_TOPO", "DSS-43_TOPO"}
