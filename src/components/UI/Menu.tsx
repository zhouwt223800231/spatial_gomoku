import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { BoardSize } from '../../types';

export function Menu() {
  const { setGameMode, startGame, setBoardSize, boardSize } = useGameStore();

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#070b16]/55 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="text-center mb-10">
        <h1 className="font-display text-5xl md:text-6xl font-light tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-violet-300 mb-3">
          Spatial Gomoku
        </h1>
        <p className="text-white/40 text-sm md:text-base tracking-[0.3em] uppercase">3D Spatial Gomoku · 五子棋</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Game setup */}
        <div className="glass-panel p-6 w-[21rem] space-y-6">
          <div className="space-y-3">
            <label className="panel-label">棋盘大小 · Board Size</label>
            <div className="flex gap-2">
              {[5, 7, 9].map((size) => (
                <button
                  key={size}
                  onClick={() => setBoardSize(size as BoardSize)}
                  className={`flex-1 py-2.5 rounded-xl border font-mono text-sm transition-all ${
                    boardSize === size
                      ? 'bg-cyan-400/15 border-cyan-200/50 text-cyan-100 shadow-glow-sm'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/75'
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
              className="w-full glass-button--primary text-lg font-light"
            >
              本地对战 · Local vs Local
            </button>
            <button
              onClick={() => { setGameMode('ai'); startGame(); }}
              className="w-full glass-button text-lg font-light"
            >
              人机挑战 · AI Challenge
            </button>
          </div>
        </div>

        {/* Usage instructions */}
        <div className="glass-panel p-6 w-[21rem]">
          <h2 className="panel-label mb-4">使用说明 · How to Play</h2>
          <ul className="text-white/70 text-sm space-y-2.5 leading-relaxed">
            <li><span className="text-cyan-200/80">左键点击</span>：在预览层直接落子</li>
            <li><span className="text-cyan-200/80">右键点击</span>：瞄准格子并进入预览</li>
            <li><span className="text-cyan-200/80">A / D</span>（或 ← / →）：沿 X 轴移动</li>
            <li><span className="text-cyan-200/80">W / S</span>（或 ↑ / ↓）：沿 Y 轴移动</li>
            <li><span className="text-cyan-200/80">Q / E</span>：沿 Z 轴切层</li>
            <li><span className="text-cyan-200/80">Enter / 空格 / 双击右键</span>：确认落子</li>
            <li><span className="text-cyan-200/80">Esc</span>：取消预览</li>
            <li><span className="text-cyan-200/80">0 / F</span>：全局总览取景</li>
            <li><span className="text-cyan-200/80">O</span>：透视 / 正交视图切换</li>
            <li className="text-white/40">左键拖拽旋转视角 · 滚轮缩放</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
