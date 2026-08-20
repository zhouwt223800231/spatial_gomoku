import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StoneProps {
  position: [number, number, number];
  player: 'black' | 'white';
  opacity?: number;
}

const SPHERE_SEGMENTS = 16; // was 32; visually identical at this size

export function Stone({ position, player, opacity = 1 }: StoneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const scaleRef = useRef(0);
  const doneRef = useRef(false);

  useFrame((_, delta) => {
    // Animate only while the stone is settling; skip all subsequent frames.
    if (doneRef.current) return;
    scaleRef.current = Math.min(1, scaleRef.current + delta * 4);
    if (groupRef.current) {
      const s = scaleRef.current;
      const bounce = s < 0.9 ? s * 1.1 : 1 - (s - 0.9) * 0.5;
      groupRef.current.scale.setScalar(Math.max(0.1, bounce));
    }
    if (scaleRef.current >= 1) {
      groupRef.current?.scale.setScalar(1);
      doneRef.current = true;
    }
  });

  const baseColor = player === 'black' ? '#1e293b' : '#f5f5f0';
  const rimColor = player === 'black' ? '#67e8f9' : '#e2e8f0';
  const rimOpacity = player === 'black' ? 0.4 : 0.12;

  return (
    <group ref={groupRef} position={position} scale={0}>
      <mesh raycast={() => null}>
        <sphereGeometry args={[0.38, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
        <meshPhysicalMaterial
          color={baseColor}
          roughness={player === 'black' ? 0.15 : 0.3}
          metalness={player === 'black' ? 0.1 : 0.05}
          clearcoat={player === 'black' ? 1 : 0.5}
          clearcoatRoughness={0.1}
          emissive={player === 'black' ? '#0f172a' : '#fff8e7'}
          emissiveIntensity={player === 'black' ? 0.15 : 0.1}
          transparent
          opacity={opacity}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh raycast={() => null} scale={1.07}>
        <sphereGeometry args={[0.38, SPHERE_SEGMENTS, SPHERE_SEGMENTS]} />
        <meshBasicMaterial
          color={rimColor}
          side={THREE.BackSide}
          transparent
          opacity={opacity * rimOpacity}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
