# 010 FIX: live check of the horizon interface after M1

Reviewer check of `https://gursimranjs.github.io/sunsight/?ui=horizon`, Sunday 14:41 to 14:47 local, build 5a5ddb3. Sizes checked: 1280×720, 800×600 and 375×812.

Do the work in this order: finish M2 (the game) first, then items 1 to 5 below. Items 6 to 9 only if time is left. The hard stop in note 009 stands: 17:30.

## What passed (do not change)

- Numbers equal the classic interface for the same link, checked on two links:
  - Default link: Sun 0.43°, 100% of the disc, no sunset in the stay, contact lost in 2 h 35 min (2029-07-24 02:35 UTC), miss line 15% within 250 m.
  - `site=im2_athena_target&days=14&preset=robotic` (start moved to 2027-01-01): NO-GO, darkness 13.0 days (311.6 h), contact gap 4.8 days (114.1 h), Sun −2.06°, sunrise in 12 d 23 h 35 min, contact back in 4 d 18 h 4 min.
- At 1280×720 and 375×812 the horizon with Sun and Earth, the call, the miss line and Play are all visible with no scrolling. No sideways scroll at 375.
- Play moves the time (`t_h` in the address, the clock and the countdowns change). The three mission-line pickers open, and Escape closes them. More holds Compare, Tour, Proof and Export. Ground loads the 3D scene.
- No console errors. The address without `ui=horizon` still shows the classic interface.

## Findings

### 1. The Barlow fonts are not applied (FIX)

- Checked: on the live page, `getComputedStyle(document.body).fontFamily` and `[...document.fonts].filter(f => f.status === 'loaded')`.
- Expected (note 009): Barlow Condensed 700 for the call and the big numbers, Barlow 400 and 600 for text, self-hosted.
- Found: `system-ui, -apple-system, "Segoe UI", sans-serif`, and no loaded font faces, although b14bb0d added the font files.
- Fix: load the faces in the horizon shell and apply the tokens to it. Test: an e2e check that, after load, `document.fonts.check('700 1em "Barlow Condensed"')` is true and the call's computed font family starts with Barlow Condensed. Keep the font budget (80 kB).

### 2. The Horizon view repeats the hero, and the views still wear the old skin (FIX)

- Checked: `?ui=horizon`, view Horizon.
- Expected (note 009): one horizon, at the top; views sit on the ground styling.
- Found: under the view bar the classic "Sky panorama" chart draws the same horizon, Sun and Earth a second time, in the old dark cards.
- Fix: in the horizon interface, the Horizon view drops the full-width panorama and keeps only the close-up ("same scale on both axes") and the "Over the whole stay" numbers. Give the view container the ground tokens. If time is short, do only the first part. Test: in the horizon interface on the Horizon view there is exactly one full panorama on the page.

### 3. On a phone the mission line takes five lines (FIX)

- Checked: 375×812, default link.
- Found: "Land at / Shackleton–de Gerlache ridge at / Shackleton's rim / on 24 Jul 2029, 00:00 UTC for a / crew sortie, 6.5 days." About 170 px of the 812, which squeezes the sky to about 100 px. At 1280 the line also wraps to two lines because of its maximum width.
- Fix: under 480 px show the site name on one line with an ellipsis (the full name stays in the picker and in the button's accessible name) and a second line "24 Jul 2029 · crew sortie, 6.5 days". At 1100 px and wider let the sentence run on one line. Give the freed height to the sky. Test: at 375×812 the mission line is at most 96 px tall; at 1280×720 it is one line.

### 4. A date outside the table is moved without a word (FIX)

- Checked: `?site=im2_athena_target&start=2025-03-06T17%3A30Z&days=14&preset=robotic&ui=horizon`.
- Expected: the classic interface says "Dates available: 2027-01-01 00:00 UTC to 2030-12-31 22:00 UTC. Dates outside are moved inside."
- Found: the address is rewritten to 2027-01-01 and the mission line shows the new date with no message.
- Fix: when a date is moved, show one line under the mission line: "Dates run from 1 Jan 2027 to 31 Dec 2030. Your date was moved to 1 Jan 2027." Announce it politely to screen readers; it can be dismissed. Test: an e2e check on the link above.

### 5. "Land it yourself" is not reachable yet (reminder, due at M2)

- Found at 14:46: the words do not appear anywhere in the horizon interface.
- Place two entries: a button beside "Play the stay" on the ground panel, and one at the top of the Miss map view. The game's result for a chosen point must equal the Miss map's result for that point (note 009).

### 6. Sun and Earth labels touch when the two are close (NOTE)

- Found: default link at 375 px, "Earth" and "Sun" labels touch.
- Fix: when the two label boxes overlap, draw one above its disc and the other below. Unit test with the default link's positions.

### 7. The date picker shows a 12-hour local time in a field labelled UTC (NOTE)

- Found: "Start (UTC)" shows "2029-07-24, 12:00 AM" (the browser's own control).
- When the calendar strip replaces it (M3), print the time in 24-hour UTC and choose the hour from a list of 00 to 23, not from the browser's date-time control.

### 8. When the Sun is below the horizon the sky shows nothing for it (NOTE)

- Found: Athena link, Sun −2.06°: only Earth is drawn.
- Add a small marker on the horizon at the Sun's azimuth with the words "Sun 2.1° below". The same for Earth.

### 9. The site picker is a flat grid of 28 buttons (NOTE)

- Until the map lands, group the list under plain headings (South pole candidates; Commercial landers; Apollo; Other countries) and keep "Custom latitude and longitude" reachable from it: the challenge statement asks for custom coordinates.

## Before the default is flipped

When M4 is green, write `M4 ready for reviewer check` as the newest line of the log in `STATUS.md` and push. The reviewer checks the live site at about 17:15 and answers with a note in this folder: either `flip approved` or a list of blockers. If there is no reviewer note by 17:30, do not flip; the horizon interface stays at `?ui=horizon` and the classic one stays the default.
