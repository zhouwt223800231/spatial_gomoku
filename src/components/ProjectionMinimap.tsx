import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Position, StoneData, BoardSize } from '../types';

const SIZE = 92;
const PAD = 10;

const norm = (v: number, size: BoardSize) => PAD + (v / (size - 1)) * (SIZE - 2 * PAD);

interface MiniViewProps {
  axis: 'xy' | 'xz' | 'yz';
  stones: StoneData[];
  boardSize: BoardSize;
  ghost: Position | null;
}

function MiniView({ axis, stones, boardSize, ghost }: MiniViewProps) {
  const project = (p: Position): [number, number] => {
    if (axis === 'xy') return [norm(p.x, boardSize), SIZE - norm(p.y, boardSize)];
    if (axis === 'xz') return [norm(p.x, boardSize), SIZE - norm(p.z, boardSize)];
    return [norm(p.y, boardSize), SIZE - norm(p.z, boardSize)];
  };

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="rounded-lg bg-black/30 border border-white/10">
      <rect x={PAD - 3} y={PAD - 3} width={SIZE - 2 * PAD + 6} height={SIZE - 2 * PAD + 6} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" rx="4" />
      {stones.map((s, i) => {
        const [cx, cy] = project(s.position);
        const fill = s.player === 'black' ? '#1e293b' : '#f8fafc';
        const stroke = s.player === 'black' ? '#94a3b8' : '#64748b';
        return <circle key={i} cx={cx} cy={cy} r={3.4} fill={fill} stroke={stroke} strokeWidth="1" />;
      })}
      {ghost && (
        <circle cx={project(ghost)[0]} cy={project(ghost)[1]} r={5} fill="none" stroke="#67e8f9" strokeWidth="1.6" />
      )}
    </svg>
  );
}

export function ProjectionMinimap() {
  const stones = useGameStore((s) => s.stones);
  const boardSize = useGameStore((s) => s.boardSize);
  const ghost = useGameStore((s) => s.ghostPosition);

  return (
    <div className="absolute bottom-24 left-6 z-10">
      <div className="glass-panel p-3">
        <h3 className="text-white/50 text-[10px] uppercase tracking-wider text-center mb-2">Projections</h3>
        <div className="flex gap-2">
          <MiniView axis="xy" stones={stones} boardSize={boardSize} ghost={ghost} />
          <MiniView axis="xz" stones={stones} boardSize={boardSize} ghost={ghost} />
          <MiniView axis="yz" stones={stones} boardSize={boardSize} ghost={ghost} />
        </div>
      </div>
    </div>
  );
}