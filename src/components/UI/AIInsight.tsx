import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export function AIInsight() {
  const { aiInsights, gameMode } = useGameStore();
  const [visible, setVisible] = useState(true);

  if (gameMode !== 'ai' || !visible) return null;

  return (
    <div className="absolute bottom-24 right-6 z-10 w-64">
      <div className="glass-panel p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white/60 text-xs uppercase tracking-wider">AI 洞察</h3>
          <button onClick={() => setVisible(false)} className="text-white/30 hover:text-white/60 text-xs">×</button>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {aiInsights.length === 0 ? (
            <p className="text-white/20 text-xs">正在观察你的下棋风格...</p>
          ) : (
            aiInsights.slice().reverse().map((insight) => (
              <div key={insight.id} className="text-xs">
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${
                  insight.type === 'detected' ? 'bg-blue-400' :
                  insight.type === 'adapted' ? 'bg-amber-400' : 'bg-red-400'
                }`} />
                <span className="text-white/60">{insight.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
