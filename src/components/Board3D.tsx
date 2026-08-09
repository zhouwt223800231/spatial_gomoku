import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { Stone } from './Stone';
import { GhostStone } from './GhostStone';
import { WinLine } from './WinLine';

export function Board3D() {
  const { stones, boardSize, ghostPosition, winLine, hoveredLayer } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  const offset = (boardSize - 1) / 2;

  // 网格线：用细圆柱（mesh）绘制，线宽可控、兼容所有 GPU。
  // cylinderGeometry 默认沿 Y 轴，因此：
  //   沿 X 轴 -> 绕 Z 旋转 90°
  //   沿 Y 轴 -> 不旋转
  //   沿 Z 轴 -> 绕 X 旋转 90°
  const gridLines = useMemo(() => {
    const lines: { pos: [number, number, number]; rot: [number, number, number] }[] = [];
    const half = boardSize / 2; // 线从 -half 到 +half，比棋盘略长保证端点衔接
    for (let a = 0; a < boardSize; a++) {
      for (let b = 0; b < boardSize; b++) {
        const v = a - offset;
        const w = b - offset;
        // 沿 X 轴（Y=w, Z=v 固定）
        lines.push({ pos: [0, w, v], rot: [0, 0, Math.PI / 2] });
        // 沿 Y 轴（X=v, Z=w 固定）
        lines.push({ pos: [v, 0, w], rot: [0, 0, 0] });
        // 沿 Z 轴（X=w, Y=v 固定）
        lines.push({ pos: [w, v, 0], rot: [Math.PI / 2, 0, 0] });
      }
    }
    return { lines, len: boardSize + 0.02 };
  }, [boardSize, offset]);

  // 落子点击靶：每个格点一个透明小立方体，点击时 intersection.point 就是格点中心，
  // App.handleClick 的 Math.round 后即为精确格点坐标。这是"能正常落子"的关键。
  const hitboxes = useMemo(() => {
    const boxes: [number, number, number][] = [];
    for (let x = 0; x < boardSize; x++) {
      for (let y = 0; y < boardSize; y++) {
        for (let z = 0; z < boardSize; z++) {
          boxes.push([x - offset, y - offset, z - offset]);
        }
      }
    }
    return boxes;
  }, [boardSize, offset]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
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

      {/* 网格线：细圆柱，禁用射线检测 */}
      {gridLines.lines.map((line, idx) => (
        <mesh key={`gl-${idx}`} position={line.pos} rotation={line.rot} raycast={() => null}>
          <cylinderGeometry args={[0.03, 0.03, gridLines.len, 6]} />
          <meshBasicMaterial color="#7dd3fc" transparent opacity={0.9} />
        </mesh>
      ))}

      {/* 悬停层高亮：纯视觉，禁用射线检测 */}
      {Array.from({ length: boardSize }, (_, z) => (
        hoveredLayer === z && (
          <mesh key={`layer-${z}`} position={[0, 0, z - offset]} raycast={() => null}>
            <planeGeometry args={[boardSize - 0.2, boardSize - 0.2]} />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.04} side={THREE.DoubleSide} />
          </mesh>
        )
      ))}

      {/* 落子点击靶：每个格点一个透明 hitbox（唯一可点击物体） */}
      {hitboxes.map((pos, idx) => (
        <mesh key={`hit-${idx}`} position={pos}>
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
