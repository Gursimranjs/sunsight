# 004 NOTE — Replay real missions as a validation check, and split the table by year

Filed by the reviewer, Saturday 10:55. Recommended once note 003 is done; there is time before
the freeze.

## Why

1. Speed. STATUS says first load is 3.22 MB, of which the 2027–2030 table is 2.5 MB, so the
   3-second target fails at 10 Mbit/s. Splitting the table into one file per year (about 0.63 MB)
   and loading only the year in view fixes that.
2. Validity and story. With yearly files it costs little to add 2023 to 2026. Then SunSight can
   replay landings that have already happened and compare its predictions with what the missions
   reported. A tool that reproduces real mission events is far more convincing than one that only
   agrees with other models. The challenge statement itself suggests CLPS and other countries'
   landing sites.

## What to build

- `ephemeris/<year>.bin` and `.json` for 2023 to 2030, same columns; a manifest entry per year;
  the loader fetches the years a window touches. Raise `format_version`. Check the Earth-orientation
  kernels cover 2023 to 2026 (the predicted kernel may not reach back; if so, find the right
  historical kernel on NAIF and add it to the lock file, or leave station columns out for those
  years and say so).
- A ninth validation check, "Real missions": for each mission below, the event SunSight predicts
  against the event the mission reported.
- A "Replay a real landing" list in the site picker that sets site and date together.

## Candidate events — VERIFY EVERY ONE AGAINST A CITED SOURCE BEFORE USE

These are from the reviewer's memory and are leads, not data. Find each on a NASA, agency or
company page, store the URL, and drop any you cannot confirm (hard rule 4).

- Blue Ghost Mission 1 (Mare Crisium): landed early March 2025; it photographed the total lunar
  eclipse of 14 March 2025 from the surface, where Earth covered the Sun; it kept working until
  shortly after local sunset around 16 March 2025. Checks: our Sun share reaches 0 during NASA's
  listed totality for that date at that site, and our sunset time against the reported one.
- IM-1 Odysseus (near Malapert A): landed 22 February 2024; put to sleep about a week later as
  night approached. Check: our sunset date at its resting place.
- Chandrayaan-3 Vikram: landed 23 August 2023; put to sleep in early September 2023 before sunset.
  Check: our sunset date.
- IM-2 Athena: landed 6 March 2025. Check: the Sun's elevation and direction at the reported
  landing time, shown in the Athena story with the real date instead of a 2027 stand-in.

Sites outside the terrain regions use the smooth horizon, so state that on each row, and say that
a real local horizon can shift a sunset by hours.

## Pass mark (owner's default, adjustable by the owner only)

Report the differences as measured. Do not set a pass mark after seeing the numbers; show
"reported" beside "SunSight" with the source link and let the reader judge.

Partly handled in the r004/real-missions merge (see STATUS log, DECISIONS #46): the ninth check "Real missions" is built as asked (no pass mark, reported beside SunSight with source links, every event cited, numbers re-derived independently). Not built, by choice before the freeze: the per-year ephemeris files and the "Replay a real landing" list. Both need the browser table to start in 2023, which changes the time origin used across the engine, URL and tests; that risk was judged too high this close to 14:00. The check is therefore computed in the pipeline (18.6-year SPICE table) rather than in the browser. Left here open for the reviewer.
