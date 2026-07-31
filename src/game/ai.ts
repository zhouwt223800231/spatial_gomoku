import { Position, Player, StoneData, BoardSize } from '../types';
import { getCandidatePositions } from './rules';
import { evaluatePosition, EvalWeights, DEFAULT_WEIGHTS } from './evaluate';

export function findBestMove(
  stones: StoneData[],
  aiPlayer: Player,
  boardSize: BoardSize,
  weights: EvalWeights = DEFAULT_WEIGHTS,
  maxDepth: number = 3
): Position {
  const candidates = getCandidatePositions(stones, boardSize);
  if (candidates.length === 0) return { x: 0, y: 0, z: 0 };

  let bestScore = -Infinity;
  let bestMove = candidates[0];

  for (const move of candidates) {
    const newStones = [...stones, { position: move, player: aiPlayer }];
    const score = minimax(newStones, maxDepth - 1, false, aiPlayer, boardSize, weights, -Infinity, Infinity);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function minimax(
  stones: StoneData[],
  depth: number,
  isMaximizing: boolean,
  aiPlayer: Player,
  boardSize: BoardSize,
  weights: EvalWeights,
  alpha: number,
  beta: number
): number {
  const score = evaluatePosition(stones, aiPlayer, boardSize, weights);

  if (Math.abs(score) >= weights.FIVE || depth === 0) {
    return score;
  }

  const currentPlayer = isMaximizing ? aiPlayer : (aiPlayer === 'black' ? 'white' : 'black');
  const candidates = getCandidatePositions(stones, boardSize).slice(0, 20);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of candidates) {
      const newStones = [...stones, { position: move, player: currentPlayer }];
      const evalScore = minimax(newStones, depth - 1, false, aiPlayer, boardSize, weights, alpha, beta);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of candidates) {
      const newStones = [...stones, { position: move, player: currentPlayer }];
      const evalScore = minimax(newStones, depth - 1, true, aiPlayer, boardSize, weights, alpha, beta);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}
