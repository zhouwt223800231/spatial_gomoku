import React, { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';

export function StrategyRadar() {
  const { stones, boardSize, currentPlayer } = useGameStore();

  const threats = useMemo(() => {
    const dirs = [
      { name: 'X-Axis', key: 'x', dir: { x: 1, y: 0, z: 0 } },
      { name: 'Y-Axis', key: 'y', dir: { x: 0, y: 1, z: 0 } },
      { name: 'Z-Axis', key: 'z', dir: { x: 0, y: 0, z: 1 } },
    ];

    return dirs.map(d => {
      let threat = 0;
      const stoneMap = new Map(stones.map(s => [`${s.position.x},${s.position.y},${s.position.z}`, s.player]));

      for (const stone of stones) {
        if (stone.player !== currentPlayer) continue;
        let count = 1;
        for (let i = 1; i < 5; i++) {
          const pos = {
            x: stone.position.x + d.dir.x * i,
            y: stone.position.y + d.dir.y * i,
            z: stone.position.z + d.dir.z * i
          };
          if (pos.x >= boardSize || pos.y >= boardSize || pos.z >= boardSize) break;
          if (stoneMap.get(`${pos.x},${pos.y},${pos.z}`) === currentPlayer) count++;
          else break;
        }
        threat = Math.max(threat, count);
      }

      return { ...d, threat: Math.min(threat / 5, 1) };
    });
  }, [stones, boardSize, currentPlayer]);

  const barColors = ['bg-cyan-400', 'bg-blue-400', 'bg-violet-400'];

  return (
    <div>
      <div className="glass-panel p-5 w-40">
        <h3 className="panel-label mb-4">Strategy Radar</h3>
        <div className="space-y-3.5">
          {threats.map((t, i) => (
            <div key={t.key}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/45">{t.name}</span>
                <span className="mono-num text-white/70">{Math.round(t.threat * 100)}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColors[i % barColors.length]}`}
                  style={{ width: `${t.threat * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
