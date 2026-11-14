# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Write pipeline outputs to the data contracts: masks, JSON sidecars and the manifest."""

from __future__ import annotations

import gzip
import hashlib
import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np

from . import __version__
from .contracts import (
    DATA_OUT,
    FORMAT_VERSION,
    GENERATED_WITH,
    MASK_CLAMP_DEG,
    MASK_SCALE_DEG,
)


def encode_masks(masks_deg: np.ndarray) -> bytes:
    """Encode horizon masks (degrees) as little-endian int16 in units of 0.001 degree, clamped."""
    clamped = np.clip(np.asarray(masks_deg, dtype=np.float64), -MASK_CLAMP_DEG, MASK_CLAMP_DEG)
    return np.round(clamped / MASK_SCALE_DEG).astype("<i2").tobytes()


def decode_masks(raw: bytes, n_points: int, n_heights: int, n_bins: int) -> np.ndarray:
    """Inverse of encode_masks; returns degrees with shape (points, heights, bins)."""
    arr = np.frombuffer(raw, dtype="<i2").astype(np.float64) * MASK_SCALE_DEG
    return arr.reshape(n_points, n_heights, n_bins)


def encode_masks_dz(raw_int16: bytes, row_len: int) -> bytes:
    """Compressed mask encoding (format v2, `.masks.dz`): per row of `row_len` int16 values, take differences
    along azimuth (first value kept, arithmetic mod 2^16), split the result into a plane of low bytes followed
    by a plane of high bytes, then gzip (level 9). Lossless; decode_masks_dz inverts it exactly."""
    a = np.frombuffer(raw_int16, dtype="<u2").reshape(-1, row_len)
    d = np.empty_like(a)
    d[:, 0] = a[:, 0]
    d[:, 1:] = a[:, 1:] - a[:, :-1]  # uint16 arithmetic wraps mod 2^16
    b = d.astype("<u2").view(np.uint8).reshape(-1, 2)
    return gzip.compress(np.concatenate([b[:, 0], b[:, 1]]).tobytes(), compresslevel=9, mtime=0)


def decode_masks_dz(dz: bytes, row_len: int) -> bytes:
    """Inverse of encode_masks_dz; returns the raw little-endian int16 bytes."""
    planes = np.frombuffer(gzip.decompress(dz), dtype=np.uint8)
    n = planes.size // 2
    d = (planes[:n].astype(np.uint16) | (planes[n:].astype(np.uint16) << 8)).reshape(-1, row_len)
    return np.cumsum(d, axis=1, dtype=np.uint16).astype("<u2").tobytes()


def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=1, sort_keys=False) + "\n")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def git_commit() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()
    except Exception:
        return "unknown"


def output_entries(paths: list[str], root: Path = DATA_OUT) -> list[dict[str, Any]]:
    out = []
    for rel in sorted(paths):
        p = root / rel
        out.append({"path": rel, "size_bytes": p.stat().st_size, "sha256": sha256_file(p)})
    return out


def build_manifest(
    files: dict[str, Any],
    inputs: list[dict[str, Any]],
    kernels: list[str],
    fixture: bool,
    root: Path = DATA_OUT,
) -> dict[str, Any]:
    """Assemble the manifest. `files` maps dataset names to relative paths (see docs/DATA_FORMAT.md)."""
    rels: list[str] = []

    def collect(v: Any) -> None:
        if isinstance(v, str):
            if v.endswith((".json", ".bin", ".csv", ".dz")):
                rels.append(v)
        elif isinstance(v, dict):
            for x in v.values():
                collect(x)
        elif isinstance(v, list):
            for x in v:
                collect(x)

    collect(files)
    return {
        "format_version": FORMAT_VERSION,
        "fixture": fixture,
        "generated_with": GENERATED_WITH,
        "pipeline_version": f"{__version__}+{git_commit()}",
        "build_time_utc": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "kernels": kernels,
        "inputs": inputs,
        "files": files,
        "outputs": output_entries(sorted(set(rels)), root),
    }
