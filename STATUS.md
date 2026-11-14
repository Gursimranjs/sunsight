# Status

Updated by the build agent after every package. Newest notes at the top of each section.

## Machine

Checked Saturday November 14, 2026, 09:16 MST.

| Item | Value |
| --- | --- |
| OS | macOS 27.0.1 (build 26A434), arm64 (Apple silicon) |
| CPU cores | 14 (14 physical) |
| Memory | 24 GB |
| Free disk | 94 GB of 460 GB on the data volume |
| git | 2.39.5 (Apple Git-154) |
| Python | 3.14.4 default; 3.11 at `/Library/Frameworks/Python.framework/Versions/3.11`; no 3.12 |
| uv | Not installed system-wide. Installed 0.13.8 into `.tools/` (a venv inside this folder, git-ignored) to avoid touching the system |
| Node | 20.19.2, npm 10.8.2 |
| gh | 2.81.0, logged in to github.com |

## Needs a human

1. **Rules question (people, before relying on this build).** `docs/PROJECT_PLAN.md` asks the team to check with the local lead how the "no work before the hackathon" and "AI is not for the idea" rules apply to this AI-drafted plan. The agent cannot do this.
2. **Mirror host.** Connect `github.com/Gursimranjs/sunsight` to Cloudflare Pages or Netlify (build command `cd web && npm ci && npm run build`, output `web/dist`, env `SUNSIGHT_BASE=/`). Needs a login.
4. **Read every validation number (BUILD_PLAN "What stays human").** `web/public/data/validation/summary.json` and the CSVs beside it. Two checks miss their pass marks and one is partial, each with its measured cause on the page:
   - Sunlight vs PGDA, like for like (review note 002 recipe): mean −2.32 points against ±2 (−1.10 under the label's other definition; our bin rule accounts for −0.13). A person should decide whether to keep the pass mark as written and present it as a miss (the agent's default), or ask the PGDA team which definition the AVGVISIB map uses.
   - Eclipses: 1 of 84 site-eclipse pairs (Peak near Cabeus B, 2029 Dec 20) shows 0.09% of the Sun in the last minute of NASA's totality; NASA enlarges Earth's shadow for the atmosphere, we use the bare sphere.
   - Gläser ridge: −5.95/−5.97 points with the half-disc rule, −1.54/−2.03 with any part of the disc. Gläser's exact definition of "sunlit" was not checked; please check the paper (Icarus 243, 78) and say which applies.
3. **FortiGuard classification.** Request a web-filter classification for `https://gursimranjs.github.io/sunsight/` at https://www.fortiguard.com/faq/classification (Submission Guide recommendation). Needs a person.

## Gates

| Gate | Due | Status | Note |
| --- | --- | --- | --- |
| 1: one real site end to end on the live address | Saturday 20:00 | Reached Saturday 10:01 MST (machine clock) | https://gursimranjs.github.io/sunsight/?site=shackleton_ridge_rim&start=2028-06-01T00%3A00Z&days=14&preset=robotic shows the same longest darkness (173.1 h), gap (231.6 h) and sunrise (2028-06-08 05:04 UTC) as light.py on the real table. A person should open it on a laptop and a phone. |
| 2: feature freeze | Sunday 14:00 | Not reached | |
| 3: submitted by people | Sunday 22:30 | Not reached | |

## Packages

Status is one of: todo, doing, done, cut.

