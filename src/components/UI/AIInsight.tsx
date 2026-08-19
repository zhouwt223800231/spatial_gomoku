import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export function AIInsight() {
  const { aiInsights, gameMode } = useGameStore();
  const [visible, setVisible] = useState(true);

  if (gameMode !== 'ai' || !visible) return null;

  return (
    <div className="col-start-3 row-start-2 self-end pointer-events-auto w-64">
      <div className="glass-panel p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="panel-label">AI Insight</h3>
          <button
            onClick={() => setVisible(false)}
            className="text-white/30 hover:text-white/70 text-xs leading-none px-1"
            aria-label="Close"
          >
            鉁?          </button>
        </div>
        <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
          {aiInsights.length === 0 ? (
            <p className="text-white/25 text-xs">Analyzing your play style...</p>
          ) : (
            aiInsights.slice().reverse().map((insight) => (
              <div key={insight.id} className="text-xs leading-relaxed">
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${
                  insight.type === 'detected' ? 'bg-blue-400 shadow-glow-sm' :
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
