import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const IGNITE_END = 1.8;      // both pulse heads reach the two endpoints

interface VictoryCelebrationProps {
  positions: [number, number, number][];
  player: 'black' | 'white';
}

export function VictoryCelebration({ positions, player }: VictoryCelebrationProps) {
  const color = player === 'black' ? '#fbbf24' : '#60a5fa';
  const glow = player === 'black' ? '#f59e0b' : '#3b82f6';

  const startRef = useRef<number | null>(null);
  const stonesRef = useRef<(THREE.Mesh | null)[]>([]);
  const segsRef = useRef<(THREE.Line | null)[]>([]);
  const headLeftRef = useRef<THREE.Mesh | null>(null);
  const headRightRef = useRef<THREE.Mesh | null>(null);

  const n = positions.length;
  const segCount = n - 1;
  const centerIdx = segCount / 2;      // stone index of the center (e.g. 2 for 5 stones)
  const maxDist = Math.max(centerIdx, segCount - centerIdx); // normalized distance (e.g. 2)

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

  const centerVec = useMemo(() => {
    const a = new THREE.Vector3(...positions[Math.floor(centerIdx)]);
    const b = new THREE.Vector3(...positions[Math.ceil(centerIdx)]);
    return a.clone().add(b).multiplyScalar(0.5);
  }, [positions, centerIdx]);

  const leftEnd = useMemo(() => new THREE.Vector3(...positions[0]), [positions]);
  const rightEnd = useMemo(() => new THREE.Vector3(...positions[n - 1]), [positions, n]);

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

    // Two pulse heads travel from the center to both endpoints, arriving together.
    if (headLeftRef.current) {
      const q = reveal(progress, maxDist);
      headLeftRef.current.position.lerpVectors(centerVec, leftEnd, q);
      const m = headLeftRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.95 * (progress >= 1 ? Math.max(0, 1 - (t - IGNITE_END) / 0.3) : 1);
    }
    if (headRightRef.current) {
      const q = reveal(progress, maxDist);
      headRightRef.current.position.lerpVectors(centerVec, rightEnd, q);
      const m = headRightRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.95 * (progress >= 1 ? Math.max(0, 1 - (t - IGNITE_END) / 0.3) : 1);
    }

    // Stones ignite symmetrically: center first, both ends last and together.
    stonesRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const dist = Math.abs(i - centerIdx);
      const igniteAt = dist / maxDist / 2;
      const local = (progress - igniteAt) / 0.22;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (local <= 0) {
        mesh.scale.setScalar(0.45);
        mat.emissiveIntensity = 0.25;
      } else if (local < 1) {
        const s = 0.45 + 0.25 * (1 - Math.pow(1 - local, 3));
        mesh.scale.setScalar(s);
        mat.emissiveIntensity = 0.25 + 1.8 * local;
      } else {
        mesh.scale.setScalar(0.7 - 0.05 * Math.sin(t * 2 + i));
        mat.emissiveIntensity = 1.7;
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
          <sphereGeometry args={[0.45, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={glow}
            emissiveIntensity={0.25}
            roughness={0.3}
            metalness={0.1}
            transparent
            opacity={0.95}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* two travelling energy heads (left + right) */}
      <mesh ref={headLeftRef} position={centerVec} raycast={() => null}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh ref={headRightRef} position={centerVec} raycast={() => null}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}
