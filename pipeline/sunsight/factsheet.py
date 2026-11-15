# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Render docs/submission/FACTS.md from the shipped data files, so no number is copied by hand.
Run after `make validate` and `python -m sunsight.facts`: `uv run python -m sunsight.factsheet`."""

from __future__ import annotations

import json
from datetime import UTC, datetime

from .contracts import DATA_OUT, REPO_ROOT

OUT = REPO_ROOT / "docs" / "submission" / "FACTS.md"


def _fmt(v, unit: str, label: str = "") -> str:
    if v is not None and unit == "points" and "gap" in label:
        return f"{v:.2f} points"
    if v is None:
        return "not run"
    if unit == "deg":
        return f"{v:.2g}°"
    if unit == "fraction":
        return f"{100 * v:.2f}% of the disc"
    if unit == "points":
        return f"{v:+.2f} points"
    if unit == "%":
        return f"{v:.1f}%"
    return f"{v:g} {unit}"


def main() -> None:
    man = json.loads((DATA_OUT / "manifest.json").read_text())
    val = json.loads((DATA_OUT / "validation" / "summary.json").read_text())
    nums = json.loads((REPO_ROOT / "docs" / "submission" / "facts_numbers.json").read_text())
    sites = json.loads((DATA_OUT / "sites.json").read_text())["sites"]
    refined = {s["id"]: s["refined"] for s in sites if "refined" in s}
    regions = [json.loads((DATA_OUT / r["meta"]).read_text()) for r in man["files"]["regions"]]
    misses = [json.loads((DATA_OUT / r["meta"]).read_text()) for r in man["files"]["miss"]]
    L: list[str] = []
    a = L.append
    a(
        "<!-- SI-generated: rendered by pipeline/sunsight/factsheet.py (Claude Code, Anthropic) from the shipped data. See SI_USE.md. -->"
    )
    a("# Facts sheet")
    a("")
    a(
        f"Verified facts and numbers for the people writing the project page. Rendered {datetime.now(UTC):%Y-%m-%d %H:%M} UTC from "
        f"`web/public/data` (manifest built {man['build_time_utc']}, pipeline {man['pipeline_version']}). Every number below comes from a "
        "run in this repository or from the cited source. This is not text to paste; write the page in the team's own words."
    )
    a("")
    a("## What the data covers")
    a("")
    a(
        f"- Sun, Earth and Deep Space Network table: hourly, 2027-01-01 to 2030-12-31 UTC (35,064 rows), apparent positions in MOON_ME, from {len(man['kernels'])} NAIF SPICE kernels."
    )
    a(
        f"- Curated sites: {len(sites)}, each with a cited NASA, NSSDCA, LROC or USGS source. NASA has not published Artemis III region centres; LROC mosaic centres stand in, labelled."
    )
    a(
        f"- Terrain-horizon regions: {len(regions)} ("
        + ", ".join(r["name"] for r in regions)
        + f"), {sum(len(r['points']) for r in regions):,} points, 1,440 directions each, at 2 m and 10 m."
    )
    a(
        f"- Miss-test grids: {len(misses)} targets ("
        + ", ".join(m["name"] for m in misses)
        + f"), {len(misses[0]['points'])} points each, every 50 m out to 500 m."
    )
    a('- Any other latitude and longitude works with a smooth horizon (labelled "no terrain").')
    a("")
    a("## Validation (in-app page; data in web/public/data/validation/)")
    a("")
    a("| Check | Result | Pass mark | Status |")
    a("| --- | --- | --- | --- |")
    for c in val["checks"]:
        a(
            f"| {c['title']} | {_fmt(c['value'], c['unit'], c['value_label'])} ({c['value_label']}) | {c['pass_mark']} | {c['status']} |"
        )
    a("")
    for c in val["checks"]:
        if c["status"] != "pass":
            a(f"- **{c['title']}** ({c['status']}): {c['explanation']}")
    a("")
    if "sensitivity" in val:
        a("### What moves the sunlight number (best connecting-ridge point, 2 m, 18.6 years)")
        a("")
        a("| Change | Lit % | Change in points |")
        a("| --- | --- | --- |")
        for r in val["sensitivity"]["rows"]:
            a(f"| {r['change']} | {r['lit_pct']:.2f} | {r['delta_points']:+.2f} |")
        a("")
    a("## The miss test, in numbers (hourly 2027-2030; lit = at least half the Sun's disc above the terrain)")
    a("")
    a("| Target | Observer | Lit at target | Range within 100 m | Range within 250 m | Range within 500 m |")
    a("| --- | --- | --- | --- | --- | --- |")
    names = {m["id"]: m["name"] for m in misses}
    for k, v in nums["miss_grids"].items():
        for h in ("2m", "10m"):
            x = v[h]
            rng = " | ".join(
                f"{x[r]['min_pct']:.1f}–{x[r]['max_pct']:.1f}%"
                for r in ("within_100m", "within_250m", "within_500m")
            )
            a(f"| {names.get(k, k)} | {h} | {x['centre_lit_pct']:.1f}% | {rng} |")
    a("")
    for sid, r in refined.items():
        a(
            f"- Refined point for `{sid}` (18.6 years): {r['offset_m']:.0f} m from the cited point, {r['lit_2m_pct']:.1f}% (2 m) / {r['lit_10m_pct']:.1f}% (10 m), "
            f"against {r['nominal_lit_2m_pct']:.1f}% / {r['nominal_lit_10m_pct']:.1f}% at the cited point; as low as {r['min_lit_10m_pct_within_radius']:.1f}% (10 m) within 300 m. Method: {r['method']}."
        )
    a(
        "- Athena's target: sunlight is nearly uniform at map scale within 250 m (see table). The 20 m crater Athena came to rest in (LROC) is below what our 10 m terrain resolves; say so on the page."
    )
    a("")
    ds_path = REPO_ROOT / "docs" / "submission" / "default_scenario.json"
    if ds_path.exists():
        ds = json.loads(ds_path.read_text())
        ch = ds["chosen"]
        a("## The site's default link (review note 003 B)")
        a("")
        a(
            f"Found by `pipeline/sunsight/default_scenario.py`, recorded in `docs/submission/default_scenario.json`. Rule: {ds['rule']}."
        )
        a("")
        for preset, res in ds["presets"].items():
            parts = [
                f"{names.get(t, t)}: target passes on {v['target_passes_screen']} of {v['screened_starts']} daily starts, {v['candidates_share_below_90pct']} of them with the 250 m share below 90% (hourly screen)"
                for t, v in res["per_target"].items()
            ]
            a(f"- {preset}: " + "; ".join(parts) + ("." if res["chosen"] else ". No start meets the rule."))
        if ch:
            a(
                f"- Chosen: {names.get(ch['target'], ch['target'])}, start {ch['start_utc']}, {ch['preset']} preset: "
                f"{ch['exact_target_verdict']['verdict'].upper()} at the target (exact), and {100 * ch['exact_share_250m']:.1f}% "
                f"of the {ch['points_within_250m']} grid points within 250 m pass (exact). The browser shows the same share (end-to-end test)."
            )
        a("")
    a("## Engineering numbers (measured in this repository)")
    a("")
    for r in regions:
        a(
            f"- Region {r['id']}: {len(r['points'])} points, terrain read {r['timing_s']['read']} s, masks {r['timing_s']['masks']} s; "
            f"compressed masks {(DATA_OUT / 'regions' / (r['id'] + '.masks.dz')).stat().st_size / 1e6:.2f} MB."
        )
    for m in misses:
        a(
            f"- Miss grid {m['id']}: {len(m['points'])} points, read {m['timing_s']['read']} s, masks {m['timing_s']['masks']} s."
        )
    a(
        "- Browser engine: a 14-day window scores in about 3 ms in Node 20 (budget 50 ms); see web/LANE_B_NOTES.md."
    )
    a("")
    a("## Data used (with links)")
    a("")
    for i in man["inputs"]:
        extra = f", SHA-256 {i['sha256'][:12]}…" if i.get("sha256") else ""
        size = f", {i['size_bytes']:,} bytes" if i.get("size_bytes") else ""
        a(f"- {i['name']}: {i['url']}{size}{extra}")
    a(
        "- PGDA 69 illumination maps (validation): https://pgda.gsfc.nasa.gov/products/69 (AVGVISIB_85S_060M_201608, _EARTH, LPSR_85S_060M_201608)"
    )
    a("- NASA lunar eclipse table 2021-2030: https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html")
    a("- Gläser et al. 2014, Icarus 243, 78: https://ui.adsabs.harvard.edu/abs/2014Icar..243...78G")
    a("- Site coordinates: see `web/public/data/sites.json` (`source_url` and `source_quote` per site).")
    a(
        "- Real-mission events (validation check 9): `pipeline/data/real_missions.json` (Firefly, NASA, NASA GSFC eclipse page, ISRO, LROC, SpacePolicyOnline, SatNews, KSL/Reuters, Scroll; URL and quote per event)."
    )
    a("")
    a("## Limits to state")
    a("")
    for x in val["limits"]:
        a(f"- {x}")
    a("")
    OUT.write_text("\n".join(L) + "\n")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
