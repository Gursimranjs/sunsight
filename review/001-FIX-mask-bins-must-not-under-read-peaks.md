# 001 FIX — Horizon mask bins must never under-read a peak (do this in P6)

Filed by the reviewer, Saturday 09:40.

## What was checked

`docs/DECISIONS.md` #16 and `light.horizon_at`. Bin k is "the terrain elevation at azimuth k × 0.25°",
`horizon_at` interpolates linearly between bin centres, and the stated plan for P6 is to fill bin k
from terrain in [k × 0.25° − 0.125°, k × 0.25° + 0.125°).

## What is expected, and where it comes from

- `docs/BUILD_PLAN.md`, P6 "done when": the far spike test.
- `docs/PROJECT_PLAN.md`, Quality checks: "a one-pixel spike 100 km away appears in the mask at the
  right direction and height, however the grid is shifted".
- `docs/PROJECT_PLAN.md`, Smart choices: "Never lose a peak when terrain is coarsened".

So the horizon read back at a peak's own azimuth must not be lower than the peak.

## What was found (by reasoning; P6 is not written yet)

With nearest-centre filling plus linear read-back, a narrow peak of elevation E over background B at
azimuth k × 0.25° + 0.12° lands only in bin k. `horizon_at` at the peak's own azimuth then returns
0.52·E + 0.48·B. The peak is under-read by almost half its height above the background.
Under-reading the horizon overstates sunlight and Earth contact, which is the unsafe direction.

## Fix

Keep `horizon_at` exactly as it is (the linear read-back is the BUILD_PLAN contract). In P6, define

    mask[k] = highest terrain elevation in the azimuth window [k × 0.25° − 0.25°, k × 0.25° + 0.25°]

That window is the support of bin k's interpolation weight. For any azimuth a between centres k and
k+1, both mask[k] and mask[k+1] are then at least the true horizon at a, so the interpolated value is
too. The cost is that obstacles widen by up to 0.25°, which biases sunlight slightly low: the safe
direction. Update DECISIONS #16 to say this.

## Tests to add in P6

1. Spike test. One-pixel spike 100 km away, placed at nine sub-bin azimuth offsets from −0.125° to
   +0.125°. For every offset assert `horizon_at(mask, spike_az) >= spike_el − 0.001°` (0.001° is one
   int16 unit), and assert that bins more than 0.5° plus the pixel's angular width away still hold
   the background value.
2. Property test. Random synthetic terrain; brute-force the true horizon at 0.01° steps; assert
   `horizon_at(mask, a) >= true(a) − 0.001°` for every a.
3. Measure the bias. On the hero site, compare the lit share from this rule with a 0.1° bin run (the
   sensitivity run already planned) and report the difference on the validation page.

## If you disagree

A step (nearest-bin) read-back with [−0.125°, +0.125°) filling also never under-reads, but it changes
the `horizon_at` contract in both languages and the shared vectors. That needs the owner's approval,
so write your reasons below and leave this note here rather than switching on your own.
