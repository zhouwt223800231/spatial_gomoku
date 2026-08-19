import React, { useState } from 'react';
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

/**
 * Mobile preview controls: a slim confirm bar by default, and an optional
 * D-pad drawer ("调整") that slides up only while the user is fine-tuning.
 */
export function MobilePreviewPad({ onMove, onConfirm, onCancel }: MobilePreviewPadProps) {
  const ghostPosition = useGameStore((s) => s.ghostPosition);
  const activeLayer = useGameStore((s) => s.activeLayer);
  const boardSize = useGameStore((s) => s.boardSize);
  const [padOpen, setPadOpen] = useState(false);

  if (!ghostPosition) return null;

  const closePad = () => setPadOpen(false);

  return (
    <>
      {/* Slim confirm bar (always visible while previewing) */}
      <div className="pointer-events-auto w-full max-w-md mx-auto">
        <div className="glass-panel px-3 py-2 flex items-center justify-between gap-2">
          <span className="mono-num text-[12px] text-white/70">
            预览 <span className="accent-glow">{fmt(ghostPosition)}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPadOpen(!padOpen)} className="glass-button px-2.5 py-1.5 text-xs">调整</button>
            <button onClick={onConfirm} className="glass-button--primary px-3 py-1.5 text-xs">✓ 落子</button>
            <button onClick={onCancel} className="glass-button px-3 py-1.5 text-xs">✕ 取消</button>
          </div>
        </div>
      </div>

      {/* D-pad drawer */}
      {padOpen && (
        <div className="fixed inset-0 z-20 flex flex-col justify-end">
          <div className="absolute inset-0 bg-[#070b16]/40" onClick={closePad} />
          <div className="relative pointer-events-auto w-full max-w-md mx-auto mb-2 px-3">
            <div className="glass-panel p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="panel-label">调整预览</span>
                <button onClick={closePad} className="glass-button px-2 py-1 text-xs">收起 ▾</button>
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
                <button onClick={() => { onConfirm(); closePad(); }} className="glass-button--primary flex-1 py-2 text-sm">✓ 落子</button>
                <button onClick={() => { onCancel(); closePad(); }} className="glass-button flex-1 py-2 text-sm">✕ 取消</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
