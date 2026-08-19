import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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

  // 用 Three.js 原生 Line 连接走点，避免 Drei <Line>（Line2）的初始化崩溃问题。
  // 不能用 JSX <line> 标签（会被 TS 当作 SVG line），因此手动构造 THREE.Line 对象。
  const winLineObject = useMemo(() => {
    const points = positions.map(p => new THREE.Vector3(...p));
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false });
    return new THREE.Line(geo, mat);
  }, [positions, color]);

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
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}
      <primitive object={winLineObject} />
    </group>
  );
}
