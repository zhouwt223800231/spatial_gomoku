import { PlayerProfile, Position, StoneData, BoardSize } from '../types';

const PROFILE_KEY = 'spatial_gomoku_profile_v1';

export function loadProfile(): PlayerProfile {
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    if (data) return JSON.parse(data);
  } catch {}

  return createDefaultProfile();
}

export function saveProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function createDefaultProfile(): PlayerProfile {
  return {
    spatialPreference: { centerControl: 0.5, edgePreference: 0.5, diagonalTendency: 0.5, verticalTendency: 0.5 },
    style: { aggressiveness: 0.5, defensiveness: 0.5, patternConsistency: 0.5 },
    vulnerabilities: [],
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    averageGameLength: 0,
    moveHistory: [],
    lastUpdated: Date.now(),
  };
}

export function updateProfileAfterMove(
  profile: PlayerProfile,
  position: Position,
  stones: StoneData[],
  boardSize: BoardSize
): PlayerProfile {
  const newProfile = { ...profile };
  newProfile.moveHistory = [...profile.moveHistory, position].slice(-50);

  const center = (boardSize - 1) / 2;
  const dist = Math.abs(position.x - center) + Math.abs(position.y - center) + Math.abs(position.z - center);
  const maxDist = 3 * center;

  if (dist < maxDist * 0.3) {
    newProfile.spatialPreference.centerControl = lerp(newProfile.spatialPreference.centerControl, 1, 0.1);
  } else if (dist > maxDist * 0.7) {
    newProfile.spatialPreference.edgePreference = lerp(newProfile.spatialPreference.edgePreference, 1, 0.1);
  }

  if (position.z !== Math.floor(center)) {
    newProfile.spatialPreference.verticalTendency = lerp(newProfile.spatialPreference.verticalTendency, 1, 0.05);
  }

  if (Math.abs(position.x - position.y) <= 1 || Math.abs(position.x - position.z) <= 1 || Math.abs(position.y - position.z) <= 1) {
    newProfile.spatialPreference.diagonalTendency = lerp(newProfile.spatialPreference.diagonalTendency, 1, 0.05);
  }

  return newProfile;
}

export function updateProfileAfterGame(
  profile: PlayerProfile,
  won: boolean,
  lost: boolean,
  moves: number
): PlayerProfile {
  const newProfile = { ...profile };
  newProfile.totalGames++;
  if (won) newProfile.wins++;
  else if (lost) newProfile.losses++;
  else newProfile.draws++;

  newProfile.averageGameLength = lerp(newProfile.averageGameLength, moves, 0.2);
  newProfile.moveHistory = [];
  newProfile.lastUpdated = Date.now();

  return newProfile;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
