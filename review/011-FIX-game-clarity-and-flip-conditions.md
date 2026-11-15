# 011 FIX: live check of M2 and M3, the game's wording, and the conditions for the flip

Reviewer check of `https://gursimranjs.github.io/sunsight/?ui=horizon`, Sunday 15:19 to 15:28 local, on the build with `HorizonApp-BKQL2svX.js` (main at 50c307e). Sizes: 1280×720 and 375×812. My browser pane was in the background, so I could not judge animation timing; I checked end states only.

You are well ahead of the plan. Do items 1 to 4, then M4. Items 5 to 9 only if they are quick. The hard stop stays 17:30.

## What passed (do not change)

- Note 010 items 1 to 5, 8 and 9 are fixed on the live site: Barlow loads, one horizon, phone mission line in two lines (64 px), moved-date note with Dismiss, the game is reachable from the ground panel and the view bar, "Sun 2.1° below" marker, map picker with a grouped list and custom coordinates.
- First screen: at 1280×720 and 375×812 the horizon, the call, the miss line, Play and "Land it yourself" are visible with no scrolling; the view bar is fully visible at 1280×720. No sideways scroll at 375. No console errors.
- The game equals the Miss map on the default link: the game's "whole ground" has 16 points that hold (12 go, 4 marginal) and 301 that fail; the Miss map says "16 pass, 301 fail", 12 of 81 within 250 m (14.8%), and both draw the same band running south from the target. My three tries: g161 no-go, g117 no-go, g158 go, each equal to its mark.
- "Power lost at touchdown: the site is in shadow" at g161 is true: the strip under the result starts at 0% of the disc.
- The classic interface is still the default and its numbers are unchanged.

## Findings

### 1. The game shows two different times, and one of them contradicts the result (FIX, before the flip)

- Checked: `…&view=game&ui=horizon&game_pt=g161` after the try has played.
- Found: the result says "Power lost at touchdown: the site is in shadow". The sky chart under it says "Now the Sun is 0.82° up at azimuth 107.2° with 100% of its disc above the terrain". The ground panel clock says "day 0, 00:00 into the stay". The chart's "now" is the end of the stay (azimuth 107° is where the Sun is after 6.5 days), but nothing says so. A reader sees "in shadow" next to "100% of its disc above the terrain".
- Fix: take the classic sky chart out of the game card in the horizon interface. Keep the strip "Sunlight and Earth contact at your landing spot", and mark the moment of failure on it. If you keep any "now" sentence in the game, begin it with its time ("At the end of the stay, 2029-07-30 12:00 UTC, …").
- Test: in the horizon interface the game card has no element with the text "Now the Sun is"; the strip shows a marker at the failure time from `firstFailure`.

### 2. "The Sun sets for up to 6.5 days" (FIX, wording)

- Found at g117: "The Sun sets for up to 6.5 days (156.0 h); this scenario needs continuous sunlight. Longest gap in Earth contact is 6.5 days (156.0 h), over the 2.0 h limit." The Sun does not set there; it never rises during the stay.
- Fix, from the same numbers (`spell_start_s`, `spell_s`, stay length):
  - Dark for the whole stay: "The Sun never rises here during the stay."
  - Dark at touchdown, light later: "The Sun is hidden at touchdown for the first 20.5 h." (use that first spell's own length, not the longest one)
  - Light at touchdown, dark later: "The Sun sets after 31.0 h and stays down for 4.2 h."
  - No contact for the whole stay: "No ground station is in view at any time during the stay."
- Test: unit tests for the four cases, with g117 and g161 on the default link as two of them.

### 3. Two map labels are cut off in the site picker (FIX)

- Checked: "Choose a landing site" at 1280×720.
- Found: the left label reads "0°W" (it is "90°W" with the 9 cut off) and "90°E" is cut at the right edge.
- Fix: keep the four longitude labels inside the drawing (inset them or widen the viewBox). Test: each label's box lies inside the SVG's box at 1280 and at 375.

### 4. Two phrases only we understand (FIX, copy)

- Scenario cards: "Starting defaults from the build plan; only continuous sunlight for a 6.5-day crew stay comes from NASA." A visitor has no build plan. Write: "These limits are our own starting assumptions. Only continuous sunlight for a 6.5-day crew stay comes from NASA."
- Site picker: "South pole from below." Write: "Map of the south pole. Rings at 85°S and 80°S; 0° longitude, the side that faces Earth, is up."

### 5. A click while a try is playing is dropped without a sign (NOTE)

- Found once: a click 5 s after the previous try did nothing and the text stayed "Try 3 of 3" (my pane was in the background, so the play may have run slowly).
- Fix: while a try plays, mark the map busy (`aria-busy`, dimmed dots, the text "Playing the stay…" beside the map) and let a click or Enter skip to the result. Test: two clicks one second apart end with two results, or with one result and a visible busy state.

### 6. Give the player something to read on the game map (NOTE, the cheapest step toward a real game)

- Found: the map is white dots on black, so the first pick is a blind guess.
- Fix: draw two small markers on the 500 m ring at the azimuths of the Sun and of Earth at touchdown, labelled "Sun at touchdown" and "Earth". Both azimuths are already computed for the hero. The player can then reason about which side of the ridge faces the Sun. Add the two markers to the map's text description.

### 7. End the game with its result (NOTE)

- After the third try, show the whole ground without a further click (keep the button for keyboard users who want to repeat it), and put one line above the map in the call's type: "1 of your 3 landings held. Within 250 m, 15% of the ground holds."

### 8. On a phone the Earth label sits on the terrain (NOTE)

- Found: 375×812, default link: "Sun" is above its disc and "Earth" is drawn below its disc, on top of the terrain, where it is hard to read.
- Fix: when the two labels would collide, keep both in the sky: raise one with a short leader line.

### 9. An address with an unknown parameter skips the default scenario (NOTE; the classic interface does it too)

- Checked: `https://gursimranjs.github.io/sunsight/?r=6` and `?ui=horizon&r=1526`.
- Found: both open the Athena target on 2027-01-01 with the robotic rules (NO-GO), not the default scenario. Social sites and mail programs add parameters such as `fbclid` or `utm_source` to links, so a shared link can open on the wrong first screen.
- Fix: apply the default scenario whenever `site` is absent, whatever other parameters are present. Test: `?foo=1` and `?ui=horizon&foo=1` both resolve to the default link.

## The flip

I have checked this build on the live site at both sizes. The flip is approved on these conditions, so that it does not depend on my being reachable at one exact minute:

1. Items 1 to 4 of this note are fixed and live.
2. `make check`, the e2e suite and CI are green on the commit that flips, with the three journeys passing under the new default and the reduced-motion, axe and keyboard checks of note 009 passing.
3. The classic interface opens at `?ui=classic`, and old links without `ui` keep every number.
4. `make capture` has been re-run so that `docs/submission/shots` and `clips` show the new interface, the game included.
5. The flip is its own small commit, pushed before 17:30, and `STATUS.md` says how to undo it in one line.

I will check the live site again after the flip. If I file a BLOCKING note, revert that one commit first and fix afterwards. If any condition is not met by 17:30, do not flip.
