import { Position, Player, StoneData, WinLineData, BoardSize } from '../types';

const DIRECTIONS: Position[] = [
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

export function checkWin(
  stones: StoneData[],
  boardSize: BoardSize
): WinLineData | null {
  const stoneMap = new Map<string, Player>();
  stones.forEach((s) => {
    stoneMap.set(`${s.position.x},${s.position.y},${s.position.z}`, s.player);
  });

  for (const stone of stones) {
    for (const dir of DIRECTIONS) {
      const line: Position[] = [stone.position];
      let player = stone.player;

      for (let i = 1; i < 5; i++) {
        const pos: Position = {
          x: stone.position.x + dir.x * i,
          y: stone.position.y + dir.y * i,
          z: stone.position.z + dir.z * i,
        };
        if (
          pos.x < 0 || pos.x >= boardSize ||
          pos.y < 0 || pos.y >= boardSize ||
          pos.z < 0 || pos.z >= boardSize
        ) break;

        const key = `${pos.x},${pos.y},${pos.z}`;
        if (stoneMap.get(key) === player) {
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
  const occupied = new Set(stones.map(s => `${s.position.x},${s.position.y},${s.position.z}`));
  const empty: Position[] = [];
  for (let x = 0; x < boardSize; x++) {
    for (let y = 0; y < boardSize; y++) {
      for (let z = 0; z < boardSize; z++) {
        if (!occupied.has(`${x},${y},${z}`)) {
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

  const occupied = new Set(stones.map(s => `${s.position.x},${s.position.y},${s.position.z}`));
  const candidates = new Set<string>();

  for (const stone of stones) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dz = -2; dz <= 2; dz++) {
          const nx = stone.position.x + dx;
          const ny = stone.position.y + dy;
          const nz = stone.position.z + dz;
          if (
            nx >= 0 && nx < boardSize &&
            ny >= 0 && ny < boardSize &&
            nz >= 0 && nz < boardSize &&
            !occupied.has(`${nx},${ny},${nz}`)
          ) {
            candidates.add(`${nx},${ny},${nz}`);
          }
        }
      }
    }
  }

  return Array.from(candidates).map(key => {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z };
  });
}
