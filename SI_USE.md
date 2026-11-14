# SI (AI) use log

The Space Apps Submission Guide calls AI tools "Super Intelligence (SI)" and asks every team to say where and how they were used. This log is the source for the form's SI field. Keep it truthful and complete; the team is responsible for making the form match it.

| When | Tool | What it did | Where |
| --- | --- | --- | --- |
| November 5 to 13, 2026, before the event | Claude (Anthropic), chat assistant | Compared the challenges, proposed the project idea including the miss test, researched data sources and rules, and drafted the project plan | `docs/PROJECT_PLAN.md`, `docs/REFERENCE.md` |
| November 14, 2026 | Claude (Anthropic), chat assistant | Read the official challenge pages, wrote the build specification and the agent rules, set up this folder, and reviews the code during the event | `docs/BUILD_PLAN.md`, `AGENTS.md`, `review/` |
| November 14 to 15, 2026 | Claude Code (Anthropic) | Writes the code, tests and data pipeline, one row per package below | Whole repository |

## Per-package log

The build agent appends one row per package.

| Package | Date and time | What was generated | Files |
| --- | --- | --- | --- |
| P0 | 2026-11-14 09:22 MST | Repository skeleton, Makefile, CI and deploy workflows, Python package with data-contract constants, fixture generator and made-up fixture data, Vite/Preact app showing one number, README, LICENSE text | `Makefile`, `.github/workflows/`, `pipeline/sunsight/{contracts,export,fixtures}.py`, `pipeline/tests/test_contracts.py`, `web/`, `web/public/data/fixture_*` |
| P8 | 2026-11-14 09:26 MST | Reference sunlight and contact maths, its tests, and the shared test vectors (made-up inputs) | `pipeline/sunsight/{light,vectors}.py`, `pipeline/tests/test_{light,vectors}.py`, `tests/vectors/light_vectors.json` |
| P1 | 2026-11-14 09:28 MST | Kernel download, checksum lock file and load-time checks | `pipeline/sunsight/kernels.py`, `pipeline/kernels.lock.json`, `pipeline/tests/test_kernels.py` |
| P2 | 2026-11-14 09:31 MST | Frame helpers and tests against SPICE topocentric routines | `pipeline/sunsight/frames.py`, `pipeline/tests/test_frames.py` |
| P3 | 2026-11-14 09:38 MST | Ephemeris builder and its tests; the generated table `ephemeris/2027_2030.bin/.json` (computed by SPICE from NAIF kernels) | `pipeline/sunsight/ephemeris.py`, `pipeline/tests/test_ephemeris.py`, `web/public/data/ephemeris/` |
| P5 | 2026-11-14 09:45 MST | Terrain access module and tests; extract of USGS Gazetteer features south of 82°S | `pipeline/sunsight/dem.py`, `pipeline/tests/test_dem.py`, `pipeline/data/gazetteer_south.json` |
| P6 | 2026-11-14 09:52 MST | Horizon engine and synthetic-terrain tests; curated site list compiled from NASA/NSSDCA/LROC/USGS pages by a research subagent | `pipeline/sunsight/horizon.py`, `pipeline/tests/test_horizon.py`, `pipeline/data/curated_sites.json` |