| ID | Package | Lane | Status | Commit | Note |
| --- | --- | --- | --- | --- | --- |
| P0 | Skeleton and fixtures | Both | done | 3dd52bc | Fixture data, CI, Pages deploy |
| P1 | Kernels and manifest | A | done | 60cc057 | Nine kernels load; Earth orientation covers 2027–2030 |
| P2 | Frames | A | done | 7c45c2d | ME/PA 875 m; matches SPICE AZLCPO to 1e-6° |
| P3 | Ephemeris table | A | done | e02475c | 35,064 rows; interp vs SPICE: Sun 1.8e-6°, Earth 5.8e-7° |
| P4 | Horizons check | A | done | fe928bc | Sun 1.6e-6°, Earth 2.6e-5°; stations 5.9e-4° (geometry) |
| P5 | Terrain access | A | done | 26088d4 | 1 km window over HTTP 1.04 s; 23 craters on bowls |
| P6 | Horizon engine | A | done | 752e373 | All synthetic tests pass; review note 001 applied |
| P7 | Hero site masks | A | done | d86facf | 961 pts in 87 s; floor 0% lit; ridge top 3.9%/0.8% |
| P8 | Light engine, reference | A | done | bd7ee2a | Reference maths + shared vectors; real-table integration follows P3 |
| P9 | Light engine, browser | B | done | cda23b0 | 3.1 ms per 14-day window; all vectors to 1e-6 |
| P10 | Site library and Anywhere mode | B | done | cda23b0 | 28 cited sites; smooth horizon labelled |
| P11 | Report card | B | done | cda23b0 | Countdowns equal event list (unit test) |
| P12 | Sky panorama | B | done | cda23b0 | Disc radius = r_deg × px/deg (test) |
| P13 | Compare and calendar | B | done | cda23b0 | Calendar cells equal report cards |
| P14 | Miss-test grids | A | done | 94a1687 | 3 targets × 317 pts, 42–50 s each; format v2 .dz masks |
| P15 | Miss-test view | B | done | cda23b0 | Shares equal Python on fixture; miss-tolerant calendar pending |
| P16 | All regions | A | done | 741a956 | 7 Artemis III regions + Shackleton; dz 1.99–2.28 MB each |
| P17 | Validation runs and page | Both | doing | 741a956 | Pipeline side done: 5 pass, 1 partial, 2 fail (explained); page with lane B2 |
| P18 | 3D hero view | B | doing |  | Lane B2 subagent |
| P19 | Guided Athena story | B | doing |  | Lane B2 subagent |
| P20 | Share and export | B | done | cda23b0 | Scenario in URL; CSV/JSON export |
| P21 | Quality pass | B | todo | | |
| P22 | Demo, project page, submission | People | todo | | |

## Log

