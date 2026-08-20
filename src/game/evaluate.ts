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

/**
 * Number of open threats (open three / open four / four) that the given stone
 * participates in, summed across the 13 directions, with direction categories.
 */
function stoneThreats(
  pos: Position,
  player: Player,
  stoneMap: Map<string, Player>,
  boardSize: BoardSize
): { count: number; z: number; diag: number; axis: number } {
  let count = 0;
  let z = 0;
  let diag = 0;
  let axis = 0;

  for (const dir of DIRECTIONS) {
    // Count contiguous stones in both directions through this stone.
    const forward: Position[] = [];
    for (let i = 1; i < 5; i++) {
      const p = { x: pos.x + dir.x * i, y: pos.y + dir.y * i, z: pos.z + dir.z * i };
      if (p.x < 0 || p.x >= boardSize || p.y < 0 || p.y >= boardSize || p.z < 0 || p.z >= boardSize) break;
      if (stoneMap.get(keyOf(p)) === player) forward.push(p);
      else break;
    }
    const backward: Position[] = [];
    for (let i = 1; i < 5; i++) {
      const p = { x: pos.x - dir.x * i, y: pos.y - dir.y * i, z: pos.z - dir.z * i };
      if (p.x < 0 || p.x >= boardSize || p.y < 0 || p.y >= boardSize || p.z < 0 || p.z >= boardSize) break;
      if (stoneMap.get(keyOf(p)) === player) backward.push(p);
      else break;
    }
    const line = [pos, ...forward, ...backward];
    if (line.length < 3) continue;

    // Open ends on this line.
    const e1 = {
      x: line[line.length - 1].x + dir.x,
      y: line[line.length - 1].y + dir.y,
      z: line[line.length - 1].z + dir.z,
    };
    const e2 = { x: line[0].x - dir.x, y: line[0].y - dir.y, z: line[0].z - dir.z };
    const open = (p: Position) =>
      p.x >= 0 && p.x < boardSize && p.y >= 0 && p.y < boardSize && p.z >= 0 && p.z < boardSize &&
      !stoneMap.has(keyOf(p));
    const openEnds = (open(e1) ? 1 : 0) + (open(e2) ? 1 : 0);

    // Threat = open three (>=3, >=2 ends) or any four (>=4, >=1 end).
    const isFour = line.length >= 4;
    const isOpenThree = line.length === 3 && openEnds >= 2;
    if (isFour && openEnds >= 1) {
      count++;
      if (dir.z !== 0) z++;
      if (Math.abs(dir.x) + Math.abs(dir.y) + Math.abs(dir.z) === 3) diag++;
      if (dir.x !== 0 && dir.y === 0 && dir.z === 0) axis++;
      else if (dir.y !== 0 && dir.x === 0 && dir.z === 0) axis++;
      else if (dir.z !== 0 && dir.x === 0 && dir.y === 0) axis++;
    } else if (isOpenThree) {
      count++;
      if (dir.z !== 0) z++;
      if (Math.abs(dir.x) + Math.abs(dir.y) + Math.abs(dir.z) === 3) diag++;
      if (dir.x !== 0 && dir.y === 0 && dir.z === 0) axis++;
      else if (dir.y !== 0 && dir.x === 0 && dir.z === 0) axis++;
      else if (dir.z !== 0 && dir.x === 0 && dir.y === 0) axis++;
    }
  }
  return { count, z, diag, axis };
}

