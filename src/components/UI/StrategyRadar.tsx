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

  return (
    <div className="absolute top-24 left-6 z-10">
      <div className="glass-panel p-4 w-36">
        <h3 className="text-white/60 text-xs uppercase tracking-wider mb-3">Strategy Radar</h3>
        <div className="space-y-3">
          {threats.map(t => (
            <div key={t.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/40">{t.name}</span>
                <span className="text-white/60">{Math.round(t.threat * 100)}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    t.threat > 0.8 ? 'bg-red-400' : t.threat > 0.5 ? 'bg-amber-400' : 'bg-blue-400'
                  }`}
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
