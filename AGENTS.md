# AGENTS.md

Rules for any AI agent working in this repository. Read this file first, every session.

## Mission

Build SunSight for the 2026 NASA Space Apps Challenge, challenge "Lunar Landing Site Navigator": an intuitive web tool that lets mission planners, educators and the public compare lunar landing sites and dates quickly, showing the Sun and Earth against the horizon to judge power and direct-to-Earth contact.

Deadlines, in local time:

- Saturday November 14, 20:00 — gate 1: one real site works end to end on the live address.
- Sunday November 15, 14:00 — gate 2: feature freeze. Only fixes after this.
- Sunday November 15, 22:30 — gate 3: people submit. The official cut-off is 23:59; nothing may be saved after it.

## What to read

1. This file.
2. `docs/BUILD_PLAN.md` — the specification: deliverables, data contracts, function contracts, 23 work packages, tests, deployment, timeline, cut order.
3. `docs/REFERENCE.md` — exact kernel and terrain file names, key numbers for tests, papers.
4. `docs/PROJECT_PLAN.md` — product detail. Read these sections closely: "November 14: what the official pages say", "What we'll build", "How it works", "Quality checks", "Validation plan". Skim the rest.

If documents disagree: the official Space Apps rules win, then `BUILD_PLAN.md`, then `PROJECT_PLAN.md`. Record the conflict in `docs/DECISIONS.md`.

## The loop

Repeat until every package is done or the feature freeze arrives.

1. Read every file in `review/` (not `review/resolved/`). Handle notes marked BLOCKING before anything else. When a note is handled, append `Resolved in <commit>: <one line>` to it and `git mv` it into `review/resolved/`. If you disagree with a note, say why in the note and leave it in place.
2. Pick the next package: follow the timeline table in `BUILD_PLAN.md`; within a lane, the lowest ID whose "needs" are all merged.
3. Create a branch `pkg/Pnn-short-name`. Write the tests from the package's "Done when" line first, then the code.
4. Run `make check`. When it passes, merge the branch into `main` and push if a remote exists.
5. Update `STATUS.md` (the package row and a two-line note), `SI_USE.md` (what was generated) and `docs/DECISIONS.md` (every assumption you made, with its value and reason).
6. Go back to step 1. Do not wait for the reviewer or for a person unless a stop condition below applies.

Lane A (pipeline) and lane B (web) can run in parallel, for example as subagents. The data contracts in `BUILD_PLAN.md` are the only interface between them.

## Automation mode for this run

`BUILD_PLAN.md` says people merge. For this run the project owner has chosen full automation: the agent merges its own package once `make check` passes. A reviewer session reads the repository about every half hour and leaves notes in `review/`. People check the work at the three gates.

## Hard rules

1. Never change a golden value or loosen a tolerance to make a test pass. Stop and report instead.
2. Never copy code or text from other Space Apps entries, including the repositories named in `docs/REFERENCE.md`.
3. Add the SI header to every file you generate and keep the co-author trailer on every commit (formats below).
4. No invented data. Every real number (coordinates, validation results, timings) comes from a run in this repository or from a cited source. If a download, a check or a run fails, say so in `STATUS.md`. Never substitute made-up values.
5. Fixture data is always marked: file names start with `fixture_`, the JSON carries `"fixture": true`, and the app shows a visible "fixture data" banner whenever it has loaded any. The release build fails if fixture data is present.
6. Report failures honestly. If a validation check misses its pass mark, the validation page shows the miss and the likely cause. Do not tune until it passes without understanding why it failed.
7. Curated site coordinates come from NASA or space-agency pages, with the source URL stored in `sites.json`. If you cannot find a reliable source for a site, leave the site out.
8. No NASA logos, insignia, flags or mission patches anywhere. No AI-generated images, video or audio.
9. The web app makes no network calls at run time. The repository holds no secrets.
10. Create no accounts, make no purchases and enter no credentials. If a step needs a login you do not already have, put it under "Needs a human" in `STATUS.md` and move on.
11. Work only inside this folder, apart from package-manager caches. Do not use `sudo`.
12. Put the unit in the name of every variable that holds a physical quantity: `_km`, `_m`, `_deg`, `_rad`, `_s`.
13. English in everything a user or judge can see.

