# SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
"""Reference sunlight and Earth-contact maths (function contracts in docs/BUILD_PLAN.md).

This module is the reference. web/src/engine/ is a line-by-line TypeScript port, and the shared
vectors in tests/vectors/ hold both to the same answers within 1e-6. Keep the order of operations
identical in both languages. Angles are in degrees and distances in km unless a name says otherwise.

Exact definitions that the build plan leaves open are recorded in docs/DECISIONS.md and here:

- Mask bin k holds the terrain elevation for the azimuth k * 0.25 degrees (bin 0 = local north,
  clockwise). horizon_at() interpolates linearly between bin centres and wraps at 360 degrees.
- interp() is 4-point Lagrange (cubic) interpolation in time over rows i-1, i, i+1, i+2.
- A moment is "lit" when sun_fraction >= rules.lit_threshold (0.5 by default).
- Contact needs at least one station that is not blocked. Grazing counts as contact and is flagged.
- events(): bisection on [t_a, t_b] until t_b - t_a <= 60 s; the event time is the midpoint.
"""

from __future__ import annotations

import math
from collections.abc import Callable, Sequence
from dataclasses import asdict, dataclass, field

import numpy as np

from .contracts import BIN_COUNT, EARTH_RADIUS_KM, MOON_RADIUS_KM, SUN_RADIUS_KM

D2R = math.pi / 180.0
R2D = 180.0 / math.pi
SAMPLE_STEP_S = 600.0
EVENT_RESOLUTION_S = 60.0
STATION_NAMES = ("goldstone", "madrid", "canberra")
CONTACT_RANK = {"blocked": 0, "grazing": 1, "clear": 2}


# ---------------------------------------------------------------------------------------------
# Geometry
# ---------------------------------------------------------------------------------------------


def site_vector(lat_deg: float, lon_deg: float, h_m: float) -> tuple[float, float, float]:
    r_km = MOON_RADIUS_KM + h_m / 1000.0
    la, lo = lat_deg * D2R, lon_deg * D2R
    return (r_km * math.cos(la) * math.cos(lo), r_km * math.cos(la) * math.sin(lo), r_km * math.sin(la))


@dataclass(frozen=True)
class Frame:
    east: tuple[float, float, float]
    north: tuple[float, float, float]
    up: tuple[float, float, float]


def local_frame(lat_deg: float, lon_deg: float) -> Frame:
    la, lo = lat_deg * D2R, lon_deg * D2R
    return Frame(
        east=(-math.sin(lo), math.cos(lo), 0.0),
        north=(-math.sin(la) * math.cos(lo), -math.sin(la) * math.sin(lo), math.cos(la)),
        up=(math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)),
    )


def _dot(a: Sequence[float], b: Sequence[float]) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def az_el(target: Sequence[float], site: Sequence[float], frame: Frame) -> tuple[float, float, float]:
    """Azimuth (0..360, clockwise from local north), elevation and distance of target from site."""
    d = (target[0] - site[0], target[1] - site[1], target[2] - site[2])
    n = math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2])
    s = _dot(d, frame.up) / n
    el_deg = math.asin(max(-1.0, min(1.0, s))) * R2D
    az_deg = math.atan2(_dot(d, frame.east), _dot(d, frame.north)) * R2D
    if az_deg < 0.0:
        az_deg += 360.0
    return az_deg, el_deg, n


def angular_radius(radius_km: float, dist_km: float) -> float:
    return math.asin(min(1.0, radius_km / dist_km)) * R2D


def smooth_horizon_deg(h_m: float) -> float:
    """Horizon elevation on a perfectly smooth Moon for an observer h_m above the surface (negative)."""
    return -math.acos(MOON_RADIUS_KM / (MOON_RADIUS_KM + h_m / 1000.0)) * R2D


def flat_mask(value_deg: float) -> list[float]:
    return [value_deg] * BIN_COUNT


# ---------------------------------------------------------------------------------------------
# Table interpolation
# ---------------------------------------------------------------------------------------------


def interp(table: np.ndarray, t_s: float, step_s: float = 3600.0) -> list[float]:
    """Row of `table` at t_s seconds after row 0, by 4-point Lagrange interpolation.

    Rows i-1..i+2 are used with i = floor(t/step), clamped to [1, n-3] so the stencil stays inside.
    """
    n = table.shape[0]
    x = t_s / step_s
    i = int(math.floor(x))
    i = max(1, min(n - 3, i))
    u = x - i
    w0 = -u * (u - 1.0) * (u - 2.0) / 6.0
    w1 = (u + 1.0) * (u - 1.0) * (u - 2.0) / 2.0
    w2 = -(u + 1.0) * u * (u - 2.0) / 2.0
    w3 = (u + 1.0) * u * (u - 1.0) / 6.0
    r0, r1, r2, r3 = table[i - 1], table[i], table[i + 1], table[i + 2]
    return [
        w0 * float(r0[c]) + w1 * float(r1[c]) + w2 * float(r2[c]) + w3 * float(r3[c])
        for c in range(table.shape[1])
    ]


