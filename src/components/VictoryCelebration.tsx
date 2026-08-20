import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Timeline (seconds, aligned with CameraController):
// 0-1.8 line grows + stones ignite -> 1.2-3.0 ripples expand -> 2.4-3.6 stone glow
// -> 3.0-6.0 orbit -> 5.6-6.2 ripples contract.
const IGNITE_END = 1.8;
const RIPPLE_START = 1.2;
const RIPPLE_END = 3.0;
const RIPPLE_FINAL = 6.2;
const RINGS_PER_PLANE = 4;

interface VictoryCelebrationProps {
  positions: [number, number, number][];
  player: 'black' | 'white';
}

// Three orthogonal planes through the last stone.
const PLANE_AXES: { u: [number, number, number]; v: [number, number, number] }[] = [
  { u: [1, 0, 0], v: [0, 1, 0] }, // XY
  { u: [1, 0, 0], v: [0, 0, 1] }, // XZ
  { u: [0, 1, 0], v: [0, 0, 1] }, // YZ
];

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

  const centerVec = useMemo(() => {
    const a = new THREE.Vector3(...positions[Math.floor(centerIdx)]);
    const b = new THREE.Vector3(...positions[Math.ceil(centerIdx)]);
    return a.clone().add(b).multiplyScalar(0.5);
  }, [positions, centerIdx]);

  const leftEnd = useMemo(() => new THREE.Vector3(...positions[0]), [positions]);
  const rightEnd = useMemo(() => new THREE.Vector3(...positions[n - 1]), [positions, n]);

  // Ripple rings: one group per plane, RINGS_PER_PLANE concentric rings.
  const rings = useMemo(() => {
    const list: { ring: THREE.Mesh }[] = [];
    for (const { u, v } of PLANE_AXES) {
      for (let k = 0; k < RINGS_PER_PLANE; k++) {
        const geo = new THREE.RingGeometry(0.25 + k * 0.55, 0.25 + k * 0.55 + (0.5 - k * 0.08), 48);
        const mat = new THREE.MeshBasicMaterial({
          color: k === 0 ? '#67e8f9' : k === 1 ? '#7dd3fc' : k === 2 ? '#a5b4fc' : '#a78bfa',
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.position.copy(rightEnd);
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(u[0], u[1], u[2]).cross(new THREE.Vector3(v[0], v[1], v[2])).normalize(),
        );
        ring.quaternion.copy(quat);
        ring.scale.setScalar(0.01);
        list.push({ ring });
      }
    }
    return list;
  }, [rightEnd]);

  // Symmetric reveal: 0 at p=0 for center, ramps so both ends finish together at p=1.
  const reveal = (p: number, dist: number) => {
    const start = dist / maxDist / 2;
    return Math.max(0, Math.min(1, (p - start) / (1 - start || 1)));
  };

  useFrame((state) => {
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startRef.current;
    const progress = Math.min(1, t / IGNITE_END);

    // --- Line grows from the center toward both ends (0-1.8s) ---
    segsRef.current.forEach((seg, i) => {
      if (!seg) return;
      const midIdx = i + 0.5;
      const dist = Math.abs(midIdx - centerIdx);
      const mat = seg.material as THREE.LineBasicMaterial;
      mat.opacity = 0.35 * reveal(progress, dist);
    });

    // Two pulse heads travel from center to both endpoints.
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

    // --- Ripple expansion (1.2-3.0s) then contract+fade (5.6-6.2s) ---
    const rippleT = Math.min(1, Math.max(0, (t - RIPPLE_START) / (RIPPLE_END - RIPPLE_START)));
    const contract = t >= 5.6 ? Math.min(1, Math.max(0, (t - 5.6) / (RIPPLE_FINAL - 5.6))) : 0;

    rings.forEach(({ ring }, idx) => {
      const plane = Math.floor(idx / RINGS_PER_PLANE);
      const k = idx % RINGS_PER_PLANE;
      const mat = ring.material as THREE.MeshBasicMaterial;
      const ringDelay = (plane * 0.15 + k * 0.12) / 0.9;
      const local = Math.max(0, Math.min(1, (rippleT - ringDelay) / (1 - ringDelay || 1)));

      if (contract > 0) {
        const s = 6 - contract * 5;
        ring.scale.setScalar(Math.max(0.01, s));
        mat.opacity = 0.4 * (1 - contract);
      } else if (local > 0) {
        const s = 0.3 + local * 2.2;
        ring.scale.setScalar(s);
        mat.opacity = 0.5 * Math.exp(-3 * Math.max(0, local - 0.35)) * (1 - rippleT * 0.3);
      } else {
        mat.opacity = 0;
      }
    });

    // --- Stone glow pulse: follow the ripple wavefront reaching each stone ---
    stonesRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const distFromCenter = Math.abs(i - centerIdx) / maxDist; // 0..1
      const waveAt = 0.35 + distFromCenter * 0.55;
      const local = Math.max(0, Math.min(1, (rippleT - waveAt) / 0.25));
      if (local > 0 && local < 1) {
        mat.emissiveIntensity = 0.4 + 2.2 * Math.sin(Math.PI * local);
      } else if (local >= 1) {
        mat.emissiveIntensity = 0.6 + 0.25 * Math.sin(t * 3 + i);
      } else {
        mat.emissiveIntensity = 0.3;
      }
    });
  });

  return (
    <group>
      {segments.map((seg, i) => (
        <primitive key={`seg-${i}`} object={seg} ref={(obj: THREE.Line | null) => { segsRef.current[i] = obj; }} />
      ))}

      {rings.map(({ ring }, idx) => (
        <primitive key={`ring-${idx}`} object={ring} />
      ))}

      {positions.map((p, i) => (
        <mesh
          key={`stone-${i}`}
          position={p}
          raycast={() => null}
          ref={(el) => { stonesRef.current[i] = el; }}
        >
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={glow}
            emissiveIntensity={0.3}
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
