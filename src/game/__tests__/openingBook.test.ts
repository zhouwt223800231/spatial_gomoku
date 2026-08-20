import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeMovesKey, normalizeVariant, recordGameOutcome, loadBook, getBookCandidates, stonesToMoves } from '../openingBook';
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

describe('openingBook normalization', () => {
  it('mirror-equivalent sequences produce the same normalized key', () => {
    const a = [pos(2, 2, 2), pos(3, 2, 2), pos(4, 2, 2)];
    const b = [pos(2, 2, 2), pos(1, 2, 2), pos(0, 2, 2)]; // mirror along X
    expect(normalizeMovesKey(a)).toBe(normalizeMovesKey(b));
  });

  it('Z-flip equivalent sequences share a key', () => {
    const a = [pos(2, 2, 2), pos(2, 2, 3)];
    const b = [pos(2, 2, 2), pos(2, 2, 1)];
    expect(normalizeMovesKey(a)).toBe(normalizeMovesKey(b));
  });

  it('record + candidate lookup works after normalization', () => {
    const moves = [pos(2, 2, 2), pos(3, 2, 2), pos(4, 2, 2), pos(4, 3, 2)];
    recordGameOutcome(moves, 'black');
    const stones = [st(pos(2, 2, 2), 'black'), st(pos(3, 2, 2), 'white'), st(pos(4, 2, 2), 'black')];
    const cands = getBookCandidates(stones, 5, 'black', 5);
    expect(cands.length).toBeGreaterThan(0);
  });

  it('stonesToMoves extracts positions in order', () => {
    const stones = [st(pos(1, 1, 1), 'black'), st(pos(2, 1, 1), 'white')];
    expect(stonesToMoves(stones)).toEqual([pos(1, 1, 1), pos(2, 1, 1)]);
  });
});
