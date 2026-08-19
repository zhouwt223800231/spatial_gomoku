export interface Position {
  x: number;
  y: number;
  z: number;
}

export type Player = 'black' | 'white';

export interface StoneData {
  position: Position;
  player: Player;
}

export type GameMode = 'pvp' | 'ai';
export type GamePhase = 'menu' | 'playing' | 'won' | 'draw';
export type BoardSize = 5 | 7 | 9;
export type ViewMode = 'perspective' | 'orthographic';
export type AiDifficulty = 'easy' | 'normal' | 'hard';

export interface WinLineData {
  positions: Position[];
  player: Player;
}

export interface AIExperience {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  blocks: number;
  recentLossByOpenThree: number;
}

export interface PlayerProfile {
  spatialPreference: {
    centerControl: number;
    edgePreference: number;
    diagonalTendency: number;
    verticalTendency: number;
  };
  style: {
    aggressiveness: number;
    defensiveness: number;
    patternConsistency: number;
  };
  vulnerabilities: Array<{
    direction: string;
    exposureRate: number;
    lastExploited: number;
  }>;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  averageGameLength: number;
  moveHistory: Position[];
  lastUpdated: number;
}

export interface AIInsight {
  id: string;
  type: 'detected' | 'adapted' | 'warning';
  message: string;
  timestamp: number;
}
