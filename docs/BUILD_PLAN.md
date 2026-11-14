# Build plan, A to Z

This tab turns the plan into a build specification: what ships, in what order, and how each piece is proved done. It is written so an AI coding agent can build most of it while people decide, review and sign off. Export it to Markdown and commit it as `docs/BUILD_PLAN.md` in the first commit.

## What we deliver

Eight things ship by Sunday 22:30. Each has one test for "done".

| # | Deliverable | What it is | Done when |
| --- | --- | --- | --- |
| D1 | Live web app | SunSight at a public address, plus a mirror | It opens with no login on a laptop and a phone, and every core feature works |
| D2 | Public repository | Pipeline, web app, tests, licence, README and this plan | A stranger can rebuild the data and the site from the README |
| D3 | Open dataset | The Sun, Earth and station table, horizon masks, miss-test grids and a manifest with checksums | Files match the data contracts below and the manifest is complete |
| D4 | Validation report | An in-app page plus data files for all eight checks | Every check shows a number, a pass mark and a status |
| D5 | Demo video | 30 seconds or less, English captions, public link | It runs 29 seconds and plays in a private browser window |
| D6 | Project page | The eight form fields, with screenshots | Submitted, and the confirmation banner seen |
| D7 | AI-use log | `SI_USE.md`: every AI tool, what it did and where | It matches the form's SI field and the file headers |
| D8 | Tagged release | `v1.0-submission` on the commit that was submitted | The tag exists and the live site is built from it |

## Do we need to deploy?

Not strictly: the Submission Guide accepts a repository link as the final project. Deploy anyway. Judges score usability under validity, and a tool they can click beats a repository they must build. It costs nothing, because the site is static files with no server. The steps are under Deployment below.

## How the build is automated

The build is split into 23 work packages. Each states its inputs, its outputs and one command that proves it done, so an AI coding agent can take a package, make that command pass and open a pull request for a person to review.

- **Spec first.** The agent's job on any package is to make its acceptance command pass, nothing more.
- **Tests before code.** The agent writes the tests from the package's "done when" line, then the code.
- **Fixture data from the first hour.** Package P0 ships a tiny made-up dataset in the final file formats. The web app is built against it while the pipeline produces the real data, and the two meet at the data contracts.
- **Two lanes.** Lane A is the Python pipeline; lane B is the TypeScript web app. One agent session per package, each on its own branch.
- **One reference, two implementations.** The sunlight and contact maths is written once in Python as the reference and once in TypeScript for the browser. A shared file of test vectors makes both give the same answers.
- **People merge.** Nothing reaches `main` until CI is green and a person has read the change.

### Rules for the agent

Put these in `AGENTS.md` at the top of the repository.

1. Never change a golden value or loosen a tolerance to make a test pass. Stop and report instead.
2. Never copy code or text from other Space Apps entries.
3. Add the AI header line to every file you generate and the trailer to every commit.
4. Work only inside the paths the package lists.
5. The web app makes no network calls at run time, and the repository holds no secrets.
6. Put the unit in the name of every variable that holds a physical quantity: `_km`, `_deg`, `_s`.

### AI acknowledgement, built in

The Submission Guide requires AI-generated code and data to be acknowledged in descriptive text and metadata. Do it in five places so nothing is missed:

- A header comment in every generated file.
- A trailer line on every commit an agent helped with.
- An "AI use" section in the README.
- The running log in `SI_USE.md`.
- A `generated_with` field in the data manifest.

## Repository layout

