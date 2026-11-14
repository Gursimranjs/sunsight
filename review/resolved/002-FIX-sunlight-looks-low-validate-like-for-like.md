# 002 FIX — Best sunlight looks low: prove the cause before gate 2 (P17, P14)

Filed by the reviewer, Saturday 10:15.

## What was checked

STATUS log for P7: over 2027–2030 the Shackleton region's best point is lit 58% of the time at 2 m and
74% at 10 m; raising the observer from 2 m to 10 m at the rim point lowers the median horizon by 1.85°.

## What is expected, and where it comes from

Published best points near Shackleton are far higher: 92.27% at 2 m and 95.65% at 10 m on the connecting
ridge over 19 years (Gläser et al. 2014, Icarus 243, 78), and roughly 86% at the surface on the rim in
NASA's own maps (Mazarico et al. 2011; PGDA 69). A 20 to 35 point gap is too large to wave through.
You were right not to tune anything. This note says what to measure.

## Likely causes, with my own estimates

Rule of thumb, derived: near the pole the Sun's elevation is about 1.54° × sin(season), so the time
density near the horizon is 1/(π × 1.54°) = 0.21 per degree. Raising the horizon by 0.1° costs about
2 points of sunlight.

1. Grid spacing. The best-lit spots in the papers are tens of metres across. A 500 m grid will almost
   never land on one. This alone can explain most of the gap in "region best".
2. The rim point is not on the local crest. A 1.85° drop in the MEDIAN horizon for 8 m of extra height
   means terrain about 250 m away (8 m / tan 1.85° = 248 m) forms the horizon in at least half of all
   directions. That is a point on a slope below a crest, not on the crest.
3. Different measure. NASA's maps average the visible FRACTION of the Sun's disc. Our headline number
   is the share of time with at least half the disc visible. Compare `mean_sun_fraction`, not `lit_share`.
4. Different near field. The NASA maps were computed node to node on a 60 m to 240 m grid, so their
   nearest terrain sample is one pixel away. Ours starts 10 m away on a bilinear 20 m surface, which
   adds local slope shading at 2 m.
5. Time span. 2027–2030 is not the 18.6-year average.
6. Review note 001's bin rule widens obstacles by up to 0.25°. Expect about 1 to 3 points, not 30.

## Fix: three pieces of work

A. Like-for-like check against PGDA 69 (this is validation check 2; do it first).
   - Read on the PGDA 69 page exactly how the maps were made (observer height, time span, step, Sun model)
     and copy those settings. Record them in DECISIONS.
   - Compute on the reference map's own grid: resample our terrain to the reference pixel size, put the
     observer on the nodes, and build the horizon from other nodes only (no sub-pixel near field).
   - Compare the average visible Sun fraction over 18.6 years, hourly, at 200 random reference pixels in
     the hero region. Pass mark stays as written: mean difference within 2 points, outliers explained.

B. Find the real best-lit points (P14 and the site library).
   - For each named well-lit target, compute masks on a 20 m grid within 300 m of the nominal
     coordinates and keep the point with the highest sunlight at 10 m. Store both positions and the
     offset in metres, and say on the site card that the point was refined and how.
   - Then repeat validation check 4 (Gläser) at the refined connecting-ridge point, computed their way.
     Pass mark stays: within 2 points at both heights, or the gap explained.

C. A sensitivity table on the validation page, for the hero point, one row per change, in points of
   sunlight: near-field start (0.5, 1 and 2 pixels); bin rule (note 001 versus nearest-bin);
   threshold (half disc versus any part); time span (2027–2030 versus 18.6 years); grid (500 m versus
   refined point). This turns the gap into an explained budget instead of a mystery.

## What this means for the product

If B confirms that sunlight falls from about 90% to about 60% within a few hundred metres, that is the
strongest evidence for the miss test we could ask for. Put that number, with its source run, in
`docs/submission/FACTS.md`.

## Do not

Do not change the bin rule, the near-field start or the lit threshold in the shipped engine to move the
headline number. If A fails its pass mark after the like-for-like recipe, write the measured gap and the
sensitivity table on the validation page and add it under "Needs a human".

## Resolution

Resolved in 741a956: A, B and C done as asked.

- A: like-for-like recipe in `validate.check_pgda` (DECISIONS #34). Sunlight: mean −2.32 points (fail), spread 3.70; −1.10 under the label's "any fraction" reading; the bin rule moves it by −0.13. Earth: +0.23 (pass). On the page and under "Needs a human".
- B: `refine_point` on a 20 m grid within 300 m of the LROC ridge/rim point: best at 10 m is 170 m away, 86.0% (10 m) / 84.3% (2 m) vs 85.7% / 73.5% at the cited point; as low as 32.0% within 300 m. Stored as `refined` in sites.json. Gläser at the refined ridge point (25 m search): −5.95 / −5.97 half-disc, −1.54 / −2.03 any part.
- C: `validation/sensitivity.csv` at the best ridge point: near-field start 0.0, bin rule +0.19 (nearest-bin) / +0.37 (none), any-part threshold +4.41, 2027–2030 span +0.16, coarse grid −15.73 points.
- Shipped engine unchanged.
