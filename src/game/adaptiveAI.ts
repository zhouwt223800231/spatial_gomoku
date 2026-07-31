import { PlayerProfile, EvalWeights, DEFAULT_WEIGHTS } from '../types';

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
    insight = 'AI降低难度，给你更多练习空间';
  }

  const zVuln = profile.vulnerabilities.find(v => v.direction === 'Z_AXIS');
  if (zVuln && zVuln.exposureRate > 0.5) {
    weights.Z_AXIS = 50;
    insight = 'AI发现你Z轴防守薄弱，加强纵向进攻';
  }

  const diagVuln = profile.vulnerabilities.find(v => v.direction === 'DIAGONAL');
  if (diagVuln && diagVuln.exposureRate > 0.5) {
    weights.DIAGONAL = 30;
    if (!insight) insight = 'AI针对你的对角线习惯调整策略';
  }

  if (profile.style.aggressiveness > 0.7) {
    weights.DEFENSE = 1.3;
    weights.ATTACK = 0.7;
    if (!insight) insight = 'AI加强防守应对你的进攻风格';
  }

  if (profile.style.patternConsistency > 0.8 && gameCount > 5) {
    weights.PATTERN_BREAK = 2.0;
    if (!insight) insight = 'AI识破你的固定模式，准备打破规律';
  }

  return { weights, maxDepth, insight };
}
