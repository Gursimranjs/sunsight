# 006 NOTE — Independent fact-checks passed; two leads for notes 003 and the validation text

Filed by the reviewer, Saturday 13:40, while the build agent was idle. No code is wrong here.

## Checked against the sources and confirmed

- `docs/submission/FACTS.md` validation table against `web/public/data/validation/summary.json`:
  all eight results and statuses match.
- Athena story against its sources, fetched by the reviewer on Saturday:
  - LROC image 1401: intended site (-84.78°, 29.13°E), 160 km from the south pole, landing planned
    for 6 March 2025. Matches.
  - LROC image 1408: 84.7906° S, 29.1957° E; "on its side within a 20-meter diameter crater".
    Matches.
  - SpacePolicyOnline: 250 m from the target per Intuitive Machines, more than 400 m per NASA;
    NASA gave the end time; landing about 12:30 pm ET on 6 March, end 1:15 am ET on 7 March
    (12 h 45 min; the article's lead says about 13 hours); the crater blocked sunlight and the
    lander was on its side per the company. All match the story text.
- `sites.json` entries for Athena (both), Odysseus, Blue Ghost, Apollo 15 and Chandrayaan-3 carry a
  source quote that contains the coordinates used.
- `SI_USE.md` and the README "AI use" section are truthful and complete, including the three
  merge commits without a trailer. No NASA logo or insignia files are in `web/`.

## Lead 1 — the default scenario for note 003 already exists

`docs/submission/shots/3_miss_map.png` shows exactly what note 003 asks for: Shackleton ridge at
Shackleton's rim, start 2027-10-13, crew sortie (6.5 days): GO at the target, 76.9% within 100 m,
32.1% within 250 m, 24.0% within 500 m. Use it as the site's default link unless the search script
finds a clearer case. Still record how it was found in FACTS.md.

## Lead 2 — the honest headline is "where a miss matters and where it does not"

FACTS.md shows that around Athena's own target the sunlight is nearly uniform at map scale
(43.1 to 44.5% within 250 m), while on the Shackleton ridge the same miss spans 22.7 to 85.1%.
Lead the start screen and the tour with that contrast. It is true, it is ours, and it explains why
a planner needs the map rather than a rule of thumb.

## Lead 3 — a possible reading of the Gläser gap (state as possible, not proven)

Your own sensitivity table gives +4.41 points for "any part of the disc" and +3.68 points for a
100 km search limit. If the 2014 study used a nearer horizon limit than our 300 km, our lower figure
would be expected, and ours would be the more complete one. The paper's horizon range is not in
its abstract, so add one sentence to the validation text: "the horizon search distance used in the
2014 study is not stated in its abstract; a 100 km limit would raise our figure by 3.7 points".
Keep the status "partial".

Resolved in adbe336 and 342823e. Lead 1: the search script (note 003 B) found a clearer case than shots/3 (2029-07-24, 14.8% within 250 m vs 32.1%), and that is the default link. Lead 2: the start strip leads with "A miss of a few hundred metres can matter a lot on the Shackleton ridge and hardly at all around Athena's target; the Miss test shows where." (no numbers). Lead 3: the sentence is in the Gläser explanation, computed from the sensitivity row, stated as possible, not proven; status stays partial.
