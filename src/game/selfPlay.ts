import { Position, Player, StoneData, BoardSize } from '../types';
import { findBestMove } from './ai';
import { DEFAULT_WEIGHTS } from './evaluate';
import { recordGameOutcome } from './openingBook';
import { checkWin } from './rules';

/**
 * Run one lightweight self-play game (AI vs AI) and feed the winning move
 * sequence into the opening book. Used in idle time to gradually strengthen
 * the AI across consecutive sessions.
 */
export function runSelfPlayGame(boardSize: BoardSize = 5): void {
  let stones: StoneData[] = [];
  let current: Player = 'black';
  const moves: Position[] = [];

  for (let step = 0; step < boardSize * boardSize * boardSize; step++) {
    const weights = { ...DEFAULT_WEIGHTS, DEFENSE: 1.2, ATTACK: 1.2 };
    const result = findBestMove(stones, current, boardSize, weights, 2, 0.6, 6_000, false);
    stones = [...stones, { position: result.position, player: current }];
    moves.push(result.position);

    const win = checkWin(stones, boardSize);
    if (win) {
      recordGameOutcome(moves, win.player);
      return;
    }
    current = current === 'black' ? 'white' : 'black';
  }

  // Board full without a winner: record a draw (winner null = no record).
  recordGameOutcome(moves, null);
}
