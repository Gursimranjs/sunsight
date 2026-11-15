// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
// Review note 009 M1: pure helpers of the horizon shell (flag, address bar, views, Play steps, mission line).
import { describe, expect, it } from 'vitest';
import { hzViewFor, isHorizonQuery, scnViewFor, stripUi, withUi } from '../../src/horizon/useHorizonState';
import { PLAY_DURATION_MS, PLAY_SPEEDS, playAt, stepTime, TIME_STEP_S } from '../../src/horizon/PlayBar';
import { missionDate, scenarioPhrase } from '../../src/horizon/MissionLine';
import { DEFAULT_QUERY } from '../../src/state/scenario';

describe('the ui=horizon flag', () => {
  it('is read from the query string, and only the exact value turns it on', () => {
    expect(isHorizonQuery('?ui=horizon')).toBe(true);
    expect(isHorizonQuery('?site=x&ui=horizon')).toBe(true);
    expect(isHorizonQuery('')).toBe(false);
    expect(isHorizonQuery('?ui=classic')).toBe(false);
    expect(isHorizonQuery('?site=horizon')).toBe(false);
  });
  it('is removed before the scenario is decoded, so ?ui=horizon alone opens the default link', () => {
    expect(stripUi('?ui=horizon')).toBe('');
    expect(stripUi('?' + DEFAULT_QUERY + '&ui=horizon')).toBe(new URLSearchParams(DEFAULT_QUERY).toString());
    expect(stripUi('?ui=horizon&site=a&start=2029-07-24T00%3A00Z')).toBe('site=a&start=2029-07-24T00%3A00Z');
  });
  it('is kept when the scenario rewrites the address bar', () => {
    expect(withUi('site=a&preset=crew')).toBe('?site=a&preset=crew&ui=horizon');
    expect(withUi('')).toBe('?ui=horizon');
    expect(isHorizonQuery(withUi('site=a'))).toBe(true);
  });
});

describe('views', () => {
  it('map the classic view ids onto the horizon views and back', () => {
    expect(hzViewFor('report')).toBe('horizon');
    expect(hzViewFor('sky')).toBe('horizon');
    expect(hzViewFor('3d')).toBe('ground');
    expect(hzViewFor('miss')).toBe('miss');
    expect(hzViewFor('rank')).toBe('rank');
    expect(hzViewFor('compare')).toBe('calendar');
    expect(hzViewFor('story')).toBe('tour');
    expect(hzViewFor('validation')).toBe('proof');
    for (const v of ['horizon', 'ground', 'miss', 'rank', 'calendar', 'tour', 'proof'] as const) expect(hzViewFor(scnViewFor(v))).toBe(v);
    expect(scnViewFor('compare')).toBe('compare');
  });
});

describe('Play', () => {
  it('runs the whole stay in about 8 s at the normal speed, in 10-minute steps, and stops at the end', () => {
    expect(PLAY_DURATION_MS).toBe(8000);
    expect(PLAY_SPEEDS).toHaveLength(3);
    const stay_s = 6.5 * 86400;
    expect(playAt(0, stay_s, 0, 1)).toBe(0);
    expect(playAt(0, stay_s, 4000, 1)).toBe(stay_s / 2);
    expect(playAt(0, stay_s, 8000, 1)).toBe(stay_s);
    expect(playAt(0, stay_s, 60_000, 1)).toBe(stay_s);
    for (const ms of [16, 333, 1234, 7777]) expect(playAt(0, stay_s, ms, 1) % TIME_STEP_S).toBe(0);
    // A faster speed covers more of the stay in the same time; play resumes from where it was.
    expect(playAt(0, stay_s, 1000, 2)).toBeGreaterThan(playAt(0, stay_s, 1000, 1));
    expect(playAt(stay_s / 2, stay_s, 4000, 1)).toBe(stay_s);
  });
  it('arrow keys step 10 minutes and stay inside the stay', () => {
    expect(TIME_STEP_S).toBe(600);
    expect(stepTime(0, 86400, 1)).toBe(600);
    expect(stepTime(0, 86400, -1)).toBe(0);
    expect(stepTime(86400, 86400, 1)).toBe(86400);
    expect(stepTime(1234, 86400, 1)).toBe(1800);
  });
});

describe('mission line', () => {
  it('says the date in words, in UTC', () => {
    expect(missionDate(Date.UTC(2029, 6, 24, 0, 0))).toBe('24 Jul 2029, 00:00 UTC');
    expect(missionDate(Date.UTC(2027, 0, 5, 13, 42))).toBe('5 Jan 2027, 13:42 UTC');
  });
  it('names the scenario with its stay length', () => {
    expect(scenarioPhrase('crew', 6.5 * 86400)).toBe('crew sortie, 6.5 days');
    expect(scenarioPhrase('robotic', 14 * 86400)).toBe('robotic lander, 14 days');
    expect(scenarioPhrase('long', 1.25 * 86400)).toBe('long stay, 1.25 days');
  });
});