```
sunsight/
  README.md  LICENSE  SI_USE.md  AGENTS.md  Makefile
  docs/
    BUILD_PLAN.md        this tab
    DECISIONS.md         each assumption, its value and why
  pipeline/
    sunsight/
      kernels.py         download, checksum and load SPICE kernels
      frames.py          site vector, local frame, azimuth and elevation
      ephemeris.py       Sun, Earth and station table
      dem.py             windowed terrain reads; map position <-> 3D point
      horizon.py         horizon masks (Numba)
      light.py           reference sunlight and contact maths
      missgrid.py        miss-test grids
      validate.py        the eight checks
      export.py          write files to the data contracts
    tests/
  web/
    src/
      engine/            TypeScript port of light.py, runs in a Web Worker
      data/              loaders for the binary files
      views/             report card, panorama, compare, calendar, miss map, 3D, story
      state/             scenario encoded in the URL
    public/data/         pipeline outputs, committed
    tests/               unit and end-to-end tests
  tests/
    vectors/             shared test vectors for Python and TypeScript
    golden/              cached Horizons answers
  data_raw/              downloads, not committed
  .github/workflows/     ci.yml, deploy.yml
```

## Data contracts

The pipeline writes these files and the web app reads them. Both lanes build to this table, which is what lets them work in parallel. All paths sit under `web/public/data/`; all binary files are little-endian.

| File | Format | Contents |
| --- | --- | --- |
| `manifest.json` | JSON | Format version, every input file (URL, size, SHA-256), kernel list, pipeline version, build time, `generated_with` |
| `ephemeris/2027_2030.bin` | Float32, 35,064 rows × 18 columns | One row per hour from 2027-01-01 00:00 UTC. Columns 1–15: x, y, z in km for the Sun, Earth's centre, Goldstone, Madrid and Canberra, measured from the Moon's centre in MOON\_ME, as apparent positions. Columns 16–18: the Moon's elevation at each station, in degrees. |
| `ephemeris/2027_2030.json` | JSON | Start time, step in seconds, row count, column names, frame, correction flag |
| `sites.json` | JSON | Curated sites: id, name, latitude, longitude, height in metres, category, region id if terrain masks exist, source link |
| `regions/<id>.json` | JSON | Point list (id, latitude, longitude, map x and y, height), observer heights, bin count, scale |
| `regions/<id>.masks.bin` | Int16, points × heights × 1,440 | Terrain elevation in each direction, in units of 0.001°. Bin 0 is local north, counting clockwise. Values are clamped to ±32.767°, far above anything the Sun or Earth reaches at these sites. |
| `miss/<target>.json` and `.masks.bin` | As for regions | Grid points, each with its east and north offset from the target in metres |
| `terrain/<site>.bin` | Int16, 512 × 512 | Heights in metres at 20 m spacing, for the 3D view |
| `validation/<check>.csv` and `summary.json` | CSV and JSON | One file per check; the summary holds each check's number, pass mark and status |

Any change to a format raises `format_version` in the manifest, and both lanes update in the same pull request.

## Function contracts

These functions exist in both `light.py` and the browser engine, with the same names and the same answers. Angles are in degrees and distances in km unless the name says otherwise.

| Function | Returns | Rule |
| --- | --- | --- |
| `site_vector(lat, lon, h_m)` | Position in km | (1737.4 + h/1000) × (cos lat cos lon, cos lat sin lon, sin lat) |
| `local_frame(lat, lon)` | East, north and up unit vectors | east = (−sin lon, cos lon, 0); north = (−sin lat cos lon, −sin lat sin lon, cos lat); up = (cos lat cos lon, cos lat sin lon, sin lat). Defined even at the pole. |
| `az_el(target, site, frame)` | Azimuth and elevation | d = target − site; elevation = asin(d·up / \|d\|); azimuth = atan2(d·east, d·north) |
| `angular_radius(R, d)` | Apparent radius | asin(R / \|d\|), with R = 695,700 km for the Sun and 6,371 km for Earth |
| `interp(table, t)` | Table row at time t | Cubic interpolation between hourly rows; must match SPICE within 0.001° at 100 random times |
| `horizon_at(mask, az)` | Terrain elevation | Linear between neighbouring bins, wrapping at 360° |
| `sun_fraction(...)` | 0 to 1 | Share of the Sun's disc above the terrain and not behind Earth; see the listing below |
| `station_contact(...)` | Clear, grazing or blocked | Blocked if the station is below the terrain or the Moon is under 10° at the station; grazing if the station is under 2° above the terrain |
| `events(series)` | List of times | Bisection to 60 seconds at each change of state in the 10-minute series |
| `window_metrics(site, start, end, rules)` | Metrics | Share of time lit, longest dark spell, longest contact gap, time to next sunset and Earthset, Sun's elevation now, battery size |
| `verdict(metrics, rules)` | Go, marginal or no-go, with a reason | No-go if any rule fails; marginal if all pass but a margin is thin; go otherwise |
| `miss_share(grid, radius, rules)` | 0 to 1 | Passing points inside the radius ÷ all points inside the radius |

