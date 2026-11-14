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
3. **FortiGuard classification.** Request a web-filter classification for `https://gursimranjs.github.io/sunsight/` at https://www.fortiguard.com/faq/classification (Submission Guide recommendation). Needs a person.

## Gates

| Gate | Due | Status | Note |
| --- | --- | --- | --- |
| 1: one real site end to end on the live address | Saturday 20:00 | Not reached | |
| 2: feature freeze | Sunday 14:00 | Not reached | |
| 3: submitted by people | Sunday 22:30 | Not reached | |

## Packages

Status is one of: todo, doing, done, cut.

| ID | Package | Lane | Status | Commit | Note |
| --- | --- | --- | --- | --- | --- |
| P0 | Skeleton and fixtures | Both | done | 3dd52bc | Fixture data, CI, Pages deploy |
| P1 | Kernels and manifest | A | done | 60cc057 | Nine kernels load; Earth orientation covers 2027–2030 |
| P2 | Frames | A | done | 7c45c2d | ME/PA 875 m; matches SPICE AZLCPO to 1e-6° |
| P3 | Ephemeris table | A | todo | | |
| P4 | Horizons check | A | todo | | |
| P5 | Terrain access | A | todo | | |
| P6 | Horizon engine | A | todo | | |
| P7 | Hero site masks | A | todo | | |
| P8 | Light engine, reference | A | done | bd7ee2a | Reference maths + shared vectors; real-table integration follows P3 |
| P9 | Light engine, browser | B | doing |  | Lane B subagent, branch lane-b |
| P10 | Site library and Anywhere mode | B | doing |  | Lane B subagent |
| P11 | Report card | B | doing |  | Lane B subagent |
| P12 | Sky panorama | B | doing |  | Lane B subagent |
| P13 | Compare and calendar | B | todo | | |
| P14 | Miss-test grids | A | todo | | |
| P15 | Miss-test view | B | doing |  | Lane B subagent |
| P16 | All regions | A | todo | | |
| P17 | Validation runs and page | Both | todo | | |
| P18 | 3D hero view | B | todo | | |
| P19 | Guided Athena story | B | todo | | |
| P20 | Share and export | B | todo | | |
| P21 | Quality pass | B | todo | | |
| P22 | Demo, project page, submission | People | todo | | |

## Log

- **P2 (09:31).** frames.py + 20 tests. MOON_ME/MOON_PA max displacement 875 m (pole 663 m), derived from TKFRAME_31009 angles before running. Our az/el equal SPICE AZLCPO to 1e-6°.
  Reviewer: the table design (Moon-centred apparent vector minus site) differs from SPICE SPKCPO by up to 2.4e-5° for Earth. Cause diagnosed (stellar aberration is applied along the centre's line of sight; second order (v/c)(R/d)); bound derived as 2.94e-5° and set as the test limit after the first run failed my un-derived 1e-5° guess. See DECISIONS #20.
- **P1 (09:28).** Nine kernels downloaded with curl (python.org Python lacks CA certs), SHA-256 in `pipeline/kernels.lock.json`. Station names confirmed in the SPK comments (1X/2X Goldstone, 3X/4X Canberra, 5X/6X Madrid).
- **P8 (09:26).** `light.py` reference engine; 19 tests from closed forms (lens area, sqrt(2h/R), a constructed sunset at 10.3 h found within 60 s). `tests/vectors/light_vectors.json` is self-contained (embeds 240 float32 fixture rows).
  Reviewer: semantics the plan left open are fixed in the light.py docstring and DECISIONS #16–19.
- **P0 (09:22).** Repo, uv/Vite skeleton, fixture data (all `fixture_`-named, `"fixture": true`), banner, CI and Pages deploy. Live at https://gursimranjs.github.io/sunsight/ once the deploy workflow succeeds.
