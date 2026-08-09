import { PlayerProfile } from '../types';
import { EvalWeights, DEFAULT_WEIGHTS } from './evaluate';

export function getAdaptiveWeights(profile: PlayerProfile, gameCount: number): { weights: EvalWeights; maxDepth: number; insight: string | null } {
  const weights = { ...DEFAULT_WEIGHTS };
  let maxDepth = 3;
  let insight: string | null = null;

  const winRate = profile.totalGames > 0 ? profile.wins / profile.totalGames : 0.5;

  if (winRate > 0.7) {
    maxDepth = 4;
    weights.DEFENSE = 1.2;
  } else if (winRate < 0.3) {
    maxDepth = 2;
    weights.ATTACK = 0.8;
    insight = 'AI lowered difficulty to give you more room to practice';
  }

  const zVuln = profile.vulnerabilities.find(v => v.direction === 'Z_AXIS');
  if (zVuln && zVuln.exposureRate > 0.5) {
    weights.Z_AXIS = 50;
    insight = 'AI detected weak Z-axis defense, strengthening vertical attack';
  }

  const diagVuln = profile.vulnerabilities.find(v => v.direction === 'DIAGONAL');
  if (diagVuln && diagVuln.exposureRate > 0.5) {
    weights.DIAGONAL = 30;
    if (!insight) insight = 'AI is adjusting strategy to counter your diagonal play';
  }

  if (profile.style.aggressiveness > 0.7) {
    weights.DEFENSE = 1.3;
    weights.ATTACK = 0.7;
    if (!insight) insight = 'AI is strengthening defense against your aggressive style';
  }

  if (profile.style.patternConsistency > 0.8 && gameCount > 5) {
    weights.PATTERN_BREAK = 2.0;
    if (!insight) insight = 'AI detected your fixed pattern, preparing to break it';
  }

  return { weights, maxDepth, insight };
}
