import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StarfieldProps {
  count?: number;
  radius?: number;
  animate?: boolean;
}

/**
 * Dynamic starfield: a slow-drifting far layer plus a faster, brighter near
 * "dust" layer (parallax depth) with gentle opacity breathing. Used behind the
 * main menu and during games. Set animate={false} for a static field.
 */
export function Starfield({ count = 160, radius = 30, animate = true }: StarfieldProps) {
  const bgGroup = useRef<THREE.Group>(null);
  const fgGroup = useRef<THREE.Group>(null);
  const bgMat = useRef<THREE.PointsMaterial>(null);
  const fgMat = useRef<THREE.PointsMaterial>(null);

  const farPositions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.55 + Math.random() * 0.45);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count, radius]);

  const nearCount = Math.max(24, Math.round(count * 0.6));
  const nearPositions = useMemo(() => {
    const arr = new Float32Array(nearCount * 3);
    for (let i = 0; i < nearCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.22 + Math.random() * 0.35);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [nearCount, radius]);

  useFrame((state, delta) => {
    if (!animate) return;
    const t = state.clock.elapsedTime;
    if (bgGroup.current) {
      bgGroup.current.rotation.y += delta * 0.02;
      bgGroup.current.rotation.x += delta * 0.005;
    }
    if (fgGroup.current) {
      fgGroup.current.rotation.y += delta * 0.06;
      fgGroup.current.rotation.z += delta * 0.012;
    }
    if (bgMat.current) bgMat.current.opacity = 0.55 + 0.15 * Math.sin(t * 2);
    if (fgMat.current) fgMat.current.opacity = 0.38 + 0.12 * Math.sin(t * 3 + 1);
  });

  return (
    <group>
      <group ref={bgGroup}>
        <points raycast={() => null}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[farPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={bgMat}
            color="#bcd4ff"
            size={0.08}
            transparent
            opacity={0.7}
            sizeAttenuation
            depthWrite={false}
            fog={false}
          />
        </points>
      </group>
      <group ref={fgGroup}>
        <points raycast={() => null}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[nearPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={fgMat}
            color="#e8f1ff"
            size={0.17}
            transparent
            opacity={0.5}
            sizeAttenuation
            depthWrite={false}
            fog={false}
          />
        </points>
      </group>
    </group>
  );
}
