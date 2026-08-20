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
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: base, depthTest: false, depthWrite: false });
      const line = new THREE.Line(geo, mat);
      return { line, base, len: run.positions.length };
    });
  }, [stones, boardSize, showLines]);

  const pulseRef = useRef<{ mat: THREE.LineBasicMaterial; base: number }[]>([]);
  pulseRef.current = lines.filter((l) => l.len >= 4).map((l) => ({ mat: l.line.material as THREE.LineBasicMaterial, base: l.base }));
  const hasPulse = pulseRef.current.length > 0;

  useFrame((state) => {
    // Only run the breathing animation when there are 4+ runs to pulse.
    if (!hasPulse) return;
    const t = state.clock.elapsedTime;
    for (const item of pulseRef.current) {
      item.mat.opacity = item.base * (0.7 + 0.3 * Math.sin(t * 4));
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
