import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { StrategyRadar } from './StrategyRadar';
import { ProjectionMinimap } from '../ProjectionMinimap';
import { AIInsight } from './AIInsight';

interface InfoDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** Mobile-only drawer that hosts the secondary panels (radar, minimap, AI insight). */
export function InfoDrawer({ open, onClose }: InfoDrawerProps) {
  const gameMode = useGameStore((s) => s.gameMode);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 md:hidden">
      <div className="absolute inset-0 bg-[#070b16]/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-2xl glass-panel p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="panel-label">信息面板</span>
          <button onClick={onClose} className="glass-button px-3 py-1 text-xs">关闭 ✕</button>
        </div>
        <StrategyRadar />
        <ProjectionMinimap />
        {gameMode === 'ai' && <AIInsight />}
      </div>
    </div>
  );
}
