<!-- SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md. -->
# SunSight

SunSight shows when a lunar landing site has sunlight for power and a line of sight to Earth for
communications, and how much of the ground around a target still works if the lander misses. It is the
SunSight team's entry for the 2026 NASA Space Apps Challenge, challenge "Lunar Landing Site Navigator".

- Live site: https://gursimranjs.github.io/sunsight/
- Status of every work package: `STATUS.md`. Assumptions and their reasons: `docs/DECISIONS.md`.

## What it does

- **Report card** for any site and date range: a go, marginal or no-go verdict with the reason in words, the
  Sun's elevation, countdowns to sunset and Earthset, and the longest darkness and contact gap.
- **Sky panorama**: the terrain horizon in every direction, with the Sun's and Earth's paths and true-size discs.
- **Compare and calendar**: several sites on one time axis; a days × sites table of verdicts.
- **Miss test**: around three targets, which ground within 100, 250 and 500 m still meets the rules.
- **Anywhere mode**: any latitude and longitude, with a smooth horizon (labelled "no terrain").
- **Validation page**: eight checks against JPL Horizons, NASA Goddard's illumination maps, a published
  site study and NASA's eclipse table, with every miss shown and explained.

## How it works

1. **Where the Sun and Earth are.** NAIF SPICE gives apparent (light-time and aberration corrected) positions
   of the Sun, Earth and three Deep Space Network complexes from the Moon's centre in the MOON_ME frame,
   hourly for 2027–2030. Each site subtracts its own position and rotates into its local east-north-up frame.
2. **How high the terrain rises.** For every grid point, the highest terrain elevation in 1,440 directions
   out to 300 km, measured in 3D from NASA's LOLA south polar maps (10–20 m near, 80 m to 60 km,
   240 m beyond), for observers 2 m and 10 m above the ground.
3. **Rules.** The share of the Sun's disc above the terrain and not behind Earth, contact with at least one
   station that clears the terrain while the Moon is 10° up at that station, events to the minute, and
   presets for a robotic lander, a crew sortie and a long stay. All rules are adjustable.

The heavy geometry runs once in Python; the site is static files and the browser does the rest in a Web Worker.

## Rebuild the data and the site

Needs `uv` (Python 3.11), Node 20 or later, `curl`, about 4 GB of free disk and a network connection.

```
make setup                         # Python and Node environments
make kernels                       # nine SPICE kernels (~60 MB), checksums in pipeline/kernels.lock.json
make ephemeris                     # Sun, Earth and station table for 2027-2030
make masks REGION=shackleton       # one region (see pipeline/data/regions.json for all ids)
make miss TARGET=im2_athena_target # one miss-test grid (see pipeline/data/miss_targets.json)
make golden                        # fetch JPL Horizons answers (already cached in tests/golden/)
make validate                      # the eight checks (downloads PGDA illumination maps to data_raw/illum first)
make manifest                      # sites.json and manifest.json with every input and output checksum
make check                         # lint, type-check and all fast tests
make web                           # build the site into web/dist
make e2e                           # browser journeys against the built site
```

Terrain maps are read in windows over HTTP and cached in `data_raw/` (never committed). The 80 m and 240 m maps
are downloaded whole (about 400 MB). `make fixtures` writes small made-up data to `web/tests/fixtures/data`
for unit tests; it is never shipped and the release build refuses it.

## Layout

- `pipeline/` — Python pipeline: `kernels`, `frames`, `ephemeris`, `dem`, `horizon` (Numba), `light`
  (reference maths), `regions`, `missgrid`, `validate`, `manifest`.
- `web/` — TypeScript web app (Vite, Preact). Pipeline outputs live in `web/public/data/`.
- `tests/vectors/` — shared test vectors that the Python and TypeScript engines both reproduce to 1e-6.
- `tests/golden/` — cached JPL Horizons answers.
- `docs/` — build plan, decisions log, references, and `docs/submission/` for the team.

## Data and credits

- NAIF SPICE generic kernels (NASA JPL): https://naif.jpl.nasa.gov/pub/naif/generic_kernels/
- LOLA south polar terrain maps, PGDA product 90 (Barker et al. 2023): https://pgda.gsfc.nasa.gov/products/90
- Polar illumination maps, PGDA product 69 (Mazarico et al. 2011), for validation: https://pgda.gsfc.nasa.gov/products/69
- JPL Horizons, for validation: https://ssd.jpl.nasa.gov/horizons/
- NASA lunar eclipse tables: https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html
- Site coordinates: NASA, NSSDCA, LROC (NASA/GSFC/Arizona State University) and the USGS Gazetteer of
  Planetary Nomenclature; each site's link and quoted text are in `web/public/data/sites.json`.
- Published benchmark: Gläser et al. 2014, Icarus 243, 78.
- Every input file with its URL, size and checksum: `web/public/data/manifest.json`.

## AI use

Most of the code, tests and data pipeline in this repository were written by Claude Code (Anthropic), an AI
coding agent, and the planning documents were drafted with Claude (Anthropic). Every generated file starts with
an "SI-generated" header line, agent commits carry a co-author trailer (three merge commits are exceptions, listed in `SI_USE.md`), and the data manifest records
`generated_with`. `SI_USE.md` records which tool did what, where and when.

## Licence

MIT, see `LICENSE`.
