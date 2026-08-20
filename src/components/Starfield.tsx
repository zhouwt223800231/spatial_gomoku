import React, { useMemo } from 'react';
import * as THREE from 'three';

export function Starfield({ count = 160, radius = 30 }: { count?: number; radius?: number }) {
  const positions = useMemo(() => {
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

  return (
    <points raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#bcd4ff"
        size={0.08}
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}
