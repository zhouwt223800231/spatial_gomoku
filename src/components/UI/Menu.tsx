import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { BoardSize } from '../../types';

export function Menu() {
  const { setGameMode, startGame, setBoardSize, boardSize } = useGameStore();

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#070b16]/60 backdrop-blur-sm">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-light tracking-wider text-white mb-2">
          Spatial Gomoku
        </h1>
        <p className="text-white/40 text-lg tracking-widest uppercase">
          3D Spatial Gomoku
        </p>
      </div>

      <div className="glass-panel p-8 w-80 space-y-6">
        <div className="space-y-3">
          <label className="text-white/60 text-sm uppercase tracking-wider">Board Size</label>
          <div className="flex gap-2">
            {[5, 7, 9].map((size) => (
              <button
                key={size}
                onClick={() => setBoardSize(size as BoardSize)}
                className={`flex-1 py-2 rounded-lg border transition-all ${
                  boardSize === size
                    ? 'bg-white/20 border-white/40 text-white'
                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                }`}
              >
                {size}³
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => { setGameMode('pvp'); startGame(); }}
            className="w-full glass-button text-lg font-light"
          >
            Local vs Local
          </button>
          <button
            onClick={() => { setGameMode('ai'); startGame(); }}
            className="w-full glass-button text-lg font-light"
          >
            AI Challenge
          </button>
        </div>
      </div>

      <div className="mt-8 text-white/25 text-xs text-center leading-relaxed">
        <p>Left-drag: rotate · Wheel: zoom</p>
        <p>Right-click: aim · WASD / arrows: fine move</p>
        <p>Double right-click / Enter: place · Esc: cancel</p>
      </div>
    </div>
  );
}