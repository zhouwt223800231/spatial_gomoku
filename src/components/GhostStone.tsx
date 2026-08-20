import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GhostStoneProps {
  position: [number, number, number];
  blocked?: boolean;
}

export function GhostStone({ position, blocked = false }: GhostStoneProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05;
      meshRef.current.scale.setScalar(s);
    }
  });

  const color = blocked ? '#f87171' : '#60a5fa';
  const emissive = blocked ? '#ef4444' : '#3b82f6';

  return (
    <mesh ref={meshRef} position={position} raycast={() => null}>
      <sphereGeometry args={[0.38, 16, 16]} />
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={blocked ? 0.55 : 0.4}
        roughness={0.2}
        metalness={0.1}
        emissive={emissive}
        emissiveIntensity={0.35}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
