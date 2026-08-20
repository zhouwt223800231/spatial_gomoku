import { Position, Player, StoneData, WinLineData, BoardSize } from '../types';

export const DIRECTIONS: Position[] = [
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 1, y: 1, z: 0 },
  { x: 1, y: -1, z: 0 },
  { x: 1, y: 0, z: 1 },
  { x: 1, y: 0, z: -1 },
  { x: 0, y: 1, z: 1 },
  { x: 0, y: 1, z: -1 },
  { x: 1, y: 1, z: 1 },
  { x: 1, y: 1, z: -1 },
  { x: 1, y: -1, z: 1 },
  { x: 1, y: -1, z: -1 },
];

const key = (p: Position, size: number) => (p.x * size + p.y) * size + p.z;

const inBounds = (p: Position, size: BoardSize) =>
  p.x >= 0 && p.x < size && p.y >= 0 && p.y < size && p.z >= 0 && p.z < size;

export interface AlignedRun {
  player: Player;
  positions: Position[];
}

/**
 * Find every same-player aligned run of length >= minLen along the 13 winning
 * directions. Runs are de-duplicated so each contiguous line is returned once.
 */
export function findAlignedRuns(
  stones: StoneData[],
  boardSize: BoardSize,
  minLen = 3
): AlignedRun[] {
  const stoneMap = new Map<number, Player>();
  stones.forEach((s) => stoneMap.set(key(s.position, boardSize), s.player));

  const seen = new Set<string>();
  const runs: AlignedRun[] = [];

  for (const stone of stones) {
    for (const dir of DIRECTIONS) {
      const behind: Position = {
        x: stone.position.x - dir.x,
        y: stone.position.y - dir.y,
        z: stone.position.z - dir.z,
      };
      if (inBounds(behind, boardSize) && stoneMap.get(key(behind, boardSize)) === stone.player) continue;

      const positions: Position[] = [stone.position];
      for (let i = 1; i < 5; i++) {
        const p: Position = {
          x: stone.position.x + dir.x * i,
          y: stone.position.y + dir.y * i,
          z: stone.position.z + dir.z * i,
        };
        if (!inBounds(p, boardSize) || stoneMap.get(key(p, boardSize)) !== stone.player) break;
        positions.push(p);
      }

      if (positions.length >= minLen) {
        const id = positions.map((p) => key(p, boardSize)).sort((a, b) => a - b).join('|');
        if (!seen.has(id)) {
          seen.add(id);
          runs.push({ player: stone.player, positions });
        }
      }
    }
  }

  return runs;
}

export function checkWin(
  stones: StoneData[],
  boardSize: BoardSize
): WinLineData | null {
  const stoneMap = new Map<number, Player>();
  stones.forEach((s) => {
    stoneMap.set(key(s.position, boardSize), s.player);
  });

  for (const stone of stones) {
    for (const dir of DIRECTIONS) {
      const line: Position[] = [stone.position];
      const player = stone.player;

      for (let i = 1; i < 5; i++) {
        const pos: Position = {
          x: stone.position.x + dir.x * i,
          y: stone.position.y + dir.y * i,
          z: stone.position.z + dir.z * i,
        };
        if (!inBounds(pos, boardSize)) break;
        if (stoneMap.get(key(pos, boardSize)) === player) {
          line.push(pos);
        } else {
          break;
        }
      }

      if (line.length >= 5) {
        return { positions: line.slice(0, 5), player };
      }
    }
  }

  return null;
}

export function isDraw(stones: StoneData[], boardSize: BoardSize): boolean {
  return stones.length >= boardSize * boardSize * boardSize;
}

export function getEmptyPositions(stones: StoneData[], boardSize: BoardSize): Position[] {
  const occupied = new Set(stones.map((s) => key(s.position, boardSize)));
  const empty: Position[] = [];
  for (let x = 0; x < boardSize; x++) {
    for (let y = 0; y < boardSize; y++) {
      for (let z = 0; z < boardSize; z++) {
        const k = (x * boardSize + y) * boardSize + z;
        if (!occupied.has(k)) {
          empty.push({ x, y, z });
        }
      }
    }
  }
  return empty;
}

export function getCandidatePositions(stones: StoneData[], boardSize: BoardSize): Position[] {
  if (stones.length === 0) {
    const center = Math.floor(boardSize / 2);
    return [{ x: center, y: center, z: center }];
  }

  const occupied = new Set(stones.map((s) => key(s.position, boardSize)));
  const candidates = new Set<number>();

  for (const stone of stones) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dz = -2; dz <= 2; dz++) {
          const nx = stone.position.x + dx;
          const ny = stone.position.y + dy;
          const nz = stone.position.z + dz;
          if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize || nz < 0 || nz >= boardSize) continue;
          const k = (nx * boardSize + ny) * boardSize + nz;
          if (!occupied.has(k)) candidates.add(k);
        }
      }
    }
  }

  const out: Position[] = new Array(candidates.size);
  let i = 0;
  for (const k of candidates) {
    out[i++] = { x: Math.floor(k / (boardSize * boardSize)), y: Math.floor(k / boardSize) % boardSize, z: k % boardSize };
  }
  return out;
}
