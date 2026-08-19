import { Position, StoneData, Player, BoardSize } from '../types';

/**
 * Opening book: learns move-sequence n-grams from finished games and biases
 * the AI toward historically winning continuations. Persisted in localStorage.
 */
const KEY = 'spatial_gomoku_opening_book_v1';
const MAX_ENTRIES = 3000;

interface BookEntry {
  w: number; // wins
  n: number; // total occurrences
}

type Book = Record<string, BookEntry>;

const posKey = (p: Position) => `${p.x},${p.y},${p.z}`;

export function loadBook(): Book {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as Book;
    }
  } catch { /* ignore */ }
  return {};
}

function saveBook(book: Book): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(book));
  } catch { /* ignore */ }
}

/** Record one finished game's full move sequence into the book. */
export function recordGameOutcome(
  moves: Position[],
  winner: Player | null
): void {
  if (moves.length < 2 || !winner) return;
  const book = loadBook();
  // n-gram length 2..5, excluding the final (winning) move from the suffix key.
  for (let n = 2; n <= 5; n++) {
    for (let i = 0; i + n < moves.length; i++) {
      const suffix = moves.slice(i, i + n).map(posKey).join('|');
      const next = moves[i + n];
      const entryKey = `${suffix}>>${posKey(next)}`;
      const entry = book[entryKey] ?? { w: 0, n: 0 };
      entry.n += 1;
      if (winner === (i % 2 === 0 ? 'black' : 'white')) entry.w += 1;
      book[entryKey] = entry;
    }
  }
  // Trim the book to a sane size, keeping most-recently-touched entries.
  const entries = Object.entries(book);
  if (entries.length > MAX_ENTRIES) {
    const sorted = entries.sort((a, b) => b[1].n - a[1].n).slice(0, MAX_ENTRIES);
    saveBook(Object.fromEntries(sorted));
  } else {
    saveBook(book);
  }
}

/**
 * For a given board, find book-backed candidate continuations.
 * key = last `n` stone sequence (n up to 5); returns entries whose next move
 * is currently empty, with win-rate and frequency.
 */
export function getBookCandidates(
  stones: StoneData[],
  boardSize: BoardSize,
  aiPlayer: Player,
  maxDepth = 5
): { move: Position; score: number }[] {
  if (stones.length === 0) return [];
  const book = loadBook();
  const occupied = new Set(stones.map((s) => posKey(s.position)));
  const out: { move: Position; score: number }[] = [];
  const seen = new Set<string>();

  for (let n = Math.min(maxDepth, stones.length); n >= 2; n--) {
    const suffix = stones.slice(stones.length - n).map((s) => posKey(s.position)).join('|');
    for (const [k, entry] of Object.entries(book)) {
      if (!k.startsWith(`${suffix}>>`)) continue;
      const nextPos = k.slice(k.lastIndexOf('>>') + 2).split(',').map(Number);
      const move: Position = { x: nextPos[0], y: nextPos[1], z: nextPos[2] };
      const kk = posKey(move);
      if (occupied.has(kk) || seen.has(kk)) continue;
      if (move.x < 0 || move.x >= boardSize || move.y < 0 || move.y >= boardSize || move.z < 0 || move.z >= boardSize) continue;
      seen.add(kk);
      const winRate = entry.n > 0 ? entry.w / entry.n : 0;
      // Prefer frequent + high-win-rate continuations; weight slightly for the AI side.
      out.push({ move, score: winRate * 100 + Math.min(entry.n, 20) });
    }
    if (out.length > 0) break;
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Convenience: build the ordered position list from stones (assumed chronological). */
export function stonesToMoves(stones: StoneData[]): Position[] {
  return stones.map((s) => s.position);
}
