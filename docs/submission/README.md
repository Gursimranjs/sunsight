<!-- SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md. -->
# Material for the people making the demo and the project page

Everything here comes from the real app with the shipped data. Nothing is edited, retouched or AI-generated.
Recreate it any time with `make capture` (Playwright, Chromium, release build).
The numbered shots and the `journey_0`/`a`/`b`/`c` clips are the classic interface (captured with `?ui=classic`);
the `h` shots and `journey_h` clips are the horizon interface (`?ui=horizon`).

| File | What it shows |
| --- | --- |
| `FACTS.md` | Verified facts and numbers, rendered from the data files (`make validate`, then `python -m sunsight.facts` and `python -m sunsight.factsheet`). Not text to paste. |
| `facts_numbers.json` | The miss-grid statistics behind FACTS.md. |
| `shots/0_first_screen.png` | Classic interface, first screen of the default scenario (desktop): the three start choices, and the verdict card with the miss-test line (GO at the target; 15% of the ground within 250 m passes) |
| `shots/1_report_card.png` | Report card, Shackleton–de Gerlache ridge at Shackleton's rim, robotic lander, 14 days from 2028-06-01 |
| `shots/2_sky_panorama.png` | Sky panorama for the same scenario |
| `shots/3_miss_map.png` | Miss test on the default link: Shackleton ridge, crew sortie from 2029-07-24, GO on the target, 14.8% of the ground within 250 m passes (found by `pipeline/sunsight/default_scenario.py`, see FACTS.md) |
| `shots/4_validation.png` | The validation page (full height) |
| `shots/5_phone_first_screen.png` | Classic interface at phone width (375 px): the default scenario's first screen, verdict and miss-test line |
| `shots/5_phone_report_card.png`, `shots/6_phone_story.png` | Phone width (375 px): Athena target report card and the guided story |
| `shots/7_which_sites_work.png` | "Which sites work?": every site with terrain masks ranked for 2027-10-13, crew sortie |
| `shots/8_3d_lit.png` | 3D view, Shackleton ridge at sunrise (illustrative; the numbers come from the horizon engine) |
| `shots/9_3d_night_fill_light.png` | 3D view at night with the faint fill light and its label |
| `clips/journey_0_first_visit.webm` | Classic interface, raw screen recording: the default scenario, then "I have a date: which sites work?" |
| `clips/journey_a_date_to_sites.webm` | Raw screen recording: pick a date, compare three sites |
| `clips/journey_b_site_to_dates.webm` | Raw screen recording: calendar for one site, click a day, its report card opens |
| `clips/journey_c_miss_test.webm` | Raw screen recording: moving the landing pin across the miss-test grid |
| `shots/h1_first_screen.png` | Horizon interface (`?ui=horizon`), default link at 1280×720 after the Sun's load run settles: mission line, horizon with Sun and Earth, GO call, miss line (15% within 250 m), Play |
| `shots/h2_phone_first_screen.png` | Horizon interface, default link at phone width (375×812): the same call, miss line and Play on the first screen |
| `shots/h3_play_mid_stay.png` | Horizon interface after "Play the stay" ran about half the stay and was paused (day 3 of 6.5): the Sun, Earth and clocks have moved |
| `shots/h4_site_picker.png` | Horizon interface, the site picker open: south pole map with numbered sites, grouped list and custom latitude and longitude |
| `shots/h5_date_strip.png` | Horizon interface, the date picker open: a strip of start days, each marked Go or No-go for this site and scenario |
| `shots/h6_game_result.png` | "Land it yourself": one landing made with the keyboard reticle and its result (no-go, power lost at touchdown, 112 m from the target) |
| `shots/h7_game_reveal.png` | "Land it yourself" after three tries and "Show the whole ground": every grid point marked holds or fails, and "Within 250 m, 15% of the ground holds." |
| `shots/h8_rank_sites.png` | Horizon interface, Rank sites view: every site with terrain masks ranked for the default stay (full height) |
| `clips/journey_h1_first_visit.webm` | Raw screen recording, horizon interface: the default link, "Play the stay" to the end, then Malapert Massif picked from the site map |
| `clips/journey_h2_land_it_yourself.webm` | Raw screen recording, horizon interface: three landings in "Land it yourself", "Show the whole ground", then "Try Athena's target" |

The clips are raw 1280×720 WebM captures with no audio, captions or edits. People record the voice-over,
cut the 30-second video and write the project page.
