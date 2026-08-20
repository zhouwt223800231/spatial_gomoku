import { describe, it, expect } from 'vitest';
import { checkWin, getCandidatePositions } from '../rules';
import { findBestMove, MoveResult } from '../ai';
import { DEFAULT_WEIGHTS } from '../evaluate';
import { Position, StoneData, Player } from '../../types';

const pos = (x: number, y: number, z: number): Position => ({ x, y, z });
const st = (p: Position, player: Player): StoneData => ({ position: p, player });
const W = { ...DEFAULT_WEIGHTS, DEFENSE: 1.4, BLOCK_THREE: 1.6, DOUBLE_THREAT: 600, THREAT_AXIS: 40, THREAT_Z: 30, THREAT_DIAG: 25 };

describe('ai.findBestMove', () => {
  it('takes an immediate win', () => {
    // Black has 4 in a row on X; the 5th cell completes five.
    const stones = [0, 1, 2, 3].map((x) => st(pos(x, 2, 2), 'black'));
    stones.push(st(pos(0, 0, 0), 'white'));
    const result: MoveResult = findBestMove(stones, 'black', 5, W, 3, 1.6, 80_000, false);
    expect(result.position).toEqual(pos(4, 2, 2));
  });

  it('blocks an opponent live-three', () => {
    // White has an open three along X at y=0,z=0: cells (0,0,0)(1,0,0)(2,0,0),
    // both ends (3,0,0) and (-1,0,0 out) -> one open end (3,0,0).
    const stones = [
      st(pos(0, 0, 0), 'white'),
      st(pos(1, 0, 0), 'white'),
      st(pos(2, 0, 0), 'white'),
    ];
    const result: MoveResult = findBestMove(stones, 'black', 5, W, 3, 1.6, 80_000, false);
    expect(result.position).toEqual(pos(3, 0, 0));
  });

  it('blocks an opponent immediate four', () => {
    // White has 4 in a row on X; blocking end is (4,2,2).
    const stones = [0, 1, 2, 3].map((x) => st(pos(x, 2, 2), 'white'));
    const result: MoveResult = findBestMove(stones, 'black', 5, W, 3, 1.6, 80_000, false);
    expect(result.position).toEqual(pos(4, 2, 2));
  });

  it('returns a valid empty cell for an empty-ish board', () => {
    const stones = [st(pos(2, 2, 2), 'black')];
    const result: MoveResult = findBestMove(stones, 'white', 5, W, 3, 1.6, 80_000, false);
    const occupied = new Set(stones.map((s) => `${s.position.x},${s.position.y},${s.position.z}`));
    expect(occupied.has(`${result.position.x},${result.position.y},${result.position.z}`)).toBe(false);
    expect(getCandidatePositions(stones, 5).some((p) => p.x === result.position.x && p.y === result.position.y && p.z === result.position.z)).toBe(true);
  });
});
