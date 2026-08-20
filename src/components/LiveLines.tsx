import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { findAlignedRuns } from '../game/rules';
import { getOpenThreats, threatColor } from '../game/threats';

export function LiveLines() {
  const stones = useGameStore((s) => s.stones);
  const boardSize = useGameStore((s) => s.boardSize);
  const showLines = useGameStore((s) => s.showLines);
  const threatGuide = useGameStore((s) => s.threatGuide);
  const gameMode = useGameStore((s) => s.gameMode);
  const humanPlayer = useGameStore((s) => s.humanPlayer);

  // Existing aligned-run lines (len >= 3), colored per player.
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

  // Open-threat guidance: a pulsing ring at each open end plus a short dashed
  // segment from the nearest run stone to that end.
  const threats = useMemo(() => {
    if (!threatGuide) return [];
    const offset = (boardSize - 1) / 2;
    return getOpenThreats(stones, boardSize).map((t) => {
      const color = threatColor(t.player, gameMode, humanPlayer);
      const first = t.run[0];
      const last = t.run[t.run.length - 1];
      const dir = new THREE.Vector3(last.x - first.x, last.y - first.y, last.z - first.z).normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

      const rings = t.openEnds.map((p) => {
        const mesh = new THREE.Mesh(
          new THREE.TorusGeometry(0.3, 0.024, 10, 32),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false })
        );
        mesh.position.set(p.x - offset, p.y - offset, p.z - offset);
        mesh.quaternion.copy(quat);
        return mesh;
      });

      const dashes = t.openEnds.map((p) => {
        const dFirst = Math.abs(p.x - first.x) + Math.abs(p.y - first.y) + Math.abs(p.z - first.z);
        const dLast = Math.abs(p.x - last.x) + Math.abs(p.y - last.y) + Math.abs(p.z - last.z);
        const nearEnd = dFirst < dLast ? first : last;
        const pts = [
          new THREE.Vector3(nearEnd.x - offset, nearEnd.y - offset, nearEnd.z - offset),
          new THREE.Vector3(p.x - offset, p.y - offset, p.z - offset),
        ];
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineDashedMaterial({ color, dashSize: 0.09, gapSize: 0.06, transparent: true, opacity: 0.55, depthTest: false, depthWrite: false });
        const line = new THREE.Line(geo, mat);
        line.computeLineDistances();
        return line;
      });

      return { rings, dashes };
    });
  }, [threatGuide, stones, boardSize, gameMode, humanPlayer]);

  const pulseRuns = useRef<{ mat: THREE.LineBasicMaterial; base: number }[]>([]);
  pulseRuns.current = lines.filter((l) => l.len >= 4).map((l) => ({ mat: l.line.material as THREE.LineBasicMaterial, base: l.base }));

  const pulseRings = useRef<{ mat: THREE.MeshBasicMaterial }[]>([]);
  pulseRings.current = threats.flatMap((t) => t.rings.map((m) => ({ mat: m.material as THREE.MeshBasicMaterial })));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pulseRuns.current.length > 0) {
      for (const item of pulseRuns.current) {
        item.mat.opacity = item.base * (0.7 + 0.3 * Math.sin(t * 4));
      }
    }
    if (pulseRings.current.length > 0) {
      for (const item of pulseRings.current) {
        item.mat.opacity = 0.55 + 0.35 * Math.sin(t * 5);
      }
    }
  });

  return (
    <group>
      {lines.map((l, i) => (
        <primitive key={`line-${i}`} object={l.line} />
      ))}
      {threats.map((t, i) => (
        <group key={`threat-${i}`}>
          {t.rings.map((m, j) => (
            <primitive key={`ring-${j}`} object={m} />
          ))}
          {t.dashes.map((d, j) => (
            <primitive key={`dash-${j}`} object={d} />
          ))}
        </group>
      ))}
    </group>
  );
}