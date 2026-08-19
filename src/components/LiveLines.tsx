import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { findAlignedRuns } from '../game/rules';

export function LiveLines() {
  const stones = useGameStore((s) => s.stones);
  const boardSize = useGameStore((s) => s.boardSize);
  const showLines = useGameStore((s) => s.showLines);

  const lines = useMemo(() => {
    if (!showLines) return [];
    const offset = (boardSize - 1) / 2;
    return findAlignedRuns(stones, boardSize, 3).map((run) => {
      const color = run.player === 'black' ? '#fbbf24' : '#60a5fa';
      const base = run.positions.length >= 4 ? 0.8 : 0.45;
      const points = run.positions.map((p) => new THREE.Vector3(p.x - offset, p.y - offset, p.z - offset));
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: base });
      const line = new THREE.Line(geo, mat);
      return { line, base, len: run.positions.length };
    });
  }, [stones, boardSize, showLines]);

  const pulseRef = useRef<{ mat: THREE.LineBasicMaterial; base: number; len: number }[]>([]);
  pulseRef.current = lines.map((l) => ({ mat: l.line.material as THREE.LineBasicMaterial, base: l.base, len: l.len }));

  useFrame((state) => {
    for (const item of pulseRef.current) {
      if (item.len >= 4) {
        item.mat.opacity = item.base * (0.7 + 0.3 * Math.sin(state.clock.elapsedTime * 4));
      }
    }
  });

  return (
    <group>
      {lines.map((l, i) => (
        <primitive key={i} object={l.line} />
      ))}
    </group>
  );
}