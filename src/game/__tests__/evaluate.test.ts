import { describe, it, expect } from 'vitest';
import { evaluatePosition, DEFAULT_WEIGHTS, EvalWeights } from '../evaluate';
import { Position, StoneData, Player } from '../../types';

const pos = (x: number, y: number, z: number): Position => ({ x, y, z });
const st = (p: Position, player: Player): StoneData => ({ position: p, player });

describe('evaluate default weights', () => {
  it('double-threat / directional threat weights are non-zero by default', () => {
    expect(DEFAULT_WEIGHTS.DOUBLE_THREAT).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.THREAT_AXIS).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.THREAT_Z).toBeGreaterThan(0);
    expect(DEFAULT_WEIGHTS.THREAT_DIAG).toBeGreaterThan(0);
  });
});

describe('evaluatePosition double-threat bonus', () => {
  // Black has two separate open threes: one along X (z=0), one along Y (z=1).
  const doubleThreatBoard: StoneData[] = [
    st(pos(1, 0, 0), 'black'), st(pos(2, 0, 0), 'black'), st(pos(3, 0, 0), 'black'),
    st(pos(0, 1, 1), 'black'), st(pos(0, 2, 1), 'black'), st(pos(0, 3, 1), 'black'),
  ];

  const zeroThreatWeights: EvalWeights = { ...DEFAULT_WEIGHTS, DOUBLE_THREAT: 0, THREAT_AXIS: 0, THREAT_Z: 0, THREAT_DIAG: 0 };

  it('applies the double-threat bonus when two threats exist', () => {
    const withThreats = evaluatePosition(doubleThreatBoard, 'black', 7, DEFAULT_WEIGHTS);
    const withoutThreats = evaluatePosition(doubleThreatBoard, 'black', 7, zeroThreatWeights);
    // 2 threats -> DOUBLE_THREAT * (2-1) = 300, plus 2 axis threats * 18 = 36.
    expect(withThreats - withoutThreats).toBe(300 + 2 * 18);
  });

  it('does not fire the double-threat multiplier for a single threat', () => {
    const single = [st(pos(1, 0, 0), 'black'), st(pos(2, 0, 0), 'black'), st(pos(3, 0, 0), 'black')];
    const withThreats = evaluatePosition(single, 'black', 7, DEFAULT_WEIGHTS);
    const withoutThreats = evaluatePosition(single, 'black', 7, zeroThreatWeights);
    // One threat: no DOUBLE_THREAT multiplier, only the axis bonus 1 * 18.
    expect(withThreats - withoutThreats).toBe(1 * 18);
  });

  it('respects a FIVE as the dominant term', () => {
    const five: StoneData[] = [0, 1, 2, 3, 4].map((x) => st(pos(x, 0, 0), 'black'));
    expect(evaluatePosition(five, 'black', 5, DEFAULT_WEIGHTS)).toBeGreaterThanOrEqual(DEFAULT_WEIGHTS.FIVE);
  });
});