## SI (AI) acknowledgement

The Space Apps Submission Guide requires AI-generated code and data to be acknowledged in descriptive text and metadata. The guide calls AI tools "Super Intelligence (SI)".

- First comment line of every generated source file: `SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.`
- Commits: keep Claude Code's default co-author trailer.
- `manifest.json`: `"generated_with": "SunSight pipeline; code written by Claude Code (Anthropic)"`.
- `README.md`: an "AI use" section that points to `SI_USE.md`.
- `SI_USE.md`: append one row per package.

## Stop conditions

Write the item under "Needs a human" in `STATUS.md`, with the exact step a person must take, then continue with other packages.

- A golden or tolerance test cannot be met after two honest attempts to find the cause.
- A step needs credentials: a GitHub login, Pages settings, a mirror host, a domain.
- Free disk space would fall below 10 GB after a download.
- The documents conflict with the official rules in a way you cannot resolve.

## Physics that is easy to get wrong

- **Frame.** Everything is in `MOON_ME`, loaded through `moon_de440_250416.tf` and `moon_assoc_me.tf`. Assert at load time that the frame resolves. Test that the same site in `MOON_ME` and `MOON_PA` lands about 875 m apart.
- **Positions.** Target relative to `MOON` in `MOON_ME` with `LT+S`. Stations are `DSS-14` (Goldstone), `DSS-63` (Madrid) and `DSS-43` (Canberra); confirm the names in the kernel's comment area. The Moon's elevation at a station uses that station's `_TOPO` frame.
- **Time.** UTC strings go through `str2et`. Never mix UTC seconds with ephemeris time; the 69-second difference moves the Sun by 0.01°.
- **Earth orientation.** Check at load time that the Earth-orientation kernel covers 2027-01-01 to 2030-12-31. If it does not, stop and report.
- **Terrain files.** Read the projection, pixel size, origin, no-data value and height units from each file's own metadata. Do not assume them. Confirm on the product page what radius the heights are measured from before adding 1,737.4 km.
- **Map to 3D.** Convert map position to latitude and longitude with the file's own projection, then to a 3D point. Never measure distance or direction on the map grid.
- **Local frame.** Use the formulas in `BUILD_PLAN.md`. Azimuth is clockwise from local north.
- **Observer.** Ground height comes from the finest terrain map by bilinear interpolation; the observer height (2 m or 10 m) is added along local up.
- **Horizon.** March rays inside about 5 km; beyond that, each pixel raises every azimuth bin it covers. Take the maximum only; never average or smooth a mask across azimuth. Ring distances: 10–20 m maps to 20 km, 80 m map to 60 km, 240 m map (to 60°S) out to 300 km.
- **Sun share.** Implement the listing in `BUILD_PLAN.md` exactly, in both languages. Test it against the analytic cases: flat horizon through the disc centre gives 0.5; Earth centred on the Sun gives 0.
- **Eclipses.** They need no special code. Test that the Sun share is 0 at every site through totality on 2028-12-31.
- **Speed.** Use Numba with parallel loops for the horizon engine, and compute both observer heights in one pass over the terrain.

## Environment

- Use `uv` for Python (3.11 or 3.12) and the current Node LTS for the web app. Lock both.
- Raw downloads go in `data_raw/` and are never committed. Check free disk space before any download over 500 MB.
- Test early whether the terrain files can be read in small windows over HTTP. If not, download the 40 m and 80 m maps and use the fine maps only for hero sites.
- Fetch JPL Horizons answers once with a script, at a polite rate, and commit the cached answers.

## Repository and deployment

- `git init` on `main` if the folder is not yet a repository. The first commit contains the files already here.
- If `gh auth status` succeeds, create a public repository named `sunsight`, push, and publish with GitHub Pages through Actions. If not, list the exact commands under "Needs a human" and keep working locally.
- The mirror host and the FortiGuard classification request need a person.

## What the agent does not do

People write the project page text, record and cut the 30-second video, and submit. Prepare material for them in `docs/submission/`:

- `FACTS.md`: verified facts and numbers, the data list with links, and the validation results. No prose meant for pasting.
- `shots/`: screenshots taken with Playwright from the real app.
- `clips/`: raw screen captures of the three journeys, taken with Playwright.
