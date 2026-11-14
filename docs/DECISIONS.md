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
