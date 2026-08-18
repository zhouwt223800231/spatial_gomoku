import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { Position } from '../types';
import { Stone } from './Stone';
import { GhostStone } from './GhostStone';
import { WinLine } from './WinLine';

interface Board3DProps {
  onCellHover?: (pos: Position) => void;
  onCellLeave?: () => void;
  onCellClick?: (pos: Position) => void;
}

// 重要：本组件不再对棋盘做任何自动旋转。旋转会导致：
//  1) 网格线视觉参差；
//  2) 点击靶(hitbox)的世界坐标 ≠ 格点坐标，落子算错格子。
// 视角旋转交给 CameraController（OrbitControls 只转相机不转棋盘）。
export function Board3D({ onCellHover, onCellLeave, onCellClick }: Board3DProps) {
  const { stones, boardSize, ghostPosition, winLine, hoveredLayer } = useGameStore();
  const offset = (boardSize - 1) / 2;

  // 内部网格线：精确构造 lineSegments 的 BufferGeometry。
  // 与边框同样的 lineSegments 渲染方式（你的环境已验证能正常显示），仅换亮色高对比。
  const gridGeometry = useMemo(() => {
    const positions: number[] = [];
    const lineLen = boardSize - 1; // 格点间距为 1，线覆盖从 -offset 到 +offset
    for (let a = 0; a < boardSize; a++) {
      for (let b = 0; b < boardSize; b++) {
        const v = a - offset; // ∈ [-2..2] 整数
        const w = b - offset;
        // 沿 X 轴：每个 (Y=w, Z=v) 固定，从 -offset 到 +offset
        positions.push(-offset, w, v, offset, w, v);
        // 沿 Y 轴：每个 (X=v, Z=w) 固定
        positions.push(v, -offset, w, v, offset, w);
        // 沿 Z 轴：每个 (X=w, Y=v) 固定
        positions.push(w, v, -offset, w, v, offset);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [boardSize, offset]);

  // 落子点击靶：每个格点一个透明小立方体，直接持有格点坐标 (grid space)。
  // 事件挂在 mesh 上（R3F 网格事件），因此无需再用 intersection.point 反算格点。
  const hitboxes = useMemo(() => {
    const boxes: Position[] = [];
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        for (let z = 0; z < boardSize; z++) {
          boxes.push({ x, y, z });
        }
      }
    }
    return boxes;
  }, [boardSize]);

  return (
    <group>
      {/* 主棋盒：纯视觉，禁用射线检测，避免挡住点击 */}
      <mesh raycast={() => null}>
        <boxGeometry args={[boardSize, boardSize, boardSize]} />
        <meshPhysicalMaterial
          color="#1e293b"
          transparent
          opacity={0.22}
          roughness={0.12}
          metalness={0.55}
          clearcoat={0.6}
        />
      </mesh>

      {/* 棋盒边框线（让棋盘轮廓清晰可见） */}
      <lineSegments raycast={() => null}>
        <edgesGeometry args={[new THREE.BoxGeometry(boardSize, boardSize, boardSize)]} />
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.9} />
      </lineSegments>

      {/* 内部网格线：与边框相同渲染方式，亮色高对比 */}
      <lineSegments geometry={gridGeometry} raycast={() => null}>
        <lineBasicMaterial color="#7dd3fc" transparent opacity={0.9} />
      </lineSegments>

      {/* 悬停层高亮：纯视觉，禁用射线检测 */}
      {Array.from({ length: boardSize }, (_, z) => (
        hoveredLayer === z && (
          <mesh key={`layer-${z}`} position={[0, 0, z - offset]} raycast={() => null}>
            <planeGeometry args={[boardSize - 0.2, boardSize - 0.2]} />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.04} side={THREE.DoubleSide} />
          </mesh>
        )
      ))}

      {/* 落子点击靶：每个格点一个透明 hitbox（唯一可点击物体）。
          通过 R3F 网格事件上报悬停 / 离开 / 点击，App 侧据此落子。 */}
      {hitboxes.map((pos, idx) => (
        <mesh
          key={`hit-${idx}`}
          position={[pos.x - offset, pos.y - offset, pos.z - offset]}
          onClick={(e) => { e.stopPropagation(); onCellClick?.(pos); }}
          onPointerMove={(e) => { e.stopPropagation(); onCellHover?.(pos); }}
          onPointerOut={() => onCellLeave?.()}
        >
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      {stones.map((stone, idx) => (
        <Stone
          key={`stone-${idx}`}
          position={[
            stone.position.x - offset,
            stone.position.y - offset,
            stone.position.z - offset,
          ]}
          player={stone.player}
        />
      ))}

      {ghostPosition && (
        <GhostStone
          position={[
            ghostPosition.x - offset,
            ghostPosition.y - offset,
            ghostPosition.z - offset,
          ]}
        />
      )}

      {winLine && (
        <WinLine
          positions={winLine.positions.map(p => [
            p.x - offset,
            p.y - offset,
            p.z - offset,
          ] as [number, number, number])}
          player={winLine.player}
        />
      )}
    </group>
  );
}