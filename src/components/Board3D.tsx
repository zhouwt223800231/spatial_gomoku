import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';
import { Stone } from './Stone';
import { GhostStone } from './GhostStone';
import { WinLine } from './WinLine';

export function Board3D() {
  const { stones, boardSize, ghostPosition, winLine, hoveredLayer } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  const offset = (boardSize - 1) / 2;

  const gridLines = useMemo(() => {
    const lines: [THREE.Vector3, THREE.Vector3][] = [];

    for (let z = 0; z < boardSize; z++) {
      for (let i = 0; i < boardSize; i++) {
        lines.push([
          new THREE.Vector3(-offset, i - offset, z - offset),
          new THREE.Vector3(boardSize - 1 - offset, i - offset, z - offset)
        ]);
        lines.push([
          new THREE.Vector3(i - offset, -offset, z - offset),
          new THREE.Vector3(i - offset, boardSize - 1 - offset, z - offset)
        ]);
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
        <meshPhysicalMaterial
          color="#0f172a"
          transparent
          opacity={0.06}
          roughness={0.05}
          metalness={0.2}
          transmission={0.95}
          thickness={1}
          clearcoat={1}
        />
      </mesh>

      {gridLines.map((line, i) => (
        <Line key={i} points={line} color="#4a5568" lineWidth={1} transparent opacity={0.2} />
      ))}

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
