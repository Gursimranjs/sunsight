# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Write web/public/data/manifest.json: every input (URL, size, SHA-256) and every output file.

Terrain maps read in windows over HTTP are listed with their size and Last-Modified date from the server;
their SHA-256 is null because the whole file was never downloaded. Run: `make manifest`.
"""

from __future__ import annotations

import json
import subprocess

from . import dem as D
from . import kernels as K
from .contracts import DATA_OUT, DATA_RAW, REPO_ROOT
from .export import build_manifest, sha256_file, write_json

TERRAIN_LOCK = REPO_ROOT / "pipeline" / "terrain.lock.json"


def _head(url: str) -> dict:
    out = subprocess.run(
        ["curl", "-sSfI", "--max-time", "60", url], capture_output=True, text=True, check=True
    ).stdout
    h = {}
    for line in out.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            h[k.strip().lower()] = v.strip()
    return h


def terrain_inputs(used_px: list[int]) -> list[dict]:
    lock = json.loads(TERRAIN_LOCK.read_text()) if TERRAIN_LOCK.exists() else {}
    out = []
    for px in used_px:
        name = D.MAPS[px]
        if name not in lock:
            url = D.PGDA_BASE + name
            local = D.TERRAIN_DIR / name
            if local.exists():
                lock[name] = {
                    "name": name,
                    "url": url,
                    "size_bytes": local.stat().st_size,
                    "sha256": sha256_file(local),
                    "access": "downloaded",
                }
            else:
                h = _head(url)
                lock[name] = {
                    "name": name,
                    "url": url,
                    "size_bytes": int(h["content-length"]),
                    "sha256": None,
                    "last_modified": h.get("last-modified"),
                    "access": "windowed HTTP range reads (cached in data_raw/cache)",
                }
        out.append(lock[name])
    TERRAIN_LOCK.write_text(json.dumps(lock, indent=1) + "\n")
    return out


def main() -> None:
    files: dict = {
        "ephemeris": {"meta": "ephemeris/2027_2030.json", "bin": "ephemeris/2027_2030.bin"},
        "sites": "sites.json",
    }
    for kind, key in (("regions", "masks"), ("miss", "masks")):
        items = []
        for p in sorted((DATA_OUT / kind).glob("*.json")) if (DATA_OUT / kind).exists() else []:
            items.append({"id": p.stem, "meta": f"{kind}/{p.name}", key: f"{kind}/{p.stem}.masks.bin"})
        files[kind] = items
    files["terrain"] = [
        {"id": p.stem, "meta": f"terrain/{p.name}", "bin": f"terrain/{p.stem}.bin"}
        for p in sorted((DATA_OUT / "terrain").glob("*.json"))
    ]
    if (DATA_OUT / "validation" / "summary.json").exists():
        files["validation"] = "validation/summary.json"
    inputs = json.loads(K.LOCK.read_text())["kernels"]
    inputs += terrain_inputs([20, 80, 240] + ([10] if files["miss"] else []))
    gz = DATA_RAW / "gazetteer" / "moon_pts.zip"
    inputs.append(
        {
            "name": "MOON_nomenclature_center_pts.zip",
            "url": "https://planetarynames.wr.usgs.gov/GIS_Downloads",
            "size_bytes": gz.stat().st_size if gz.exists() else None,
            "sha256": sha256_file(gz) if gz.exists() else None,
            "used_for": "crater orientation test (pipeline/data/gazetteer_south.json)",
        }
    )
    inputs.append(
        {
            "name": "JPL Horizons answers",
            "url": "https://ssd.jpl.nasa.gov/api/horizons.api",
            "size_bytes": None,
            "sha256": None,
            "cached_in": "tests/golden/horizons/",
            "used_for": "validation check 1 and 6",
        }
    )
    man = build_manifest(
        files,
        inputs=inputs,
        kernels=[k["name"] for k in json.loads(K.LOCK.read_text())["kernels"]],
        fixture=False,
    )
    write_json(DATA_OUT / "manifest.json", man)
    print(f"wrote manifest with {len(man['outputs'])} outputs and {len(inputs)} inputs")


if __name__ == "__main__":
    main()
