import { Position, Player, StoneData, BoardSize } from '../types';
import { getCandidatePositions } from './rules';
import { evaluatePosition, EvalWeights, DEFAULT_WEIGHTS } from './evaluate';
import { checkWin, DIRECTIONS } from './rules';

// Total node budget (prevents any board/depth combo from freezing).
const MAX_NODES = 200_000;

export interface MoveResult {
  position: Position;
  blocked: boolean;
}

// Per-layer candidate cap: larger boards need tighter breadth.
function candidateLimit(boardSize: BoardSize): number {
  if (boardSize <= 5) return 16;
  if (boardSize === 7) return 12;
  return 8;
}

const keyOf = (p: Position) => `${p.x},${p.y},${p.z}`;

/**
 * Detect every opponent run of exactly length 3 along the 13 winning
 * directions that has at least one open (empty, in-bounds) end.
 * Returns the set of open-end cells that would block such a three.
 */
export function findBlockingMoves(
  stones: StoneData[],
  opponent: Player,
  boardSize: BoardSize
): Map<string, { count: number }> {
  const stoneMap = new Map<string, Player>();
  stones.forEach((s) => stoneMap.set(keyOf(s.position), s.player));

  const blockers = new Map<string, { count: number }>();
  const bump = (p: Position) => {
    const k = keyOf(p);
    const cur = blockers.get(k);
    if (cur) cur.count += 1;
    else blockers.set(k, { count: 1 });
  };

  const isOpen = (p: Position) =>
    p.x >= 0 && p.x < boardSize && p.y >= 0 && p.y < boardSize && p.z >= 0 && p.z < boardSize &&
    !stoneMap.has(keyOf(p));

  for (const stone of stones) {
    if (stone.player !== opponent) continue;
    for (const dir of DIRECTIONS) {
      // Walk backwards to the start of this contiguous opponent run.
      const behind: Position = {
        x: stone.position.x - dir.x,
        y: stone.position.y - dir.y,
        z: stone.position.z - dir.z,
      };
      if (behind.x >= 0 && behind.x < boardSize && behind.y >= 0 && behind.y < boardSize && behind.z >= 0 && behind.z < boardSize &&
          stoneMap.get(keyOf(behind)) === opponent) continue;

      const run: Position[] = [stone.position];
      for (let i = 1; i < 5; i++) {
        const p = {
          x: stone.position.x + dir.x * i,
          y: stone.position.y + dir.y * i,
          z: stone.position.z + dir.z * i,
        };
        if (p.x < 0 || p.x >= boardSize || p.y < 0 || p.y >= boardSize || p.z < 0 || p.z >= boardSize) break;
        if (stoneMap.get(keyOf(p)) !== opponent) break;
        run.push(p);
      }

      if (run.length !== 3) continue;

      const end1 = {
        x: run[run.length - 1].x + dir.x,
        y: run[run.length - 1].y + dir.y,
        z: run[run.length - 1].z + dir.z,
      };
      const end2 = {
        x: run[0].x - dir.x,
        y: run[0].y - dir.y,
        z: run[0].z - dir.z,
      };
      if (isOpen(end1)) bump(end1);
      if (isOpen(end2)) bump(end2);
    }
  }

  return blockers;
}

