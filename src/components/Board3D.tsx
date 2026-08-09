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

  // 使用 Three.js 原生 LineSegments 构建网格线，避免 Drei <Line>（Line2）
  // 在部分 WebGL/GPU 环境初始化时实例化崩溃（Cannot read properties of undefined）。
  // 后来发现 lineSegments 的 1px 细线在部分高分屏/驱动下不可见，改用细圆柱（mesh）画线，
  // 线宽可控且兼容性极好。
  const gridLines = useMemo(() => {
    const lines: { pos: [number, number, number]; orient: 'x' | 'y' | 'z'; len: number }[] = [];
    for (let a = 0; a < boardSize; a++) {
      for (let b = 0; b < boardSize; b++) {
        const v = a - offset;
        const w = b - offset;
        // 沿 X 轴
        lines.push({ pos: [0, w, v], orient: 'x', len: boardSize });
        // 沿 Y 轴
        lines.push({ pos: [v, 0, w], orient: 'y', len: boardSize });
        // 沿 Z 轴
        lines.push({ pos: [w, v, 0], orient: 'z', len: boardSize });
      }
    }
    return lines;
  }, [boardSize, offset]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[boardSize, boardSize, boardSize]} />
        {/* 主棋盒材质：避免 transmission（玻璃透射）——它在部分 Intel 集显/Chromium 环境会黑屏。
            改用普通半透明金属材质模拟玻璃，兼容性远好于 transmission。 */}
        <meshPhysicalMaterial
          color="#1e293b"
          transparent
          opacity={0.22}
          roughness={0.12}
          metalness={0.55}
          clearcoat={0.6}
        />
      </mesh>

      {/* 棋盒边框线（让棋盘轮廓在无透射时也清晰可见） */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(boardSize, boardSize, boardSize)]} />
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.9} />
      </lineSegments >

      {/* 网格线：改用细圆柱 mesh 绘制，线宽可控，兼容所有 GPU（替代 lineSegments 的 1px 细线） */}
      {gridLines.map((line, idx) => {
        // 坐标轴向旋转：x 轴向默认(沿X)，y 轴需绕Z旋转90°，z 轴需绕X旋转90°
        let rot: [number, number, number] = [0, 0, 0];
        if (line.orient === 'y') rot = [0, 0, Math.PI / 2];
        else if (line.orient === 'z') rot = [Math.PI / 2, 0, 0];
        return (
          <mesh key={`gl-${idx}`} position={line.pos} rotation={rot}>
            <cylinderGeometry args={[0.03, 0.03, line.len, 6]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={0.9} />
          </mesh>
        );
      })}

      {Array.from({ length: boardSize }, (_, z) => (
        hoveredLayer === z && (
          <mesh key={`layer-${z}`} position={[0, 0, z - offset]}>
            <planeGeometry args={[boardSize - 0.2, boardSize - 0.2]} />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.04} side={THREE.DoubleSide} />
          </mesh>
        )
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
