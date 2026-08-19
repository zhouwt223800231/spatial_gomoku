import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Position } from '../../types';

const fmt = (p: Position | null) => (p ? `(${p.x + 1}, ${p.y + 1}, ${p.z + 1})` : '—');

interface GameHUDProps {
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function GameHUD({ onConfirm, onCancel }: GameHUDProps) {
  const {
    currentPlayer, movesCount, gameMode, aiThinking, resetGame, undoMove, stones,
    activeLayer, boardSize, setActiveLayer, showLines, setShowLines, viewMode, setViewMode, requestOverview,
    ghostPosition, lastMove,
  } = useGameStore();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      {/* Top Left - Player + Coordinates */}
      <div className="col-start-1 row-start-1 pointer-events-auto">
        <div className="glass-panel p-5 min-w-[180px]">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3.5 h-3.5 rounded-full ${currentPlayer === 'black'
              ? 'bg-slate-900 border border-white/40 shadow-glow-sm'
              : 'bg-slate-100 border border-white/20'}`} />
            <span className="font-display text-white/85 text-sm tracking-wider uppercase">
              {currentPlayer === 'black' ? 'Black' : 'White'}
            </span>
          </div>
          <div className="space-y-2 border-t border-white/10 pt-4 mono-num text-[11px]">
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/40">Preview</span>
              <span className="accent-glow">{fmt(ghostPosition)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/40">Last</span>
              <span className="text-white/80">{fmt(lastMove)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Center - Status bar */}
      <div className="col-start-2 row-start-1 self-start justify-self-center pointer-events-auto">
        <div className="glass-panel px-5 py-2 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${currentPlayer === 'black'
              ? 'bg-slate-900 border border-white/40'
              : 'bg-slate-100 border border-white/20'}`} />
            <span className="font-display uppercase tracking-wider text-white/85">
              {currentPlayer === 'black' ? 'Black' : 'White'}
            </span>
          </div>
          <span className="text-white/30">·</span>
          <span className="mono-num text-white/70">Move {movesCount}</span>
          <span className="text-white/30">·</span>
          <span className="text-white/40">{aiThinking ? 'AI thinking…' : gameMode === 'ai' ? 'Your turn' : 'Local'}</span>
        </div>
      </div>

      {/* Top Right - Controls (collapsible) */}
      <div className="col-start-3 row-start-1 justify-self-end pointer-events-auto">
        <div className="glass-panel p-3">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="w-full text-left panel-label px-1 py-0.5 flex justify-between items-center"
          >
            <span>Controls</span>
            <span className="text-white/50">{showInfo ? '▾' : '▸'}</span>
          </button>
          {showInfo && (
            <div className="p-2 space-y-3 min-w-[190px]">
              <div className="flex items-center justify-between gap-2 text-sm">
                <button
                  onClick={() => setActiveLayer(Math.max(0, activeLayer - 1))}
                  disabled={activeLayer === 0}
                  className="glass-button px-2 py-1 text-xs disabled:opacity-30"
                >&#9664;</button>
                <span className="mono-num text-white/85 whitespace-nowrap">Layer {activeLayer + 1}/{boardSize}</span>
                <button
                  onClick={() => setActiveLayer(Math.min(boardSize - 1, activeLayer + 1))}
                  disabled={activeLayer === boardSize - 1}
                  className="glass-button px-2 py-1 text-xs disabled:opacity-30"
                >&#9654;</button>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowLines(!showLines)}
                  className={`flex-1 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                    showLines ? 'bg-cyan-400/15 border-cyan-200/50 text-cyan-100' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  Lines {showLines ? 'On' : 'Off'}
                </button>
                <button onClick={requestOverview} className="flex-1 glass-button px-2 py-1.5 text-xs">Overview</button>
                <button
                  onClick={() => setViewMode(viewMode === 'orthographic' ? 'perspective' : 'orthographic')}
                  className="flex-1 glass-button px-2 py-1.5 text-xs"
                >
                  {viewMode === 'orthographic' ? '3D' : '2D'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Center - Controls */}
      <div className="col-start-2 row-start-3 self-end justify-self-center pointer-events-auto">
        <div className="flex gap-3">
          <button onClick={undoMove} disabled={stones.length === 0} className="glass-button text-sm disabled:opacity-30">
            Undo
          </button>
          <button onClick={resetGame} className="glass-button text-sm">Restart</button>
          <button onClick={() => useGameStore.setState({ gamePhase: 'menu' })} className="glass-button text-sm">Main Menu</button>
        </div>
      </div>

      {/* Confirm / Cancel overlay (floats above bottom center) */}
      {ghostPosition && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto z-10">
          <div className="glass-panel px-5 py-3 flex items-center gap-4">
            <span className="mono-num text-[12px] text-white/70">
              Place at <span className="accent-glow">{fmt(ghostPosition)}</span>
            </span>
            <button onClick={onConfirm} className="glass-button--primary px-4 py-1.5 text-sm">✓ 落子 (Enter)</button>
            <button onClick={onCancel} className="glass-button px-4 py-1.5 text-sm">✕ 取消 (Esc)</button>
          </div>
        </div>
      )}
    </>
  );
}