export function findBestMove(
  stones: StoneData[],
  aiPlayer: Player,
  boardSize: BoardSize,
  weights: EvalWeights = DEFAULT_WEIGHTS,
  maxDepth: number = 3,
  blockWeight: number = 1.0
): MoveResult {
  const candidates = getCandidatePositions(stones, boardSize);
  if (candidates.length === 0) return { position: { x: 0, y: 0, z: 0 }, blocked: false };

  // 1) AI wins immediately -> take it.
  for (const move of candidates) {
    const test = [...stones, { position: move, player: aiPlayer }];
    if (checkWin(test, boardSize)) return { position: move, blocked: false };
  }

  const opponent: Player = aiPlayer === 'black' ? 'white' : 'black';

  // 2) Opponent would win next move -> block it.
  for (const move of candidates) {
    const test = [...stones, { position: move, player: opponent }];
    if (checkWin(test, boardSize)) return { position: move, blocked: true };
  }

  // 3) Opponent has an open/closed three -> block its open end(s).
  if (blockWeight > 0) {
    const blockers = findBlockingMoves(stones, opponent, boardSize);
    if (blockers.size > 0) {
      let best: Position | null = null;
      let bestScore = -Infinity;
      for (const [k, info] of blockers) {
        const [x, y, z] = k.split(',').map(Number);
        const move = { x, y, z };
        const s = info.count * 1000 + orderScore(move, stones, aiPlayer, boardSize);
        if (s > bestScore) {
          bestScore = s;
          best = move;
        }
      }
      if (best) return { position: best, blocked: true };
    }
  }

  const depth = Math.min(maxDepth, 3);
  const limit = candidateLimit(boardSize);
  if (maxDepth <= 2) {
    // Easy: keep the search shallow and narrow for quick, forgiving play.
    const narrowed = candidates.slice(0, Math.max(4, Math.floor(limit / 2)));
    const scored = narrowed
      .map(move => ({ move, s: orderScore(move, stones, aiPlayer, boardSize) }))
      .sort((a, b) => b.s - a.s);
    return { position: scored[0].move, blocked: false };
  }

  let ordered = candidates;
  if (stones.length > 1) {
    ordered = candidates
      .map(move => ({ move, score: orderScore(move, stones, aiPlayer, boardSize) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.move);
  } else {
    ordered = ordered.slice(0, limit);
  }

  let bestScore = -Infinity;
  let bestMove = ordered[0];
  let nodes = 0;

  for (const move of ordered) {
    const newStones = [...stones, { position: move, player: aiPlayer }];
    const score = minimax(
      newStones, depth - 1, false, aiPlayer, boardSize, weights,
      -Infinity, Infinity, limit
    );
    nodes++;
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    if (nodes >= MAX_NODES) break;
  }

  return { position: bestMove, blocked: false };
}

// Heuristic ordering: favor center, proximity to stones, and blocking a three.
function orderScore(
  move: Position,
  stones: StoneData[],
  aiPlayer: Player,
  boardSize: BoardSize
): number {
  let score = 0;
  const center = (boardSize - 1) / 2;
  const distCenter = Math.abs(move.x - center) + Math.abs(move.y - center) + Math.abs(move.z - center);
  score += (3 * center - distCenter) * 0.5;
  for (const s of stones) {
    const d = Math.abs(s.position.x - move.x) + Math.abs(s.position.y - move.y) + Math.abs(s.position.z - move.z);
    if (d === 1) score += s.player === aiPlayer ? 8 : 10;
    else if (d === 2) score += s.player === aiPlayer ? 4 : 5;
    else if (d <= 3) score += 1;
  }
  return score;
}

function minimax(
  stones: StoneData[],
  depth: number,
  isMaximizing: boolean,
  aiPlayer: Player,
  boardSize: BoardSize,
  weights: EvalWeights,
  alpha: number,
  beta: number,
  limit: number
): number {
  const score = evaluatePosition(stones, aiPlayer, boardSize, weights);

  if (Math.abs(score) >= weights.FIVE || depth <= 0) {
    return score;
  }

  const currentPlayer = isMaximizing ? aiPlayer : (aiPlayer === 'black' ? 'white' : 'black');
  let candidates = getCandidatePositions(stones, boardSize);
  if (candidates.length === 0) return score;

  if (isMaximizing) {
    candidates = candidates
      .map(move => ({ move, s: orderScore(move, stones, currentPlayer, boardSize) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map(x => x.move);
    let maxEval = -Infinity;
    for (const move of candidates) {
      const newStones = [...stones, { position: move, player: currentPlayer }];
      const evalScore = minimax(newStones, depth - 1, false, aiPlayer, boardSize, weights, alpha, beta, limit);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    candidates = candidates
      .map(move => ({ move, s: -orderScore(move, stones, currentPlayer, boardSize) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map(x => x.move);
    let minEval = Infinity;
    for (const move of candidates) {
      const newStones = [...stones, { position: move, player: currentPlayer }];
      const evalScore = minimax(newStones, depth - 1, true, aiPlayer, boardSize, weights, alpha, beta, limit);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}