# ---------------------------------------------------------------------------------------------
# Horizon and light
# ---------------------------------------------------------------------------------------------


def horizon_at(mask: Sequence[float], az_deg: float) -> float:
    n = len(mask)
    x = (az_deg % 360.0) * n / 360.0
    k0 = int(math.floor(x))
    f = x - k0
    k0 %= n
    k1 = (k0 + 1) % n
    return (1.0 - f) * mask[k0] + f * mask[k1]


def overlap(lo: float, hi: float, a: float, b: float) -> float:
    return max(0.0, min(hi, b) - max(lo, a))


def wrap180(x_deg: float) -> float:
    return (x_deg + 180.0) % 360.0 - 180.0


def sun_fraction(
    mask: Sequence[float],
    az_s: float,
    el_s: float,
    r_sun: float,
    az_e: float,
    el_e: float,
    r_earth: float,
) -> float:
    """Share of the Sun's disc above the terrain and not behind Earth (the listing in BUILD_PLAN.md)."""
    cos_el = max(math.cos(el_s * D2R), 1e-9)
    delta = wrap180(az_e - az_s) * cos_el
    visible = 0.0
    total = 0.0
    for i in range(15):
        x = r_sun * (2.0 * (i + 0.5) / 15.0 - 1.0)
        c = math.sqrt(max(0.0, r_sun * r_sun - x * x))
        h = horizon_at(mask, az_s + x / cos_el)
        lo = max(el_s - c, h)
        hi = el_s + c
        lit = max(0.0, hi - lo)
        if abs(x - delta) < r_earth:
            ce = math.sqrt(r_earth * r_earth - (x - delta) * (x - delta))
            lit = lit - overlap(lo, hi, el_e - ce, el_e + ce)
        visible += max(0.0, lit)
        total += 2.0 * c
    return visible / total


def disc_fraction(mask: Sequence[float], az: float, el: float, r: float) -> float:
    """Share of a disc above the terrain, with no occluder (used for Earth's disc)."""
    cos_el = max(math.cos(el * D2R), 1e-9)
    visible = 0.0
    total = 0.0
    for i in range(15):
        x = r * (2.0 * (i + 0.5) / 15.0 - 1.0)
        c = math.sqrt(max(0.0, r * r - x * x))
        h = horizon_at(mask, az + x / cos_el)
        visible += max(0.0, el + c - max(el - c, h))
        total += 2.0 * c
    return visible / total


def station_contact(
    station_el_deg: float,
    terrain_el_deg: float,
    moon_el_at_station_deg: float,
    min_moon_el_deg: float = 10.0,
    grazing_deg: float = 2.0,
) -> str:
    """'blocked' if the station is at or below the terrain or the Moon is under the limit at the
    station; 'grazing' if the station is less than grazing_deg above the terrain; else 'clear'."""
    if station_el_deg <= terrain_el_deg or moon_el_at_station_deg < min_moon_el_deg:
        return "blocked"
    if station_el_deg - terrain_el_deg < grazing_deg:
        return "grazing"
    return "clear"


# ---------------------------------------------------------------------------------------------
# Rules, sampling, events, metrics and verdicts
# ---------------------------------------------------------------------------------------------


@dataclass
class Rules:
    stay_s: float = 14 * 86400.0
    observer_height_m: float = 2.0
    max_dark_s: float = 2 * 3600.0
    max_gap_s: float = 12 * 3600.0
    lit_threshold: float = 0.5
    min_moon_el_deg: float = 10.0
    grazing_deg: float = 2.0
    contact_mode: str = "stations"  # or "earth": any part of Earth's disc in view
    load_w: float = 100.0
    depth_of_discharge: float = 0.8
    efficiency: float = 0.9
    weights: tuple[float, float, float] = (0.5, 0.3, 0.2)
    thin_margin: float = 0.75  # within 75% of a limit counts as thin


PRESETS: dict[str, Rules] = {
    "robotic": Rules(
        stay_s=14 * 86400.0, observer_height_m=2.0, max_dark_s=2 * 3600.0, max_gap_s=12 * 3600.0
    ),
    "crew": Rules(stay_s=6.5 * 86400.0, observer_height_m=10.0, max_dark_s=0.0, max_gap_s=2 * 3600.0),
    "long": Rules(
        stay_s=30 * 86400.0, observer_height_m=10.0, max_dark_s=100 * 3600.0, max_gap_s=24 * 3600.0
    ),
}


