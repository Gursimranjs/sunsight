# 009 BLOCKING — "Horizon" interface: simpler navigation, animated, game-like (owner's request)

Filed by the reviewer, Sunday 13:15. The owner looked at the site and said: it is confusing to
navigate; make it feel out of this world, really usable, animated, more like a video game. The
owner has chosen to keep building past the 12:40 freeze for this. Time box and rollback below.

## Time box and safety (read first)

- First: `git tag pre-polish` on current main and push the tag. That build is the fallback.
- Build the new interface behind a flag, `?ui=horizon`. The current interface stays the default
  until the flip in milestone 4. Merge to main in small steps; the live site must never break.
- No changes to `pipeline/`, the data files, `web/src/engine/` results, or the validation numbers.
  This is an interface layer over the same engine.
- Milestones: M1 by 14:30, M2 by 15:45, M3 by 16:45, M4 by 17:15. HARD STOP 17:30: if M4 is not
  green, do not flip; leave the new interface at `?ui=horizon` and say so in STATUS.
- Record in `SI_USE.md` that the redesign was requested by the owner and specified by the reviewer.

## What is wrong now (reviewer's audit of the live site)

- The first screen is a dashboard: a text card, then four form controls, a slider, then eight tabs.
  Everything visual (the horizon, the map, the 3D ground) is below the fold.
- Eight tabs of equal weight; no primary path. Three entry buttons sit above a card they do not
  visibly change.
- The verdict card carries five lines of provenance small print before the user sees any picture.
- Nothing moves unless the user finds the slider.

## Concept: the horizon is the interface

The challenge asks to show the Sun and Earth against the horizon. So the horizon becomes the
permanent top of the screen, and the screen is laid out like a photograph taken on the Moon:
black sky above, sunlit ground below.

    +----------------------------------------------------------------------+
    | SunSight   Land at [Shackleton ridge] on [24 Jul 2029]               |  black sky
    |            for a [crew sortie, 6.5 days].                            |
    |                                                                      |
    |            Sun on its path  o - - - -            Earth  O            |  360° horizon
    |  ____/\______/\/\_________________/\___________/\_____________       |  terrain line
    |----------------------------------------------------------------------|
    |  GO for all 6.5 days                 Sun 0.43° up, whole disc        |  lit ground
    |  Miss by 250 m: 15% of the ground    Sunset: not during the stay     |
    |  still holds.  [See the map]         Contact lost in 2 h 35 min      |
    |  [Play the stay]  |=====o==========================| lit / contact   |  timeline
    |  Horizon | Ground | Miss map | Rank sites | Calendar | More          |  views
    +----------------------------------------------------------------------+

- Sky (top, true black): the existing sky panorama as the hero, full width, with the Sun's and
  Earth's paths and true-size discs. It loads at once (SVG) and needs no 3D.
- Ground (bottom, light): one panel with the call, the miss line, three readouts and the timeline.
  Dark ink on a light regolith surface.
