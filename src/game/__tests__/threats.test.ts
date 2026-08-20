import { describe, it, expect } from 'vitest';
import { getOpenThreats, threatColor } from '../threats';
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

describe('getOpenThreats', () => {
  it('open three with both ends open yields 2 open ends', () => {
    const stones = line(pos(1, 0, 0), pos(1, 0, 0), 3, 'white');
    const threats = getOpenThreats(stones, 5);
    expect(threats).toHaveLength(1);
    expect(threats[0].player).toBe('white');
    expect(threats[0].len).toBe(3);
    expect(threats[0].openEnds).toHaveLength(2);
    // ends (0,0,0) and (4,0,0)
    const keys = threats[0].openEnds.map((p) => `${p.x},${p.y},${p.z}`).sort();
    expect(keys).toEqual(['0,0,0', '4,0,0']);
  });

  it('a three with one end blocked yields 1 open end', () => {
    const stones = [
      ...line(pos(1, 0, 0), pos(1, 0, 0), 3, 'white'),
      st(pos(4, 0, 0), 'black'),
    ];
    const threats = getOpenThreats(stones, 5);
    expect(threats).toHaveLength(1);
    expect(threats[0].openEnds).toHaveLength(1);
    expect(threats[0].openEnds[0]).toEqual(pos(0, 0, 0));
  });

  it('a four with one open end yields 1 open end', () => {
    const stones = line(pos(1, 0, 0), pos(1, 0, 0), 4, 'black');
    const threats = getOpenThreats(stones, 5);
    expect(threats).toHaveLength(1);
    expect(threats[0].len).toBe(4);
    // (0,0,0) open; (5,0,0) out of bounds
    expect(threats[0].openEnds).toHaveLength(1);
    expect(threats[0].openEnds[0]).toEqual(pos(0, 0, 0));
  });

  it('a completed five is not reported as an open threat', () => {
    const stones = line(pos(0, 0, 0), pos(1, 0, 0), 5, 'white');
    expect(getOpenThreats(stones, 5)).toHaveLength(0);
  });

  it('out-of-bounds ends are not counted', () => {
    const stones = line(pos(0, 0, 0), pos(1, 0, 0), 3, 'white');
    const threats = getOpenThreats(stones, 5);
    expect(threats).toHaveLength(1);
    // (-1,0,0) is out of bounds; only (3,0,0) counts.
    expect(threats[0].openEnds).toHaveLength(1);
    expect(threats[0].openEnds[0]).toEqual(pos(3, 0, 0));
  });

  it('attributes black and white threats to the correct player', () => {
    const stones = [
      ...line(pos(1, 0, 0), pos(1, 0, 0), 3, 'black'),
      ...line(pos(1, 2, 1), pos(0, 1, 0), 3, 'white'),
    ];
    const threats = getOpenThreats(stones, 5);
    expect(threats).toHaveLength(2);
    const black = threats.find((t) => t.player === 'black');
    const white = threats.find((t) => t.player === 'white');
    expect(black).toBeDefined();
    expect(white).toBeDefined();
  });
});

describe('threatColor', () => {
  it('flags the AI opponent red in AI mode', () => {
    // human = black -> AI opponent = white -> white threats are red.
    expect(threatColor('white', 'ai', 'black')).toBe('#f87171');
    expect(threatColor('black', 'ai', 'black')).toBe('#fbbf24');
  });

  it('uses run colors in PvP mode', () => {
    expect(threatColor('black', 'pvp', 'black')).toBe('#fbbf24');
    expect(threatColor('white', 'pvp', 'black')).toBe('#60a5fa');
  });
});