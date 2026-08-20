import { Position, Player, StoneData, BoardSize } from '../types';

export const DIRECTIONS: Position[] = [
  { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 },
  { x: 1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 },
  { x: 1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 },
  { x: 0, y: 1, z: 1 }, { x: 0, y: 1, z: -1 },
  { x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: -1 },
  { x: 1, y: -1, z: 1 }, { x: 1, y: -1, z: -1 },
];

export interface EvalWeights {
  FIVE: number;
  OPEN_FOUR: number;
  FOUR: number;
  OPEN_THREE: number;
  THREE: number;
  BLOCK_THREE: number;
  OPEN_TWO: number;
  TWO: number;
  CENTER: number;
  Z_AXIS: number;
  DIAGONAL: number;
  DEFENSE: number;
  ATTACK: number;
  PATTERN_BREAK: number;
  DOUBLE_THREAT: number;
  THREAT_AXIS: number;
  THREAT_Z: number;
  THREAT_DIAG: number;
}

export const DEFAULT_WEIGHTS: EvalWeights = {
  FIVE: 100000,
  OPEN_FOUR: 10000,
  FOUR: 5000,
  OPEN_THREE: 1000,
  THREE: 500,
  BLOCK_THREE: 1.0,
  OPEN_TWO: 100,
  TWO: 50,
  CENTER: 30,
  Z_AXIS: 20,
  DIAGONAL: 15,
  DEFENSE: 1.0,
  ATTACK: 1.0,
  PATTERN_BREAK: 1.0,
  DOUBLE_THREAT: 0,
  THREAT_AXIS: 0,
  THREAT_Z: 0,
  THREAT_DIAG: 0,
};

const keyOf = (p: Position) => `${p.x},${p.y},${p.z}`;

const inBounds = (p: Position, boardSize: BoardSize) =>
  p.x >= 0 && p.x < boardSize && p.y >= 0 && p.y < boardSize && p.z >= 0 && p.z < boardSize;

/**
 * Evaluate a position. Each same-player contiguous segment is visited exactly
 * once (scan its start, then extend), instead of re-scanning from every stone.
 * Threat (double-three/four) stats are only computed when threat weights are set.
 */
export function evaluatePosition(
  stones: StoneData[],
  player: Player,
  boardSize: BoardSize,
  weights: EvalWeights = DEFAULT_WEIGHTS
): number {
  const stoneMap = new Map<string, Player>();
  stones.forEach((s) => stoneMap.set(keyOf(s.position), s.player));

  const wantThreats =
    weights.DOUBLE_THREAT > 0 || weights.THREAT_AXIS > 0 || weights.THREAT_Z > 0 || weights.THREAT_DIAG > 0;

  let score = 0;
  let myThreatCount = 0;
  let myThreatAxis = 0;
  let myThreatZ = 0;
  let myThreatDiag = 0;

  for (const stone of stones) {
    const p = stone.player;
    const isMine = p === player;
    const sign = isMine ? 1 : -1;

    for (const dir of DIRECTIONS) {
      // Only start a segment at its first stone (no same player right behind).
      const behind: Position = { x: stone.position.x - dir.x, y: stone.position.y - dir.y, z: stone.position.z - dir.z };
      if (inBounds(behind, boardSize) && stoneMap.get(keyOf(behind)) === p) continue;

      // Extend the segment forward.
      const seg: Position[] = [stone.position];
      for (let i = 1; i < 5; i++) {
        const q = { x: stone.position.x + dir.x * i, y: stone.position.y + dir.y * i, z: stone.position.z + dir.z * i };
        if (!inBounds(q, boardSize) || stoneMap.get(keyOf(q)) !== p) break;
        seg.push(q);
      }
      if (seg.length < 2) continue;

      const last = seg[seg.length - 1];
      const e1: Position = { x: last.x + dir.x, y: last.y + dir.y, z: last.z + dir.z };
      const e2: Position = { x: stone.position.x - dir.x, y: stone.position.y - dir.y, z: stone.position.z - dir.z };
      const open = (q: Position) => inBounds(q, boardSize) && !stoneMap.has(keyOf(q));
      const openEnds = (open(e1) ? 1 : 0) + (open(e2) ? 1 : 0);

      const len = seg.length;
      const pattern = classifyPattern(len, openEnds);
      let value = 0;
      switch (pattern) {
        case 'FIVE': value = weights.FIVE; break;
        case 'OPEN_FOUR': value = weights.OPEN_FOUR; break;
        case 'FOUR': value = weights.FOUR; break;
        case 'OPEN_THREE': value = weights.OPEN_THREE; break;
        case 'THREE': value = weights.THREE; break;
        case 'OPEN_TWO': value = weights.OPEN_TWO; break;
        case 'TWO': value = weights.TWO; break;
      }

      if (dir.z !== 0) value += weights.Z_AXIS * len;
      if (Math.abs(dir.x) + Math.abs(dir.y) + Math.abs(dir.z) === 3) value += weights.DIAGONAL * len;
      score += sign * value;

      // Threat accounting for double-three / directional bonuses.
      if (wantThreats && isMine) {
        const isThreat =
          (len >= 4 && openEnds >= 1) || (len === 3 && openEnds >= 2);
        if (isThreat) {
          myThreatCount++;
          if (dir.z !== 0) myThreatZ++;
          if (Math.abs(dir.x) + Math.abs(dir.y) + Math.abs(dir.z) === 3) myThreatDiag++;
          const axis =
            (dir.x !== 0 && dir.y === 0 && dir.z === 0) ||
            (dir.y !== 0 && dir.x === 0 && dir.z === 0) ||
            (dir.z !== 0 && dir.x === 0 && dir.y === 0);
          if (axis) myThreatAxis++;
        }
      }
    }

    const center = (boardSize - 1) / 2;
    const dist = Math.abs(stone.position.x - center) + Math.abs(stone.position.y - center) + Math.abs(stone.position.z - center);
    score += sign * weights.CENTER * (3 * center - dist);
  }

  if (wantThreats) {
    score += weights.DOUBLE_THREAT * Math.max(0, myThreatCount - 1);
    score += weights.THREAT_AXIS * myThreatAxis;
    score += weights.THREAT_Z * myThreatZ;
    score += weights.THREAT_DIAG * myThreatDiag;
  }

  return score;
}

type Pattern = 'FIVE' | 'OPEN_FOUR' | 'FOUR' | 'OPEN_THREE' | 'THREE' | 'OPEN_TWO' | 'TWO' | 'NONE';

function classifyPattern(length: number, openEnds: number): Pattern {
  if (length >= 5) return 'FIVE';
  if (length === 4) return openEnds === 2 ? 'OPEN_FOUR' : openEnds === 1 ? 'FOUR' : 'NONE';
  if (length === 3) return openEnds === 2 ? 'OPEN_THREE' : openEnds === 1 ? 'THREE' : 'NONE';
  if (length === 2) return openEnds === 2 ? 'OPEN_TWO' : openEnds === 1 ? 'TWO' : 'NONE';
  return 'NONE';
}
