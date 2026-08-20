import { describe, it, expect, beforeEach } from 'vitest';
import { computeThreatFeature, threatFeatureKey, recordThreatFeature, queryThreatWinRate, loadThreatStats } from '../threatLearning';
import { Position, StoneData, Player } from '../../types';

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

const pos = (x: number, y: number, z: number): Position => ({ x, y, z });
const st = (p: Position, player: Player): StoneData => ({ position: p, player });

beforeEach(() => {
  (globalThis as any).localStorage = new MemStorage();
});

describe('threatLearning', () => {
  it('feature key is stable and coarse-grained', () => {
    // Open three: cells (1,0,0)(2,0,0) then placing at (3,0,0) creates
    // a 3-in-a-row with both ends (0,0,0) and (4,0,0) open.
    const stones = [st(pos(1, 0, 0), 'white'), st(pos(2, 0, 0), 'white')];
    const f = computeThreatFeature(stones, pos(3, 0, 0), 'white', 5);
    expect(f.openThreats).toBeGreaterThanOrEqual(1);
    const k = threatFeatureKey(f);
    expect(k).toMatch(/^openThreats=\d+;hasZ=[01];hasDiag=[01];axisCount=\d+$/);
    expect(threatFeatureKey(f)).toBe(k);
  });

  it('record/query win rate is color-aware', () => {
    const ctx = [st(pos(1, 0, 0), 'white'), st(pos(2, 0, 0), 'white')];
    const f2 = computeThreatFeature(ctx, pos(3, 0, 0), 'white', 5);
    expect(f2.openThreats).toBeGreaterThanOrEqual(1);
    recordThreatFeature(f2, 'white', 'white'); // white played & won
    recordThreatFeature(f2, 'white', 'black'); // white played & lost
    recordThreatFeature(f2, 'black', 'white'); // black played this feature & lost
    const rate = queryThreatWinRate(f2, 'white');
    expect(rate).toBeGreaterThan(0);
    expect(rate).toBeLessThanOrEqual(1);
    expect(Object.keys(loadThreatStats()).length).toBeGreaterThan(0);
  });
});
