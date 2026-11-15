// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Note 011 #8 and the capture finding: the Sun and Earth labels stay in the sky (one raised with a leader
// line when they would collide) and inside the drawing near the left and right edges.
import { describe, expect, it } from 'vitest';
import { clampLabelX, labelRect, LABEL_PX, placeLabels } from '../../src/horizon/HorizonHero';

const overlap = (a: ReturnType<typeof labelRect>, b: ReturnType<typeof labelRect>) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
/** Top of a disc's ring (RING_PX 7 px plus the drawn radius), px. */
const ringTop = (d: { cy: number; ry: number }) => d.cy - 7 - Math.max(d.ry, 2);

describe('Sun and Earth labels stay in the sky (note 011 #8)', () => {
  // The disc positions of the default link at 375 px wide, as read off the built page for note 010 #6.
  const sun = { cx: 195.1, cy: 88.5, ry: 2.33 };
  const earth = { cx: 174.8, cy: 89.2, ry: 8.6 };
  const W = 375;

  it('raises the lower disc\'s label above the other, with a leader line, when they would collide', () => {
    const p = placeLabels(sun, earth, W);
    expect(p.sun.leader).toBeNull();
    expect(p.earth.leader).not.toBeNull();
    // Both labels are above their own discs (never below, where the terrain is) and do not overlap.
    expect(labelRect(p.sun.x, p.sun.y, 'Sun').y1).toBeLessThan(ringTop(sun));
    expect(labelRect(p.earth.x, p.earth.y, 'Earth').y1).toBeLessThan(ringTop(earth));
    expect(overlap(labelRect(p.sun.x, p.sun.y, 'Sun'), labelRect(p.earth.x, p.earth.y, 'Earth'))).toBe(false);
    // The leader runs from the Earth disc up to the bottom of its label.
    const l = p.earth.leader!;
    expect(l.y1).toBeGreaterThan(l.y2);
    expect(l.y2).toBeCloseTo(labelRect(p.earth.x, p.earth.y, 'Earth').y1, 6);
  });

  it('leaves both labels on their discs when they are apart', () => {
    const p = placeLabels(sun, { ...earth, cx: 40 }, W);
    expect(p.sun.leader).toBeNull();
    expect(p.earth.leader).toBeNull();
    expect(p.earth.x).toBeCloseTo(40, 6);
  });

  it('puts the label beside the other one when there is no room above (top of the drawing)', () => {
    const p = placeLabels({ ...sun, cy: 24 }, { ...earth, cy: 30 }, W);
    const a = labelRect(p.sun.x, p.sun.y, 'Sun'), b = labelRect(p.earth.x, p.earth.y, 'Earth');
    expect(overlap(a, b)).toBe(false);
    for (const r of [a, b]) { expect(r.y0).toBeGreaterThanOrEqual(0); expect(r.x0).toBeGreaterThanOrEqual(0); expect(r.x1).toBeLessThanOrEqual(W); }
    expect(p.earth.leader).not.toBeNull();
  });

  it('does not move a label for a body that is under the terrain', () => {
    const p = placeLabels(sun, earth, W, { sun: false, earth: true });
    expect(p.sun.leader).toBeNull();
    expect(p.earth.leader).toBeNull();
  });
});

describe('labels near the left and right edges stay whole (capture: "arth")', () => {
  it('moves a label in so its whole box is inside the drawing', () => {
    for (const [cx, W] of [[1, 375], [0, 1280], [374.5, 375], [1279, 1280]]) {
      for (const text of ['Sun', 'Earth']) {
        const x = clampLabelX(cx, text, W);
        const r = labelRect(x, 50, text);
        expect(r.x0).toBeGreaterThanOrEqual(0);
        expect(r.x1).toBeLessThanOrEqual(W);
      }
    }
  });
  it('placeLabels keeps an Earth label at azimuth 0 inside the drawing', () => {
    const p = placeLabels({ cx: 200, cy: 90, ry: 2 }, { cx: 0.5, cy: 80, ry: 8 }, 375);
    expect(labelRect(p.earth.x, p.earth.y, 'Earth').x0).toBeGreaterThanOrEqual(0);
    expect(p.earth.y).toBeGreaterThanOrEqual(LABEL_PX);
  });
});
