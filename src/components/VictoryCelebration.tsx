import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Timeline (seconds):
// 0-1.8 line grows (center -> both ends) while stones ignite sequentially
// (0.3s apart -> all 5 lit by 1.2s) -> gentle breathing until orbit (~2.2s+).
const IGNITE_END = 1.8;
const IGNITE_STEP = 0.3;
const GLOW_RISE = 1.5;      // white-hot emissive intensity
const GLOW_BREATHE = 0.3;   // gentle breathing amplitude
const RING_RADIUS = 0.55;
const RING_TUBE = 0.02;

interface VictoryCelebrationProps {
  positions: [number, number, number][];
  player: 'black' | 'white';
}

export function VictoryCelebration({ positions, player }: VictoryCelebrationProps) {
  const color = player === 'black' ? '#fbbf24' : '#60a5fa'; // accent color for rings/line
  const whiteHot = '#ffffff';                                 // stones glow white-hot, keep their own color

  const startRef = useRef<number | null>(null);
  const stonesRef = useRef<(THREE.Mesh | null)[]>([]);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
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

    // Stones ignite sequentially (first -> last, ALL five), then breathe.
    stonesRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      // igniteAt = i*step / IGNITE_END keeps i=4 well below 1 so every stone lights.
      const igniteAt = (i * IGNITE_STEP) / IGNITE_END;
      const local = (progress - igniteAt) / 0.22;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (local <= 0) {
        mesh.scale.setScalar(0.45);
        mat.emissiveIntensity = 0.25;
      } else if (local < 1) {
        const s = 0.45 + 0.25 * (1 - Math.pow(1 - local, 3));
        mesh.scale.setScalar(s);
        mat.emissiveIntensity = 0.25 + (GLOW_RISE - 0.25) * local;
      } else {
        mesh.scale.setScalar(0.7 - 0.04 * Math.sin(t * 2 + i * 0.7));
        mat.emissiveIntensity = GLOW_RISE + GLOW_BREATHE * Math.sin(t * 2.2 + i * 0.9);
      }
    });

    // Accent rings pulse with the glow.
    ringRefs.current.forEach((ring, i) => {
      if (!ring) return;
      const rm = ring.material as THREE.MeshBasicMaterial;
      const lit = progress >= (i * IGNITE_STEP) / IGNITE_END;
      if (lit) {
        const breathe = 0.5 + 0.15 * Math.sin(t * 2.2 + i * 0.9);
        ring.scale.setScalar(1 + 0.04 * Math.sin(t * 2 + i));
        rm.opacity = breathe;
        ring.visible = true;
      } else {
        ring.visible = false;
      }
    });
  });

  return (
    <group>
      {segments.map((seg, i) => (
        <primitive key={i} object={seg} ref={(obj: THREE.Line | null) => { segsRef.current[i] = obj; }} />
      ))}

      {positions.map((p, i) => (
        <group key={i} position={p}>
          {/* Stone: keeps its own color; glow is white-hot. */}
          <mesh
            raycast={() => null}
            ref={(el) => { stonesRef.current[i] = el; }}
          >
            <sphereGeometry args={[0.45, 16, 16]} />
            <meshStandardMaterial
              color={player === 'black' ? '#1e293b' : '#f5f5f0'}
              emissive={whiteHot}
              emissiveIntensity={0.25}
              roughness={0.3}
              metalness={0.1}
              transparent
              opacity={0.95}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>

          {/* Victory-color accent ring (keeps the win color as a subtle halo). */}
          <mesh
            visible={false}
            ref={(el) => { ringRefs.current[i] = el; }}
            raycast={() => null}
          >
            <torusGeometry args={[RING_RADIUS, RING_TUBE, 8, 40]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