- **P16, P17 pipeline (10:40).** Seven Artemis III regions (961 points each, 75–112 s, compressed masks under 3 MB). Validation: Horizons, stations, physics sanity (10/10), known places (99.1% of PGDA permanent-shadow points never lit), Earth vs PGDA (+0.23) pass; sunlight vs PGDA −2.32 (fail), eclipses (1 of 84 pairs, fail), Gläser (partial). All explained on the page with computed numbers; nothing tuned.
  Reviewer: note 002 handled (A like-for-like recipe, B refined ridge/rim point 170 m from LROC's: 84.3%/86.0% vs 73.5%/85.7% at 2/10 m, as low as 32% within 300 m; C sensitivity table). Under "Needs a human" as the note asked.
- **P14 (10:15).** Miss grids for the Athena target, Shackleton ridge/rim and Malapert Massif (317 points each, 10 m map near field, under a minute each). Mask format v2 adds lossless `.masks.dz` files (azimuth deltas + byte planes + gzip, ~37% of raw); both loaders tested.
- **Gate 1 (10:01).** Real data live: manifest.json (fixture false), ephemeris, 28 cited sites, Shackleton region and terrain cut. Fixtures moved to `web/tests/fixtures/data` and never shipped; the release build refuses any `fixture_` file.
- **Lane B (P9–P13, P15, P20, merged 09:58).** Built by a subagent on fixtures; all shared vectors reproduce to 1e-6; 14-day window 3.1 ms (budget 50 ms); bundle 77.8 kB JS (28 kB gzip). Not yet done: miss-tolerant calendar, axe run, the two people tests. Its notes are in `web/LANE_B_NOTES.md`.
  Reviewer: lane B found the shared vectors only reached no-go; added 21 verdict cases and a smooth-horizon window (merged).
- **P7 (09:50).** Shackleton region, 961 points at 500 m in 87 s. 2027–2030 hourly: floor 0.00% lit; LROC ridge/rim point top 3.9% (2 m), top 0.8% (10 m). Region best: 58% (2 m), 74% (10 m).
  Reviewer: those best values look low next to published rim numbers; 2 m→10 m lowers the median horizon at the rim point by 1.85°, i.e. terrain within ~250 m dominates at 2 m. P17 will compare like for like with PGDA and Gläser before anyone tunes anything. Odysseus ground height from our 20 m map 2,592 m vs NASA's 2,579 m.
- **P4 (09:52).** Horizons: Sun 1.6e-6°, Earth 2.6e-5° (the P2 aberration term). Station elevations: geometry 5.9e-4° at all 60 times; interpolated column 3.9e-3° in its 0–20° band, 0.246° near station zenith (not used for decisions).
  Reviewer: make check failed during this merge on a transient PGDA read error; the HTTP test now runs only in `make check-network`.
- **P6 (09:52).** Numba horizon engine; 35 synthetic tests from closed-form 3D geometry (dip 0.087/0.194°, walls < 0.01°, 90° rotation, far spike at 27 placements, brute-force never-under-read, 10 m ≤ 2 m). Review note 001 resolved as proposed.
  Reviewer: near-field rays are 0.05° apart; a single-pixel spike within 5 km can be under-read by part of its height between rays (bilinear surface). Far field has the exact guarantee. P17 sensitivity runs will measure the near-field effect.
- **P5 (09:45).** dem.py: projection checked against pyproj; map stretch 0.77/1.73/7.18%; 3D distance and bearing equal haversine and spherical bearing; 23 IAU craters (USGS Gazetteer extract committed) land on bowls, mirrored grid fails; 1 km window of the 20 m map over HTTP in 1.04 s.
  Reviewer: the PGDA 90 page does not state the height reference radius; I used the LOLA PDS label ("Map values are relative to a radius of 1737.4 km", `OFFSET = 1737400`), DECISIONS #27. The crater-depth thresholds were set after a first run (my first guess, depth > 4% of D, failed on degraded craters).
- **P3 (09:38).** Hourly table, 2.5 MB. Interpolation vs fresh SPICE at 100 random times: Sun 1.8e-6°, Earth 5.8e-7°, stations 7.9e-5°; Moon elevation at stations 0.0046° in the 0–20° band.
  Reviewer: three test bounds I first wrote were wrong and were replaced by derivations after diagnosis: station elevation interpolates badly near the station zenith (DECISIONS #24); apparent-size bounds need the Moon's orbit and the real apogee (#26); the plan's "Earth averages −0.26° at the pole" is not true for 2027–2030 (#25, SPICE mean sub-Earth latitude −0.163°).
- **P2 (09:31).** frames.py + 20 tests. MOON_ME/MOON_PA max displacement 875 m (pole 663 m), derived from TKFRAME_31009 angles before running. Our az/el equal SPICE AZLCPO to 1e-6°.
  Reviewer: the table design (Moon-centred apparent vector minus site) differs from SPICE SPKCPO by up to 2.4e-5° for Earth. Cause diagnosed (stellar aberration is applied along the centre's line of sight; second order (v/c)(R/d)); bound derived as 2.94e-5° and set as the test limit after the first run failed my un-derived 1e-5° guess. See DECISIONS #20.
- **P1 (09:28).** Nine kernels downloaded with curl (python.org Python lacks CA certs), SHA-256 in `pipeline/kernels.lock.json`. Station names confirmed in the SPK comments (1X/2X Goldstone, 3X/4X Canberra, 5X/6X Madrid).
- **P8 (09:26).** `light.py` reference engine; 19 tests from closed forms (lens area, sqrt(2h/R), a constructed sunset at 10.3 h found within 60 s). `tests/vectors/light_vectors.json` is self-contained (embeds 240 float32 fixture rows).
  Reviewer: semantics the plan left open are fixed in the light.py docstring and DECISIONS #16–19.
- **P0 (09:22).** Repo, uv/Vite skeleton, fixture data (all `fixture_`-named, `"fixture": true`), banner, CI and Pages deploy. Live at https://gursimranjs.github.io/sunsight/ once the deploy workflow succeeds.
