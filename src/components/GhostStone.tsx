import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GhostStoneProps {
  position: [number, number, number];
}

export function GhostStone({ position }: GhostStoneProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      meshRef.current.scale.setScalar(s);
    }
  });

  return (
    <mesh ref={meshRef} position={position} raycast={() => null}>
      <sphereGeometry args={[0.38, 32, 32]} />
      <meshPhysicalMaterial
        color="#60a5fa"
        transparent
        opacity={0.4}
        roughness={0.2}
        metalness={0.1}
        emissive="#3b82f6"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}