The sunlight share, written out so both implementations match:

```
# r_sun, r_earth: apparent radii; (az_s, el_s), (az_e, el_e): Sun and Earth centres
delta = (az_e - az_s) * cos(el_s)            # Earth's sideways offset from the Sun
visible = 0 ; total = 0
for i in 0..14:                               # 15 vertical strips across the disc
    x  = r_sun * (2*(i + 0.5)/15 - 1)         # strip position, left to right
    c  = sqrt(r_sun^2 - x^2)                  # half-length of the strip
    h  = horizon_at(mask, az_s + x / cos(el_s))
    lo = max(el_s - c, h)                     # bottom of the part above terrain
    hi = el_s + c
    lit = max(0, hi - lo)
    if |x - delta| < r_earth:                 # Earth's disc crosses this strip
        ce = sqrt(r_earth^2 - (x - delta)^2)
        lit = lit - overlap([lo, hi], [el_e - ce, el_e + ce])
    visible += max(0, lit) ; total += 2*c
fraction = visible / total
```

### Default rules

A moment counts as "lit" when at least half the Sun's disc is visible. The numbers below are our starting defaults and every one is adjustable in the app. Only continuous sunlight for the 6.5-day stay comes from NASA.

| Preset | Stay | Observer height | Power rule | Contact rule |
| --- | --- | --- | --- | --- |
| Robotic lander | 14 days | 2 m | No dark spell over 2 hours | No gap over 12 hours |
| Crew sortie | 6.5 days | 10 m | No dark spell at all | No gap over 2 hours |
| Long stay | 30 days | 10 m | No dark spell over 100 hours; battery sized for the longest | No gap over 24 hours |

With the miss test on, a date is good only if at least 90% of points inside the miss radius pass.

## Work packages

Lane A is the pipeline, lane B the web app. A package can start as soon as everything in its "needs" column is merged.

