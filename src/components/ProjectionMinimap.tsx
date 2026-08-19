import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Position, StoneData, BoardSize } from '../types';

const SIZE = 104;
const PLOT_LEFT = 24;
const PLOT_RIGHT = SIZE - 10;
const PLOT_TOP = 10;
const PLOT_BOTTOM = SIZE - 24;

const AXIS_COLORS: Record<'x' | 'y' | 'z', string> = {
  x: '#67e8f9',
  y: '#60a5fa',
  z: '#a78bfa',
};

const VIEW_LABELS: Record<'xy' | 'xz' | 'yz', string> = {
  xy: 'XY · 沿Z轴',
  xz: 'XZ · 沿Y轴',
  yz: 'YZ · 沿X轴',
};

const VIEW_AXES: Record<'xy' | 'xz' | 'yz', ['x' | 'y' | 'z', 'x' | 'y' | 'z']> = {
  xy: ['x', 'y'],
  xz: ['x', 'z'],
  yz: ['y', 'z'],
};

const TICK_TEXT = 'rgba(255,255,255,0.45)';

interface MiniViewProps {
  axis: 'xy' | 'xz' | 'yz';
  stones: StoneData[];
  boardSize: BoardSize;
  ghost: Position | null;
}

function MiniView({ axis, stones, boardSize, ghost }: MiniViewProps) {
  const [hAxis, vAxis] = VIEW_AXES[axis];
  const hColor = AXIS_COLORS[hAxis];
  const vColor = AXIS_COLORS[vAxis];

  const span = boardSize - 1;
  const px = (v: number) => PLOT_LEFT + (v / span) * (PLOT_RIGHT - PLOT_LEFT);
  const py = (v: number) => PLOT_BOTTOM - (v / span) * (PLOT_BOTTOM - PLOT_TOP);

  const project = (p: Position): [number, number] => {
    if (axis === 'xy') return [px(p.x), py(p.y)];
    if (axis === 'xz') return [px(p.x), py(p.z)];
    return [px(p.y), py(p.z)];
  };

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/55">{VIEW_LABELS[axis]}</span>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="rounded-xl bg-[#0a1224]/70 border border-cyan-200/15"
        style={{ boxShadow: 'inset 0 0 18px rgba(103,232,249,0.05), 0 0 12px rgba(103,232,249,0.06)' }}
      >
        <rect x={PLOT_LEFT} y={PLOT_TOP} width={PLOT_RIGHT - PLOT_LEFT} height={PLOT_BOTTOM - PLOT_TOP} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" rx="3" />

        {/* stones */}
        {stones.map((s, i) => {
          const [cx, cy] = project(s.position);
          const fill = s.player === 'black' ? '#1e293b' : '#f8fafc';
          const stroke = s.player === 'black' ? '#94a3b8' : '#64748b';
          return <circle key={i} cx={cx} cy={cy} r={4} fill={fill} stroke={stroke} strokeWidth="1" />;
        })}

        {/* ghost preview */}
        {ghost && (
          <circle cx={project(ghost)[0]} cy={project(ghost)[1]} r={5} fill="none" stroke="#67e8f9" strokeWidth="1.6" />
        )}

        {/* horizontal axis arrow */}
        <line x1={PLOT_LEFT - 2} y1={PLOT_BOTTOM + 7} x2={PLOT_RIGHT + 5} y2={PLOT_BOTTOM + 7} stroke={hColor} strokeWidth="1" />
        <polygon
          points={`${PLOT_RIGHT + 7},${PLOT_BOTTOM + 7} ${PLOT_RIGHT + 1},${PLOT_BOTTOM + 4} ${PLOT_RIGHT + 1},${PLOT_BOTTOM + 10}`}
          fill={hColor}
        />
        <text x={PLOT_RIGHT + 10} y={PLOT_BOTTOM + 10} fontSize="9" fill={hColor} fontFamily="ui-monospace, monospace">{hAxis.toUpperCase()}</text>

        {/* vertical axis arrow */}
        <line x1={PLOT_LEFT - 7} y1={PLOT_BOTTOM + 3} x2={PLOT_LEFT - 7} y2={PLOT_TOP - 5} stroke={vColor} strokeWidth="1" />
        <polygon
          points={`${PLOT_LEFT - 7},${PLOT_TOP - 7} ${PLOT_LEFT - 10},${PLOT_TOP - 1} ${PLOT_LEFT - 4},${PLOT_TOP - 1}`}
          fill={vColor}
        />
        <text x={PLOT_LEFT - 12} y={PLOT_TOP - 6} fontSize="9" fill={vColor} fontFamily="ui-monospace, monospace">{vAxis.toUpperCase()}</text>

        {/* horizontal ticks 1..N */}
        {Array.from({ length: boardSize }, (_, i) => (
          <g key={`h${i}`}>
            <line x1={px(i)} y1={PLOT_BOTTOM} x2={px(i)} y2={PLOT_BOTTOM + 3} stroke={hColor} strokeWidth="0.6" opacity="0.7" />
            <text x={px(i)} y={PLOT_BOTTOM + 9} fontSize="6" fill={TICK_TEXT} textAnchor="middle" fontFamily="ui-monospace, monospace">{i + 1}</text>
          </g>
        ))}

        {/* vertical ticks 1..N */}
        {Array.from({ length: boardSize }, (_, i) => (
          <g key={`v${i}`}>
            <line x1={PLOT_LEFT - 3} y1={py(i)} x2={PLOT_LEFT} y2={py(i)} stroke={vColor} strokeWidth="0.6" opacity="0.7" />
            <text x={PLOT_LEFT - 5} y={py(i) + 2} fontSize="6" fill={TICK_TEXT} textAnchor="end" fontFamily="ui-monospace, monospace">{i + 1}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ProjectionMinimap() {
  const stones = useGameStore((s) => s.stones);
  const boardSize = useGameStore((s) => s.boardSize);
  const ghost = useGameStore((s) => s.ghostPosition);

  return (
    <div className="absolute bottom-24 left-6 z-10">
      <div className="glass-panel p-4">
        <h3 className="panel-label text-center mb-3">Projections</h3>
        <div className="flex gap-2.5">
          <MiniView axis="xy" stones={stones} boardSize={boardSize} ghost={ghost} />
          <MiniView axis="xz" stones={stones} boardSize={boardSize} ghost={ghost} />
          <MiniView axis="yz" stones={stones} boardSize={boardSize} ghost={ghost} />
        </div>
      </div>
    </div>
  );
}
