import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Position } from '../../types';

const fmt = (p: Position | null) => (p ? `(${p.x + 1}, ${p.y + 1}, ${p.z + 1})` : '—');

/** Player + coordinates panel (used on desktop grid and inside the mobile drawer). */
export function PlayerPanel() {
  const { currentPlayer, ghostPosition, lastMove } = useGameStore();
  return (
    <div className="glass-panel p-4 md:p-5 min-w-[160px] md:min-w-[180px]">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-3.5 h-3.5 rounded-full ${currentPlayer === 'black'
          ? 'bg-slate-900 border border-white/40 shadow-glow-sm'
          : 'bg-slate-100 border border-white/20'}`} />
        <span className="font-display text-white/85 text-sm tracking-wider uppercase">
          {currentPlayer === 'black' ? 'Black' : 'White'}
        </span>
      </div>
      <div className="space-y-2 border-t border-white/10 pt-3 mono-num text-[11px]">
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
  );
}

/** Compact status bar: current color, move count, thinking state. */
export function StatusBar() {
  const { currentPlayer, movesCount, gameMode, aiThinking } = useGameStore();
  return (
    <div className="glass-panel px-4 md:px-5 py-2 flex items-center gap-3 md:gap-4 text-sm">
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
      <span className="hidden sm:inline text-white/30">·</span>
      <span className="hidden sm:inline text-white/40">{aiThinking ? 'AI thinking…' : gameMode === 'ai' ? 'Your turn' : 'Local'}</span>
    </div>
  );
}

/** Controls: layer switcher + layer strip, lines/view toggles, visual aids (collapsible). */
export function ControlsPanel() {
  const {
    activeLayer, boardSize, setActiveLayer, showLines, setShowLines,
    viewMode, setViewMode, requestOverview,
    layerFocus, setLayerFocus, threatGuide, setThreatGuide, stones,
  } = useGameStore();
  const [showInfo, setShowInfo] = React.useState(false);
  const layerCounts = React.useMemo(() => {
    const counts = new Array<number>(boardSize).fill(0);
    for (const s of stones) counts[s.position.z] += 1;
    return counts;
  }, [stones, boardSize]);
  return (
    <div className="glass-panel p-3">
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="w-full text-left panel-label px-1 py-0.5 flex justify-between items-center"
      >
        <span>Controls</span>
        <span className="text-white/50">{showInfo ? '▾' : '▸'}</span>
      </button>
      {showInfo && (
        <div className="p-2 space-y-3 min-w-[160px] md:min-w-[190px]">
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

          {/* Layer strip: per-layer stone counts, click to jump */}
          <div className="flex gap-1.5 pt-1">
            {layerCounts.map((count, li) => (
              <button
                key={li}
                onClick={() => setActiveLayer(li)}
                title={`Layer ${li + 1}: ${count} stones`}
                className={`flex-1 rounded-md border px-1 py-1 text-center transition-all ${
                  li === activeLayer ? 'bg-cyan-400/20 border-cyan-200/50' : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <span className="block mono-num text-[10px] text-white/70 leading-none">{li + 1}</span>
                <span className={`block mono-num text-[9px] leading-tight ${count > 0 ? 'text-cyan-200/80' : 'text-white/25'}`}>{count}</span>
              </button>
            ))}
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

          {/* Visual aids (default off): focus mode + threat guidance */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setLayerFocus(!layerFocus)}
              className={`flex-1 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                layerFocus ? 'bg-violet-400/15 border-violet-200/50 text-violet-100' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              Focus {layerFocus ? 'On' : 'Off'}
            </button>
            <button
              onClick={() => setThreatGuide(!threatGuide)}
              className={`flex-1 px-2 py-1.5 rounded-lg border text-xs transition-all ${
                threatGuide ? 'bg-red-400/15 border-red-200/50 text-red-100' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              Threats {threatGuide ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Bottom action bar: Undo / Restart / Main Menu (+ mobile info button). */
export function BottomBar({ onToggleDrawer }: { onToggleDrawer?: () => void }) {
  const { undoMove, resetGame, stones } = useGameStore();
  return (
    <div className="flex gap-2 md:gap-3">
      {onToggleDrawer && (
        <button onClick={onToggleDrawer} className="glass-button text-sm md:hidden">信息</button>
      )}
      <button onClick={undoMove} disabled={stones.length === 0} className="glass-button text-sm disabled:opacity-30">
        Undo
      </button>
      <button onClick={resetGame} className="glass-button text-sm">Restart</button>
      <button onClick={() => useGameStore.setState({ gamePhase: 'menu' })} className="glass-button text-sm">Main Menu</button>
    </div>
  );
}

/** Desktop floating confirm/cancel bar (shown when a ghost is selected). */
export function ConfirmBar({ onConfirm, onCancel }: { onConfirm?: () => void; onCancel?: () => void }) {
  const ghostPosition = useGameStore((s) => s.ghostPosition);
  if (!ghostPosition) return null;
  return (
    <div className="hidden md:block absolute left-1/2 -translate-x-1/2 bottom-24 pointer-events-auto z-10">
      <div className="glass-panel px-5 py-3 flex items-center gap-4">
        <span className="mono-num text-[12px] text-white/70">
          Place at <span className="accent-glow">{fmt(ghostPosition)}</span>
        </span>
        <button onClick={onConfirm} className="glass-button--primary px-4 py-1.5 text-sm">✓ 落子 (Enter)</button>
        <button onClick={onCancel} className="glass-button px-4 py-1.5 text-sm">✕ 取消 (Esc)</button>
      </div>
    </div>
  );
}