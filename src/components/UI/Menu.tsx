import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { BoardSize } from '../../types';

const CHIPS = ['13 方向连珠', 'AI 自适应学习', '双人 · 人机'];

const HELP_ITEMS: Array<[string, string]> = [
  ['左键 / 右键点击', '选中格子进入预览（不落子）'],
  ['Enter / 空格 / 「落子」按钮', '确认落子'],
  ['Esc / 「取消」按钮', '取消预览'],
  ['A / D（或 ← / →）', '沿 X 轴移动'],
  ['W / S（或 ↑ / ↓）', '沿 Y 轴移动'],
  ['Q / E', '沿 Z 轴切层'],
  ['左键拖拽 / 滚轮', '旋转视角 / 缩放'],
  ['0 / F / R', '全局总览取景'],
  ['O', '透视 / 正交视图切换'],
];

/**
 * Desktop main menu - "Deep Space Command Deck": a dynamic starfield shows
 * through a light scrim on the left (brand block) and a refined setup console
 * on the right; the how-to-play guide lives behind the bottom-right button.
 */
export function Menu() {
  const {
    setGameMode, startGame, setBoardSize, setHumanPlayer, setAiDifficulty,
    boardSize, humanPlayer, aiDifficulty, gameMode,
  } = useGameStore();
  const [showHelp, setShowHelp] = useState(false);

  const seg = (active: boolean) =>
    `flex-1 py-2.5 rounded-xl border font-mono text-sm transition-all ${
      active
        ? 'bg-cyan-400/15 border-cyan-200/50 text-cyan-100 shadow-glow-sm'
        : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/75'
    }`;

  const difficultyLabel: Record<string, string> = { easy: '简单', normal: '普通', hard: '困难' };

  return (
    <div className="absolute inset-0 z-10 bg-[#070b16]/20 overflow-y-auto">
      {/* Light vignette keeps the dynamic starfield visible while focusing the center */}
      <div className="fixed inset-0 menu-vignette pointer-events-none" />

      <div className="min-h-full w-full flex flex-col md:flex-row items-center justify-center gap-10 px-8 py-14 md:px-16 md:gap-16">
        {/* Brand block (left) */}
        <div className="w-full max-w-xl flex-1 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="relative mb-7">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="menu-emblem" />
            </div>
            <h1
              className="menu-title font-display font-light tracking-wider md:whitespace-nowrap"
              style={{ fontSize: 'clamp(2.4rem, 5.5vw, 4.4rem)' }}
            >
              SPATIAL GOMOKU
            </h1>
          </div>
          <div className="menu-rise w-28 h-px bg-gradient-to-r from-cyan-300/80 via-white/30 to-transparent mb-5" style={{ animationDelay: '0.12s' }} />
          <p className="menu-rise text-white/50 tracking-[0.32em] uppercase text-sm mb-9" style={{ animationDelay: '0.2s' }}>
            3D 空间五子棋 · 13 方向连珠
          </p>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            {CHIPS.map((chip, i) => (
              <span key={chip} className="menu-rise glass-chip px-4 py-1.5 text-xs" style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* Setup console (right) */}
        <div className="w-full max-w-md md:w-[26rem] menu-rise" style={{ animationDelay: '0.4s' }}>
          <div className="glass-panel p-7 corner-accent space-y-6">
            <div className="space-y-3">
              <label className="panel-label">棋盘大小 · Board Size</label>
              <div className="flex gap-2">
                {[5, 7, 9].map((size) => (
                  <button key={size} onClick={() => setBoardSize(size as BoardSize)} className={seg(boardSize === size)}>
                    {size}³
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="panel-label">执子 · Your Color（人机模式）</label>
              <div className="flex gap-2">
                <button onClick={() => setHumanPlayer('black')} className={seg(humanPlayer === 'black')}>我执黑 · 先手</button>
                <button onClick={() => setHumanPlayer('white')} className={seg(humanPlayer === 'white')}>我执白 · 后手</button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="panel-label">AI 难度 · Difficulty</label>
              <div className="flex gap-2">
                {(['easy', 'normal', 'hard'] as const).map((d) => (
                  <button key={d} onClick={() => setAiDifficulty(d)} className={seg(aiDifficulty === d)}>
                    {difficultyLabel[d]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="panel-label">模式 · Mode</label>
              <div className="flex gap-2">
                <button onClick={() => setGameMode('pvp')} className={seg(gameMode === 'pvp')}>本地对战</button>
                <button onClick={() => setGameMode('ai')} className={seg(gameMode === 'ai')}>人机挑战</button>
              </div>
            </div>

            <button onClick={startGame} className="w-full glass-button--primary text-lg font-light py-3">
              开始对局
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-5 left-8 font-mono text-[11px] text-white/30">
        v1.0 · Spatial Gomoku — 拖拽旋转 · 滚轮缩放
      </div>

      {/* Help toggle */}
      <button onClick={() => setShowHelp(true)} className="fixed bottom-5 right-8 glass-button text-xs px-4 py-2">
        玩法 ?
      </button>

      {/* Help panel */}
      {showHelp && (
        <div className="fixed inset-0 z-20 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-[#070b16]/60" onClick={() => setShowHelp(false)} />
          <div className="relative glass-panel p-7 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="panel-label">使用说明 · How to Play</h2>
              <button onClick={() => setShowHelp(false)} className="glass-button px-3 py-1.5 text-xs">✕ 关闭</button>
            </div>
            <ul className="text-white/70 text-sm space-y-2.5 leading-relaxed">
              {HELP_ITEMS.map(([keys, desc]) => (
                <li key={keys}>
                  <span className="text-cyan-200/80">{keys}</span>：{desc}
                </li>
              ))}
              <li className="text-white/40">提示：预览格为彩色 ghost，红色表示该格已被占用</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
