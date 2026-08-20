import { Position, Player, StoneData, BoardSize, GameMode } from '../types';
import { findAlignedRuns } from './rules';

export interface OpenThreat {
  player: Player;
  run: Position[];
  openEnds: Position[];
  len: number;
}

/**
 * Find every open threat: aligned runs of exactly length 3 or 4 with at least
 * one legal open end (empty, in-bounds). Length-5 runs are wins and are handled
 * by the victory flow, so they are intentionally excluded here.
 */
export function getOpenThreats(stones: StoneData[], boardSize: BoardSize): OpenThreat[] {
  const occupied = new Set(stones.map((s) => `${s.position.x},${s.position.y},${s.position.z}`));
  const isOpen = (p: Position) =>
    p.x >= 0 && p.x < boardSize && p.y >= 0 && p.y < boardSize && p.z >= 0 && p.z < boardSize &&
    !occupied.has(`${p.x},${p.y},${p.z}`);

  const out: OpenThreat[] = [];
  for (const run of findAlignedRuns(stones, boardSize, 3)) {
    const len = run.positions.length;
    if (len < 3 || len > 4) continue;

    const first = run.positions[0];
    const last = run.positions[len - 1];
    const dx = Math.sign(last.x - first.x);
    const dy = Math.sign(last.y - first.y);
    const dz = Math.sign(last.z - first.z);

    const openEnds: Position[] = [];
    const e1 = { x: last.x + dx, y: last.y + dy, z: last.z + dz };
    const e2 = { x: first.x - dx, y: first.y - dy, z: first.z - dz };
    if (isOpen(e1)) openEnds.push(e1);
    if (isOpen(e2)) openEnds.push(e2);

    if (openEnds.length > 0) {
      out.push({ player: run.player, run: run.positions, openEnds, len });
    }
  }
  return out;
}

/**
 * Guide color for a threat: in AI mode the opponent's threats are flagged red
 * (#f87171); own threats keep the run color (black=amber, white=blue). In PvP
 * both sides use their run color.
 */
export function threatColor(player: Player, gameMode: GameMode, humanPlayer: Player): string {
  const opponent = gameMode === 'ai' ? (humanPlayer === 'black' ? 'white' : 'black') : null;
  if (opponent !== null && player === opponent) return '#f87171';
  return player === 'black' ? '#fbbf24' : '#60a5fa';
}