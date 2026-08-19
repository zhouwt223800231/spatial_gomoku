import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const IGNITE_END = 1.8;      // energy pulse reaches the last stone

interface VictoryCelebrationProps {
  positions: [number, number, number][];
  player: 'black' | 'white';
}

export function VictoryCelebration({ positions, player }: VictoryCelebrationProps) {
  const color = player === 'black' ? '#fbbf24' : '#60a5fa';
  const glow = player === 'black' ? '#f59e0b' : '#3b82f6';

  const startRef = useRef<number | null>(null);
  const stonesRef = useRef<(THREE.Mesh | null)[]>([]);
  const pulseRef = useRef<THREE.Mesh | null>(null);
  const lineGeoRef = useRef<THREE.BufferGeometry | null>(null);

  const line = useMemo(() => {
    const pts = positions.map((p) => new THREE.Vector3(...p));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35, depthTest: false, depthWrite: false });
    return new THREE.Line(geo, mat);
  }, [positions, color]);

  const segCount = positions.length - 1;

  useFrame((state) => {
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startRef.current;
    const progress = Math.min(1, t / IGNITE_END);

    // Line grows progressively from the first stone to the last.
    if (lineGeoRef.current) {
      const drawCount = Math.round(progress * segCount) + 1;
      lineGeoRef.current.setDrawRange(0, drawCount);
      lineGeoRef.current.attributes.position.needsUpdate = true;
    }

    // energy pulse travels along the line, synced to the growing tip
    if (pulseRef.current) {
      const idxF = progress * segCount;
      const i = Math.min(segCount - 1, Math.floor(idxF));
      const f = idxF - i;
      const a = new THREE.Vector3(...positions[i]);
      const b = new THREE.Vector3(...positions[i + 1]);
      pulseRef.current.position.lerpVectors(a, b, f);
      const pmat = pulseRef.current.material as THREE.MeshBasicMaterial;
      pmat.opacity = 0.95 * (progress >= 1 ? Math.max(0, 1 - (t - IGNITE_END) / 0.3) : 1);
    }

    // stones ignite sequentially
    stonesRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const igniteAt = i / segCount;
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
      <primitive object={line} ref={(obj: THREE.Line | null) => { lineGeoRef.current = obj?.geometry ?? null; }} />

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

      {/* travelling energy pulse */}
      <mesh ref={pulseRef} raycast={() => null}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}
