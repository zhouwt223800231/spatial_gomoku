import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

interface WinLineProps {
  positions: [number, number, number][];
  player: 'black' | 'white';
}

export function WinLine({ positions, player }: WinLineProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          child.position.y = positions[i][1] + Math.sin(state.clock.elapsedTime * 2 + i) * 0.05;
        }
      });
    }
  });

  const color = player === 'black' ? '#fbbf24' : '#60a5fa';
  const linePoints = positions.map(p => new THREE.Vector3(...p));

  return (
    <group ref={groupRef}>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.45, 32, 32]} />
          <meshPhysicalMaterial
            color={color}
            transparent
            opacity={0.6}
            emissive={color}
            emissiveIntensity={0.5}
            roughness={0.1}
          />
        </mesh>
      ))}
      <Line points={linePoints} color={color} lineWidth={3} />
    </group>
  );
}
