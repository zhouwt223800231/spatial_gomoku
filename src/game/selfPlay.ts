import { Position, Player, StoneData, BoardSize } from '../types';
import { findBestMove } from './ai';
import { DEFAULT_WEIGHTS } from './evaluate';
import { recordGameOutcome } from './openingBook';
import { computeThreatFeature, recordThreatFeature } from './threatLearning';
import { checkWin } from './rules';

export interface SelfPlayResult {
  winner: Player | null; // null = draw
}

/**
 * Run one lightweight self-play game (AI vs AI) and feed the winning move
 * sequence into the opening book + threat learning library.
 */
export function runSelfPlayGame(boardSize: BoardSize = 5): SelfPlayResult {
  let stones: StoneData[] = [];
  let current: Player = 'black';
  const moves: Position[] = [];
  // Collect each move's threat feature so we can reward them once the winner is known.
  const features: { player: Player; feature: ReturnType<typeof computeThreatFeature> }[] = [];

  for (let step = 0; step < boardSize * boardSize * boardSize; step++) {
    const weights = { ...DEFAULT_WEIGHTS, DEFENSE: 1.2, ATTACK: 1.2 };
    const result = findBestMove(stones, current, boardSize, weights, 2, 0.6, 6_000, false);
    const feature = computeThreatFeature(stones, result.position, current, boardSize);
    features.push({ player: current, feature });
    stones = [...stones, { position: result.position, player: current }];
    moves.push(result.position);

    const win = checkWin(stones, boardSize);
    if (win) {
      recordGameOutcome(moves, win.player);
      // Reward each feature based on whether its player won (black perspective = aiWon for black).
      for (const f of features) {
        const won = f.player === win.player;
        recordThreatFeature(f.feature, won);
      }
      return { winner: win.player };
    }
    current = current === 'black' ? 'white' : 'black';
  }

  recordGameOutcome(moves, null);
  // Draw: no win reward.
  return { winner: null };
}
