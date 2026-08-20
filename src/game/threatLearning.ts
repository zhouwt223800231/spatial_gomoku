import { Position, Player, StoneData, BoardSize } from '../types';
import { DIRECTIONS } from './evaluate';

/**
 * Threat learning library: remembers which threat patterns (open three / four
 * in various directions) led to AI wins. Persisted in localStorage.
 */
const KEY = 'spatial_gomoku_threat_stats_v1';
const MAX_ENTRIES = 2000;

interface ThreatEntry {
  w: number; // AI wins when this pattern was played
  n: number; // total times this pattern was played by the AI
}

type ThreatStats = Record<string, ThreatEntry>;

const keyOf = (p: Position) => `${p.x},${p.y},${p.z}`;

export interface ThreatFeature {
  openThreats: number;
  hasZ: boolean;
  hasDiag: boolean;
  axisCount: number;
}

export function loadThreatStats(): ThreatStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as ThreatStats;
    }
  } catch { /* ignore */ }
  return {};
}

function saveThreatStats(stats: ThreatStats): void {
  try {
    const entries = Object.entries(stats);
    if (entries.length > MAX_ENTRIES) {
      const sorted = entries.sort((a, b) => b[1].n - a[1].n).slice(0, MAX_ENTRIES);
      localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(sorted)));
    } else {
      localStorage.setItem(KEY, JSON.stringify(stats));
    }
  } catch { /* ignore */ }
}

/**
 * Simulate placing a stone for `player` at `move` and summarize the threats
 * that stone creates across all 13 directions.
 */
export function computeThreatFeature(
  stones: StoneData[],
  move: Position,
  player: Player,
  boardSize: BoardSize
): ThreatFeature {
  const stoneMap = new Map<string, Player>();
  stones.forEach((s) => stoneMap.set(keyOf(s.position), s.player));
  stoneMap.set(keyOf(move), player);

  const open = (p: Position) =>
    p.x >= 0 && p.x < boardSize && p.y >= 0 && p.y < boardSize && p.z >= 0 && p.z < boardSize &&
    !stoneMap.has(keyOf(p));

  let openThreats = 0;
  let hasZ = false;
  let hasDiag = false;
  let axisCount = 0;

  for (const dir of DIRECTIONS) {
    const forward: Position[] = [];
    for (let i = 1; i < 5; i++) {
      const p = { x: move.x + dir.x * i, y: move.y + dir.y * i, z: move.z + dir.z * i };
      if (p.x < 0 || p.x >= boardSize || p.y < 0 || p.y >= boardSize || p.z < 0 || p.z >= boardSize) break;
      if (stoneMap.get(keyOf(p)) === player) forward.push(p);
      else break;
    }
    const backward: Position[] = [];
    for (let i = 1; i < 5; i++) {
      const p = { x: move.x - dir.x * i, y: move.y - dir.y * i, z: move.z - dir.z * i };
      if (p.x < 0 || p.x >= boardSize || p.y < 0 || p.y >= boardSize || p.z < 0 || p.z >= boardSize) break;
      if (stoneMap.get(keyOf(p)) === player) backward.push(p);
      else break;
    }
    const line = [move, ...forward, ...backward];
    if (line.length < 3) continue;

    // True open ends: the far +dir stone's next cell, and the far -dir stone's next cell.
    const farPlus = forward.length > 0 ? forward[forward.length - 1] : move;
    const farMinus = backward.length > 0 ? backward[backward.length - 1] : move;
    const e1 = { x: farPlus.x + dir.x, y: farPlus.y + dir.y, z: farPlus.z + dir.z };
    const e2 = { x: farMinus.x - dir.x, y: farMinus.y - dir.y, z: farMinus.z - dir.z };
    const openEnds = (open(e1) ? 1 : 0) + (open(e2) ? 1 : 0);

    const isFour = line.length >= 4;
    const isOpenThree = line.length === 3 && openEnds >= 2;
    if (!(isFour && openEnds >= 1) && !isOpenThree) continue;

    openThreats++;
    if (dir.z !== 0) hasZ = true;
    if (Math.abs(dir.x) + Math.abs(dir.y) + Math.abs(dir.z) === 3) hasDiag = true;
    if ((dir.x !== 0 && dir.y === 0 && dir.z === 0) ||
        (dir.y !== 0 && dir.x === 0 && dir.z === 0) ||
        (dir.z !== 0 && dir.x === 0 && dir.y === 0)) axisCount++;
  }

  return { openThreats, hasZ, hasDiag, axisCount };
}

export function threatFeatureKey(f: ThreatFeature): string {
  return `openThreats=${f.openThreats};hasZ=${f.hasZ ? 1 : 0};hasDiag=${f.hasDiag ? 1 : 0};axisCount=${f.axisCount}`;
}

/**
 * Record that a player played a move creating this feature.
 * @param player the player who made the move
 * @param winner  the final winner of the game (null = draw)
 */
export function recordThreatFeature(f: ThreatFeature, player: Player, winner: Player | null): void {
  if (f.openThreats === 0) return;
  const stats = loadThreatStats();
  const k = threatFeatureKey(f);
  const entry = stats[k] ?? { w: 0, n: 0 };
  entry.n += 1;
  if (winner === player) entry.w += 1;
  stats[k] = entry;
  saveThreatStats(stats);
}

/**
 * Historical win rate (0..1) for this threat feature from the perspective of
 * player; 0 if unknown.
 */
export function queryThreatWinRate(f: ThreatFeature, player: Player): number {
  if (f.openThreats === 0) return 0;
  const entry = loadThreatStats()[threatFeatureKey(f)];
  if (!entry || entry.n === 0) return 0;
  // Entries are mixed across colors; approximate per-player win rate by
  // weighting with 0.5 when the stored winner is unknown is not possible.
  // We keep a single stat table and report the aggregate win rate.
  return entry.w / entry.n;
}
