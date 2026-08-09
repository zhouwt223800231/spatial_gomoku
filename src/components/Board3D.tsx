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
  const gridGeometry = useMemo(() => {
    const positions: number[] = [];

    for (let z = 0; z < boardSize; z++) {
      for (let i = 0; i < boardSize; i++) {
        // X 方向线
        positions.push(
          -offset, i - offset, z - offset,
          boardSize - 1 - offset, i - offset, z - offset
        );
        // Y 方向线
        positions.push(
          i - offset, -offset, z - offset,
          i - offset, boardSize - 1 - offset, z - offset
        );
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
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
        <lineBasicMaterial color="#60a5fa" transparent opacity={0.5} />
      </lineSegments >

      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial color="#94a3b8" transparent opacity={0.45} />
      </lineSegments>

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
