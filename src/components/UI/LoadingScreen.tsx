import React from 'react';

interface LoadingScreenProps {
  booted: boolean;
  onStart: () => void;
}

/**
 * Full-screen boot screen: shows a loading state until every component is
 * ready (fonts + WebGL first frame + minimum display time), then a small
 * "click to start" prompt. Clicking anywhere starts the main menu and counts
 * as the first user gesture (audio init).
 */
export function LoadingScreen({ booted, onStart }: LoadingScreenProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b16]/35 cursor-pointer select-none"
      onClick={booted ? onStart : undefined}
    >
      <h1
        className="menu-title font-display font-light tracking-wider mb-10"
        style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)' }}
      >
        SPATIAL GOMOKU
      </h1>

      {!booted ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-cyan-300/30 border-t-cyan-300 rounded-full animate-spin" />
          <p className="text-white/40 text-sm tracking-[0.3em] uppercase">正在加载…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="accent-glow text-base md:text-lg tracking-[0.2em]">点击开始游戏</p>
          <p className="text-white/30 text-[11px] uppercase tracking-[0.3em]">click to start</p>
        </div>
      )}
    </div>
  );
}
