import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { BoardSize } from '../../types';

export function Menu() {
  const { setGameMode, startGame, setBoardSize, boardSize } = useGameStore();

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#070b16]/60 backdrop-blur-sm overflow-y-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-5xl md:text-6xl font-light tracking-wider text-white mb-2">
          Spatial Gomoku
        </h1>
        <p className="text-white/40 text-lg tracking-widest uppercase">
          3D Spatial Gomoku
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-5 px-4">
        {/* Game setup */}
        <div className="glass-panel p-6 w-80 space-y-6">
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

        {/* Usage instructions */}
        <div className="glass-panel p-6 w-80">
          <h2 className="text-white/60 text-sm uppercase tracking-wider mb-4">使用说明</h2>
          <ul className="text-white/70 text-sm space-y-2">
            <li>左键点击：在预览层直接落子</li>
            <li>右键点击：瞄准该格并进入预览</li>
            <li>A / D（或 ← / →）：沿 X 轴移动</li>
            <li>W / S（或 ↑ / ↓）：沿 Y 轴移动</li>
            <li>Q / E：沿 Z 轴切层</li>
            <li>Enter / 空格 / 双击右键：确认落子</li>
            <li>Esc：取消预览</li>
            <li>0 / F：全局总览取景</li>
            <li>O：透视 / 正交视图切换</li>
            <li className="text-white/40">左键拖拽：旋转视角 · 滚轮：缩放</li>
          </ul>
        </div>
      </div>
    </div>
  );
}