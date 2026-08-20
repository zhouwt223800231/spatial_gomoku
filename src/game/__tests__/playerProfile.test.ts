import { describe, it, expect, beforeEach } from 'vitest';
import { createDefaultProfile, updateProfileAfterMove, updateProfileAfterGame } from '../playerProfile';
import { PlayerProfile, Position, StoneData, Player } from '../../types';

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

beforeEach(() => {
  (globalThis as any).localStorage = new MemStorage();
});

const pos = (x: number, y: number, z: number): Position => ({ x, y, z });
const st = (p: Position, player: Player): StoneData => ({ position: p, player });

/** n history moves all on the center plane z=2 of a 5x5x5 board. */
const lowZHistory = (n: number): Position[] =>
  Array.from({ length: n }, (_, i) => pos((i * 2) % 5, (i * 3) % 5, 2));

function profileWith(history: Position[]): PlayerProfile {
  const p = createDefaultProfile();
  p.moveHistory = history;
  return p;
}

describe('playerProfile.updateVulnerabilities', () => {
  it('does not judge weaknesses with fewer than 8 samples', () => {
    const p = profileWith(lowZHistory(6));
    const stones = [
      st(pos(0, 0, 0), 'black'),
      st(pos(4, 4, 0), 'black'),
      st(pos(2, 2, 2), 'white'),
    ];
    const updated = updateProfileAfterMove(p, 'white', pos(2, 2, 2), stones, 5);
    expect(updated.vulnerabilities).toHaveLength(0);
  });

  it('detects Z-axis weakness from the explicit player, not a stones.find fallback', () => {
    // Player is white, but no white stone exists at the passed position.
    // The old code fell back to 'black' and would compute opponent = 'white',
    // missing the two black stones that sit off the central plane.
    const p = profileWith(lowZHistory(10));
    const stones = [
      st(pos(0, 0, 0), 'black'),
      st(pos(4, 4, 0), 'black'),
    ];
    const updated = updateProfileAfterMove(p, 'white', pos(2, 2, 2), stones, 5);
    const z = updated.vulnerabilities.find((v) => v.direction === 'Z_AXIS');
    expect(z).toBeDefined();
    expect(z!.exposureRate).toBeGreaterThan(0.3);
    expect(z!.exposureRate).toBeLessThanOrEqual(1);
  });

  it('scales exposure with confidence (history length)', () => {
    const stones = [
      st(pos(0, 0, 0), 'black'),
      st(pos(4, 4, 0), 'black'),
      st(pos(2, 2, 2), 'white'),
    ];
    const p8 = updateProfileAfterMove(profileWith(lowZHistory(8)), 'white', pos(2, 2, 2), stones, 5);
    const p14 = updateProfileAfterMove(profileWith(lowZHistory(14)), 'white', pos(2, 2, 2), stones, 5);
    const z8 = p8.vulnerabilities.find((v) => v.direction === 'Z_AXIS');
    const z14 = p14.vulnerabilities.find((v) => v.direction === 'Z_AXIS');
    expect(z8).toBeDefined();
    expect(z14).toBeDefined();
    // More samples -> confidence 1 -> full exposure (0.5 + offPlane * 1).
    expect(z14!.exposureRate).toBeCloseTo(0.5, 3);
    expect(z8!.exposureRate).toBeLessThan(z14!.exposureRate);
  });
});

describe('playerProfile.updateProfileAfterGame', () => {
  it('tracks wins / losses / average length and clears history', () => {
    const p = profileWith(lowZHistory(9));
    const won = updateProfileAfterGame(p, true, false, 23);
    expect(won.totalGames).toBe(1);
    expect(won.wins).toBe(1);
    expect(won.losses).toBe(0);
    expect(won.moveHistory).toHaveLength(0);

    const lost = updateProfileAfterGame(p, false, true, 12);
    expect(lost.totalGames).toBe(1);
    expect(lost.losses).toBe(1);
  });
});
