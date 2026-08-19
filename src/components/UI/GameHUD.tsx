import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Position } from '../../types';

const fmt = (p: Position | null) => (p ? `(${p.x + 1}, ${p.y + 1}, ${p.z + 1})` : '—');

export function GameHUD() {
  const {
    currentPlayer, movesCount, gameMode, aiThinking, resetGame, undoMove, stones,
    activeLayer, boardSize, setActiveLayer, showLines, setShowLines, viewMode, setViewMode, requestOverview,
    ghostPosition, lastMove,
  } = useGameStore();

  return (
    <>
      {/* Top Left - Player + Coordinates */}
      <div className="absolute top-6 left-6 z-10">
        <div className="glass-panel p-4 min-w-[170px]">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-3 h-3 rounded-full ${currentPlayer === 'black' ? 'bg-neutral-900 border border-white/30' : 'bg-stone-100'}`} />
            <span className="text-white/80 text-sm uppercase tracking-wider">
              {currentPlayer === 'black' ? 'Black' : 'White'}
            </span>
          </div>

          <div className="space-y-1.5 border-t border-white/10 pt-3 font-mono tabular-nums text-[11px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/40">{aiThinking ? 'AI thinking...' : 'Your turn'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/40">Preview</span>
              <span className="text-cyan-200/90">{fmt(ghostPosition)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/40">Last</span>
              <span className="text-white/80">{fmt(lastMove)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Right - Game Info + View controls */}
      <div className="absolute top-6 right-6 z-10">
        <div className="glass-panel p-4 min-w-[170px] space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Mode</span>
            <span className="text-white/80 font-mono tabular-nums">{gameMode === 'ai' ? 'AI' : 'Local'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Moves</span>
            <span className="text-white/80 font-mono tabular-nums">{movesCount}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <button
              onClick={() => setActiveLayer(Math.max(0, activeLayer - 1))}
              disabled={activeLayer === 0}
              className="glass-button px-2 py-1 text-xs disabled:opacity-30"
            >&#9664;</button>
            <span className="text-white/80 whitespace-nowrap font-mono tabular-nums">Layer {activeLayer + 1}/{boardSize}</span>
            <button
              onClick={() => setActiveLayer(Math.min(boardSize - 1, activeLayer + 1))}
              disabled={activeLayer === boardSize - 1}
              className="glass-button px-2 py-1 text-xs disabled:opacity-30"
            >&#9654;</button>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowLines(!showLines)}
              className={`flex-1 px-2 py-1 rounded-lg border text-xs transition-all ${showLines ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}
            >
              Lines {showLines ? 'On' : 'Off'}
            </button>
            <button onClick={requestOverview} className="flex-1 glass-button px-2 py-1 text-xs">
              Overview
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'orthographic' ? 'perspective' : 'orthographic')}
              className="flex-1 glass-button px-2 py-1 text-xs"
            >
              {viewMode === 'orthographic' ? '3D' : '2D'}
            </button>
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