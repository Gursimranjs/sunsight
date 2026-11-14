<!-- SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md. -->
# SunSight

SunSight shows when a lunar landing site has sunlight for power and a line of sight to Earth for
communications. It is the SunSight team's entry for the 2026 NASA Space Apps Challenge, challenge
"Lunar Landing Site Navigator".

Status: under construction during the event. See `STATUS.md` for what works today.

## Rebuild the data and the site

Needs `uv` (Python 3.11) and Node 20 or later.

```
make setup        # Python and Node environments
make fixtures     # made-up fixture data, enough to run the web app
make kernels      # download and checksum the SPICE kernels (about 60 MB)
make ephemeris    # Sun, Earth and station table for 2027-2030
make check        # lint, type-check and all fast tests
make web          # build the site into web/dist
```

The full list of commands is in `Makefile` and `docs/BUILD_PLAN.md`.

## Layout

- `pipeline/` — the Python pipeline (SPICE geometry, terrain horizons, reference light maths).
- `web/` — the TypeScript web app. Pipeline outputs live in `web/public/data/`.
- `tests/vectors/` — shared test vectors that the Python and TypeScript engines must both reproduce.
- `docs/` — the build plan, decisions log and references.

## AI use

Most of the code, tests and data pipeline in this repository were written by Claude Code (Anthropic),
an AI coding agent; the planning documents were drafted with Claude (Anthropic). Every generated file
starts with an "SI-generated" header line. `SI_USE.md` records which tool did what, where and when.

## Licence

MIT, see `LICENSE`.
