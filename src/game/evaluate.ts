import { Position, Player, StoneData, BoardSize } from '../types';

const DIRECTIONS: Position[] = [
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
  OPEN_TWO: number;
  TWO: number;
  CENTER: number;
  Z_AXIS: number;
  DIAGONAL: number;
  DEFENSE: number;
  ATTACK: number;
  PATTERN_BREAK: number;
}

export const DEFAULT_WEIGHTS: EvalWeights = {
  FIVE: 100000,
  OPEN_FOUR: 10000,
  FOUR: 5000,
  OPEN_THREE: 1000,
  THREE: 500,
  OPEN_TWO: 100,
  TWO: 50,
  CENTER: 30,
  Z_AXIS: 20,
  DIAGONAL: 15,
  DEFENSE: 1.0,
  ATTACK: 1.0,
  PATTERN_BREAK: 1.0,
};

export function evaluatePosition(
  stones: StoneData[],
  player: Player,
  boardSize: BoardSize,
  weights: EvalWeights = DEFAULT_WEIGHTS
): number {
  const opponent: Player = player === 'black' ? 'white' : 'black';
  const stoneMap = new Map<string, Player>();
  stones.forEach((s) => {
    stoneMap.set(`${s.position.x},${s.position.y},${s.position.z}`, s.player);
  });

  let score = 0;

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

    const center = (boardSize - 1) / 2;
    const dist = Math.abs(stone.position.x - center) + Math.abs(stone.position.y - center) + Math.abs(stone.position.z - center);
    score += sign * weights.CENTER * (3 * center - dist);
  }

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
