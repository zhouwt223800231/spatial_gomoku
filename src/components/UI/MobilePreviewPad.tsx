import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Position } from '../../types';

const fmt = (p: Position | null) => (p ? `(${p.x + 1}, ${p.y + 1}, ${p.z + 1})` : '—');

interface MobilePreviewPadProps {
  onMove: (axis: 'x' | 'y' | 'z', delta: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const btn =
  'glass-button w-12 h-12 text-lg flex items-center justify-center active:scale-90 select-none';

/** Mobile-only virtual D-pad + Z-layer switch for previewing a ghost move. */
export function MobilePreviewPad({ onMove, onConfirm, onCancel }: MobilePreviewPadProps) {
  const ghostPosition = useGameStore((s) => s.ghostPosition);
  const activeLayer = useGameStore((s) => s.activeLayer);
  const boardSize = useGameStore((s) => s.boardSize);
  if (!ghostPosition) return null;

  return (
    <div className="pointer-events-auto w-full max-w-xs mx-auto">
      <div className="glass-panel p-3 space-y-2">
        <div className="text-center mono-num text-[12px] text-white/70">
          预览 <span className="accent-glow">{fmt(ghostPosition)}</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <button className={btn} onClick={() => onMove('z', -1)} disabled={activeLayer === 0}>Z−</button>
          <div className="grid grid-cols-3 gap-1">
            <div />
            <button className={btn} onClick={() => onMove('y', 1)}>↑</button>
            <div />
            <button className={btn} onClick={() => onMove('x', -1)}>←</button>
            <div />
            <button className={btn} onClick={() => onMove('x', 1)}>→</button>
            <div />
            <button className={btn} onClick={() => onMove('y', -1)}>↓</button>
            <div />
          </div>
          <button className={btn} onClick={() => onMove('z', 1)} disabled={activeLayer === boardSize - 1}>Z+</button>
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={onConfirm} className="glass-button--primary flex-1 py-2 text-sm">✓ 落子</button>
          <button onClick={onCancel} className="glass-button flex-1 py-2 text-sm">✕ 取消</button>
        </div>
      </div>
    </div>
  );
}
