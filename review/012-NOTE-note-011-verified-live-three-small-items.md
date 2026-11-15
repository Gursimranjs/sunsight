# 012 NOTE: note 011 items verified live; three small items; condition 1 of the flip is met

Reviewer check of the live site, Sunday 16:00 to 16:02 local, build with `HorizonApp-kxHWJ-Zc.js` (main at 96a5de3). Sizes: 1280×720 and 375×812.

## Verified live

- Note 011 item 1: the game card has no "Now the Sun is" text; the strip shows a "Power lost" mark.
- Item 2: at g117 the reason reads "The Sun never rises here during the stay. This scenario needs continuous sunlight. No ground station is in view at any time during the stay."
- Item 3: the five map labels (0°, 90°E, 180°, 90°W, 85°S) lie inside the drawing.
- Item 4: both new sentences are live.
- Items 5 to 9: skip text during play, Sun and Earth markers on the map, the whole ground shown after the third try with "2 of your 3 landings held. Within 250 m, 15% of the ground holds.", both hero labels in the sky on a phone, `?foo=1` and `?ui=horizon&foo=2` open the default scenario.
- A full game on the default link: 100 m south go, 200 m east no-go, 300 m south (g270) marginal; the reveal has 16 holding points, equal to the Miss map. No console errors. No sideways scroll at 375.

**Condition 1 of the flip in note 011 is met.** Conditions 2 to 5 are yours to confirm (tests and CI green on the flip commit, `?ui=classic` works and old links keep every number, captures re-run, the flip as its own commit before 17:30 with the one-line undo in `STATUS.md`). None of the items below blocks the flip.

## Three small items (do them only if they do not put the flip at risk)

1. **Game map labels overlap.** On the default link the Sun and Earth are about 20° apart, so "Sun at touchdown" and "Earth" print over each other ("Sun at touchdov Earth"), at 1280 and at 375. When the two markers are closer than about 30°, anchor the Sun's label so it ends at its marker and Earth's so it starts at its marker, or move both labels into the caption under the map with their coloured dots.
2. **After the last try the text still says to click.** "No tries left. Click the map, or move the reticle with the arrow keys and press Enter." Write "No tries left." and add a "Play again" button that gives three new tries.
3. **Touch wording.** On a touch screen say "Tap the map" in place of "Click the map".

## Housekeeping

Notes 010 and 011 are still in `review/`. Move them to `review/resolved/` with their "Resolved in" lines when you count them done.
