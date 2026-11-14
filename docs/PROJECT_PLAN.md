# SunSight — Lunar Landing Site Navigator Project Plan

Plan as of November 14, 2026. Exported from the planning document; the two diagrams are not included.

## Summary

We will build **SunSight**, a web tool that shows when and where a lunar south pole landing site has sunlight for power and a line of sight to Earth for communications. It answers the two questions mission planners actually ask: "We launch on this date, which sites work?" and "We want this site, which dates work?"

Why it can win:

- **It answers the challenge as written.** NASA asks for an intuitive tool that lets planners, educators and the public compare sites and dates quickly. Our target is a trustworthy answer in under 30 seconds.
- **The miss test, our signature.** In March 2025 the Athena lander came down about 250 m from its target, on its side in a crater, and could not recharge ([SpacePolicyOnline](https://spacepolicyonline.com/news/im-2-mission-ends-one-day-after-lunar-landing/)). SunSight shows how much of the ground around each target still works if the lander misses. None of the public entries read for this review offers it.
- **Physics that survives expert review.** Real terrain in NASA's own frame, Sun and Earth as true-size discs, eclipses, and Earth contact checked station by station.
- **Proof, like for like.** Validation against JPL Horizons, NASA Goddard's illumination maps and a published site study, each computed the way the reference was.
- **Rules followed to the letter.** Every AI use declared truthfully, and the two rules that touch this plan itself checked with the organisers first (see the November 14 section).
- **A 30-second demo that tells one true story.** A lander missed by 250 m; here is what a miss costs at every site.

Challenge: Lunar Landing Site Navigator, NASA Space Apps 2026 (November 14–15). It was announced in September as "CLPS Lunar Mission Browser", and many teams still use that name. SunSight is a working name; change it if you like.

No plan can guarantee a win: last year 10 Global Winners came from more than 11,500 projects ([NASA](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/)). This one aims every hour at what judges score.

Deliverables, build order, automation and deployment: Build plan A to Z

## November 14: what the official pages say

Read in the browser on Saturday morning: the [challenge statement](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/) and its Resources tab, the [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/), the [Judging and Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/) and the [Participant FAQs](https://www.spaceappschallenge.org/resources/participant-faqs/). Where these differ from anything below, they win.

### Two rules that touch this plan itself

1. **No early start.** The FAQ says teams may not begin working on the challenges before the hackathon.
2. **AI is not for the idea.** The Submission Guide allows AI tools (it calls them "Super Intelligence", SI) to speed up work, but says they should not be used to come up with the idea for solving the challenge. Teams must say where and how they used them.

This plan was written before kickoff with an AI assistant, and its central idea, the miss test, came from that assistant. Whether that is inside the rules is the organisers' call, not ours. So:

- Ask your local lead, or Space Apps Connect, how both rules apply before you build on this plan.
- At kickoff, decide as a team what to build. Treat this document as background reading and keep only what the team itself chooses.
- Whatever you build, describe AI use truthfully in the SI field, this plan included.

### What the statement asks for that the plan missed

| The statement says | Change to the plan |
| --- | --- |
| The tool is for the whole Moon: a curated list of notable sites (Apollo, CLPS targets, other commercial missions, other countries' landings) plus custom coordinates | New core feature, "Anywhere mode": any latitude and longitude, using the same Sun and Earth table against a smooth horizon, clearly labelled. Terrain horizons stay for the south pole grids. |
| Show how much time remains before sunset and Earthset (named twice) | A countdown to both at the top of every report card |
| Solar elevation angle is a key power metric to display prominently | Solar elevation shown beside the verdict, not buried in a chart |
| The framing is CLPS missions and replanning after delays | Lead with CLPS sites. Athena was a CLPS mission, so the story fits. |
| Small changes in location or date change everything | Already our core: the miss test and the date comparison |
| Resources listed: QuickMap, Moon Trek and JPL Horizons, plus the Canadian Space Agency's Moon Exploration page | Name all three as the tools we simplify, link each site out to QuickMap and Moon Trek, and credit the partner resource |

### Confirmed

- Submission opens Saturday 9:00 and closes Sunday 11:59 p.m., local event time. A project saved or submitted after that is not eligible. Local judging times may differ, so ask the local lead.
- Demo: a video of 30 seconds or less, or up to 7 slides. Over the limit means no Global Judging.
- Most of the judges' evaluation rests on the project page, not the demo.
- At least one NASA data source or resource is required for a Global Award; partner agency data is encouraged.
- Teams of at most six, all confirmed at the same local event. No likeness of anyone under 18.
- Scores run 1 to 5 on impact, creativity, validity, relevance and presentation. Validity includes usability; relevance includes NASA data as a core part.
- Nominees December 3, finalists December 17, winners January 26, 2027.
- For a new website, the guide recommends requesting a FortiGuard web filter classification so judges can open it.
- NASA reviews teams for prohibited activity with China or Chinese-owned entities before Global Judging; read the Terms and Conditions if that could apply.

### Not found in the pages read

A fresh public repository and an open-source licence came from a participant's summary of last year's rules. They are not in the 2026 guides or FAQs read today. Keep them as good practice and check the Terms and Conditions.

## November 13 review: what changed

The first plan had eight physics errors or gaps, and its claim that terrain shadows would set us apart no longer holds. Both are fixed in the sections below; this section records the changes.

### The field is stronger than we assumed

More than a dozen teams have public repositories for this challenge. Several already compute real LOLA terrain horizons, partial Sun discs, Deep Space Network contact, eclipses and power budgets, and publish validation against NASA's maps ([one example](https://github.com/BroBYW/CLPS-Lunar-Mission-Website), [another](https://github.com/NetRunnerXD/lunar-horizon-wheel), [a third](https://github.com/dundaryusuf566-maker/clps-lunar-browser)). Terrain shadows are now the entry ticket. Those repositories are for awareness only: copying code or text would break the originality rule.

Where we can still stand out:

1. **Ease and speed.** The statement's own words are "intuitive" and "quickly". Feature count will not beat that.
2. **The miss test.** A decision-relevant number the entries read for this review do not offer.
3. **Trust.** Validation done like for like, limits stated, uncertainty shown.
4. **Story.** One true incident, one question, one answer on screen.

### Corrections to the first plan

| Item | First plan | Now | Why it matters |
| --- | --- | --- | --- |
| Earth's place in the sky | Site offset taken as about 0.03° | Subtract the site's position from Earth's; the offset is 0.26° | Earth sits 0.26° lower at the pole than a Moon-centred calculation shows; skipping it overstates contact |
| Terrain search distance | About 200 km | 300 km, with a stop rule | A site 2 km high can see an 8 km peak 250 km away |
| Directions near the pole | Azimuth taken from the map grid | All geometry in 3D Moon-fixed coordinates | Map distances are stretched 0.8% at 80°S and 7% at 60°S |
| Sun and Earth sizes | Fixed 0.53° and 1.9° | From distance at each step: 0.52–0.54° and 1.80–2.05° | Sunrise and Earth-set times shift |
| Earth blocking the Sun | Not modelled | Lunar eclipses included | Totality lasts 71 minutes on 31 December 2028 and 102 minutes on 26 June 2029 ([NASA eclipse table](https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html)) |
| Earth contact | Earth's centre 1° above terrain; a ground station assumed | Each Deep Space Network complex checked against the terrain and its own horizon; low-angle contact flagged | A link needs a dish that can see the Moon, and grazing links fade |
| Validation settings | "Same settings as the reference" | Named: surface level, hourly, 18.6 years, any part of Earth's disc | Otherwise our numbers miss NASA's for the wrong reason |
| Horizons agreement target | 0.05° | 0.001° | Another team reports 0.00001° ([README](https://github.com/BroBYW/CLPS-Lunar-Mission-Website)) |
| Our edge | "Most teams will skip terrain" | The miss test, speed and trust | See above |

## The problem we solve

At the lunar south pole, sunlight and contact with Earth change hour by hour, so whether a site works depends on the date. NASA says the same: specific landing sites are tightly tied to the launch window, and it picks sites within regions only after launch dates are set ([NASA via Khaleej Times, 2022](https://www.khaleejtimes.com/world/americas/us-nasa-identifies-candidate-regions-for-landing-next-astronauts-on-moon?amp=1); [Space.com, 2024](https://www.space.com/space-exploration/artemis/nasa-announces-9-possible-moon-landing-sites-for-artemis-3-lunar-mission)).

NASA judged its candidate regions on terrain slope, ease of communications with Earth and lighting. Every region had to offer continuous sunlight through a 6.5-day surface stay ([NASA via Khaleej Times](https://www.khaleejtimes.com/world/americas/us-nasa-identifies-candidate-regions-for-landing-next-astronauts-on-moon?amp=1)). SunSight is built around those same criteria.

The challenge statement says tools for Sun and Earth positions already exist, but their interfaces are too complicated to judge sites efficiently. It asks for an intuitive tool that lets mission planners, educators and the public compare sites and dates quickly ([challenge summary, as listed by a local event](https://edeon.sonoma.edu/nasaspaceapps-26/)). Ease and speed are the core requirement, not an extra.

Direct contact with Earth is the harder half. NASA notes that at the south pole Earth sits low on the horizon, so radio signals reflect off the ground and weaken the link ([NASA Lunar Surface Propagation](https://www.nasa.gov/wp-content/uploads/2026/10/lsp-one-pager-digital.pdf?emrc=1715f2)). A JPL study puts the antenna's pointing at no more than 10° above the horizon ([JPL IPN 42-216](https://ipnpr.jpl.nasa.gov/progress_report/42-216/42-216C.html)).

The question is live right now. Artemis III is now a 2027 test flight in Earth orbit, and NASA plans to start landing astronauts near the south pole in 2028 ([NASA, October 2026](https://www.nasa.gov/missions/artemis/nasas-artemis-iii-mission-to-test-future-moon-lander-operations/)). NASA's first Moon Base mission targets Shackleton Connecting Ridge, and a 2028 drone mission, MoonFall, will scout potential Artemis landing sites ([Washington Times, May 2026](https://www.washingtontimes.com/news/2026/may/27/nasa-targets-fall-2026-first-moon-base-mission-near-lunar-south-pole/)).

Who it's for:

- **Mission planners** comparing sites and launch windows, who need numbers they can export and check.
- **Educators** who need a clear picture and a guided example to teach with.
- **The public**, who want to see why the south pole is so hard, on a phone, without jargon.

## Requirements

NASA asks for an intuitive tool that lets mission planners, educators and the public compare landing sites and dates quickly. It must show where the Sun and Earth sit against the horizon, so users can judge power generation and direct-to-Earth contact windows ([official statement](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/), read November 14). Only the Sun and Earth display is worded as a must; the rest are things teams "may consider". Rows R11 to R14 come from that list.

| # | Requirement | Where SunSight meets it | Status |
| --- | --- | --- | --- |
| R1 | Compare landing sites | Site library; two or three sites side by side on aligned timelines | Planned |
| R2 | Compare dates | "Find dates for a site" mode with a calendar heatmap | Planned |
| R3 | Show the Sun against the horizon | Sky panorama and timeline, using real terrain horizons at the south pole | Planned |
| R4 | Show Earth against the horizon | Same views with Earth's track and every blackout marked | Planned |
| R5 | Judge power generation potential | Solar elevation, share of the Sun's disc visible, longest night, eclipses, battery estimate | Planned |
| R6 | Judge direct-to-Earth contact windows | Station-by-station contact, longest gap, low-angle warning | Planned |
| R7 | Intuitive | Two plain-language questions as entry points; a go, marginal or no-go verdict with the reason in words | Planned |
| R8 | Quick | Answer in under 30 seconds, first load under 3 seconds, no login | Planned |
| R9 | Serves mission planners | Adjustable rules, exports, shareable links, the miss test, a validation page | Planned |
| R10 | Serves educators and the public | Guided example built on Athena's landing, plain-language tooltips, works on a phone | Planned |
| R11 | Curated list of notable sites: Apollo, CLPS targets, other commercial missions, other countries' landings | Site library covers the whole Moon; coordinates taken from NASA and agency sources and credited | Planned |
| R12 | Custom lunar coordinates | Anywhere mode: any latitude and longitude against a smooth horizon, labelled as such | Planned |
| R13 | Time remaining before sunset and Earthset | Countdown to both at the top of the report card | Planned |
| R14 | Solar elevation angle shown prominently | Beside the verdict on every report card | Planned |

## What we'll build

SunSight ships eleven core features by Sunday evening, with the miss test as its signature. Stretch features start only after the core passes every item in Quality checks.

### Core features (must ship)

| Feature | What the user gets | Owner | Status |
| --- | --- | --- | --- |
| Site library | NASA's nine Artemis III candidate regions ([NASA, Oct 2024](https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/)), plus Shackleton Connecting Ridge and the Nobile region near Mons Mouton, targets of the first Moon Base missions ([Starlust](https://starlust.org/four-major-lunar-missions-set-to-launch-in-2026-to-support-nas-as-goal-to-stay-on-the-moon/)). A grid of points in each region and a fine grid around each named target. |  | Planned |
| Two entry questions | "We land on this date: which sites work?" and "We want this site: which dates work?" |  | Planned |
| Scenario presets | Robotic lander for one lunar day (about 14 days), crew sortie (6.5 days), long stay (30 days or more). Each sets stay length, mast height, Earth-contact rule and power load; all adjustable. |  | Planned |
| Site report card | Opens with a go, marginal or no-go verdict and the reason in plain words. Then the timeline of sunlight and Earth contact, share of time in full sun, longest night, longest contact gap, event times to the minute, battery size. Two or three sites side by side. |  | Planned |
| Sky panorama | The 360° horizon from real terrain with the Sun's and Earth's paths and true-size discs, so users see why a site passes or fails |  | Planned |
| Miss test | Around each named target, the share of ground within 100 m, 250 m and 500 m that still meets the rules, drawn as a pass/fail map. Default 250 m, Athena's miss. |  | Planned |
| Calendar heatmap | Days × sites from 2027 to 2030, coloured by score with pass/fail marks; click a cell to open its report card |  | Planned |
| Validation page | Our numbers next to JPL Horizons, NASA's illumination maps and a published site study, with every assumption and limit listed |  | Planned |
| Share and export | A link that reopens the exact scenario, plus CSV and JSON downloads |  | Planned |

Added on November 14 from the official statement:

- **Anywhere mode (tenth core feature).** A curated list of notable sites across the Moon (Apollo, CLPS targets, other commercial missions, other countries' landings) and any custom latitude and longitude. These use the same Sun and Earth table against a smooth horizon, labelled "no terrain".
- **Countdowns and solar elevation.** Every report card shows time to sunset, time to Earthset and the Sun's elevation beside the verdict.

### 3D and interaction (moved into the core)

The statement itself suggests 3D surface views, animations and timeline views, so one 3D scene is now core, built for a single hero site first.

- **3D hero view (eleventh core feature).** A Three.js terrain mesh of one hero site from the LOLA map, about 10 km across. The Sun and Earth sit at their computed positions, and a time slider sweeps the shadows across the craters.
- **Astronaut's-eye camera.** One click drops the camera to 2 m at the landing point, so the user sees the Sun skim the ridge and Earth dip below it.
- **Drag the lander.** Dragging the landing pin across the terrain updates the verdict live and draws the miss-test circle on the ground.
- **Scrub time everywhere.** The same slider drives the 3D view, the sky panorama, the countdowns and the timeline, so every view stays in step.
- **Guided Athena story.** Five steps that walk a newcomer through the 2025 landing: the target, the miss, the shadow, the lost power, and what SunSight would have shown.
- **Honest label.** Shadows in the 3D view come from the graphics engine and only cover nearby terrain. The numbers always come from the horizon engine, and the view says so.
- **Order of work.** Build the 2D report card and sky panorama first. Start the 3D view only after the Saturday 20:00 gate, and drop it at feature freeze if it is not solid.

### Stretch features (in this order)

1. **Blocker finder.** For any blackout, mark on the map the terrain that hides the Sun or Earth, with its bearing and distance.
2. **Relay mode.** Add a lunar relay satellite and watch contact gaps close while Earth is below the horizon.
3. **Slope screen.** NASA's ready-made LOLA slope maps with an adjustable limit, since NASA also weighs terrain suitability.
4. **3D terrain view.** Extend the hero-site 3D scene to every region.
5. **Moonwalk check.** Draw a walking route and flag the stretches that fall into shadow or lose sight of Earth.

### Out of scope (we say so on the project page)

- Earth-to-Moon trajectories: the user enters the surface arrival date.
- Link budgets and data rates: we report geometry and a low-angle warning, not signal strength.
- Thermal, dust and boulder-scale hazards.
- Terrain horizons outside our south pole grids: other sites use a smooth horizon and say so.
- Live data feeds: everything is precomputed so the site stays fast and reliable.

## How it works

SunSight combines three things: where the Sun and Earth are, how high the terrain rises in every direction, and simple rules that turn those into power and contact windows. Physical constants below are standard approximate values.

### Data we use

| Data | What it gives us | Access |
| --- | --- | --- |
| [NAIF SPICE toolkit and generic kernels](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/) | The geometry engine NASA missions use: positions of the Sun, Earth and the Deep Space Network stations, and the Moon's orientation. About 60 MB of files. | No login |
| [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) | Sun and Earth azimuth and elevation from any point on the Moon; our independent cross-check | No login |
| [LOLA south polar terrain maps (PGDA 90)](https://pgda.gsfc.nasa.gov/products/90) | Elevation at 10 to 240 m per pixel, with error maps and ready-made slope maps. The files are cloud-optimised, so we can read only the windows we need. | No login |
| [5 m site maps (PGDA 78)](https://pgda.gsfc.nasa.gov/products/78) | Finer terrain for several candidate sites, with published height errors of 0.3 to 0.5 m; for miss-test grids where a map exists | No login |
| [Polar illumination maps (PGDA 69)](https://pgda.gsfc.nasa.gov/products/69) | NASA's average sunlight and Earth-visibility maps; our validation reference | No login |
| [Moon Trek south pole layers](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon) | Map tiles for the basemap, plus illumination and Earth-visibility layers as a second reference | No login, works in browser |
| [LCRNS Reference Constellation 3.1](https://ntrs.nasa.gov/citations/20250002698) | Public reference orbit states for NASA's planned lunar relays (stretch) | Public |
| LROC QuickMap (quickmap.lroc.asu.edu) | Listed on the challenge's Resources tab with Moon Trek and Horizons. Imagery and terrain viewer; we link each site out to it and use it to sanity-check locations. | No login |

File names, sizes and frames were checked on NASA's own pages on November 13. The challenge page lists NASA's recommended resources: read it tonight and add anything missing here. Early dataset notes came from the [Space Data Atlas](https://spacedata.swapniltamse.com/challenges/lunar-landing-site-navigator/) page for this challenge.

Exact file names, sizes, key numbers and papers: Reference shelf

### 1. Where the Sun and Earth are

- Work in the Moon's mean-Earth frame (MOON\_ME), the frame the LOLA maps use. The two easy mistakes both move the site: the principal-axis frame (MOON\_PA) by about 875 m, and SPICE's built-in low-precision frame (IAU\_MOON) by up to about 155 m.
- Compute apparent positions, corrected for light travel time and aberration, of the Sun, Earth's centre and the three Deep Space Network complexes. Store them hourly for 2027–2030 as 3D vectors from the Moon's centre.
- Interpolate to 10 minutes in the browser. The Sun slides about 0.5° along the horizon each hour, a full Sun-width, so hourly steps alone are too coarse.
- One table serves every site. Each site subtracts its own position vector, then rotates into its local frame. The subtraction shifts Earth by up to 0.26°, nine times what the first plan assumed.
- Take apparent sizes from distance at every step: the Sun spans about 0.52° to 0.54°, Earth about 1.8° to 2.0°.
- Store all times in UTC and let SPICE convert with the leap-second kernel. Mixing UTC with SPICE's internal time, 69 seconds apart, shifts the Sun by about 0.01°.
- Cross-check against Horizons to 0.001°. A steady offset near 0.005° or 0.03° points to a frame mix-up, not a maths bug. Horizons assumes a smooth horizon, so it checks positions only.

### 2. The terrain horizon at each point

- Turn every terrain pixel into a 3D point (map position to latitude and longitude, radius 1,737.4 km plus height) and measure angles in 3D. Lines on the polar map are not true lines on the Moon: the map stretches distance by 0.8% at 80°S and 7% at 60°S.
- For every candidate point, record the highest terrain angle in 1,440 directions (every 0.25°) out to 300 km: the horizon mask. From a site 2 km up, an 8 km peak stays in view out to 250 km.
- The 3D method includes the Moon's curvature. At 100 km the surface drops about 2.9 km, which lowers a distant ridge by about 1.6°: three Sun-widths. This is one of our unit tests.
- Within about 5 km, march rays through the finest map with interpolation. Farther out, each pixel raises the horizon in every direction it covers, so no peak slips between rays.
- Use 10 to 20 m maps out to 20 km, the 80 m map to 60 km and the 240 m map beyond. The 80°S maps end about 150 km Earthward of an 85°S site, so the far field uses the map that reaches 60°S.
- Stop searching a direction once no terrain farther out could rise above the horizon found so far, even at the tallest height on the map.
- Compute masks for two observer heights: 2 m (astronaut) and 10 m (mast or solar array). Height changes polar lighting a lot.
- Store the distance to the blocking terrain in each direction, so the app can show which ridge causes a blackout.
- Measure azimuth in each site's own east-north-up frame, the same one used for the Sun, Earth and stations. On screen, label directions by landmarks ("toward Earth", "toward Shackleton"), since compass words confuse near the pole.

### 3. Sunlight (power)

- Compute the share of the Sun's disc above the terrain at every step, using the disc's true size at that moment.
- Sample the horizon at several points across the disc, since a ridge can cut across it at an angle.
- At the pole itself the Sun never climbs more than about 1.5° above the horizon (the Moon's axis tilts 1.54°), and only a few degrees higher at nearby sites, so partial sunlight is common and matters.
- Include Earth's shadow. Three total lunar eclipses fall in our window (31 December 2028, 26 June 2029 and 20 December 2029), with totality lasting 54 to 102 minutes ([NASA eclipse tables](https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html)). We subtract the part of the Sun hidden behind Earth's disc at every step, which also covers partial eclipses.
- Refine every sunrise and sunset to the minute by bisection on the interpolated positions.
- Report the plain share of the disc by default, to match NASA's maps. As a refinement for power, weight the visible part by brightness, since the Sun's edge is dimmer than its centre.

### 4. Contact with Earth (communications)

- **Check stations, not Earth's centre.** A ground station can sit up to about 0.9° from Earth's centre in the lunar sky, so the first plan's rule (centre plus a 1° margin) could be wrong in either direction.
- **Two tests per station.** Contact needs at least one Deep Space Network complex (Goldstone, Madrid or Canberra) where the line to the station clears the lunar terrain and the Moon is at least 10° above the station's own horizon. The 10° is our assumption and adjustable.
- **A reference network, not the only one.** Commercial landers often use other stations. We say so, and offer the simple rule "any part of Earth in view" as a switch.
- **Three grades, not yes or no.** Clear, grazing (the station is less than 2° above the terrain, our threshold) or blocked. Near the pole the antenna points almost along the ground, and NASA and JPL studies warn of reflections and slow fading at such angles.
- **Blackouts and gaps.** Earth's centre wanders roughly 6.7° up and down over a 27.2-day cycle and, at the pole, averages 0.26° below the level horizon. Many polar sites lose Earth regularly; we mark every blackout and the longest gap.
- **NASA's convention for validation.** NASA's Earth-visibility maps count Earth as visible if any part of its disc clears the terrain. We compute that too, only to compare like with like.

### 5. Relay mode (stretch)

- NASA's LCRNS project is validating commercial relay services so lunar missions stay connected even where Earth is not visible ([NASA Goddard](https://etd.gsfc.nasa.gov/our-work/lcrns/)).
- NASA publishes reference orbit states for analyses like ours, noting the final design belongs to Intuitive Machines ([NTRS](https://ntrs.nasa.gov/citations/20250002698)). We propagate them, check when a relay is above each site's terrain and in view of Earth, and label the result illustrative.

### 6. Power and surviving the night

- Battery estimate = load × longest darkness ÷ (usable depth of discharge × efficiency). Example: 100 W for 50 h ÷ (0.8 × 0.9) ≈ 6.9 kWh.
- Assume a vertical panel that turns to follow the Sun, the usual choice where the Sun hugs the horizon. Users set the load; defaults are shown.

### 7. Scoring engineers can trust

- **Constraints first.** Pass/fail rules the user sets. Defaults: continuous sunlight through the whole stay (NASA's criterion for its candidate regions) and a maximum comms gap.
- **Then a transparent score** from three visible parts, clamped to 0–100, with default weights 0.5, 0.3 and 0.2 that users can change:

```latex
\text{Score} = 100\,\big(0.5\,S + 0.3\,E - 0.2\,N\big)
```

S is the average share of the Sun's disk visible, E the share of time with Earth contact, and N the longest night divided by the stay length. Every report card shows the three parts, so nothing is a black box.

### 8. The miss test

- **Why.** Athena (IM-2, March 2025) came down about 250 m from its target by the company's figure and more than 400 m by NASA's. It ended on its side in a crater where sunlight could not reach its panels, and the mission lasted about 13 hours ([SpacePolicyOnline](https://spacepolicyonline.com/news/im-2-mission-ends-one-day-after-lunar-landing/)).
- **Grid.** Around each named target, points every 50 m out to 500 m: about 320 points, each with its own horizon masks. Terrain comes from the 10 m map, or a 5 m site map where NASA has published one.
- **Result.** The share of points within 100 m, 250 m and 500 m that meet the scenario's rules on the chosen dates, a pass/fail map, and the worst case inside the circle.
- **Miss-tolerant windows.** With the miss test on, the calendar marks a date as good only if at least 90% of points inside the miss radius pass (adjustable).
- **Honest label.** This is a robustness share, not a landing probability. It treats every point in the circle as equally likely and does not model the lander's guidance.

## Architecture and tech stack

&#91;embedded content: SunSight architecture · NASA data to browser\]

The Python pipeline does all heavy geometry once; the site is plain static files, so it loads fast and cannot break during judging.

| Layer | Choice | Why |
| --- | --- | --- |
| Pipeline | Python with spiceypy, NumPy, Numba and rasterio | SPICE has a mature Python wrapper; Numba makes ray casting fast enough to run in minutes |
| Tests | pytest, plus a few browser smoke tests | Run on every commit |
| Web app | TypeScript with Vite | Fast builds and a small bundle |
| Map | OpenLayers with proj4, in a south polar stereographic view over Moon Trek tiles | Handles polar projections and map tiles natively |
| Charts | D3 or Observable Plot | Full control over the sky panorama and heatmap |
| Browser math | A Web Worker | Keeps the page responsive while windows are scored |
| 3D (stretch) | Three.js | Terrain mesh lit by the computed Sun direction |
| Hosting | GitHub Pages, plus a mirror on Netlify or Cloudflare Pages | Free, static and reliable for weeks |

### Data budget

- **Sun, Earth and station table:** hourly for 2027–2030 is 35,064 rows. Sun, Earth and three station vectors, plus the Moon's height above each station's horizon, come to about 2.5 MB before compression.
- **Horizon masks:** 1,440 directions × 2 bytes ≈ 2.9 KB per point per height; storing blocker distances doubles it. A 500 m grid over a 15 × 15 km region is about 900 points, roughly 2.6 MB per height before compression.
- **Miss-test grids:** about 320 points per target, roughly 0.9 MB per height.
- **Validation run:** the 18.6-year hourly table (about 163,000 rows) stays in the pipeline; only the comparison results ship.
- **Loading:** the browser fetches one region at a time, only when the user opens it.

## Smart choices

Each choice below either makes the numbers more trustworthy, the tool faster, or the story clearer to NASA judges.

| Choice | Why it matters | Helps with |
| --- | --- | --- |
| Build around NASA's real decision: date ↔ site | Mirrors how NASA says it picks sites, so expert judges recognise the problem at once | Relevance, impact |
| Answer first, detail second | The challenge asks for an intuitive, quick tool. Every screen opens with a verdict and its reason; the physics sits one click below. | Relevance, presentation |
| The miss test | No landing is exact. Showing how a site holds up 250 m off target answers the question Athena raised; none of the public entries we checked on November 13 does it. | Creativity, impact |
| Scenario presets built on NASA's criteria | A 6.5-day crew stay with continuous sunlight and Earth contact, or a 14-day robotic lander, in one click | Relevance, validity |
| Reuse NASA's maps for "where", spend our effort on "when" and "how sure" | PGDA and Moon Trek already map average sunlight; our value is specific dates and tolerance to a miss | Creativity, impact |
| Precompute everything, ship a static site | Loads in seconds, needs no keys, and cannot break if an outside service is slow during weeks of judging | Presentation |
| One Sun, Earth and station table plus small per-point horizon masks | About 3 KB per point per height; the browser does the rest instantly | Presentation |
| 3D geometry in NASA's own lunar frame | Sites, terrain and the Sun line up to metres; avoids the 875 m frame trap and the map-stretch error | Validity |
| True-size Sun and Earth discs, plus eclipses | Correct partial sunlight at the pole, and no surprise blackout on 31 December 2028 | Validity |
| Station-level Earth contact with a grazing grade | Checks a real antenna on Earth, and warns when the link skims the ground | Validity, impact |
| Never lose a peak when terrain is coarsened | Far terrain uses coarser maps for speed. Each pixel raises the horizon in every direction it covers, and blocks we coarsen keep their highest point. | Validity |
| Two observer heights | Matches real hardware: an astronaut versus a mast or solar array | Impact, validity |
| Constraints before score, weights visible | How engineers decide; no black box | Validity, impact |
| Minute-accurate events by bisection | Precise times without storing minute-by-minute data | Validity |
| Like-for-like validation, built into the product | We copy each NASA reference's own settings before comparing, and show the result one click away | Validity |
| NASA's region names and units everywhere | Instant credibility with subject-matter experts | Relevance, presentation |
| Shareable links and CSV/JSON export | A tool planners could actually use | Impact |
| Colour-blind-safe palettes, keyboard use, projector-readable text | Inclusive and demo-proof | Presentation |
| Feature freeze and sleep shifts | Fewer late bugs, a sharper demo | Presentation |
| Fresh repository at kickoff, open licence, AI-use log, tagged release | Proves the work happened during the event, meets the open-source and AI-disclosure rules, and freezes what judges see | Eligibility |
| Save evidence as we go | A data manifest, validation outputs and a decision log feed both the project page and the paper | Validity, publication |

## Quality checks

Nothing ships until every box below is ticked. The science checks run as automated tests where possible; the rest are a walkthrough before the feature freeze. Numeric targets are our own.

### Science

- [ ] SPICE and Horizons agree on Sun and Earth azimuth and elevation within 0.001° at 3 sites × 20 random times.
- [ ] Frame test: the same site in MOON\_ME and MOON\_PA lands about 875 m apart. The pipeline uses MOON\_ME, and a test fails if anyone changes it.
- [ ] Orientation test: a few named craters from the IAU gazetteer land on the right features in our terrain map, which catches a mirrored or rotated grid.
- [ ] Distance and bearing between two known points match the spherical formulas, proving we measure in 3D and not on the map grid.
- [ ] With flat terrain at exactly 90°S, the Sun's centre stays within about ±1.6° all year.
- [ ] The Sun's peak elevation at the pole repeats roughly every 346.6 days, the Moon's seasonal cycle.
- [ ] The Sun's azimuth makes one full circle about every 29.5 days, one lunar day.
- [ ] Earth's elevation at the pole swings roughly ±6.7° with a period near 27.2 days, around an average near −0.26°, not zero.
- [ ] Apparent sizes stay within 0.52° to 0.54° for the Sun and 1.8° to 2.0° for Earth across 2027–2030.
- [ ] Eclipse test: the Sun is fully hidden at every site through NASA's listed totality on 31 December 2028, 26 June 2029 and 20 December 2029.
- [ ] Synthetic terrain: a perfectly smooth Moon gives the expected horizon dip (0.09° at 2 m, 0.19° at 10 m); a single wall of known height and distance gives the expected angle within 0.01°.
- [ ] Rotating a synthetic terrain grid by 90° rotates its horizon mask by 90°.
- [ ] Far-field test: a one-pixel spike 100 km away appears in the mask at the right direction and height, however the grid is shifted.
- [ ] A permanently shadowed crater floor, such as Shackleton's, returns about 0% sunlight.
- [ ] Known well-lit ridges, such as the Shackleton–de Gerlache connecting ridge, rank among the best-lit points.
- [ ] Published benchmark: our best point on the connecting ridge comes close to the published 92% sunlit at 2 m and 96% at 10 m ([Gläser et al. 2014](https://ui.adsabs.harvard.edu/abs/2014Icar..243...78G)).
- [ ] A 10 m observer never gets less sunlight than a 2 m observer at the same point.
- [ ] Our surface-level, 18.6-year sunlight share agrees with the PGDA maps at 200 random points (see Validation plan).
- [ ] Station check: the Moon's elevation at Goldstone, Madrid and Canberra matches Horizons within 0.01°, and the Earth-orientation kernel covers every date we use.
- [ ] A known UTC time round-trips exactly through SPICE with the leap-second kernel loaded.
- [ ] Every number on screen has a unit; metres versus kilometres checked in the terrain code.

### Engineering

- [ ] One command rebuilds all data from the raw downloads; a data manifest lists every file, URL and version.
- [ ] Pipeline tests and a few interface smoke tests run on every commit.
- [ ] First load under 3 seconds on a typical laptop; each region's data file under 3 MB compressed.
- [ ] Interactions respond in under 100 ms; heavy work runs off the main thread.
- [ ] No console errors in Chrome, Firefox and Safari; usable on a phone.
- [ ] Works offline after first load, with no live calls to outside services.
- [ ] A shared link reopens the exact scenario, and exports match what is on screen.
- [ ] A mirror copy runs on a second static host.

### User experience

- [ ] Someone outside the team answers "which site works on this date?" in under 30 seconds without help.
- [ ] The same person explains the miss-test map in their own words after 10 seconds of looking.
- [ ] Every screen opens with a verdict and its reason before any chart.
- [ ] Every chart has a title, labelled axes with units, and a one-line takeaway.
- [ ] Colour-blind-safe palette, and pass/fail never shown by colour alone.
- [ ] Full keyboard use with visible focus; images have alt text.
- [ ] Text at least 14 px with strong contrast, so it reads on a projector.
- [ ] Plain-language tooltips for jargon such as azimuth, libration and permanently shadowed region.
- [ ] The guided Athena example works on a phone from start to finish.

### Rules and submission

- [ ] Asked the local lead or Space Apps Connect how the "no work before the hackathon" and "AI is not for the idea" rules apply to this plan, before building on it.
- [ ] The team decided at kickoff what to build, and wrote that decision in the log.
- [ ] All members registered, confirmed (not waitlisted) at the same local event and shown on the team's Members tab. At most six; none can be added after submission closes.
- [ ] At least one NASA data source or resource used and described in the NASA Data field. This is required for a Global Award.
- [ ] SI field filled truthfully: where and how AI tools were used, this plan included.
- [ ] AI-made images and video carry a visible watermark; AI-generated audio, code and data are acknowledged in text and metadata; no NASA logos, flags or mission identifiers in generated content.
- [ ] Every outside resource (code, text, images, even open source) listed in the references field. No copyrighted material without permission, and no code copied from other teams.
- [ ] Demo is a video of 30 seconds or less, or at most 7 slides, on a public link with no login. Over the limit means no Global Judging.
- [ ] Final project link is public with no login. For a new website, request a FortiGuard web filter classification so judges can open it.
- [ ] English on the project page and in linked materials. A video in another language needs English subtitles.
- [ ] No image, video, audio or other likeness of anyone under 18.
- [ ] "Submit for Judging" clicked before Sunday 11:59 p.m. local event time; our target is 22:30. Nothing saved or resubmitted after the deadline.
- [ ] Good practice, not found in the 2026 guides read: a fresh public repository, an open licence and a tagged release. Check the Terms and Conditions.
- [ ] Submitted version kept live through January 26, 2027, when winners are announced.

## Validation plan

We prove SunSight is right in eight independent ways and publish every result on the in-app validation page, so judges can check it in one click. Before each comparison we copy the reference's own settings.

| Test | What we compare | How we show it | Our pass mark |
| --- | --- | --- | --- |
| Ephemeris cross-check | SPICE Sun and Earth azimuth and elevation vs JPL Horizons, 3 sites × 20 times | Table of differences | Largest difference ≤ 0.001° |
| Sunlight maps, like for like | Our sunlight share computed NASA's way (surface level, hourly, 18.6 years, Sun as a disc) vs the [PGDA illumination maps](https://pgda.gsfc.nasa.gov/products/69) at 200 random points | Scatter plot with mean difference and spread; outliers marked on the map | Mean difference within 2 points; every outlier explained |
| Earth visibility, like for like | Our Earth-in-view share under NASA's rule (any part of the disc counts) vs the PGDA Earth-visibility maps | Same scatter and map | Mean difference within 2 points; every outlier explained |
| Published site study | Our best point on the Shackleton connecting ridge vs Gläser et al. 2014: 92.27% sunlit at 2 m and 95.65% at 10 m over 19 years | Numbers side by side | Within 2 points at both heights, or the gap explained |
| Eclipses | When Earth hides the Sun vs NASA's tables for the three total eclipses in our window | Timeline strip | Sun fully hidden at every site through NASA's listed totality |
| Station geometry | The Moon's elevation at Goldstone, Madrid and Canberra vs Horizons, 20 times each | Table of differences | Largest difference ≤ 0.01° |
| Physics sanity tests | Seasons, lunar day, Earth's wobble, synthetic terrain (see Quality checks) | Pass/fail list | All pass |
| Known places | Shadowed crater floors and well-lit ridges | Callouts on the map | Match expectations |

Rules that keep the comparison fair:

- Copy each reference's settings first. The PGDA maps use a surface-level observer and hourly steps over 18.6 years, treat the Sun as a disc, and count Earth as visible if any part of it shows.
- The PGDA maps date from 2016 and older terrain; ours uses the 2023 maps. Some differences are real terrain improvements, not errors, and we say so where it applies.
- Compare at the reference map's resolution (60 to 240 m), not ours, so a finer grid is not punished for detail.
- Name each outlier's likely cause, such as terrain resolution near a steep crater wall.

### Sensitivity and honest limits

- Re-run key sites with coarser terrain, a finer 0.1° azimuth step, a 100 km search limit and NASA's averaged coarse maps in place of ours. Show how much each answer moves as an uncertainty band on the report card.
- Shift each test site by one terrain pixel in each direction and show how far the answer moves.
- One teammate who did not write the engine re-derives two numbers by hand: a curvature correction and one sunrise time from Horizons.
- State the limits on the page: terrain maps cannot see boulders or small craters; Earth contact is geometry, not signal strength; the station network is a reference choice; the relay layer is illustrative; NASA's terrain error maps are not yet folded into error bars.

## How we score on each judging criterion

At every level, judges score each project from 1 to 5 on impact, creativity, validity, relevance and presentation, and the guide tells teams to give presentation equal attention ([2026 Judging and Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/), read November 14). Validity covers usability as well as science. Relevance covers how deeply NASA data is built in. Dates: Global Nominees on December 3, 2026, Global Finalists on December 17, and Global Winners on January 26, 2027.

| Criterion | What judges ask | How SunSight delivers |
| --- | --- | --- |
| Impact | How big a problem, and how many people it helps | Answers a site-and-date question NASA must settle before every south pole landing, and the one Athena raised: what if we miss? Built for planners, educators and the public, as the challenge asks. |
| Creativity | Novel, or an incremental improvement? | The miss test and miss-tolerant landing windows. Terrain shadows alone are now common among public entries, so we do not lead with them. |
| Validity | Scientifically valid; works in the real world | 3D geometry in NASA's frame, true-size discs, eclipses and station-level contact, checked like for like against Horizons, NASA's maps and a published site study, all on a public validation page |
| Relevance | Responsive, complete, feasible, usable | Covers every requirement row, ships as a working site, and a newcomer gets a verdict in 30 seconds |
| Presentation | Tells the story: challenge, solution, why it matters | A 30-second demo built on one true story in the organisers' beat order, plus a project page that leads with the decision it supports |

### Awards we aim for

- **Best Use of Data**: the solution that best makes space data accessible or leverages it in a unique way. This is SunSight's core.
- **Best Use of Science**: the best and most valid use of science. Our validation work targets this.
- **Best Mission Concept** as a reach: the most plausible concept and design.

The 2026 guide lists ten Global Awards. The other seven are Best Use of Technology, Galactic Impact, Most Inspirational, Best Storytelling, Global Connection, Art & Technology and Local Impact.

### Win the room first

Local judges choose the few projects that advance to global judging, where NASA and partner experts take over, then an executive committee picks the winners ([2022 guide](https://spaceapps-prod.s3.amazonaws.com/media/documents/Space_Apps_2022_Judging_and_Awards_Guide.pdf)). Local judges may not be lunar experts. So the demo must make sense to a non-specialist in 30 seconds, while the validation page convinces the NASA experts later.

## Demo and submission plan

The demo is a 30-second video built on one true story: a lander missed its target by a few hundred metres and lost its sunlight. It follows the timing in the 2026 Submission Guide: who you are at 0:00, the challenge and what inspired you at 0:02, title and tagline at 0:05, how it works and the data at 0:10, and a look into the future from 0:20. The guide says most of the evaluation rests on the project page, so the page gets as much care as the video.

### 30-second video script

| Time | On screen | Caption and voice-over |
| --- | --- | --- |
| 0–2 s | Presenter and team name over the south pole map | "I'm \[name\], team \[team\]." |
| 2–5 s | Athena's target and where it came down, a few hundred metres apart, with the crater in shadow | "Athena missed by 250 metres and lost its sunlight." |
| 5–10 s | Title card with the tagline | "SunSight. Pick a site and a date. See if it survives a miss." |
| 10–20 s | Pick a date and the sites rank. Open one: the Sun skims a ridge, the countdowns to sunset and Earthset tick, the miss-test circle fills with pass and fail points. Data credits on screen. | "NASA's LOLA terrain and SPICE give real horizons: sunlight, Earth contact, time to sunset, and what a 250-metre miss costs." |
| 20–30 s | A launch date slips and every site re-ranks at once; a classroom view; the check against NASA's maps; end card with the link | "When a launch slips, planners re-check every site in seconds, and classrooms see why the south pole is so hard." |

Production rules:

- Cut to 29 seconds. Last year a video over 30 seconds made a project ineligible.
- Keep the voice-over near two words a second. The script above is about 70 words.
- English captions burned in, plus a caption file.
- Voice-over by an adult teammate, or captions only.
- Real NASA imagery, credited. No AI-made images or video; if any is used, it needs a visible watermark and no NASA logos.
- Record at 1080p with browser zoom at 125% and the bookmarks bar hidden.
- Rehearse the cursor path; cut every loading pause.
- One idea per shot, with text large enough to read on a phone.
- Upload publicly and test the link in a private browser window.

### Project page outline

1. **Project Name.**
2. **High-Level Project Summary:** what we developed, how it addresses the challenge and why it matters.
3. **Link to Project Demo:** the 30-second video on a public link.
4. **Link to Final Project:** the live site and repository, public with no login.
5. **Detailed Project Description:** what it does, how it works, its benefits, what we hope to achieve, and the tools and languages used. Add screenshots (JPG, PNG or GIF, up to 10 MB each), validation numbers, limits and next steps.
6. **Use of Super Intelligence (SI):** whether and how AI tools were used. The guide says judges do not see this answer, but they do see watermarks and acknowledgements inside the project.
7. **NASA Data:** each NASA dataset and resource and what we used it for.
8. **Space Agency Partner Data and Other References:** every other dataset, tool, code, text and image used.

These are the eight fields in the 2026 Project Submission Guide. All required fields must be complete before the form will submit.

### Submission-form checklist

- [ ] Every teammate confirmed at the same local event and listed on the Members tab.
- [ ] Challenge set to Lunar Landing Site Navigator.
- [ ] All eight fields complete, in English.
- [ ] SI field truthful and matching our log.
- [ ] Demo and final project links open in a private browser window with no login.
- [ ] FortiGuard web filter classification requested for the live site.
- [ ] Both boxes ticked: terms and conditions, and all work is original.
- [ ] "Submit for Judging" clicked and the confirmation banner seen; screenshot saved.
- [ ] Nothing saved or resubmitted after Sunday 11:59 p.m.

## Team roles

Six roles, one owner each, and every role has a backup so work continues through sleep shifts. Teams are capped at six ([Internshala listing](https://internshala.com/competitions/nasa-international-space-apps-challenge-2026-registration/)).

| Role | Owns | Delivers during the hackathon | Name | Backup |
| --- | --- | --- | --- | --- |
| Geometry lead | SPICE pipeline, time and frames | Sun, Earth and station table for 2027–2030; Horizons cross-check |  |  |
| Terrain lead | LOLA data and the horizon engine | Horizon masks for every point at both heights; miss-test grids; synthetic terrain tests |  |  |
| Science and validation lead | Tests, map comparisons, limits | Validation page, sensitivity runs, the hand re-derivation |  |  |
| Front-end lead | The web app | Map, report card, heatmap, sky panorama, share and export, speed |  |  |
| Design and demo lead | Look, accessibility, video | Interface design, colour-blind-safe palette, the 30-second video, screenshots |  |  |
| Story and submission lead (captain) | Scope, schedule, rules, project page | Requirements table, feature freeze call, project page, submission; asks the challenge experts questions |  |  |

The captain watches Space Apps Connect, the GitHub forum where subject-matter experts answered participants' questions during last year's event ([NASA Terra, 2025](https://terra.nasa.gov/2025/10)). It opened for 2026 on November 2 ([Internshala listing](https://internshala.com/competitions/nasa-international-space-apps-challenge-2026-registration/)).

Smaller team? Merge geometry with terrain, design with story, and pair validation with the front-end lead.

## 48-hour schedule

&#91;embedded content: 48-hour schedule · 3 gates\]

Three gates keep us honest: one site working end to end by Saturday 20:00, feature freeze at Sunday 14:00, and submission by 22:30. The miss test runs on one hero target before the first gate and on every target overnight. The 2026 Submission Guide confirms that submission opens Saturday November 14 at 9:00 and closes Sunday November 15 at 11:59 p.m., local event time, and that a project saved or submitted later is not eligible. Local judging and awards may run on different times, so ask your local lead.

- **Stand-ups:** five minutes every three hours: done, blocked, cut.
- **After freeze:** only bug fixes, polish, the demo and the project page.
- **Sleep:** everyone gets at least four hours; pairs rotate so each role's backup is awake.

## Before kickoff

Check the rules before building on this plan. The official FAQ says teams may not begin working on the challenges before the hackathon, and the Submission Guide says AI tools should not be used to come up with the idea. This plan was written before kickoff with an AI assistant. An earlier version of this section called that "preparation"; that was our reading, not the organisers'. Ask your local lead first.

- [ ] Ask the local lead, or Space Apps Connect, how the two rules above apply to this plan, and when local judging happens.
- [ ] Every teammate registered, confirmed (not waitlisted) at the same local event, and on one team.
- [ ] Everyone reads the challenge statement, its Resources tab, the Project Submission Guide and the Judging and Awards Guide.
- [ ] At kickoff, the team decides what to build and writes the decision down.
- [ ] Start the SI-use log. First entry: this plan and how it was made.
- [ ] Agree roles, backups, sleep shifts and the feature-freeze time.
- [ ] Check the Global Collaborators page for free tools and claim anything useful.
- [ ] Read Space Apps Connect for expert answers about this challenge.
- [ ] Check laptops: Python, Node, at least 20 GB of free disk space and screen-recording software.
- [ ] Pack chargers, a power strip and headphones for recording.

## Risks and fallbacks

Every risk has an early-warning time and a fallback, so we cut scope on purpose instead of running out of time.

| Risk | Early warning | Fallback |
| --- | --- | --- |
| Terrain processing too slow | One region's horizon masks take over an hour by Saturday 18:00 | Cut to three hero regions, coarser far-field terrain, 0.5° azimuth step |
| Miss-test grids too slow | One target's grid takes over 20 minutes by Saturday 22:00 | Three hero targets, 100 m spacing, one observer height |
| Terrain files too large for the network | Windowed reads fail or crawl on Saturday morning | Download the 40 m and 80 m maps (under 1 GB together) and use those; fine maps only for hero sites |
| SPICE setup stalls | No Sun table by Saturday 14:00 | Precompute azimuth and elevation from the Horizons API for the hero sites, cached and within its rate limits |
| Station check fails for later dates | Earth-orientation kernel does not cover 2027–2030 | Load the long-range predicted kernel; if still stuck, use "any part of Earth in view" and say so |
| Validation disagrees with NASA's maps | Weak agreement by Sunday 08:00 | Check frames, azimuth convention, observer height and averaging period; if still unresolved, show the gap honestly with likely causes |
| Another team ships the same idea | We see a public entry with a miss test | Keep going: ours is validated like for like and tells one true story. Never copy their code. |
| Front end behind | Report card not working by Sunday 08:00 | Ship report card, sky panorama and a sortable table; drop heatmap polish |
| 3D view unstable | Not solid at feature freeze | Ship the 2D sky panorama, which is already core |
| Relay data hard to use | Reference states not parsed within 2 hours | Skip relay mode and list it under next steps |
| Hosting fails at submission | Deploy error | Switch the links to the mirror host |
| Venue Wi-Fi slow | Downloads crawl | Pre-downloaded data if allowed, a phone hotspot, a shared USB drive |
| A teammate drops out or burns out | Missed check-in | The role's backup takes over; merge roles as in Team roles |
| Demo video late | No rough cut by Sunday 18:00 | Record a rough cut Saturday night from the first working version, then replace shots at the end |

## IEEE publication plan

Winning the hackathon and publishing are separate goals. The hackathon rewards a clear, working tool; a paper needs one new, well-tested result. The first target is a 4-page paper for IGARSS 2027, due January 10, 2027. Acceptance is not guaranteed.

### Where to submit

| Venue | Format | Deadline | Fit |
| --- | --- | --- | --- |
| [IGARSS 2027](https://2027.ieeeigarss.org/important_dates.php), Reykjavík, July 11–16, 2027 | 4-page paper, published in IEEE Xplore | January 10, 2027. The site shows both January 10 and 11, so treat the 10th as final. Decisions March 12. | First target. A remote-sensing audience that knows the LOLA data. |
| [IEEE SPACE 2027](https://ieee-aess.org/files/ieeeaess/2026-10/ieee-space-2027_call-for-papers.pdf), Singapore, July 5–7, 2027 | 3 to 6 pages | January 31, 2027 | Backup, three weeks later. Accepted papers are considered for a journal special section. The call does not say whether proceedings go to IEEE Xplore, so ask. |
| [IEEE Aerospace Conference 2028](https://aeroconf.org/paper-submission), March 2028 | 6 to 20 pages | Not posted yet. The 2027 edition took abstracts by July 1 and papers by October 2, 2026. | The fuller paper, with the mission-planning angle |
| [IEEE Access](https://ieeeaccess.ieee.org/about/) | Open-access journal article | Any time | Later option once the method is mature. It charges a publication fee; check the current amount before committing. |

### What the paper must add

Terrain-based sunlight studies of the lunar south pole are well established. [Mazarico et al. 2011](https://doi.org/10.1016/j.icarus.2010.10.030) set out the horizon method over 18.6 years, [Gläser et al. 2014](https://ui.adsabs.harvard.edu/abs/2014Icar..243...78G) studied sites on 20 m terrain, and [Barker et al. 2021](https://doi.org/10.1016/j.pss.2020.105119) built 5 m site maps and showed how terrain error changes illumination. A paper that repeats them will be rejected. Ours needs a result they do not have:

1. **Miss-tolerant landing windows.** For each site and date, the share of ground within a landing error that still meets the power and Earth-contact rules, and how the windows shrink as the error grows from 100 m to 500 m.
2. **Terrain-error bands.** Carry NASA's published height-error maps through to the horizon and the windows, in the spirit of the terrain variants Barker's team used.
3. **An open, reproducible dataset.** Horizon masks and windows for all nine regions for 2027–2030, released with the code.

Before writing, search IEEE Xplore, NASA ADS and NTRS for work that combines landing error with illumination. This plan's review was not exhaustive. If the idea is already published, cite it and narrow our claim to what is still new.

### What to save during the hackathon

- A data manifest: every file name, URL, version and checksum, plus the exact kernel list.
- Validation outputs as data files, not only screenshots.
- A decision log: each assumption, its value and the reason.
- Compute time per point and per region.
- The tagged release.

### Timeline to January 10

| When | What |
| --- | --- |
| November 16–30 | Literature search; settle the claim; read the IGARSS paper template and topic list; find a reviewer outside the team, ideally a lunar scientist or faculty mentor |
| December 1–20 | Full runs for all nine regions; miss-radius sweeps; terrain-error bands; figures |
| December 21 to January 3 | Write the four pages; outside review |
| January 4–9 | Final checks; submit a day early |

### Rules to respect

- IEEE requires authors to disclose AI-generated content (text, figures, images and code) in the acknowledgments, naming the system, the sections and the level of use ([IEEE author guidelines](https://open.ieee.org/author-guidelines-for-artificial-intelligence-ai-generated-text/)). An AI system cannot be an author.
- Every author must have contributed and be able to defend the paper. Agree the author list and order before writing.
- An accepted IGARSS paper needs a registered author by April 30, 2027; plan for someone to present it in July. Student authors can apply for travel support by the same January deadline.
- The project page and repository will already be public. Check the conference's policy on prior publication, and write the paper as new analysis, not a copy of the project page.

## Sources

- NASA: [NASA's Artemis III Mission to Test Future Moon Lander Operations](https://www.nasa.gov/missions/artemis/nasas-artemis-iii-mission-to-test-future-moon-lander-operations/) (October 23, 2026)
- NASA: [NASA Provides Update on Artemis III Moon Landing Regions](https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/) (October 28, 2024)
- Khaleej Times, carrying NASA's release: [NASA identifies candidate regions for landing next astronauts on Moon](https://www.khaleejtimes.com/world/americas/us-nasa-identifies-candidate-regions-for-landing-next-astronauts-on-moon?amp=1) (August 2022)
- Space.com: [NASA announces 9 possible moon landing sites for Artemis 3](https://www.space.com/space-exploration/artemis/nasa-announces-9-possible-moon-landing-sites-for-artemis-3-lunar-mission) (October 30, 2024)
- The Washington Times: [NASA targets fall 2026 first Moon Base mission near lunar south pole](https://www.washingtontimes.com/news/2026/may/27/nasa-targets-fall-2026-first-moon-base-mission-near-lunar-south-pole/) (May 27, 2026)
- Starlust: [Four major lunar missions set to launch in 2026](https://starlust.org/four-major-lunar-missions-set-to-launch-in-2026-to-support-nas-as-goal-to-stay-on-the-moon/) (May 27, 2026)
- SpacePolicyOnline: [IM-2 mission ends one day after lunar landing](https://spacepolicyonline.com/news/im-2-mission-ends-one-day-after-lunar-landing/) (March 2025)
- Sonoma State University: [Space Apps 2026 local event page](https://edeon.sonoma.edu/nasaspaceapps-26/), with the challenge summary
- Space Data Atlas: [Lunar Landing Site Navigator](https://spacedata.swapniltamse.com/challenges/lunar-landing-site-navigator/), an independent summary of the challenge with dataset notes
- NASA Goddard PGDA: [south polar terrain maps](https://pgda.gsfc.nasa.gov/products/90), [5 m site maps](https://pgda.gsfc.nasa.gov/products/78) and [polar illumination maps](https://pgda.gsfc.nasa.gov/products/69)
- NASA JPL NAIF: [generic SPICE kernels](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/) and the [lunar frames kernel notes](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf)
- NASA Goddard: [lunar eclipses 2021–2030](https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html)
- NASA: [Lunar Surface Propagation one-pager](https://www.nasa.gov/wp-content/uploads/2026/10/lsp-one-pager-digital.pdf) (October 2026)
- NASA JPL: [IPN Progress Report 42-216C](https://ipnpr.jpl.nasa.gov/progress_report/42-216/42-216C.html), on radio links from the lunar south pole
- Mazarico et al. 2011: [Illumination conditions of the lunar polar regions using LOLA topography](https://doi.org/10.1016/j.icarus.2010.10.030), Icarus 211
- Gläser et al. 2014: [Illumination conditions at the lunar south pole using high resolution Digital Terrain Models from LOLA](https://ui.adsabs.harvard.edu/abs/2014Icar..243...78G), Icarus 243
- Barker et al. 2021: [Improved LOLA elevation maps for south pole landing sites](https://doi.org/10.1016/j.pss.2020.105119), Planetary and Space Science 203
- Barker et al. 2023: [A new view of the lunar south pole from LOLA](https://doi.org/10.3847/PSJ/acf3e1), Planetary Science Journal 4
- NASA Goddard: [Lunar Communications Relay and Navigation Systems (LCRNS)](https://etd.gsfc.nasa.gov/our-work/lcrns/)
- NASA Technical Reports Server: [LCRNS Reference Constellation 3.1](https://ntrs.nasa.gov/citations/20250002698) (April 2025, public)
- Space Apps: [Judging and Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/) (2026, read through search previews) and [Judging and Awards Guide 2022](https://spaceapps-prod.s3.amazonaws.com/media/documents/Space_Apps_2022_Judging_and_Awards_Guide.pdf)
- Space Apps forum: [organisers' reply on AI tools](https://github.com/nasa/spaceapps/discussions/1273) (September 2025)
- PA-Andries on GitHub: [a participant's summary of the 2025 rules](https://github.com/PA-Andries/space-apps-kit/blob/main/docs/rules.md)
- NASA: [2025 Space Apps Global Winners](https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-announces-2025-international-space-apps-challenge-global-winners/) (December 18, 2025)
- Internshala: [NASA International Space Apps Challenge 2026 listing](https://internshala.com/competitions/nasa-international-space-apps-challenge-2026-registration/)
- NASA Terra: [Space Apps 2025 post](https://terra.nasa.gov/2025/10) (October 2025)
- Public entries read for awareness: [BroBYW](https://github.com/BroBYW/CLPS-Lunar-Mission-Website), [NetRunnerXD](https://github.com/NetRunnerXD/lunar-horizon-wheel) and [dundaryusuf566-maker](https://github.com/dundaryusuf566-maker/clps-lunar-browser)
- IEEE: [IGARSS 2027 important dates](https://2027.ieeeigarss.org/important_dates.php), [IEEE SPACE 2027 call for papers](https://ieee-aess.org/files/ieeeaess/2026-10/ieee-space-2027_call-for-papers.pdf), [IEEE Aerospace Conference paper submission](https://aeroconf.org/paper-submission), [IEEE Access](https://ieeeaccess.ieee.org/about/) and the [author guidelines on AI-generated content](https://open.ieee.org/author-guidelines-for-artificial-intelligence-ai-generated-text/)

The official Space Apps pages were read in a browser on November 14: the [challenge statement](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/) and its Resources tab, the [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/), the [Judging and Awards Guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/) and the [Participant FAQs](https://www.spaceappschallenge.org/resources/participant-faqs/). The Terms and Conditions were not read. Resources named on the challenge page: [QuickMap](https://quickmap.lroc.asu.edu/), [Moon Trek](https://trek.nasa.gov/moon/), the [Horizons System](https://ssd.jpl.nasa.gov/horizons/) and the Canadian Space Agency's [Moon Exploration](https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/) page.
