import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StoneProps {
  position: [number, number, number];
  player: 'black' | 'white';
}

export function Stone({ position, player }: StoneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const scaleRef = useRef(0);

  useFrame((_, delta) => {
    if (scaleRef.current < 1) {
      scaleRef.current = Math.min(1, scaleRef.current + delta * 4);
      if (meshRef.current) {
        const s = scaleRef.current;
        const bounce = s < 0.9 ? s * 1.1 : 1 - (s - 0.9) * 0.5;
        meshRef.current.scale.setScalar(Math.max(0.1, bounce));
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={0} raycast={() => null}>
      <sphereGeometry args={[0.38, 32, 32]} />
      <meshPhysicalMaterial
        color={player === 'black' ? '#0a0a0a' : '#f5f5f0'}
        roughness={player === 'black' ? 0.15 : 0.3}
        metalness={player === 'black' ? 0.1 : 0.05}
        clearcoat={player === 'black' ? 1 : 0.5}
        clearcoatRoughness={0.1}
        emissive={player === 'black' ? '#000000' : '#fff8e7'}
        emissiveIntensity={player === 'black' ? 0 : 0.1}
      />
    </mesh>
  );
}
