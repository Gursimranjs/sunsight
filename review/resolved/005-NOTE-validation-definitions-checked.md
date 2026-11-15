# 005 NOTE — What the open sources say about the two disputed definitions

Filed by the reviewer, Saturday 10:55. For the validation page text; no code change needed.

## PGDA 69 (sunlight maps)

Read at https://pgda.gsfc.nasa.gov/products/69 on Saturday morning:

- The page calls the product the average solar illumination over a lunar nutation cycle, computed
  at hourly steps over 18.6 years, with the Sun treated as a finite disc.
- It does not say whether the value is the average visible fraction of the disc or the share of
  time any part is visible. The "any part of its disc" wording appears only for Earth.
- It gives no observer height for the Sun maps and links no label file.

So your two readings (−2.32 and −1.10 points) are both defensible and the page should keep showing
both, as it does. Keeping the status as a miss under the stricter reading is correct.

## Gläser et al. 2014 (connecting ridge)

- The abstract (ADS) gives 92.27% at 2 m and 95.65% at 10 m over 19 years on a 20 m model, and
  longest darkness of 3 to 5 days. It does not define "illuminated".
- A companion conference abstract from the same group (Marco Figuera, Gläser et al., EPSC 2014-476)
  describes the method as deriving the visible fraction of the solar disc, a "degree of
  illumination". It still does not state the threshold used for the percentages.

So the definition cannot be settled from open sources. Keep both rows (half disc: −5.95 / −5.97;
any part: −1.54 / −2.03) and keep the status "partial". A person with access to the paper
(Icarus 243, 78, section on illumination modelling) should confirm; this stays under
"Needs a human".

## Eclipse check

Your diagnosis is right: NASA's eclipse predictions enlarge Earth's shadow to allow for the
atmosphere, and a bare-sphere model ends geometric totality about a minute early at the limb.
The plan's pass mark ("0 at every site and minute") did not allow for that, which is a flaw in
the plan, not in your code. Keep the result as reported until the owner decides whether to
restate the mark as agreement within two minutes. Do not change it yourself.

Resolved in 342823e: no code change needed. The validation page keeps both readings for PGDA sunlight (−2.32 / −1.10) and Gläser (half disc / any part), statuses unchanged (fail, partial); the eclipse pass mark stays as written and the owner decision ("0 at every minute" vs "agreement within two minutes") is under "Needs a human" in STATUS.md, item 4.