@dataclass
class Sample:
    t_s: float
    sun_az_deg: float
    sun_el_deg: float
    sun_r_deg: float
    earth_az_deg: float
    earth_el_deg: float
    earth_r_deg: float
    sun_frac: float
    earth_frac: float
    contact: str  # best station grade, or Earth-in-view grade in "earth" mode
    stations: dict[str, str] = field(default_factory=dict)


def sample_at(
    table: np.ndarray,
    t_s: float,
    site: Sequence[float],
    frame: Frame,
    mask: Sequence[float],
    rules: Rules,
) -> Sample:
    row = interp(table, t_s)
    sun_az, sun_el, sun_d = az_el(row[0:3], site, frame)
    e_az, e_el, e_d = az_el(row[3:6], site, frame)
    r_s = angular_radius(SUN_RADIUS_KM, sun_d)
    r_e = angular_radius(EARTH_RADIUS_KM, e_d)
    sf = sun_fraction(mask, sun_az, sun_el, r_s, e_az, e_el, r_e)
    ef = disc_fraction(mask, e_az, e_el, r_e)
    stations: dict[str, str] = {}
    best = "blocked"
    for k, name in enumerate(STATION_NAMES):
        s_az, s_el, _ = az_el(row[6 + 3 * k : 9 + 3 * k], site, frame)
        g = station_contact(
            s_el, horizon_at(mask, s_az), row[15 + k], rules.min_moon_el_deg, rules.grazing_deg
        )
        stations[name] = g
        if CONTACT_RANK[g] > CONTACT_RANK[best]:
            best = g
    if rules.contact_mode == "earth":
        best = "clear" if ef > 0.0 else "blocked"
    return Sample(t_s, sun_az, sun_el, r_s, e_az, e_el, r_e, sf, ef, best, stations)


def bisect_event(f: Callable[[float], bool], t_a: float, t_b: float, state_a: bool) -> float:
    """Time where f changes from state_a, refined until the bracket is at most 60 s wide."""
    while t_b - t_a > EVENT_RESOLUTION_S:
        t_m = 0.5 * (t_a + t_b)
        if f(t_m) == state_a:
            t_a = t_m
        else:
            t_b = t_m
    return 0.5 * (t_a + t_b)


def events(times_s: Sequence[float], states: Sequence[bool], f: Callable[[float], bool]) -> list[dict]:
    """Every change of state in a sampled series, refined by bisection. Each event: t_s, to (new state)."""
    out = []
    for k in range(1, len(states)):
        if states[k] != states[k - 1]:
            t = bisect_event(f, times_s[k - 1], times_s[k], states[k - 1])
            out.append({"t_s": t, "to": bool(states[k])})
    return out


def spells(
    start_s: float, end_s: float, state0: bool, evs: list[dict], want: bool
) -> list[tuple[float, float]]:
    """Intervals inside [start, end] where the state equals `want`."""
    out = []
    cur = state0
    t0 = start_s
    for e in evs:
        if cur == want:
            out.append((t0, e["t_s"]))
        cur = e["to"]
        t0 = e["t_s"]
    if cur == want:
        out.append((t0, end_s))
    return out


