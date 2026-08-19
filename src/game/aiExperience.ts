import { AIExperience, AiDifficulty } from '../types';

const KEY = 'spatial_gomoku_ai_experience_v1';

export const DEFAULT_AI_EXPERIENCE: AIExperience = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  blocks: 0,
  recentLossByOpenThree: 0,
};

export function loadAIExperience(): AIExperience {
  try {
    const data = localStorage.getItem(KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return { ...DEFAULT_AI_EXPERIENCE, ...parsed };
    }
  } catch { /* ignore */ }
  return DEFAULT_AI_EXPERIENCE;
}

export function saveAIExperience(exp: AIExperience): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(exp));
  } catch { /* ignore */ }
}

/**
 * Reward the AI after each finished game.
 * - win        -> +1 win (encourages keeping attacking play)
 * - loss       -> +1 loss (strengthens defense via win-rate feedback)
 * - draw       -> +1 draw
 * - lossByOpenThree -> how often the AI lost while an open-three was on the board
 *   (fed back into BLOCK_THREE / DEFENSE weights).
 */
export function updateAIExperience(
  prev: AIExperience,
  result: { aiWin: boolean; aiLost: boolean; draw: boolean; lossByOpenThree: boolean; blocks: number }
): AIExperience {
  const next: AIExperience = {
    ...prev,
    totalGames: prev.totalGames + 1,
    wins: prev.wins + (result.aiWin ? 1 : 0),
    losses: prev.losses + (result.aiLost ? 1 : 0),
    draws: prev.draws + (result.draw ? 1 : 0),
    blocks: prev.blocks + result.blocks,
    recentLossByOpenThree: result.lossByOpenThree
      ? Math.min(10, prev.recentLossByOpenThree + 1)
      : Math.max(0, prev.recentLossByOpenThree - 1),
  };
  saveAIExperience(next);
  return next;
}

export function difficultyDepth(d: AiDifficulty): number {
  return d === 'easy' ? 2 : d === 'hard' ? 4 : 3;
}

export function difficultyBlockWeight(d: AiDifficulty): number {
  return d === 'easy' ? 0 : d === 'hard' ? 1.8 : 1.0;
}
