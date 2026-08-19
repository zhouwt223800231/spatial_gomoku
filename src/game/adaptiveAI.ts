import { PlayerProfile, AiDifficulty } from '../types';
import { EvalWeights, DEFAULT_WEIGHTS } from './evaluate';
import type { AIExperience } from '../types';
import { loadAIExperience, difficultyDepth, difficultyBlockWeight } from './aiExperience';

export interface AdaptiveResult {
  weights: EvalWeights;
  maxDepth: number;
  blockWeight: number;
  nodeBudget: number;
  useBook: boolean;
  insight: string | null;
}

function difficultyNodeBudget(d: AiDifficulty): number {
  return d === 'easy' ? 20_000 : d === 'hard' ? 180_000 : 80_000;
}

export function getAdaptiveWeights(
  profile: PlayerProfile,
  gameCount: number,
  difficulty: AiDifficulty = 'normal',
  experience?: AIExperience
): AdaptiveResult {
  const weights = { ...DEFAULT_WEIGHTS };
  const exp = experience ?? loadAIExperience();
  let maxDepth = difficultyDepth(difficulty);
  let blockWeight = difficultyBlockWeight(difficulty);
  let nodeBudget = difficultyNodeBudget(difficulty);
  let useBook = difficulty !== 'easy';
  let insight: string | null = null;

  // --- Easy: forgiving and fast ---
  if (difficulty === 'easy') {
    maxDepth = 2;
    weights.ATTACK = 0.7;
    blockWeight = 0;
    nodeBudget = 20_000;
    useBook = false;
  }

  // --- Experience / win-rate feedback (learning library) ---
  const winRate = exp.totalGames > 0 ? exp.wins / exp.totalGames : 0.5;
  if (exp.totalGames >= 3) {
    if (winRate > 0.65) {
      weights.ATTACK = 1.25;
      weights.DEFENSE = 1.15;
      if (difficulty === 'hard') nodeBudget = 220_000;
      insight = 'AI library: strong record recently - attacking more confidently';
    } else if (winRate < 0.4) {
      weights.DEFENSE = 1.4;
      weights.ATTACK = 0.9;
      nodeBudget = Math.max(nodeBudget, 100_000);
      insight = 'AI library: recent losses - defending more carefully';
    }
  }

  if (exp.recentLossByOpenThree >= 2) {
    blockWeight = Math.max(blockWeight, 1.6);
    weights.DEFENSE = Math.max(weights.DEFENSE, 1.5);
    insight = 'AI library: you often win through open threes - blocking harder';
  }

  // --- Player-profile based adjustments (honest wording) ---
  const pWinRate = profile.totalGames > 0 ? profile.wins / profile.totalGames : 0.5;
  if (pWinRate > 0.7) {
    weights.DEFENSE = Math.max(weights.DEFENSE, 1.2);
  } else if (pWinRate < 0.3) {
    weights.ATTACK = Math.min(weights.ATTACK, 0.8);
    if (!insight) insight = 'Observed: you win less than 30% - AI playing at a gentler setting';
  }

  const zVuln = profile.vulnerabilities.find(v => v.direction === 'Z_AXIS');
  if (zVuln && zVuln.exposureRate > 0.5) {
    weights.Z_AXIS = 50;
    if (!insight) insight = 'Observed: you rarely use the Z axis - AI weights vertical lines higher';
  }

  const diagVuln = profile.vulnerabilities.find(v => v.direction === 'DIAGONAL');
  if (diagVuln && diagVuln.exposureRate > 0.5) {
    weights.DIAGONAL = 30;
    if (!insight) insight = 'Observed: you play few diagonals - AI weights diagonals higher';
  }

  if (profile.style.aggressiveness > 0.7) {
    weights.DEFENSE = Math.max(weights.DEFENSE, 1.3);
    weights.ATTACK = Math.min(weights.ATTACK, 0.8);
    if (!insight) insight = 'Observed: your moves are aggressive - AI weights defense higher';
  }

  if (profile.style.patternConsistency > 0.8 && gameCount > 5) {
    weights.PATTERN_BREAK = 2.0;
    if (!insight) insight = 'Observed: your opening patterns repeat - AI adds pattern-break weight';
  }

  return { weights, maxDepth, blockWeight, nodeBudget, useBook, insight };
}
