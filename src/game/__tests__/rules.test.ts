import { describe, it, expect } from 'vitest';
import { checkWin, isDraw, getCandidatePositions, getEmptyPositions } from '../rules';
import { Position, StoneData, Player } from '../../types';

const pos = (x: number, y: number, z: number): Position => ({ x, y, z });
const st = (p: Position, player: Player): StoneData => ({ position: p, player });

const line = (start: Position, dir: Position, n: number, player: Player): StoneData[] => {
  const out: StoneData[] = [];
  for (let i = 0; i < n; i++) {
    out.push(st({ x: start.x + dir.x * i, y: start.y + dir.y * i, z: start.z + dir.z * i }, player));
  }
  return out;
};

describe('rules.checkWin', () => {
  it('detects five in a row along an axis', () => {
    const stones = line(pos(0, 2, 2), pos(1, 0, 0), 5, 'black');
    const win = checkWin(stones, 5);
    expect(win).not.toBeNull();
    expect(win!.player).toBe('black');
    expect(win!.positions).toHaveLength(5);
  });

  it('detects five along a cross-layer body diagonal', () => {
    const stones = line(pos(0, 0, 0), pos(1, 1, 1), 5, 'white');
    expect(checkWin(stones, 5)).not.toBeNull();
  });

  it('detects five on an edge plane (boundary)', () => {
    // All on y = 0 boundary, along Z.
    const stones = line(pos(2, 0, 0), pos(0, 0, 1), 5, 'black');
    expect(checkWin(stones, 5)).not.toBeNull();
  });

  it('returns null for four in a row', () => {
    const stones = line(pos(0, 2, 2), pos(1, 0, 0), 4, 'black');
    expect(checkWin(stones, 5)).toBeNull();
  });

  it('returns null when a line is broken by the opponent', () => {
    const stones = [
      ...line(pos(0, 2, 2), pos(1, 0, 0), 2, 'black'),
      st(pos(2, 2, 2), 'white'),
      ...line(pos(3, 2, 2), pos(1, 0, 0), 2, 'black'),
    ];
    expect(checkWin(stones, 5)).toBeNull();
  });

  it('requires in-bounds continuation (no wrap-around)', () => {
    // (3,2,2),(4,2,2) at one edge and (0,2,2),(1,2,2) at the other do not
    // form a contiguous five.
    const stones = [
      ...line(pos(3, 2, 2), pos(1, 0, 0), 2, 'black'),
      ...line(pos(0, 2, 2), pos(1, 0, 0), 2, 'black'),
    ];
    expect(checkWin(stones, 5)).toBeNull();
  });
});

describe('rules.isDraw / getEmptyPositions', () => {
  it('isDraw only when the board is full', () => {
    const partial = [st(pos(0, 0, 0), 'black'), st(pos(1, 0, 0), 'white')];
    expect(isDraw(partial, 5)).toBe(false);

    const full: StoneData[] = [];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        for (let z = 0; z < 5; z++) full.push(st(pos(x, y, z), 'black'));
      }
    }
    expect(full).toHaveLength(125);
    expect(isDraw(full, 5)).toBe(true);
    expect(getEmptyPositions(full, 5)).toHaveLength(0);
  });
});

describe('rules.getCandidatePositions', () => {
  it('returns the board center for an empty board', () => {
    const cands = getCandidatePositions([], 5);
    expect(cands).toEqual([pos(2, 2, 2)]);
  });

  it('keeps far cross-layer cells along winning directions (no -2..2 pruning loss)', () => {
    // A lone stone at the origin; the far end of the body diagonal (4,4,4)
    // is the natural first step of a long cross-layer line. Old ±2 pruning
    // dropped it; direction-extension must keep it.
    const stones = [st(pos(0, 0, 0), 'black')];
    const cands = getCandidatePositions(stones, 5);
    expect(cands.some((p) => p.x === 4 && p.y === 4 && p.z === 4)).toBe(true);
    expect(cands.some((p) => p.x === 2 && p.y === 2 && p.z === 2)).toBe(true);
  });

  it('keeps classic ±2 neighborhood as a safety net', () => {
    const stones = [st(pos(2, 2, 2), 'black')];
    const cands = getCandidatePositions(stones, 7);
    // Manhattan distance 2 along an axis must be present.
    expect(cands.some((p) => p.x === 4 && p.y === 2 && p.z === 2)).toBe(true);
  });

  it('does not include cells that are neither on a direction line nor within ±2', () => {
    const stones = [st(pos(2, 2, 2), 'black')];
    const cands = getCandidatePositions(stones, 7);
    // (5,4,2) is outside the ±2 Chebyshev neighborhood (|dx|=3) and not on any of the 13 unit directions.
    expect(cands.some((p) => p.x === 5 && p.y === 4 && p.z === 2)).toBe(false);
  });

  it('never returns occupied cells', () => {
    const stones = [st(pos(1, 1, 1), 'black'), st(pos(2, 1, 1), 'white')];
    const cands = getCandidatePositions(stones, 5);
    const keys = new Set(cands.map((p) => `${p.x},${p.y},${p.z}`));
    expect(keys.has('1,1,1')).toBe(false);
    expect(keys.has('2,1,1')).toBe(false);
  });
});
