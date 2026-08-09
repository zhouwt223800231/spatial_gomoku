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

  return updateVulnerabilities(newProfile, position, stones, boardSize);
}

/**
 * 弱点档案采集：基于玩家移动历史，检测防守薄弱方向。
 *
 * 思路：如果玩家的棋子长期集中在低 Z 层（主平面），而对 Z 轴向（纵向）
 * 或纯对角线方向的协防覆盖少，一旦对手在这些方向展开进攻，就判定为弱点
 * 并提高 exposureRate。adaptiveAI 会据此调整权重去攻击这些方向。
 */
function updateVulnerabilities(
  profile: PlayerProfile,
  position: Position,
  stones: StoneData[],
  boardSize: BoardSize
): PlayerProfile {
  const history = profile.moveHistory;
  if (history.length < 4) return profile; // 样本不足，暂不判定

  const centerZ = Math.floor((boardSize - 1) / 2);
  const activePlayer = stones.find(s => s.position.x === position.x && s.position.y === position.y && s.position.z === position.z)?.player ?? 'black';
  const opponent: 'black' | 'white' = activePlayer === 'black' ? 'white' : 'black';

  // 该玩家历史中偏离中心层的比例（纵向活动度）
  const offPlane = history.filter(p => p.z !== centerZ).length / history.length;

  // 该玩家历史中使用“纯对角线位置”（x、y、z 两两不等）的比例
  const diagMoves = history.filter(p =>
    p.x !== p.y && p.y !== p.z && p.x !== p.z
  ).length / history.length;

  // 当前棋盘中，对手棋子有多少分布在偏离中心层的纵向层
  const oppOffPlane = stones.filter(s => s.player === opponent && s.position.z !== centerZ).length;

  // 判定 Z 轴防守弱点：玩家很少离开中心层，而对手已经在纵向布子
  const zWeak = offPlane < 0.25 && oppOffPlane >= 2;
  // 判定对角线防守弱点：玩家几乎不用对角位，而对手有对角威胁结构
  const diagWeak = diagMoves < 0.25;

  const vulnerabilities = [...profile.vulnerabilities];

  applyVulnerability(vulnerabilities, 'Z_AXIS', zWeak ? 0.5 + offPlane : 0.3);
  applyVulnerability(vulnerabilities, 'DIAGONAL', diagWeak ? 0.5 + (1 - diagMoves) * 0.5 : 0.3);

  return { ...profile, vulnerabilities };
}

function applyVulnerability(
  list: PlayerProfile['vulnerabilities'],
  direction: string,
  exposureRate: number
): void {
  const existing = list.find(v => v.direction === direction);
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