- The mission line is a sentence with three controls in it. Each opens a picker:
  site (a small south-pole map with pins, plus a list for sites elsewhere on the Moon), date (this
  site's calendar strip coloured by verdict), scenario (three cards). "Rules" lives in the scenario
  picker.
- Views replace the eight tabs: Horizon (default), Ground (the 3D view, loaded on demand),
  Miss map, Rank sites, Calendar. Under "More": Compare, Tour, Proof (validation), Export.
  On a phone: a bottom bar with Horizon, Ground, Miss map, More.
- Provenance small print moves behind one "Sources and method" disclosure on the ground panel.
  Every honest label stays: smooth-horizon, illustrative 3D, fixture rules, "not a landing
  probability".

## Tokens

- Colour: sky `#000000`; ground `#CFCBC2`; ground shade `#8E8A82`; ink `#17181A`;
  Sun `#FFD27A` (everything about sunlight); Earth `#4F8FD6` (everything about Earth and contact);
  go `#1F7A4D`; no-go `#B4421E`; marginal uses ink with a hatched mark. Verdicts always carry a
  word and a shape, never colour alone. Check contrast on both surfaces.
- Type: Barlow Condensed 700 for the call and the big numerals; Barlow 400/600 for everything
  else; tabular figures for clocks. Self-host the woff2 files (SIL Open Font License; add the
  licence file and a credit). No font CDN: the app makes no network calls at run time. If the
  files cannot be obtained in ten minutes, use a system stack and move on.
- Layout: left-aligned text; sentence case everywhere; no all-caps labels; lines under 80
  characters; the horizon line is the only full-width rule on the page.

## Motion (one orchestrated moment, then only motion that answers an action)

- On load and on every change of site or date: the Sun runs along its path to its position
  (about 800 ms) and the call appears with it. Nothing else animates on its own.
- "Play the stay": the playhead runs the whole stay in about 8 seconds; the Sun and Earth move,
  the readouts and clocks tick, the ground panel dims while the site is dark. Space toggles play;
  arrow keys step 10 minutes; a speed control offers three speeds.
- Changing view cross-fades in 150 ms. Miss-map dots appear outward from the target in 300 ms.
- `prefers-reduced-motion`: no automatic motion; Play still works as a stepped slider.

## The game: "Land it yourself"

The challenge statement names an educational game as a valid format. This one uses only real
engine results.

- Entry: a button on the ground panel and in the Miss map view. Available for the three targets
  with miss grids.
- Brief, in one line: "You are landing a crew for 6.5 days on the Shackleton ridge on
  24 July 2029. Pick your spot within 500 m of the target."
- The player clicks the map (or moves a reticle with the arrow keys and presses Enter). The
  nearest grid point is used and shown. A lander marker drops (600 ms), then the stay plays in
  about 5 seconds on the horizon and timeline for that point.
- Result, from the engine for that point: "Mission holds for all 6.5 days" or
  "Power lost after 31 h" or "Out of contact for 4.2 h on day 2", with the distance from the
  target. The first-failure time comes from a small pure function over the event lists, with unit
  tests; say in DECISIONS that it is an interface helper.
- Three tries, then "Show the whole ground": the full pass/fail map fills in and the line
  "Within 250 m, 15% of the ground holds" appears. A "Try Athena's target" button runs the same
  game where the ground is uniform, which is the lesson.
- No scores stored, no network, a share link for the result. The "robustness share, not a landing
  probability" label stays visible.

## Milestones

- M1 (14:30): shell behind the flag: mission line with the three pickers (site list and date strip
  can be plain at first), horizon hero, ground panel with call, miss line, readouts, clocks,
  timeline with Play, view switch wrapping the existing views. Phone layout works.
- M2 (15:45): "Land it yourself" on the default scenario and on Athena's target.
- M3 (16:45): site map picker, calendar date strip, load motion, reduced-motion path, type and
  colour tokens applied to every view, copy pass (fewer words, same facts).
- M4 (17:15): tests and budgets below, `make capture` for new shots and clips (include the game),
  reviewer check on the live site, then flip the default to the new interface and keep the old one
  at `?ui=classic`.

## Done when

- At 1280 x 720 and at 375 x 812, with no scrolling: the horizon with Sun and Earth, the call, the
  miss line and the Play control are all visible.
- A first-time visitor can change site, date and scenario from the mission line without help.
- The three journeys in the end-to-end tests pass in the new interface, plus: Play moves the Sun
  and the clocks; the game returns the same verdict as the Miss map for the chosen point; reduced
  motion shows no automatic animation.
- axe: no serious findings. Keyboard reaches every control, including the map reticle.
- First-load JavaScript stays within the existing 60 kB gzip budget (3D still lazy); fonts add at
  most 80 kB; first-load data unchanged.
- Every number on screen equals the classic interface for the same link (one end-to-end test
  compares the two).
