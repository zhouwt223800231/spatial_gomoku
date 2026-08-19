import { Position, Player, StoneData, BoardSize } from '../types';
import { getCandidatePositions } from './rules';
import { evaluatePosition, EvalWeights, DEFAULT_WEIGHTS } from './evaluate';
import { checkWin, DIRECTIONS } from './rules';
import { getBookCandidates } from './openingBook';

export interface MoveResult {
  position: Position;
  blocked: boolean;
}

export interface SearchOptions {
  maxDepth: number;
  nodeBudget: number;
  blockWeight: number;
  useBook: boolean;
}

const keyOf = (p: Position) => `${p.x},${p.y},${p.z}`;

// Per-layer candidate cap: larger boards need tighter breadth.
function candidateLimit(boardSize: BoardSize): number {
  if (boardSize <= 5) return 20;
  if (boardSize === 7) return 14;
  return 10;
}

class NodeCounter {
  nodes = 0;
}

/**
 * Detect every opponent run of exactly length `len` along the 13 winning
 * directions that has at least one open (empty, in-bounds) end.
 */
export function findThreatEnds(
  stones: StoneData[],
  opponent: Player,
  boardSize: BoardSize,
  len: number
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
      if (run.length !== len) continue;

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

export function findBlockingMoves(stones: StoneData[], opponent: Player, boardSize: BoardSize) {
  return findThreatEnds(stones, opponent, boardSize, 3);
}

/** True if the opponent has a "live four" (four in a row, both ends open). */
function hasOpenFour(stones: StoneData[], opponent: Player, boardSize: BoardSize): boolean {
  const stoneMap = new Map<string, Player>();
  stones.forEach((s) => stoneMap.set(keyOf(s.position), s.player));
  const isOpen = (p: Position) =>
    p.x >= 0 && p.x < boardSize && p.y >= 0 && p.y < boardSize && p.z >= 0 && p.z < boardSize &&
    !stoneMap.has(keyOf(p));

  for (const stone of stones) {
    if (stone.player !== opponent) continue;
    for (const dir of DIRECTIONS) {
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
      if (run.length === 4) {
        const e1 = {
          x: run[run.length - 1].x + dir.x,
          y: run[run.length - 1].y + dir.y,
          z: run[run.length - 1].z + dir.z,
        };
        const e2 = { x: run[0].x - dir.x, y: run[0].y - dir.y, z: run[0].z - dir.z };
        if (isOpen(e1) && isOpen(e2)) return true;
      }
    }
  }
  return false;
}

export function findBestMove(
  stones: StoneData[],
  aiPlayer: Player,
  boardSize: BoardSize,
  weights: EvalWeights = DEFAULT_WEIGHTS,
  maxDepth: number = 3,
  blockWeight: number = 1.0,
  nodeBudget: number = 80_000,
  useBook: boolean = true
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

  // 3) Opponent has a live four (unblockable) -> fight for our own win; else block threes.
  if (hasOpenFour(stones, opponent, boardSize)) {
    const threatEnds = findThreatEnds(stones, opponent, boardSize, 4);
    if (threatEnds.size > 0) {
      const best = pickBestBlocker(threatEnds, stones, aiPlayer, boardSize);
      if (best) return { position: best, blocked: true };
    }
  } else if (blockWeight > 0) {
    const blockers = findThreatEnds(stones, opponent, boardSize, 3);
    if (blockers.size > 0) {
      const best = pickBestBlocker(blockers, stones, aiPlayer, boardSize);
      if (best) return { position: best, blocked: true };
    }
  }

  // 4) Opening book: prefer historically winning continuations early on.
  if (useBook && stones.length > 0 && stones.length <= 10) {
    const bookMoves = getBookCandidates(stones, boardSize, aiPlayer, 5);
    if (bookMoves.length > 0) {
      return { position: bookMoves[0].move, blocked: false };
    }
  }

  // 5) Iterative deepening with a node budget.
  const limit = candidateLimit(boardSize);
  const counter = new NodeCounter();
  let bestMove = candidates[0];
  let bestScore = -Infinity;
  const maxSearchDepth = Math.min(maxDepth, 5);

  for (let depth = 2; depth <= maxSearchDepth; depth++) {
    let depthBest = bestMove;
    let depthBestScore = -Infinity;
    let ordered: { move: Position; s: number }[] = candidates.map((move) => ({ move, s: orderScore(move, stones, aiPlayer, boardSize) }));
    if (stones.length > 1) {
      ordered = ordered.sort((a, b) => b.s - a.s).slice(0, limit);
    }
    for (const { move } of ordered) {
      if (counter.nodes >= nodeBudget) break;
      const newStones = [...stones, { position: move, player: aiPlayer }];
      const score = minimax(newStones, depth - 1, false, aiPlayer, boardSize, weights, -Infinity, Infinity, limit, counter, nodeBudget);
      if (score > depthBestScore) {
        depthBestScore = score;
        depthBest = move;
      }
    }
    if (counter.nodes >= nodeBudget) break;
    bestMove = depthBest;
    bestScore = depthBestScore;
  }

  return { position: bestMove, blocked: false };
}

function pickBestBlocker(
  blockers: Map<string, { count: number }>,
  stones: StoneData[],
  aiPlayer: Player,
  boardSize: BoardSize
): Position | null {
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
  return best;
}

// Heuristic ordering: favor center, proximity to stones, and blocking a three.
function orderScore(move: Position, stones: StoneData[], aiPlayer: Player, boardSize: BoardSize): number {
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
  limit: number,
  counter: NodeCounter,
  nodeBudget: number
): number {
  counter.nodes += 1;
  if (counter.nodes >= nodeBudget) return 0;

  const score = evaluatePosition(stones, aiPlayer, boardSize, weights);
  if (Math.abs(score) >= weights.FIVE || depth <= 0) return score;

  const currentPlayer = isMaximizing ? aiPlayer : (aiPlayer === 'black' ? 'white' : 'black');
  let candidates = getCandidatePositions(stones, boardSize);
  if (candidates.length === 0) return score;

  if (isMaximizing) {
    candidates = candidates
      .map((move) => ({ move, s: orderScore(move, stones, currentPlayer, boardSize) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x.move);
    let maxEval = -Infinity;
    for (const move of candidates) {
      const newStones = [...stones, { position: move, player: currentPlayer }];
      const evalScore = minimax(newStones, depth - 1, false, aiPlayer, boardSize, weights, alpha, beta, limit, counter, nodeBudget);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    candidates = candidates
      .map((move) => ({ move, s: -orderScore(move, stones, currentPlayer, boardSize) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x.move);
    let minEval = Infinity;
    for (const move of candidates) {
      const newStones = [...stones, { position: move, player: currentPlayer }];
      const evalScore = minimax(newStones, depth - 1, true, aiPlayer, boardSize, weights, alpha, beta, limit, counter, nodeBudget);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}
