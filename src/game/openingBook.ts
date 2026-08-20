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

// Sign-flip transforms on each axis (covers mirrors and 180 rotations).
// Index: 0=+++, 1=++-, 2=+-+, 3=+--, 4=-++, 5=-+-, 6=--+, 7=---.
function signVariant(p: Position, v: number): Position {
  return {
    x: (v & 4 ? -1 : 1) * p.x,
    y: (v & 2 ? -1 : 1) * p.y,
    z: (v & 1 ? -1 : 1) * p.z,
  };
}

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

/** Return the normalized key and the sign-variant index that produced it. */
export function normalizeVariant(moves: Position[]): { relKey: string; variant: number } {
  const base = moves[0];
  let best: string | null = null;
  let bestVariant = 0;
  for (let v = 0; v < 8; v++) {
    const rel = moves
      .map((m) => {
        const q = signVariant({ x: m.x - base.x, y: m.y - base.y, z: m.z - base.z }, v);
        return `${q.x},${q.y},${q.z}`;
      })
      .join('|');
    if (best === null || rel < best) {
      best = rel;
      bestVariant = v;
    }
  }
  return { relKey: best ?? '', variant: bestVariant };
}

export function normalizeMovesKey(moves: Position[]): string {
  return normalizeVariant(moves).relKey;
}

/** Build the full book key from a move sequence plus the next move. */
function buildKey(moves: Position[], next: Position): string {
  const { relKey, variant } = normalizeVariant(moves);
  const base = moves[0];
  const relNext = signVariant({ x: next.x - base.x, y: next.y - base.y, z: next.z - base.z }, variant);
  return `${relKey}>>${relNext.x},${relNext.y},${relNext.z}`;
}

/** Record one finished game's full move sequence into the book. */
export function recordGameOutcome(moves: Position[], winner: Player | null): void {
  if (moves.length < 2 || !winner) return;
  const book = loadBook();
  for (let n = 2; n <= 5; n++) {
    for (let i = 0; i + n < moves.length; i++) {
      const suffix = moves.slice(i, i + n);
      const next = moves[i + n];
      const entryKey = buildKey(suffix, next);
      const entry = book[entryKey] ?? { w: 0, n: 0 };
      entry.n += 1;
      if (winner === (i % 2 === 0 ? 'black' : 'white')) entry.w += 1;
      book[entryKey] = entry;
    }
  }
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
 * The stored next move is relative to the suffix's first stone in the
 * normalized frame; we recover it via the matching variant.
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
    const seq = stones.slice(stones.length - n).map((s) => s.position);
    const base = seq[0];
    const { relKey: suffixKey, variant } = normalizeVariant(seq);
    for (const [k, entry] of Object.entries(book)) {
      if (!k.startsWith(`${suffixKey}>>`)) continue;
      const nextRel = k.slice(k.lastIndexOf('>>') + 2).split(',').map(Number);
      // The stored next is relative in the suffix's variant frame; apply the
      // same variant to recover the absolute move.
      const inv = signVariant({ x: nextRel[0], y: nextRel[1], z: nextRel[2] }, variant);
      const move: Position = { x: base.x + inv.x, y: base.y + inv.y, z: base.z + inv.z };
      const kk = posKey(move);
      if (occupied.has(kk) || seen.has(kk)) continue;
      if (move.x < 0 || move.x >= boardSize || move.y < 0 || move.y >= boardSize || move.z < 0 || move.z >= boardSize) continue;
      seen.add(kk);
      const winRate = entry.n > 0 ? entry.w / entry.n : 0;
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
