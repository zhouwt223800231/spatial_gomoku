import { Position, Player, StoneData, BoardSize } from '../types';
import { getCandidatePositions } from './rules';
import { evaluatePosition, EvalWeights, DEFAULT_WEIGHTS } from './evaluate';
import { checkWin } from './rules';

/**
 * Minimax + Alpha-Beta。
 *
 * v2 性能保护：
 * - 候选点按启发式排序（先看离已有棋子近、且有相邻子威胁的位置），配合 alpha-beta 剪枝可大幅减枝。
 * - 每层候选数按棋盘大小动态限制，避免 7×7×7 / 9×9×9 指数爆炸。
 * - 增加绝对深度上限，防止自适应权重把 maxDepth 抬到不可用。
 */

// 总节点预算上限（防止任意棋盘/深度组合卡死）
const MAX_NODES = 200_000;

// 每层候选上限：棋盘越大，搜索宽度越需收紧
function candidateLimit(boardSize: BoardSize): number {
  if (boardSize <= 5) return 16;
  if (boardSize === 7) return 12;
  return 8;
}

export function findBestMove(
  stones: StoneData[],
  aiPlayer: Player,
  boardSize: BoardSize,
  weights: EvalWeights = DEFAULT_WEIGHTS,
  maxDepth: number = 3
): Position {
  const candidates = getCandidatePositions(stones, boardSize);
  if (candidates.length === 0) return { x: 0, y: 0, z: 0 };

  // AI 如果已有胜着，直接选最优先
  for (const move of candidates) {
    const test = [...stones, { position: move, player: aiPlayer }];
    if (checkWin(test, boardSize)) return move;
  }

  // 防守：如果对手下一步能赢，优先封堵
  const opponent: Player = aiPlayer === 'black' ? 'white' : 'black';
  for (const move of candidates) {
    const test = [...stones, { position: move, player: opponent }];
    if (checkWin(test, boardSize)) return move;
  }

  const depth = Math.min(maxDepth, 3); // 绝对上限保护：任何情况下不超过 3 层
  const limit = candidateLimit(boardSize);

  // 按启发式评分排序，让更可能的落点在剪枝时更早被评估
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

  return bestMove;
}

// 启发式排序分：距离最近己方/对方棋子越近越优先，且偏好的进攻/防守方向偏高
function orderScore(
  move: Position,
  stones: StoneData[],
  aiPlayer: Player,
  boardSize: BoardSize
): number {
  let score = 0;
  const center = (boardSize - 1) / 2;
  const distCenter = Math.abs(move.x - center) + Math.abs(move.y - center) + Math.abs(move.z - center);
  score += (3 * center - distCenter) * 0.5; // 偏中心

  for (const s of stones) {
    const d = Math.abs(s.position.x - move.x) + Math.abs(s.position.y - move.y) + Math.abs(s.position.z - move.z);
    if (d === 1) score += s.player === aiPlayer ? 8 : 10; // 贴邻：对方威胁更大优先防
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

  // 同层也做启发式排序，加速剪枝
  if (isMaximizing) {
    candidates = candidates
      .map(move => ({ move, s: orderScore(move, stones, currentPlayer, boardSize) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map(x => x.move);
  } else {
    // 极小层优先看防守价值高的点（等效：让对手威胁被尽早评估）
    candidates = candidates
      .map(move => ({ move, s: -orderScore(move, stones, currentPlayer, boardSize) }))
      .sort((a, b) => a.s - b.s)
      .slice(0, limit)
      .map(x => x.move);
  }

  if (isMaximizing) {
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