| ID | Package | Lane | Needs | Output | Done when |
| --- | --- | --- | --- | --- | --- |
| P0 | Skeleton and fixtures | Both | — | Repository, CI, deploy, made-up fixture data in the final formats, a first page live | A push to `main` publishes a page that loads the fixture and shows one number |
| P1 | Kernels and manifest | A | P0 | `make kernels` | All nine kernels load with no SPICE error; the manifest lists sizes and checksums |
| P2 | Frames | A | P1 | `frames.py` | Unit tests pass, including a site at the pole; the same site in MOON\_ME and MOON\_PA lands about 875 m apart |
| P3 | Ephemeris table | A | P2 | `2027_2030.bin` and `.json` | 35,064 rows; interpolated rows match SPICE within 0.001° |
| P4 | Horizons check | A | P3 | Cached Horizons answers and a comparison file | Sun and Earth within 0.001° at 3 sites × 20 times; station elevations within 0.01° |
| P5 | Terrain access | A | P0 | `dem.py` | A 1 km window reads in under 5 seconds; named craters land on the right features; the distance test passes |
| P6 | Horizon engine | A | P5 | `horizon.py` | Synthetic tests pass: smooth-Moon dip of 0.087° at 2 m and 0.194° at 10 m; a wall within 0.01°; the 90° rotation; the far spike |
| P7 | Hero site masks | A | P6 | Masks for one region at both heights, plus the 3D terrain cut | One region in under 10 minutes; a shadowed crater floor is about 0% lit; the ridge ranks among the best |
| P8 | Light engine, reference | A | P3 | `light.py` and the shared test vectors | Vectors cover full Sun, half Sun, an eclipse, grazing contact and blocked contact |
| P9 | Light engine, browser | B | P0, P8 | `engine/` in a Web Worker | Reproduces every shared vector to 1e-6; a 14-day window scores in under 50 ms |
| P10 | Site library and Anywhere mode | B | P9 | Site picker, custom coordinates, smooth-horizon path | Any latitude and longitude returns Sun and Earth positions; at an Apollo site Earth stays within a few degrees of one spot |
| P11 | Report card | B | P9 | Verdict, reason, solar elevation, countdowns, metrics, timeline | An outsider gets a verdict in under 30 seconds; the countdowns match the event list |
| P12 | Sky panorama | B | P9 | 360° horizon with Sun and Earth tracks and true-size discs | Disc sizes match the computed radii; the time slider stays in step with the report card |
| P13 | Compare and calendar | B | P11 | Sites side by side; a days × sites heatmap | Three sites share one time axis; clicking a cell opens that report card |
| P14 | Miss-test grids | A | P7 | Grids for three hero targets, then the rest | About 320 points per target; one target in under 20 minutes |
| P15 | Miss-test view | B | P9 | Pass/fail map, shares at 100, 250 and 500 m, miss-tolerant calendar | Shares equal the reference on the fixture; dragging the pin updates the verdict |
| P16 | All regions | A | P7 | Masks for every region | Each region file is under 3 MB compressed |
| P17 | Validation runs and page | Both | P4, P7, P8 | The eight checks, their data files and the in-app page | Every check shows a number, a pass mark and a status; any failure is explained in words |
| P18 | 3D hero view | B | P7 | Three.js scene, time slider, astronaut camera | 30 frames a second on a laptop; loads only when opened; labelled as illustrative |
| P19 | Guided Athena story | B | P11, P15 | Five-step walkthrough | Works on a phone from start to finish |
| P20 | Share and export | B | P11 | Scenario in the URL; CSV and JSON downloads | A shared link reopens the same view; the export equals the screen |
| P21 | Quality pass | B | All above | Accessibility, speed and browser fixes | No serious accessibility findings; first load under 3 seconds; no console errors |
| P22 | Demo, project page, submission | People | P21 | Video, the eight fields, the tag | Submitted by 22:30 with the confirmation saved |

## Commands

Every package's acceptance test runs through one of these. `make check` is what CI runs.

```
make setup                 Python and Node environments
make kernels               download and checksum the SPICE kernels
make ephemeris             build the Sun, Earth and station table
make golden                fetch and cache Horizons answers (run once, then commit)
make masks REGION=<id>     horizon masks for one region
make miss TARGET=<id>      miss-test grid for one target
make validate              run the eight checks and write their data files
make web                   build the site
make check                 lint, type-check and all fast tests
make e2e                   browser tests against the built site
make deploy                build and publish (CI does this on main)
```

## Tests and CI

Tests are what make automation safe: an agent can only merge what the tests accept, so the tests carry the physics.

| Layer | Tool | What it proves | Runs |
| --- | --- | --- | --- |
| Pipeline units | pytest | Frames, interpolation, horizons on synthetic terrain, the light maths | Every push |
| Web units | Vitest | The engine port, file loaders, URL state | Every push |
| Parity | Shared test vectors | Python and TypeScript give the same answers to 1e-6 | Every push |
| Golden | Cached Horizons answers | Positions within 0.001°, with no network needed | Every push |
| End to end | Playwright | Three journeys: date to sites, site to dates, the miss test | Every pull request |
| Budgets | Build script and Lighthouse | Bundle and data sizes; first load under 3 seconds | Every pull request |
| Accessibility | axe | No serious findings | Every pull request |
| Full validation | `make validate` | The eight checks on real data | By hand before each gate |

CI is two workflows. `ci.yml` runs `make check` and the browser tests on every pull request, and a merge needs it green. `deploy.yml` builds the site from `main` and publishes it.

## Deployment

