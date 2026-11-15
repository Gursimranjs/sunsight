# 003 FIX — First impression: the site opens on a failing case with an empty miss test

Filed by the reviewer, Saturday 10:55, after opening https://gursimranjs.github.io/sunsight/ in a
desktop browser as a judge would.

## What was checked

The first screen and each tab, with no prior knowledge, against PROJECT_PLAN requirement R7
("two plain-language questions as entry points"), R8 ("answer in under 30 seconds") and the
Presentation criterion (the story must be clear to someone with no background).

## What was found

1. The site opens on the Athena target, 2027-01-01, robotic preset: NO-GO, 311.6 h of darkness.
   Nothing says why this site and date were chosen. A judge's first ten seconds show a failure
   with no story.
2. Miss test on that default: 0 of 13, 0 of 81 and 0 of 317 points pass. When the target itself
   fails, every miss fails too, so our signature feature shows nothing on the first visit.
3. 3D view on that default: the terrain is almost entirely black, because the Sun is below the
   horizon at the selected time.
4. Long durations are given only in hours ("311.6 h", "114.1 h").
5. I could not find the plan's first entry question, "We land on this date: which sites work?",
   as a one-click ranking of all sites. Compare shows three hand-picked sites.

The parts that work well and must stay: verdict first with the reason in words, the Sun's
elevation beside it, the three countdowns, the honest labels, the share link.

## Fix

A. Start screen or header strip with three plain choices:
   "I have a date: which sites work?", "I have a site: which dates work?", "Take the Athena tour".
   The first runs a ranking of every site that has terrain masks for the chosen date and preset,
   sorted by verdict and then score. The second opens the calendar for the chosen site.

B. A default scenario where the miss test teaches something. Pick it from computed data, not by
   hand: among the three miss-grid targets and all dates 2027–2030 (robotic preset), find a start
   date where the target point passes and the share within 250 m is well below 90%. Use that as the
   default link. Record the site, date, shares and the script that found it in
   `docs/submission/FACTS.md`. If no such case exists, say so in STATUS and use the refined
   Shackleton ridge point's best date instead.

C. Miss test when the target fails: replace the three 0% rows with one line, "The target itself
   fails on this date, so every miss fails too", and a button "Jump to this site's best date".

D. 3D view when the Sun is down: add a faint fill light so the terrain shape stays visible, with
   the label "Sun below the horizon: terrain shown with a faint fill light". Add a Play button that
   sweeps the stay, and open the view at the first lit moment of the stay when there is one.

E. Durations over 48 hours read "13.0 days (311.6 h)" everywhere, including verdict reasons. Keep
   the Python and TypeScript texts identical and update the shared vectors together.

## Tests

- End to end: the default link shows a verdict of go or marginal at the target and a 250 m share
  strictly between 0% and 90%.
- End to end: "I have a date" returns a ranked list within 2 seconds on the laptop.
- Unit: the duration formatter in both languages for 47.9 h, 48 h, 311.6 h.
- A screenshot of the 3D view at a dark moment is not uniformly black (mean pixel value above a
  small threshold).

Resolved in adbe336 (A), ed77bfe (C), 9663a6b + db8a747 (D), 342823e (B), ae127fc (E): all five parts merged with the tests the note asks for; each of A, C and D was reviewed by a separate agent, fixed, and re-reviewed before merging. B: the robotic preset has no qualifying start at any miss-test target in 2027-2030, so the default link uses the crew preset (Shackleton ridge, 2029-07-24: GO at the target, 14.8% within 250 m); recorded in docs/submission/FACTS.md and DECISIONS #41. Full suite on merged main: make check, 147 unit and 72 e2e tests pass.
