<!-- SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md. -->
# Material for the people making the demo and the project page

Everything here comes from the real app with the shipped data. Nothing is edited, retouched or AI-generated.
Recreate it any time with `make capture` (Playwright, Chromium, release build).

| File | What it shows |
| --- | --- |
| `FACTS.md` | Verified facts and numbers, rendered from the data files (`make validate`, then `python -m sunsight.facts` and `python -m sunsight.factsheet`). Not text to paste. |
| `facts_numbers.json` | The miss-grid statistics behind FACTS.md. |
| `shots/0_first_screen.png` | The first screen of the default link (desktop): the three start choices, and the verdict card with the miss-test line (GO at the target; 15% of the ground within 250 m passes) |
| `shots/1_report_card.png` | Report card, Shackleton–de Gerlache ridge at Shackleton's rim, robotic lander, 14 days from 2028-06-01 |
| `shots/2_sky_panorama.png` | Sky panorama for the same scenario |
| `shots/3_miss_map.png` | Miss test on the default link: Shackleton ridge, crew sortie from 2029-07-24, GO on the target, 14.8% of the ground within 250 m passes (found by `pipeline/sunsight/default_scenario.py`, see FACTS.md) |
| `shots/4_validation.png` | The validation page (full height) |
| `shots/5_phone_first_screen.png` | Phone width (375 px): the default link's first screen, verdict and miss-test line |
| `shots/5_phone_report_card.png`, `shots/6_phone_story.png` | Phone width (375 px): Athena target report card and the guided story |
| `shots/7_which_sites_work.png` | "Which sites work?": every site with terrain masks ranked for 2027-10-13, crew sortie |
| `shots/8_3d_lit.png` | 3D view, Shackleton ridge at sunrise (illustrative; the numbers come from the horizon engine) |
| `shots/9_3d_night_fill_light.png` | 3D view at night with the faint fill light and its label |
| `clips/journey_0_first_visit.webm` | Raw screen recording: the default link, then "I have a date: which sites work?" |
| `clips/journey_a_date_to_sites.webm` | Raw screen recording: pick a date, compare three sites |
| `clips/journey_b_site_to_dates.webm` | Raw screen recording: calendar for one site, click a day, its report card opens |
| `clips/journey_c_miss_test.webm` | Raw screen recording: moving the landing pin across the miss-test grid |

The clips are raw 1280×720 WebM captures with no audio, captions or edits. People record the voice-over,
cut the 30-second video and write the project page.