def window_metrics(
    table: np.ndarray,
    lat_deg: float,
    lon_deg: float,
    h_m: float,
    mask: Sequence[float],
    start_s: float,
    end_s: float,
    rules: Rules,
) -> dict:
    """Metrics for one site over [start_s, end_s] (seconds after the table's first row).

    The site's ground height is h_m; the observer stands rules.observer_height_m above it.
    """
    site = site_vector(lat_deg, lon_deg, h_m + rules.observer_height_m)
    frame = local_frame(lat_deg, lon_deg)
    n = int(math.floor((end_s - start_s) / SAMPLE_STEP_S)) + 1
    times = [start_s + k * SAMPLE_STEP_S for k in range(n)]
    samples = [sample_at(table, t, site, frame, mask, rules) for t in times]

    def is_lit(t: float) -> bool:
        return sample_at(table, t, site, frame, mask, rules).sun_frac >= rules.lit_threshold

    def has_contact(t: float) -> bool:
        return sample_at(table, t, site, frame, mask, rules).contact != "blocked"

    def earth_up(t: float) -> bool:
        return sample_at(table, t, site, frame, mask, rules).earth_frac > 0.0

    lit = [s.sun_frac >= rules.lit_threshold for s in samples]
    con = [s.contact != "blocked" for s in samples]
    eup = [s.earth_frac > 0.0 for s in samples]
    lit_ev = events(times, lit, is_lit)
    con_ev = events(times, con, has_contact)
    eup_ev = events(times, eup, earth_up)
    t_end = times[-1]

    dark = spells(start_s, t_end, lit[0], lit_ev, False)
    gaps = spells(start_s, t_end, con[0], con_ev, False)
    longest_dark_s = max((b - a for a, b in dark), default=0.0)
    longest_gap_s = max((b - a for a, b in gaps), default=0.0)

    def first(evs: list[dict], to: bool) -> float | None:
        for e in evs:
            if e["to"] == to:
                return e["t_s"] - start_s
        return None

    mean_sun = sum(s.sun_frac for s in samples) / n
    lit_share = sum(lit) / n
    contact_share = sum(con) / n
    grazing_share = sum(1 for s in samples if s.contact == "grazing") / n
    stay_s = max(t_end - start_s, 1.0)
    w_s, w_e, w_n = rules.weights
    score = 100.0 * (w_s * mean_sun + w_e * contact_share - w_n * longest_dark_s / stay_s)
    score = max(0.0, min(100.0, score))
    battery_kwh = (
        rules.load_w * (longest_dark_s / 3600.0) / (rules.depth_of_discharge * rules.efficiency) / 1000.0
    )
    min_lit_frac = min(s.sun_frac for s in samples)
    return {
        "n_samples": n,
        "lit_share": lit_share,
        "mean_sun_fraction": mean_sun,
        "min_sun_fraction": min_lit_frac,
        "contact_share": contact_share,
        "grazing_share": grazing_share,
        "longest_dark_s": longest_dark_s,
        "longest_gap_s": longest_gap_s,
        "next_sunset_s": first(lit_ev, False) if lit[0] else None,
        "next_sunrise_s": first(lit_ev, True) if not lit[0] else None,
        "next_earthset_s": first(eup_ev, False) if eup[0] else None,
        "next_earthrise_s": first(eup_ev, True) if not eup[0] else None,
        "next_contact_loss_s": first(con_ev, False) if con[0] else None,
        "sun_el_now_deg": samples[0].sun_el_deg,
        "sun_az_now_deg": samples[0].sun_az_deg,
        "earth_el_now_deg": samples[0].earth_el_deg,
        "battery_kwh": battery_kwh,
        "score": score,
        "lit_events": lit_ev,
        "contact_events": con_ev,
        "earth_events": eup_ev,
    }


LONG_DURATION_S = 48 * 3600.0


def format_hours(s: float) -> str:
    """'4.5 h'; over 48 hours also in days: '13.0 days (311.6 h)'. Same text as web/src/engine/light.ts."""
    hours = f"{s / 3600.0:.1f} h"
    if s > LONG_DURATION_S:
        return f"{s / 86400.0:.1f} days ({hours})"
    return hours


_hours = format_hours


def verdict(metrics: dict, rules: Rules) -> dict:
    """'no-go' if any rule fails; 'marginal' if all pass but a margin is thin; 'go' otherwise."""
    dark = metrics["longest_dark_s"]
    gap = metrics["longest_gap_s"]
    fails = []
    if dark > rules.max_dark_s:
        if rules.max_dark_s == 0.0:
            fails.append(f"The Sun sets for up to {_hours(dark)}; this scenario needs continuous sunlight.")
        else:
            fails.append(f"Longest darkness is {_hours(dark)}, over the {_hours(rules.max_dark_s)} limit.")
    if gap > rules.max_gap_s:
        fails.append(
            f"Longest gap in Earth contact is {_hours(gap)}, over the {_hours(rules.max_gap_s)} limit."
        )
    if fails:
        return {"verdict": "no-go", "reason": " ".join(fails)}
    thin = []
    if rules.max_dark_s > 0.0 and dark > rules.thin_margin * rules.max_dark_s:
        thin.append(f"Longest darkness of {_hours(dark)} is close to the {_hours(rules.max_dark_s)} limit.")
    if rules.max_dark_s == 0.0 and metrics["min_sun_fraction"] < 0.75:
        thin.append(
            f"The Sun stays up, but at times only {100 * metrics['min_sun_fraction']:.0f}% of its disc clears the terrain."
        )
    if rules.max_gap_s > 0.0 and gap > rules.thin_margin * rules.max_gap_s:
        thin.append(f"Longest contact gap of {_hours(gap)} is close to the {_hours(rules.max_gap_s)} limit.")
    if metrics["contact_share"] > 0 and metrics["grazing_share"] > 0.5 * metrics["contact_share"]:
        thin.append("Earth contact is mostly at grazing angles, where links fade.")
    if thin:
        return {"verdict": "marginal", "reason": " ".join(thin)}
    return {"verdict": "go", "reason": "Sunlight and Earth contact meet every rule with margin."}


def miss_share(
    point_passes: Sequence[bool], east_m: Sequence[float], north_m: Sequence[float], radius_m: float
) -> float:
    """Passing points inside the radius divided by all points inside the radius."""
    inside = [
        p
        for p, e, nn in zip(point_passes, east_m, north_m, strict=True)
        if math.hypot(e, nn) <= radius_m + 1e-9
    ]
    if not inside:
        return float("nan")
    return sum(1 for p in inside if p) / len(inside)


def rules_dict(rules: Rules) -> dict:
    return asdict(rules)
