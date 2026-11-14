// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Geometry of the sky panorama (pure, unit-tested): scales, terrain outline, tracks and true-size discs.

export interface PanoBox { width_px: number; height_px: number; padL: number; padR: number; padT: number; padB: number }

export interface PanoScale {
  az0_deg: number;
  az1_deg: number;
  el0_deg: number;
  el1_deg: number;
  px_per_deg_x: number;
  px_per_deg_y: number;
  /** Vertical exaggeration: px_per_deg_y / px_per_deg_x. */
  exaggeration: number;
  x(az_deg: number): number;
  y(el_deg: number): number;
  box: PanoBox;
}

function unwrapNear(az_deg: number, centre_deg: number): number {
  let a = az_deg;
  while (a - centre_deg > 180) a -= 360;
  while (a - centre_deg < -180) a += 360;
  return a;
}

function makeScale(box: PanoBox, az0: number, az1: number, el0: number, el1: number): PanoScale {
  const plotW = box.width_px - box.padL - box.padR;
  const plotH = box.height_px - box.padT - box.padB;
  const px_per_deg_x = plotW / (az1 - az0);
  const px_per_deg_y = plotH / (el1 - el0);
  const mid = (az0 + az1) / 2;
  return {
    az0_deg: az0, az1_deg: az1, el0_deg: el0, el1_deg: el1, px_per_deg_x, px_per_deg_y,
    exaggeration: px_per_deg_y / px_per_deg_x,
    x: (az) => box.padL + (unwrapNear(az, mid) - az0) * px_per_deg_x,
    y: (el) => box.padT + (el1 - el) * px_per_deg_y,
    box,
  };
}

/** Full 360° strip, north at the left edge; the elevation range covers the terrain and the tracks. */
export function fullScale(box: PanoBox, el_values_deg: number[], min_span_deg = 4): PanoScale {
  let lo = Infinity, hi = -Infinity;
  for (const v of el_values_deg) if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  if (!Number.isFinite(lo)) { lo = -1; hi = 3; }
  lo = Math.floor(Math.max(-90, lo - 0.5));
  hi = Math.ceil(Math.min(90, hi + 0.5));
  if (hi - lo < min_span_deg) { const c = (hi + lo) / 2; lo = Math.floor(c - min_span_deg / 2); hi = Math.ceil(c + min_span_deg / 2); }
  return makeScale(box, 0, 360, lo, hi);
}

/** Close-up around a direction with equal scales on both axes (no exaggeration). */
export function closeScale(box: PanoBox, centre_az_deg: number, centre_el_deg: number, half_span_az_deg: number): PanoScale {
  const plotW = box.width_px - box.padL - box.padR;
  const plotH = box.height_px - box.padT - box.padB;
  const ppd = plotW / (2 * half_span_az_deg);
  const half_el = plotH / ppd / 2;
  return makeScale(box, centre_az_deg - half_span_az_deg, centre_az_deg + half_span_az_deg, centre_el_deg - half_el, centre_el_deg + half_el);
}

export interface Disc { cx: number; cy: number; rx: number; ry: number }

/**
 * A body's disc on the chart. Radii follow each axis' own scale, so with vertical exaggeration the
 * disc is drawn true to the vertical scale (ry = r_deg x px_per_deg_y): exactly how much of it the
 * terrain hides is what the chart shows. In the close-up both scales are equal, so rx == ry.
 */
export function disc(s: PanoScale, az_deg: number, el_deg: number, r_deg: number): Disc {
  return { cx: s.x(az_deg), cy: s.y(el_deg), rx: r_deg * s.px_per_deg_x, ry: r_deg * s.px_per_deg_y };
}

/**
 * Terrain outline as an SVG path closed along the bottom. Bins are merged per pixel column by
 * taking the maximum (never an average), as the horizon rules require.
 */
export function terrainPath(s: PanoScale, mask: ArrayLike<number>): string {
  const n = mask.length;
  const step = 360 / n;
  const bottom = s.box.height_px - s.box.padB;
  const pts: [number, number][] = [];
  let colX = -1, colMax = -Infinity;
  const lo = s.az0_deg, hi = s.az1_deg;
  // Walk azimuth across the visible range in bin steps.
  const k0 = Math.floor(lo / step), k1 = Math.ceil(hi / step);
  for (let k = k0; k <= k1; k++) {
    const az = Math.max(lo, Math.min(hi, k * step));
    const v = mask[((k % n) + n) % n];
    const px = Math.round(s.box.padL + (az - lo) * s.px_per_deg_x);
    if (px !== colX) {
      if (colX >= 0) pts.push([colX, s.y(colMax)]);
      colX = px; colMax = v;
    } else colMax = Math.max(colMax, v);
  }
  if (colX >= 0) pts.push([colX, s.y(colMax)]);
  const top = (y: number) => Math.min(bottom, y).toFixed(1);
  let d = `M${pts[0][0]},${bottom}`;
  for (const [x, y] of pts) d += `L${x},${top(y)}`;
  d += `L${pts[pts.length - 1][0]},${bottom}Z`;
  return d;
}

/** A track as SVG path segments, broken where it wraps across the chart's edge. */
export function trackPath(s: PanoScale, az_deg: ArrayLike<number>, el_deg: ArrayLike<number>): string {
  let d = '';
  let prevX = NaN;
  const plotW = s.box.width_px - s.box.padL - s.box.padR;
  for (let i = 0; i < az_deg.length; i++) {
    const x = s.x(az_deg[i]);
    const y = s.y(el_deg[i]);
    const inside = x >= s.box.padL - 1 && x <= s.box.padL + plotW + 1;
    if (!inside) { prevX = NaN; continue; }
    const jump = !Number.isFinite(prevX) || Math.abs(x - prevX) > plotW / 2;
    d += `${jump ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    prevX = x;
  }
  return d;
}

/** Nice tick step for a span, aiming for about `target` ticks. */
export function niceStep(span: number, target: number): number {
  const raw = span / Math.max(1, target);
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

/** Circular mean of azimuths, degrees 0..360. */
export function meanAz(az_deg: ArrayLike<number>): number {
  let x = 0, y = 0;
  for (let i = 0; i < az_deg.length; i++) { x += Math.sin((az_deg[i] * Math.PI) / 180); y += Math.cos((az_deg[i] * Math.PI) / 180); }
  const a = (Math.atan2(x, y) * 180) / Math.PI;
  return a < 0 ? a + 360 : a;
}
