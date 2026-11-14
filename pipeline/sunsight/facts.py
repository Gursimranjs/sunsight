# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Numbers for docs/submission/FACTS.md, computed from the shipped data. Run: `uv run python -m sunsight.facts`."""

from __future__ import annotations

import json
import math

import numpy as np

from . import validate as V
from .contracts import BIN_COUNT, DATA_OUT, REPO_ROOT
from .export import decode_masks, write_json

OUT = REPO_ROOT / "docs" / "submission" / "facts_numbers.json"


def miss_stats() -> dict:
    table = V._table()
    out = {}
    for p in sorted((DATA_OUT / "miss").glob("*.json")):
        meta = json.loads(p.read_text())
        pts = meta["points"]
        n = len(pts)
        masks = decode_masks((DATA_OUT / "miss" / f"{p.stem}.masks.bin").read_bytes(), n, 2, BIN_COUNT)
        lat = np.array([q["lat_deg"] for q in pts])
        lon = np.array([q["lon_deg"] for q in pts])
        hgt = np.array([q["height_m"] for q in pts])
        r = np.array([math.hypot(q["east_m"], q["north_m"]) for q in pts])
        c = int(np.argmin(r))
        res: dict = {"points": n}
        for hh, h_m in ((0, 2.0), (1, 10.0)):
            sf, _ = V.series_for(masks[:, hh, :], lat, lon, hgt, h_m, table[:, 0:3], table[:, 3:6])
            lit = 100.0 * (sf >= 0.5).mean(axis=1)
            res[f"{h_m:g}m"] = {"centre_lit_pct": float(lit[c])}
            for rad in (100.0, 250.0, 500.0):
                sel = lit[r <= rad + 1e-9]
                res[f"{h_m:g}m"][f"within_{rad:g}m"] = {
                    "min_pct": float(sel.min()),
                    "median_pct": float(np.median(sel)),
                    "max_pct": float(sel.max()),
                    "points": int(sel.size),
                }
        out[p.stem] = res
    return out


def main() -> None:
    facts = {
        "note": "Computed by pipeline/sunsight/facts.py from web/public/data; lit = at least half the Sun's disc above the terrain, hourly 2027-2030.",
        "miss_grids": miss_stats(),
    }
    write_json(OUT, facts)
    print(json.dumps(facts, indent=1))


if __name__ == "__main__":
    main()