export function evaluatePosition(
  stones: StoneData[],
  player: Player,
  boardSize: BoardSize,
  weights: EvalWeights = DEFAULT_WEIGHTS
): number {
  const opponent: Player = player === 'black' ? 'white' : 'black';
  const stoneMap = new Map<string, Player>();
  stones.forEach((s) => stoneMap.set(keyOf(s.position), s.player));

  let score = 0;
  let myThreats = 0;
  let myThreatZ = 0;
  let myThreatDiag = 0;
  let myThreatAxis = 0;

  for (const stone of stones) {
    const isMine = stone.player === player;
    const sign = isMine ? 1 : -1;

    for (const dir of DIRECTIONS) {
      const line = getLine(stone.position, dir, stoneMap, boardSize);
      if (line.length < 2) continue;

      const openEnds = countOpenEnds(stone.position, dir, line.length, stoneMap, boardSize, stone.player);
      const pattern = classifyPattern(line.length, openEnds);

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

      if (dir.z !== 0) value += weights.Z_AXIS * line.length;
      if (Math.abs(dir.x) + Math.abs(dir.y) + Math.abs(dir.z) === 3) value += weights.DIAGONAL * line.length;

      score += sign * value;
    }

    if (isMine) {
      const t = stoneThreats(stone.position, player, stoneMap, boardSize);
      myThreats += t.count;
      myThreatZ += t.z;
      myThreatDiag += t.diag;
      myThreatAxis += t.axis;
    }

    const center = (boardSize - 1) / 2;
    const dist = Math.abs(stone.position.x - center) + Math.abs(stone.position.y - center) + Math.abs(stone.position.z - center);
    score += sign * weights.CENTER * (3 * center - dist);
  }

  // Double-threat bonus: multiple open threats (open three / four) in different
  // directions, plus directional preferences (axis / Z / body diagonal).
  score += weights.DOUBLE_THREAT * Math.max(0, myThreats - 1);
  score += weights.THREAT_AXIS * myThreatAxis;
  score += weights.THREAT_Z * myThreatZ;
  score += weights.THREAT_DIAG * myThreatDiag;

  return score;
}

function getLine(
  start: Position,
  dir: Position,
  stoneMap: Map<string, Player>,
  boardSize: BoardSize
): Position[] {
  const player = stoneMap.get(`${start.x},${start.y},${start.z}`);
  const line: Position[] = [start];

  for (let i = 1; i < 5; i++) {
    const pos = { x: start.x + dir.x * i, y: start.y + dir.y * i, z: start.z + dir.z * i };
    if (pos.x < 0 || pos.x >= boardSize || pos.y < 0 || pos.y >= boardSize || pos.z < 0 || pos.z >= boardSize) break;
    if (stoneMap.get(`${pos.x},${pos.y},${pos.z}`) === player) {
      line.push(pos);
    } else {
      break;
    }
  }

  return line;
}

function countOpenEnds(
  start: Position,
  dir: Position,
  length: number,
  stoneMap: Map<string, Player>,
  boardSize: BoardSize,
  player: Player
): number {
  let openEnds = 0;

  const end1 = {
    x: start.x + dir.x * length,
    y: start.y + dir.y * length,
    z: start.z + dir.z * length,
  };
  if (
    end1.x >= 0 && end1.x < boardSize &&
    end1.y >= 0 && end1.y < boardSize &&
    end1.z >= 0 && end1.z < boardSize &&
    !stoneMap.has(`${end1.x},${end1.y},${end1.z}`)
  ) {
    openEnds++;
  }

  const end2 = {
    x: start.x - dir.x,
    y: start.y - dir.y,
    z: start.z - dir.z,
  };
  if (
    end2.x >= 0 && end2.x < boardSize &&
    end2.y >= 0 && end2.y < boardSize &&
    end2.z >= 0 && end2.z < boardSize &&
    !stoneMap.has(`${end2.x},${end2.y},${end2.z}`)
  ) {
    openEnds++;
  }

  return openEnds;
}

type Pattern = 'FIVE' | 'OPEN_FOUR' | 'FOUR' | 'OPEN_THREE' | 'THREE' | 'OPEN_TWO' | 'TWO' | 'NONE';

function classifyPattern(length: number, openEnds: number): Pattern {
  if (length >= 5) return 'FIVE';
  if (length === 4) return openEnds === 2 ? 'OPEN_FOUR' : openEnds === 1 ? 'FOUR' : 'NONE';
  if (length === 3) return openEnds === 2 ? 'OPEN_THREE' : openEnds === 1 ? 'THREE' : 'NONE';
  if (length === 2) return openEnds === 2 ? 'OPEN_TWO' : openEnds === 1 ? 'TWO' : 'NONE';
  return 'NONE';
}
