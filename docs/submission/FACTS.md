<!-- SI-generated: rendered by pipeline/sunsight/factsheet.py (Claude Code, Anthropic) from the shipped data. See SI_USE.md. -->
# Facts sheet

Verified facts and numbers for the people writing the project page. Rendered 2026-11-15 18:48 UTC from `web/public/data` (manifest built 2026-11-15T18:48:47Z, pipeline 0.1.0+1f2ccba). Every number below comes from a run in this repository or from the cited source. This is not text to paste; write the page in the team's own words.

## What the data covers

- Sun, Earth and Deep Space Network table: hourly, 2027-01-01 to 2030-12-31 UTC (35,064 rows), apparent positions in MOON_ME, from 9 NAIF SPICE kernels.
- Curated sites: 28, each with a cited NASA, NSSDCA, LROC or USGS source. NASA has not published Artemis III region centres; LROC mosaic centres stand in, labelled.
- Terrain-horizon regions: 8 (de Gerlache Rim region, Haworth region, Malapert Massif region, Mons Mouton Plateau region, Nobile Rim 1 and Mons Mouton region, Nobile Rim 2 region, Peak near Cabeus B region, Shackleton rim and connecting ridge), 7,688 points, 1,440 directions each, at 2 m and 10 m.
- Miss-test grids: 3 targets (Malapert Massif (LROC Artemis III mosaic centre), IM-2 Athena target (Mons Mouton), Shackleton–de Gerlache ridge at Shackleton's rim), 317 points each, every 50 m out to 500 m.
- Any other latitude and longitude works with a smooth horizon (labelled "no terrain").

## Validation (in-app page; data in web/public/data/validation/)

| Check | Result | Pass mark | Status |
| --- | --- | --- | --- |
| Sun and Earth positions vs JPL Horizons | 2.6e-05° (largest difference (elevation, or azimuth x cos elevation)) | ≤ 0.001° | pass |
| Average sunlight vs NASA Goddard's maps (PGDA) | -2.32 points (mean difference (ours - PGDA)) | mean within ±2 points; outliers explained | fail |
| Earth visibility vs NASA Goddard's maps (PGDA) | +0.23 points (mean difference (ours - PGDA)) | mean within ±2 points; outliers explained | partial |
| Best point on the connecting ridge vs Gläser et al. (2014) | 5.97 points (largest gap to the published value (half-disc rule)) | within 2 points at both heights, or the gap explained | partial |
| Total lunar eclipses: Sun hidden at every site | 0.09% of the disc (largest visible share of the Sun's disc) | 0 at every site and minute | fail |
| Moon's elevation at Goldstone, Madrid and Canberra vs JPL Horizons | 0.00059° (largest difference, SPICE geometry) | ≤ 0.01° | pass |
| Physics sanity tests | 10 of 10 pass (checks passed) | all pass | pass |
| Known places: shadowed floors and lit ridges | 99.1% (PGDA shadowed points we also find never lit) | floor ~0%; ridge in the top 10%; ≥ 90% agreement on permanent shadow | pass |
| Real missions: our predictions beside what landers reported | 6 events (events compared) | None set: reported and predicted values are shown side by side with their sources (review note 004) | reported |

- **Average sunlight vs NASA Goddard's maps (PGDA)** (fail): Mean difference -2.32 points, spread 3.70 points over 200 pixels. Largest: pixel 113 (+27.1; PGDA 0%, its 3x3 median 23%, ours 27%, isolated in PGDA), pixel 110 (-12.3; PGDA 38%, its 3x3 median 38%, ours 25%), pixel 59 (-11.5; PGDA 20%, its 3x3 median 23%, ours 8%), pixel 198 (+11.4; PGDA 0%, its 3x3 median 18%, ours 11%), pixel 139 (-11.2; PGDA 39%, its 3x3 median 40%, ours 28%). 1 of the 5 largest differences sits on a PGDA pixel that differs from its own 3x3 neighbourhood median by more than 20 points (isolated values in the 2016 map); the others are not explained by that test, so the outliers are only partly explained. The PDS label also describes the values as the share of time sunlit by any fraction of the disc; read that way the mean difference is -1.10 points. Our bin rule (review note 001, obstacles widened by up to 0.25°) changes the mean by -0.13 points on these pixels (measured by rerunning without widening); it stays in the shipped engine because it never under-reads a peak. PGDA used the 2016 60 m elevation map and we use the 2023 maps averaged to 60 m, so part of the scatter is real terrain change. The label does not give the period start (we use 2009-07-13) or the observer height (we use the surface).
- **Earth visibility vs NASA Goddard's maps (PGDA)** (partial): Mean difference +0.23 points, spread 5.54 points over 200 pixels. Largest: pixel 113 (+56.0; PGDA 0%, its 3x3 median 43%, ours 56%, isolated in PGDA), pixel 198 (+45.2; PGDA 0%, its 3x3 median 45%, ours 45%, isolated in PGDA), pixel 8 (+14.5; PGDA 39%, its 3x3 median 39%, ours 54%), pixel 52 (+13.4; PGDA 4%, its 3x3 median 4%, ours 17%), pixel 25 (-13.1; PGDA 21%, its 3x3 median 21%, ours 8%). 2 of the 5 largest differences sit on PGDA pixels that differ from their own 3x3 neighbourhood median by more than 20 points (isolated values in the 2016 map); the others are not explained by that test, so the outliers are only partly explained. PGDA used the 2016 60 m elevation map and we use the 2023 maps averaged to 60 m, so part of the scatter is real terrain change. The label does not give the period start (we use 2009-07-13) or the observer height (we use the surface).
- **Best point on the connecting ridge vs Gläser et al. (2014)** (partial): Half the disc visible (our 'lit' rule): 86.32% at 2 m (-5.95), 89.68% at 10 m (-5.97). Any part of the disc visible, same points: 90.73% (-1.54) and 93.62% (-2.03). Gläser's exact definition of 'sunlit' was not checked (the paper was not accessible here), so both are shown. The coarse grid alone gave 70.6% and 86.6%: a 2 m observer is very sensitive to standing exactly on the crest. Our bin rule (review note 001) lowers the lit share by only 0.37 and 0.33 points here. Other differences: newer 2023 terrain, an 18.6-year period starting 2009-07-13, and a search limited to two neighbourhoods. The horizon search distance used in the 2014 study is not stated in its abstract; a 100 km limit would raise our figure by 3.7 points (sensitivity table), so a nearer limit in the study is one possible reason for the gap, not a proven one.
- **Total lunar eclipses: Sun hidden at every site** (fail): 1 of 84 site-eclipse pairs show a sliver of the Sun at the edge of NASA's totality: Peak near Cabeus B (LROC Artemis III mosaic centre), 2029 Dec 20: up to 0.09% of the disc; our full cover runs -40.5 to +26.0 min around greatest eclipse vs NASA's ±27.0 min. NASA's eclipse predictions enlarge Earth's shadow to allow for its atmosphere; our Earth disc is the bare 6,371 km sphere, so our geometric totality is about a minute shorter at some sites.
- **Real missions: our predictions beside what landers reported** (reported): Blue Ghost: Earth hides the whole Sun at the landing site through NASA's totality (full cover starts 8 min before U2 and ends 63 min after U3; geometry only: Earth's atmosphere, which lit the ring in Blue Ghost's photo, is not modelled). Blue Ghost: last data 2.9 h after our half-disc sunset and 2.3 h after the last of the disc set; Firefly said just over 5 h into the lunar night without defining its start. IM-1 Odysseus: our first sunset 2024-03-03 08:12 UTC; standby reported on 2024-02-29 (smooth horizon near the pole: not a fair test). Chandrayaan-3: put to sleep 14 h before our sunset. Chandrayaan-3: our next sunrise 2023-09-19; ISRO expected awakening around 2023-09-22. Athena: at landing our model has the Sun 2.5° up and 100% visible at its resting place; the 20 m crater that, per SpacePolicyOnline, kept sunlight off its solar cells is below our map's resolution. Sites without a computed terrain horizon use a smooth horizon; a real local horizon can move a sunset by hours (each row says by how much per degree). Reported times are from mission, NASA, ISRO and news pages (links in the data).

### What moves the sunlight number (best connecting-ridge point, 2 m, 18.6 years)

| Change | Lit % | Change in points |
| --- | --- | --- |
| Baseline: shipped engine, 2 m, half the disc, 18.6 years from 2009-07-13 | 86.32 | +0.00 |
| Near-field rays start 1 pixel out (baseline 0.5) | 86.32 | +0.00 |
| Near-field rays start 2 pixels out | 86.32 | +0.00 |
| Bin rule: nearest-bin filling (±0.125°) instead of review note 001's ±0.25° | 86.51 | +0.19 |
| Bin rule: no widening at all | 86.69 | +0.37 |
| Threshold: any part of the disc counts as lit | 90.73 | +4.41 |
| Time span: 2027-2030 (the app's table) instead of 18.6 years | 86.48 | +0.16 |
| Terrain search stops at 100 km instead of 300 km | 90.00 | +3.68 |
| Coarser terrain: 80 m map near the site instead of 20 m | 85.09 | -1.23 |
| Grid: best point of the ~240 m validation grid instead of this refined point | 70.59 | -15.73 |

## The miss test, in numbers (hourly 2027-2030; lit = at least half the Sun's disc above the terrain)

| Target | Observer | Lit at target | Range within 100 m | Range within 250 m | Range within 500 m |
| --- | --- | --- | --- | --- | --- |
| Malapert Massif (LROC Artemis III mosaic centre) | 2m | 29.3% | 26.5–40.3% | 0.0–63.9% | 0.0–63.9% |
| Malapert Massif (LROC Artemis III mosaic centre) | 10m | 49.3% | 36.5–61.0% | 4.9–64.8% | 0.0–65.0% |
| IM-2 Athena target (Mons Mouton) | 2m | 44.4% | 44.3–44.4% | 43.1–44.5% | 33.6–45.1% |
| IM-2 Athena target (Mons Mouton) | 10m | 45.0% | 44.9–45.1% | 44.7–45.1% | 42.0–46.0% |
| Shackleton–de Gerlache ridge at Shackleton's rim | 2m | 73.4% | 48.2–82.7% | 22.7–85.1% | 0.0–85.1% |
| Shackleton–de Gerlache ridge at Shackleton's rim | 10m | 85.7% | 64.2–85.9% | 41.4–86.1% | 0.2–86.1% |

- Refined point for `shackleton_ridge_rim` (18.6 years): 170 m from the cited point, 84.3% (2 m) / 86.0% (10 m), against 73.5% / 85.7% at the cited point; as low as 32.0% (10 m) within 300 m. Method: highest share of hours with at least half the Sun's disc visible at 10 m over 18.6 years, on a 20 m grid within 300 m of the cited point.
- Athena's target: sunlight is nearly uniform at map scale within 250 m (see table). The 20 m crater Athena came to rest in (LROC) is below what our 10 m terrain resolves; say so on the page.

## The site's default link (review note 003 B)

Found by `pipeline/sunsight/default_scenario.py`, recorded in `docs/submission/default_scenario.json`. Rule: presets in the order robotic, crew, long; per target, in rising screened share: first exact target verdict 'go' with exact share of passing points within 250 m in (0, 0.9); lowest share across targets, ties earliest.

- robotic: Shackleton–de Gerlache ridge at Shackleton's rim: target passes on 1 of 1447 daily starts, 1 of them with the 250 m share below 90% (hourly screen); Malapert Massif (LROC Artemis III mosaic centre): target passes on 0 of 1447 daily starts, 0 of them with the 250 m share below 90% (hourly screen); IM-2 Athena target (Mons Mouton): target passes on 18 of 1447 daily starts, 0 of them with the 250 m share below 90% (hourly screen). No start meets the rule.
- crew: Shackleton–de Gerlache ridge at Shackleton's rim: target passes on 221 of 1455 daily starts, 221 of them with the 250 m share below 90% (hourly screen); Malapert Massif (LROC Artemis III mosaic centre): target passes on 86 of 1455 daily starts, 86 of them with the 250 m share below 90% (hourly screen); IM-2 Athena target (Mons Mouton): target passes on 201 of 1455 daily starts, 3 of them with the 250 m share below 90% (hourly screen).
- Chosen: Shackleton–de Gerlache ridge at Shackleton's rim, start 2029-07-24T00:00Z, crew preset: GO at the target (exact), and 14.8% of the 81 grid points within 250 m pass (exact). The browser shows the same share (end-to-end test).

## Engineering numbers (measured in this repository)

- Region de_gerlache_rim: 961 points, terrain read 28.7 s, masks 83.2 s; compressed masks 2.23 MB.
- Region haworth: 961 points, terrain read 35.0 s, masks 51.8 s; compressed masks 2.16 MB.
- Region malapert_massif: 961 points, terrain read 34.8 s, masks 45.9 s; compressed masks 2.19 MB.
- Region mons_mouton_plateau: 961 points, terrain read 31.6 s, masks 46.7 s; compressed masks 1.99 MB.
- Region nobile_rim1_mons_mouton: 961 points, terrain read 27.8 s, masks 48.4 s; compressed masks 2.19 MB.
- Region nobile_rim2: 961 points, terrain read 33.1 s, masks 55.6 s; compressed masks 2.09 MB.
- Region peak_near_cabeus_b: 961 points, terrain read 25.9 s, masks 51.4 s; compressed masks 2.12 MB.
- Region shackleton: 961 points, terrain read 37.9 s, masks 49.1 s; compressed masks 2.28 MB.
- Miss grid a3_malapert_massif: 317 points, read 23.4 s, masks 24.7 s.
- Miss grid im2_athena_target: 317 points, read 16.2 s, masks 26.0 s.
- Miss grid shackleton_ridge_rim: 317 points, read 33.0 s, masks 25.7 s.
- Browser engine: a 14-day window scores in about 3 ms in Node 20 (budget 50 ms); see web/LANE_B_NOTES.md.

## Data used (with links)

- naif0012.tls: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls, 5,257 bytes, SHA-256 678e32bdb5a7…
- pck00011.tpc: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc, 131,226 bytes, SHA-256 3dff7b1dbece…
- de440s.bsp: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp, 32,726,016 bytes, SHA-256 c1c7feeab882…
- moon_pa_de440_200625.bpc: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.bpc, 12,863,488 bytes, SHA-256 60cd55aa401e…
- moon_de440_250416.tf: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf, 19,478 bytes, SHA-256 a47c71e9c9f3…
- moon_assoc_me.tf: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_assoc_me.tf, 8,468 bytes, SHA-256 52c622043ce0…
- earth_2026_260806_2126_predict.bpc: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/earth_2026_260806_2126_predict.bpc, 19,169,280 bytes, SHA-256 9f565ab5aacc…
- earthstns_itrf93_260814.bsp: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/stations/earthstns_itrf93_260814.bsp, 26,624 bytes, SHA-256 007eb0aad5dd…
- earth_topo_260814.tf: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/stations/earth_topo_260814.tf, 69,400 bytes, SHA-256 4f40cd1e8671…
- LDEM_80S_20MPP_ADJ.TIF: https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_20MPP_ADJ.TIF, 2,696,082,051 bytes
- LDEM_80S_80MPP_ADJ.TIF: https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_80S_80MPP_ADJ.TIF, 189,158,392 bytes, SHA-256 82030dcbdd7c…
- LDEM_60S_240MPP_ADJ.TIF: https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_60S_240MPP_ADJ.TIF, 218,961,039 bytes, SHA-256 3f9663257b63…
- LDEM_83S_10MPP_ADJ.TIF: https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LDEM_83S_10MPP_ADJ.TIF, 5,116,709,568 bytes
- MOON_nomenclature_center_pts.zip: https://planetarynames.wr.usgs.gov/GIS_Downloads, 23,845,070 bytes, SHA-256 bcb1a37a195b…
- AVGVISIB_85S_060M_201608.TIF: https://pgda.gsfc.nasa.gov/data/MoonIllumination/AVGVISIB_85S_060M_201608.TIF, 33,994,464 bytes, SHA-256 ccf67d4f39e0…
- AVGVISIB_85S_060M_201608_EARTH.TIF: https://pgda.gsfc.nasa.gov/data/MoonIllumination/AVGVISIB_85S_060M_201608_EARTH.TIF, 24,862,958 bytes, SHA-256 d71dc5adfff6…
- LPSR_85S_060M_201608.TIF: https://pgda.gsfc.nasa.gov/data/MoonIllumination/LPSR_85S_060M_201608.TIF, 656,183 bytes, SHA-256 e9544c081dd4…
- JPL Horizons answers: https://ssd.jpl.nasa.gov/api/horizons.api
- PGDA 69 illumination maps (validation): https://pgda.gsfc.nasa.gov/products/69 (AVGVISIB_85S_060M_201608, _EARTH, LPSR_85S_060M_201608)
- NASA lunar eclipse table 2021-2030: https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html
- Gläser et al. 2014, Icarus 243, 78: https://ui.adsabs.harvard.edu/abs/2014Icar..243...78G
- Site coordinates: see `web/public/data/sites.json` (`source_url` and `source_quote` per site).

## Limits to state

- Terrain maps cannot see boulders or craters smaller than a few pixels (20 m map; 10 m near miss-test targets).
- Earth contact is geometry only: line of sight and elevation, not signal strength or data rate.
- The Deep Space Network is a reference choice; commercial landers often use other stations.
- Sites outside the south polar terrain grids use a smooth horizon and say so.
- NASA's terrain error maps are not yet folded into error bars.
- The miss-test share treats every point in the circle as equally likely; it is not a landing probability.
- Horizon bins are widened by up to 0.25° so no peak is missed (review note 001); this biases sunlight slightly low.

