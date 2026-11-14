# Decisions

Every assumption, its value and the reason. The build agent appends to this table. Rows marked "starting default" were proposed in the AI-drafted plan and are for the team to confirm or change.

| # | Decision | Value | Reason | Status |
| --- | --- | --- | --- | --- |
| 1 | Reference frame | MOON_ME | The frame the LOLA terrain maps use | Fixed |
| 2 | Time span of the table | 2027-01-01 to 2030-12-31 UTC, hourly | Covers the planned south pole landings; 35,064 rows | Fixed |
| 3 | Position corrections | Light time and stellar aberration (LT+S) | Apparent positions are what a lander sees | Fixed |
| 4 | Azimuth bins | 1,440 (0.25°) | Half a Sun-radius; 2.9 KB per mask | Fixed |
| 5 | Observer heights | 2 m and 10 m | An astronaut and a mast or solar array | Starting default |
| 6 | Terrain search distance | 300 km | A site 2 km up sees an 8 km peak out to 250 km | Fixed |
| 7 | Terrain rings | 10–20 m to 20 km; 80 m to 60 km; 240 m beyond | Keeps each pixel under one azimuth bin wide | Fixed |
| 8 | "Lit" threshold | At least half the Sun's disc visible | A simple, explainable rule | Starting default |
| 9 | Station rule | Moon at least 10° above the station's horizon | A common ground-station mask; adjustable | Starting default |
| 10 | Grazing contact | Station less than 2° above the lunar terrain | Low-angle links fade; our threshold | Starting default |
| 11 | Reference network | Deep Space Network: Goldstone, Madrid, Canberra | Public station positions in NAIF kernels | Starting default |
| 12 | Miss-test grid | 50 m spacing out to 500 m, about 320 points | Covers Athena's reported miss of 250 m to over 400 m | Starting default |
| 13 | Miss-tolerant rule | At least 90% of points inside the radius pass | Our threshold; adjustable | Starting default |
| 14 | Preset rules | See "Default rules" in BUILD_PLAN.md | Only continuous sunlight for a 6.5-day stay comes from NASA | Starting default |
| 15 | Merge rule for this run | The agent merges when `make check` passes | The owner chose full automation; reviews arrive in `review/` | Fixed for this run |
| 16 | Mask bin centres | Bin k holds the terrain elevation at azimuth k × 0.25°; `horizon_at` interpolates linearly between centres | Makes "linear between neighbouring bins" exact; the horizon engine fills bin k from [k×0.25 − 0.125, k×0.25 + 0.125) | Fixed |
| 17 | Table interpolation | 4-point Lagrange cubic over rows i−1..i+2, stencil clamped inside the table | Simple, exact for cubics, identical in both languages | Fixed |
| 18 | Contact grades | Grazing counts as contact (flagged); contact gap = all three stations blocked; "earth" mode = any part of Earth's disc above terrain | BUILD_PLAN grades three states but does not say whether grazing breaks a link | Starting default |
| 19 | Event times and thin margins | Bisection until the bracket ≤ 60 s, event at the midpoint; "thin" = over 75% of a limit, or (no-darkness rule) under 75% of the Sun's disc at some moment, or mostly grazing contact | The plan says "a margin is thin" without a number | Starting default |
| 20 | Site light-time/aberration | Use the Moon-centred apparent (LT+S) vector minus the site vector | Differs from SPICE SPKCPO by at most (v/c)(R/d) + ωR/c = 2.94e-5° for Earth and 9.5e-7° for the Sun (measured max 2.4e-5°): 34× under the 0.001° pass mark, and it keeps one table for every site | Fixed |
| 21 | Fixture vs real data | App loads `manifest.json`, else `fixture_manifest.json` with a banner; deploy enforces the no-fixture release check once `manifest.json` exists | Lets the site go live at P0 while keeping rule 5 for the release | Fixed |
| 22 | Toolchain | Python 3.11 via uv 0.13.8 in `.tools/`; Node 20.19.2 (installed; current LTS is newer) | No sudo, no system changes; Node 20 runs Vite 6 | Fixed |
| 23 | Web framework | Preact 10 + Vite 6 + TypeScript, no CSS framework | Small bundle for the 3-second first load | Fixed |
