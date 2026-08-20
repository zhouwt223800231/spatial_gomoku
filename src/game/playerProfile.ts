import { PlayerProfile, Position, Player, StoneData, BoardSize } from '../types';

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

/**
 * Update the player profile after one move. The moving player is passed in
 * explicitly (never inferred from the board) so the opponent for weakness
 * detection is always correct, even for out-of-bounds / edge positions.
 */
export function updateProfileAfterMove(
  profile: PlayerProfile,
  player: Player,
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

  return updateVulnerabilities(newProfile, player, stones, boardSize);
}

/**
 * Weakness detection based on the player's move history.
 *
 * We only draw conclusions after a minimum sample size (MIN_SAMPLES) and scale
 * each exposure estimate by a confidence factor that grows with history length,
 * so early low-sample guesses never dominate the AI's targeting.
 */
function updateVulnerabilities(
  profile: PlayerProfile,
  player: Player,
  stones: StoneData[],
  boardSize: BoardSize
): PlayerProfile {
  const history = profile.moveHistory;
  const MIN_SAMPLES = 8;
  if (history.length < MIN_SAMPLES) return profile;

  const centerZ = Math.floor((boardSize - 1) / 2);
  const opponent: Player = player === 'black' ? 'white' : 'black';
  const confidence = Math.min(1, history.length / 12);

  // How often the player plays away from the central plane (vertical activity).
  const offPlane = history.filter((p) => p.z !== centerZ).length / history.length;
  // How often the player uses positions with all three coordinates distinct.
  const diagMoves = history.filter((p) => p.x !== p.y && p.y !== p.z && p.x !== p.z).length / history.length;
  // How many opponent stones currently sit off the central plane.
  const oppOffPlane = stones.filter((s) => s.player === opponent && s.position.z !== centerZ).length;

  const zWeak = offPlane < 0.25 && oppOffPlane >= 2;
  const diagWeak = diagMoves < 0.25;

  const vulnerabilities = [...profile.vulnerabilities];
  applyVulnerability(vulnerabilities, 'Z_AXIS', (zWeak ? 0.5 + offPlane : 0.3) * confidence);
  applyVulnerability(vulnerabilities, 'DIAGONAL', (diagWeak ? 0.5 + (1 - diagMoves) * 0.5 : 0.3) * confidence);

  return { ...profile, vulnerabilities };
}

function applyVulnerability(
  list: PlayerProfile['vulnerabilities'],
  direction: string,
  exposureRate: number
): void {
  const existing = list.find((v) => v.direction === direction);
  const now = Date.now();
  if (existing) {
    existing.exposureRate = lerp(existing.exposureRate, Math.min(1, exposureRate), 0.15);
    existing.lastExploited = now;
  } else {
    list.push({ direction, exposureRate: Math.min(1, exposureRate), lastExploited: now });
  }
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