// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Order of the "which sites work on this date?" ranking: verdict first, then score.
import type { VerdictKind } from '../engine/light';

/** go before marginal before no-go. */
export const VERDICT_ORDER: Record<VerdictKind, number> = { go: 0, marginal: 1, 'no-go': 2 };

const scoreOr = (x: number) => (Number.isFinite(x) ? x : -Infinity);

/**
 * A sorted copy: by verdict (go, marginal, no-go), then by score, highest first. A score that is
 * not a number sorts last within its verdict; equal rows keep their input order.
 */
export function sortRanked<T extends { verdict: VerdictKind; score: number }>(rows: T[]): T[] {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) =>
      VERDICT_ORDER[a.r.verdict] - VERDICT_ORDER[b.r.verdict]
      || scoreOr(b.r.score) - scoreOr(a.r.score)
      || a.i - b.i)
    .map((x) => x.r);
}
