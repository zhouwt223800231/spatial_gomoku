import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Position } from '../../types';

const fmt = (p: Position | null) => (p ? `(${p.x + 1}, ${p.y + 1}, ${p.z + 1})` : '—');

interface MobilePreviewPadProps {
  onMove: (axis: 'x' | 'y' | 'z', delta: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onToggleDrawer?: () => void;
}

const padBtn =
  'glass-button w-11 h-11 text-lg flex items-center justify-center active:scale-95 select-none disabled:opacity-40';
const stepBtn =
  'glass-button w-10 h-10 text-base flex items-center justify-center active:scale-95 select-none disabled:opacity-40';

/**
 * Always-on mobile console (bottom-center single band). Three rows:
 * 1) hint + confirm/cancel, 2) layer stepper + D-pad, 3) meta actions.
 * Its height is constant, so the canvas band never changes on select/place/
 * cancel and the camera keeps the user's angle & zoom (no view reset).
 */
export function MobilePreviewPad({ onMove, onConfirm, onCancel, onToggleDrawer }: MobilePreviewPadProps) {
  const ghostPosition = useGameStore((s) => s.ghostPosition);
  const activeLayer = useGameStore((s) => s.activeLayer);
  const boardSize = useGameStore((s) => s.boardSize);
  const stones = useGameStore((s) => s.stones);
  const undoMove = useGameStore((s) => s.undoMove);
  const resetGame = useGameStore((s) => s.resetGame);

  const hasGhost = ghostPosition !== null;

  return (
    <div className="pointer-events-auto w-full max-w-md mx-auto">
      <div className="glass-panel px-3 py-2.5 space-y-2">
        {/* Row 1: hint + confirm/cancel */}
        <div className="flex items-center justify-between gap-2">
          <span className={`mono-num text-[12px] ${hasGhost ? 'text-white/70' : 'text-white/40'}`}>
            {hasGhost ? (
              <span>预览 <span className="accent-glow">{fmt(ghostPosition)}</span></span>
            ) : (
              '点击棋盘选择落子位置'
            )}
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={onConfirm} disabled={!hasGhost} className="glass-button--primary px-3.5 py-1.5 text-sm disabled:opacity-40">✓ 落子</button>
            <button onClick={onCancel} disabled={!hasGhost} className="glass-button px-3 py-1.5 text-sm disabled:opacity-40">✕ 取消</button>
          </div>
        </div>

        {/* Row 2: layer stepper + D-pad */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1">
            <button className={stepBtn} onClick={() => onMove('z', 1)} disabled={activeLayer >= boardSize - 1} aria-label="上一层">▲</button>
            <span className="mono-num text-violet-200 min-w-[2.5rem] text-center text-xs">{activeLayer + 1}/{boardSize}</span>
            <button className={stepBtn} onClick={() => onMove('z', -1)} disabled={activeLayer <= 0} aria-label="下一层">▼</button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div />
            <button className={padBtn} onClick={() => onMove('y', 1)} disabled={!hasGhost}>↑</button>
            <div />
            <button className={padBtn} onClick={() => onMove('x', -1)} disabled={!hasGhost}>←</button>
            <div />
            <button className={padBtn} onClick={() => onMove('x', 1)} disabled={!hasGhost}>→</button>
            <div />
            <button className={padBtn} onClick={() => onMove('y', -1)} disabled={!hasGhost}>↓</button>
            <div />
          </div>
        </div>

        {/* Row 3: meta actions */}
        <div className="flex gap-2 justify-center pt-0.5">
          {onToggleDrawer && (
            <button onClick={onToggleDrawer} className="glass-button text-xs px-2.5 py-1.5">信息</button>
          )}
          <button onClick={undoMove} disabled={stones.length === 0} className="glass-button text-xs px-2.5 py-1.5 disabled:opacity-40">撤销</button>
          <button onClick={resetGame} className="glass-button text-xs px-2.5 py-1.5">重开</button>
          <button onClick={() => useGameStore.setState({ gamePhase: 'menu' })} className="glass-button text-xs px-2.5 py-1.5">菜单</button>
        </div>
      </div>
    </div>
  );
}
