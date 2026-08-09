import React from 'react';
import { useGameStore } from '../../store/gameStore';

export function GameHUD() {
  const { currentPlayer, movesCount, gameMode, aiThinking, resetGame, undoMove, stones } = useGameStore();

  return (
    <>
      {/* Top Left - Player Info */}
      <div className="absolute top-6 left-6 z-10">
        <div className="glass-panel p-4 min-w-[140px]">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-3 h-3 rounded-full ${currentPlayer === 'black' ? 'bg-neutral-900 border border-white/30' : 'bg-stone-100'}`} />
            <span className="text-white/80 text-sm uppercase tracking-wider">
              {currentPlayer === 'black' ? 'Black' : 'White'}
            </span>
          </div>
          <p className="text-white/40 text-xs">
            {aiThinking ? 'AI thinking...' : 'Your turn'}
          </p>
        </div>
      </div>

      {/* Top Right - Game Info */}
      <div className="absolute top-6 right-6 z-10">
        <div className="glass-panel p-4 min-w-[140px] space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Mode</span>
            <span className="text-white/80">{gameMode === 'ai' ? 'AI' : 'Local'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Moves</span>
            <span className="text-white/80">{movesCount}</span>
          </div>
        </div>
      </div>

      {/* Bottom - Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-3">
        <button onClick={undoMove} disabled={stones.length === 0} className="glass-button text-sm disabled:opacity-30">
          Undo
        </button>
        <button onClick={resetGame} className="glass-button text-sm">
          Restart
        </button>
        <button onClick={() => useGameStore.setState({ gamePhase: 'menu' })} className="glass-button text-sm">
          Main Menu
        </button>
      </div>
    </>
  );
}
