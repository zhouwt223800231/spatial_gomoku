import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Timeline (seconds):
// 0-1.8 line grows (center -> both ends) while stones ignite sequentially
// (0.3s apart -> all 5 lit by 1.2s) -> stones themselves breathe until orbit (~2.2s+).
const IGNITE_END = 1.8;
const IGNITE_STEP = 0.3;

interface VictoryCelebrationProps {
  positions: [number, number, number][];
  player: 'black' | 'white';
}

export function VictoryCelebration({ positions, player }: VictoryCelebrationProps) {
  const color = player === 'black' ? '#fbbf24' : '#60a5fa'; // accent for the win line only

  const startRef = useRef<number | null>(null);
  const stonesRef = useRef<(THREE.Mesh | null)[]>([]);
  const segsRef = useRef<(THREE.Line | null)[]>([]);

  const n = positions.length;
  const segCount = n - 1;
  const centerIdx = segCount / 2;
  const maxDist = Math.max(centerIdx, segCount - centerIdx);

  // Line built from independent segments so opacity can be animated per segment
  // from the center outward (both ends reveal last, simultaneously).
  const segments = useMemo(() => {
    return Array.from({ length: segCount }, (_, i) => {
      const a = new THREE.Vector3(...positions[i]);
      const b = new THREE.Vector3(...positions[i + 1]);
      const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
      return new THREE.Line(geo, mat);
    });
  }, [positions, segCount, color]);

  // Symmetric reveal: 0 at p=0 for center, ramps so both ends finish together at p=1.
  const reveal = (p: number, dist: number) => {
    const start = dist / maxDist / 2;
    return Math.max(0, Math.min(1, (p - start) / (1 - start || 1)));
  };

  useFrame((state) => {
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startRef.current;
    const progress = Math.min(1, t / IGNITE_END);

    // Line segments appear from the center toward both ends.
    segsRef.current.forEach((seg, i) => {
      if (!seg) return;
      const midIdx = i + 0.5;
      const dist = Math.abs(midIdx - centerIdx);
      const mat = seg.material as THREE.LineBasicMaterial;
      mat.opacity = 0.35 * reveal(progress, dist);
    });

    // Stones ignite sequentially (first -> last, ALL five), then the stones
    // themselves breathe (scale only, no glow / no rings).
    stonesRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const igniteAt = (i * IGNITE_STEP) / IGNITE_END;
      const local = (progress - igniteAt) / 0.22;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (local <= 0) {
        mesh.scale.setScalar(0.45);
        mat.emissiveIntensity = 0.15;
      } else if (local < 1) {
        const s = 0.45 + 0.25 * (1 - Math.pow(1 - local, 3));
        mesh.scale.setScalar(s);
        mat.emissiveIntensity = 0.15 + 0.1 * local;
      } else {
        // Gentle breathing on the stone itself.
        mesh.scale.setScalar(0.7 + 0.06 * Math.sin(t * 2 + i * 0.7));
        mat.emissiveIntensity = 0.25;
      }
    });
  });

  return (
    <group>
      {segments.map((seg, i) => (
        <primitive key={i} object={seg} ref={(obj: THREE.Line | null) => { segsRef.current[i] = obj; }} />
      ))}

      {positions.map((p, i) => (
        <mesh
          key={i}
          position={p}
          raycast={() => null}
          ref={(el) => { stonesRef.current[i] = el; }}
        >
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshStandardMaterial
            color={player === 'black' ? '#1e293b' : '#f5f5f0'}
            emissive={player === 'black' ? '#0f172a' : '#fff8e7'}
            emissiveIntensity={0.15}
            roughness={0.3}
            metalness={0.1}
            transparent
            opacity={0.95}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
