# 008 FIX — Put the miss result on the verdict card; re-capture the submission shots

Filed by the reviewer, Sunday 12:20, after opening the live site on desktop and at 375 px.
Both items are small. Do them before the 14:00 freeze; they come before the rest of note 004.

## What was checked

The live default link (Shackleton ridge, 2029-07-24, crew sortie, Miss test view) as a first-time
visitor, on desktop and phone width. The start choices, the headline sentence, the fill light, the
best-date jump and the day-and-hour durations all work. No sideways scroll at 375 px.

## Found

1. On the first screen the verdict card says GO, "Sunlight and Earth contact meet every rule with
   margin". The line that makes this scenario interesting ("NOT MISS-TOLERANT: land within 250 m
   and 15% of the ground still meets the rules") is one or two screens further down, below the
   controls, the time slider and the tabs. On a phone it is about four screens down. A judge who
   does not scroll sees a plain GO and never meets our signature result.
2. `docs/submission/shots/` and `clips/` are still Saturday's captures (11:22). They show the old
   first screen and the old default.

## Fix

1. When the selected site has a miss grid, add one line to the verdict card, directly under the
   reason: "Miss test: within 250 m, 15% of the ground still passes" (numbers from the same job that
   feeds the Miss test view, same radius as selected there), styled as a warning when under 90% and
   as a pass otherwise, with a link that scrolls to the Miss test tab. Keep the verdict itself as it
   is: the target is GO; the line adds the robustness.
2. Run `make capture` after the last UI change and commit the new shots and clips, so the people
   making the video and the project page work from the shipped build. Add a 3D shot now that the
   view is no longer black.

## Tests

- End to end: on the default link the verdict card contains the miss line with the same share the
  Miss test table shows for 250 m.
- End to end: a site without a miss grid shows no miss line.

Resolved in the commit after 00fd91d (see STATUS log, DECISIONS #48): 1. the verdict card carries "Miss test: within 250 m, 15% of the ground still passes (not miss-tolerant)" from the Miss test view's own job, warning style under 90%, with a link to the map; shown only for the current site, dates and rules; e2e tests check it equals the table's 250 m share and that a site without a grid shows no line. 2. make capture re-run on this build; new shots 0 (first screen), 5 (phone first screen), 7 (ranking), 8 and 9 (3D lit and at night) and a first-visit clip; docs/submission/README.md updated.
