# 007 NOTE — Real-mission sources spot-checked; two cautions before publishing the check

Filed by the reviewer, Sunday 11:45. Short, because the freeze is at 14:00. Note 003 parts A, C
and D come first; do this only if they are merged and green.

## Checked

I fetched two of the cited pages in `pipeline/data/real_missions.json` myself:

- Firefly, "completes 14 days of surface operations": confirms just over 5 hours into the lunar
  night and final data around 6:15 pm CDT on 16 March 2025 (23:15 UTC). Matches.
- NASA, LRO images of Odysseus: confirms landing at 6:24 pm EST on 22 February 2024 (23:24 UTC) and
  80.13° S, 1.44° E, 2,579 m. Matches.

The UTC conversions in the file are right (CST −6, CDT −5 from 9 March 2025, EST −5, IST +5:30).

## Caution 1 — say which "sunset" you compare

At 18.6° N the Sun's disc takes about an hour to cross the horizon. Firefly does not say whether
"lunar night" starts when the disc is half gone or fully gone. Report both of our times (half the
disc hidden, and the last of the disc hidden) beside "final data minus just over 5 hours", and say
the mission's definition is not stated. Do not pick the one that fits better.

## Caution 2 — polar sites on a smooth horizon

Odysseus (80.13° S) and Athena are outside the terrain regions, and Odysseus sits only about 4 km
inside the edge of the 80° S maps. With a smooth horizon a polar sunset can be wrong by a day or
more. Either compute a terrain horizon for those two points (the Athena miss grid already has one;
for Odysseus the 75° S 30 m map covers the north side), or show the row with a plain warning that
it uses a smooth horizon and is not a fair test. Blue Ghost and Chandrayaan-3 are far from the
pole, so the smooth horizon is a reasonable first check there.

## Keep

No pass mark set after seeing the numbers: show "reported" beside "SunSight" with the source link.

Resolved in the r004/real-missions merge: caution 1, both sunsets (half the disc and the last of it) are reported beside the mission statement, with "the mission does not say which sunset it means"; caution 2, Odysseus keeps the smooth horizon and is marked "not a fair test" (no terrain horizon computed for it), Athena uses its 10 m terrain horizon from the miss grid; every smooth-horizon sunset row also says how many hours 1 deg of real horizon would move it. No pass mark set.