1. **Host.** GitHub Pages, published by GitHub Actions on every merge to `main`. No server, no keys and no cost.
2. **Mirror.** Connect the same repository to Cloudflare Pages or Netlify so it builds on each push. If the main host fails at submission, switch the links.
3. **Data.** Commit the pipeline's outputs under `web/public/data/`. All regions and miss grids together come to about 80 MB before compression, in files of a few MB each. Check GitHub's current file and site size limits before the full build.
4. **Paths and links.** Set the build's base path to the repository name. Keep the scenario in the URL's query string so a shared link survives a reload on a static host.
5. **Offline.** A service worker caches the app and each region once opened, so the site keeps working without a connection.
6. **Access for judges.** Request the FortiGuard web filter classification as soon as the address exists, as the Submission Guide recommends.
7. **Privacy.** No accounts, no cookies, no analytics and no calls to outside services.
8. **Freeze.** Tag `v1.0-submission` on the submitted commit and keep the live site on that build through January 26, 2027. Later work goes on a separate branch and a separate address.

## Timeline and cut order

Packages against the schedule's three gates. Times are local event time.

| By | Lane A, pipeline | Lane B, web | People |
| --- | --- | --- | --- |
| Saturday 10:00 | P0 | P0 | Decide what to build; put names against roles; send the rules question to the local lead |
| Saturday 14:00 | P1 to P5 | P9 on fixtures, P10 | AI-use log started; curated site coordinates sourced and credited |
| Saturday 20:00, gate 1 | P6, P7, P8, one hero grid from P14 | P11, P12, P15 | One real site works end to end on the live address; rough demo cut recorded |
| Sunday 02:00 | Rest of P14, P16, P17 runs | P13, P17 page, P18 started | A person reads every validation number |
| Sunday 08:00 to 14:00 | Fix validation outliers | P18, P19, P20 | Project page drafted |
| Sunday 14:00, gate 2 | Feature freeze | Feature freeze | Only fixes from here |
| Sunday 18:00 | Final data build and manifest | P21 | Screenshots and GIF taken |
| Sunday 21:00 | — | — | P22: final video and the eight fields |
| Sunday 22:30, gate 3 | — | — | Submit, tag, save the confirmation |

If a gate is missed, cut in this order:

1. Relay mode, moonwalk check and slope screen.
2. Blocker finder.
3. 3D hero view.
4. Calendar heatmap, replaced by a sortable table.
5. Regions beyond three hero sites.
6. Station-level contact, replaced by "any part of Earth in view".

Never cut: the report card with its verdict, countdowns and solar elevation; the sky panorama; Anywhere mode; the miss test on three hero targets; the validation page; the demo.

## Submission pack

The Submission Guide says most of the judges' evaluation rests on this page, so it is written by people, in the team's own words.

| Field | What goes in | Comes from |
| --- | --- | --- |
| Project Name | SunSight, or the name the team chooses | Team |
| High-Level Project Summary | Three sentences: what we built, how it answers the challenge, why it matters | Story lead |
| Link to Project Demo | The public video link | Demo lead |
| Link to Final Project | The live site, which links to the repository | Deployment |
| Detailed Project Description | What it does, how it works, its benefits, what we hope to achieve, tools and languages, validation numbers, limits, screenshots | README sections, rewritten for judges |
| Use of Super Intelligence (SI) | Which AI tools, for what, and where | `SI_USE.md` |
| NASA Data | LOLA terrain maps, SPICE kernels, JPL Horizons, NASA's illumination maps, Moon Trek and QuickMap, each with what it did | Data manifest |
| Space Agency Partner Data and Other References | The Canadian Space Agency's Moon Exploration page; every library, font, image and paper | Manifest and package files |

Assets to prepare: four screenshots (report card, sky panorama, miss map, validation page), one GIF under 10 MB, the video and its caption file.

## What stays human

Automation writes code; it does not own the project. These stay with the team:

- Deciding what to build, and settling the rules question with the local lead.
- Reading every validation number before it goes on the page.
- The story, the voice-over and the project page text.
- Reviewing each change before it merges.
- The final submission.
