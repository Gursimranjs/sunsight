# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Write web/public/data/sites.json from pipeline/data/curated_sites.json (every coordinate cited).

Polar sites (south of 80S) take their ground height from the 20 m LOLA map and link to the nearest point of
any region or miss-test grid that covers them. Other sites have no terrain model: height 0 and a smooth
horizon in the app ("Anywhere mode"). Run: `uv run python -m sunsight.sites`.
"""

from __future__ import annotations

import json
import math

from . import dem as D
from .contracts import DATA_OUT, REPO_ROOT
from .export import write_json

CURATED = REPO_ROOT / "pipeline" / "data" / "curated_sites.json"
CATEGORY_LABEL = {
    "clps": "CLPS and commercial landers",
    "commercial": "CLPS and commercial landers",
    "artemis_region": "Artemis III candidate regions",
    "polar_feature": "South pole features",
    "apollo": "Apollo",
    "international": "Other countries",
}


def _gc_km(la1: float, lo1: float, la2: float, lo2: float) -> float:
    a, b = math.radians(la1), math.radians(la2)
    c = math.sin(a) * math.sin(b) + math.cos(a) * math.cos(b) * math.cos(math.radians(lo2 - lo1))
    return 1737.4 * math.acos(max(-1.0, min(1.0, c)))


def _nearest_point(points: list[dict], lat: float, lon: float) -> tuple[str, float]:
    best = min(points, key=lambda p: _gc_km(lat, lon, p["lat_deg"], p["lon_deg"]))
    return best["id"], _gc_km(lat, lon, best["lat_deg"], best["lon_deg"])


def build() -> dict:
    cur = json.loads(CURATED.read_text())
    groups = []
    for kind in ("regions", "miss"):
        d = DATA_OUT / kind
        if d.exists():
            for p in sorted(d.glob("*.json")):
                if not p.name.startswith("fixture_"):
                    groups.append((kind, json.loads(p.read_text())))
    rp = REPO_ROOT / "pipeline" / "data" / "refined_points.json"
    refined = json.loads(rp.read_text())["points"] if rp.exists() else {}
    sites = []
    for s in cur["sites"]:
        polar = s["lat_deg"] <= -80.0
        h = D.height_at(s["lat_deg"], s["lon_deg"], 20) if polar else 0.0
        rec = {
            "id": s["id"],
            "name": s["name"],
            "lat_deg": s["lat_deg"],
            "lon_deg": s["lon_deg"],
            "height_m": round(h, 1),
            "height_source": "LOLA 20 m map (PGDA 90), bilinear" if polar else "none: smooth-horizon site",
            "category": s["category"],
            "category_label": CATEGORY_LABEL[s["category"]],
            "region_id": None,
            "region_point_id": None,
            "miss_target_id": None,
            "terrain_id": None,
            "source_url": s["source_url"],
            "source_org": s["source_org"],
            "source_quote": s["source_quote"],
            "notes": s.get("notes", ""),
        }
        for kind, meta in groups:
            pid, d_km = _nearest_point(meta["points"], s["lat_deg"], s["lon_deg"])
            spacing_km = meta.get("spacing_m", 500.0) / 1000.0
            if d_km <= 0.75 * spacing_km:
                if kind == "regions" and rec["region_id"] is None:
                    rec["region_id"], rec["region_point_id"] = meta["id"], pid
                if kind == "miss" and meta.get("target_site_id") == s["id"]:
                    rec["miss_target_id"] = meta["id"]
        if (DATA_OUT / "terrain" / f"{s['id']}.json").exists():
            rec["terrain_id"] = s["id"]
        elif rec["region_id"] and (DATA_OUT / "terrain" / f"{rec['region_id']}.json").exists():
            rec["terrain_id"] = rec["region_id"]
        if s["id"] in refined:
            rec["refined"] = refined[s["id"]]
        sites.append(rec)
    out = {
        "note": "Coordinates copied from the cited pages; east-positive longitudes. See pipeline/data/curated_sites.json.",
        "left_out": cur["left_out"],
        "sites": sites,
    }
    write_json(DATA_OUT / "sites.json", out)
    return out


if __name__ == "__main__":
    o = build()
    print(f"wrote {len(o['sites'])} sites")
