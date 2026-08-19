import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const AXES = [
  { axis: 'X', color: '#67e8f9', dir: [1, 0, 0] as [number, number, number] },
  { axis: 'Y', color: '#60a5fa', dir: [0, 1, 0] as [number, number, number] },
  { axis: 'Z', color: '#a78bfa', dir: [0, 0, 1] as [number, number, number] },
];

const GIZMO_NDC_X = -0.72; // bottom-left-ish corner
const GIZMO_NDC_Y = -0.72;
const GIZMO_DIST = 5;

export function AxisGizmo() {
  const groupRef = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    // Anchor to a fixed point on the near plane, projected into world space.
    const ndc = new THREE.Vector3(GIZMO_NDC_X, GIZMO_NDC_Y, 0.5).unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    g.position.copy(camera.position).addScaledVector(dir, GIZMO_DIST);
    // Keep the gizmo oriented with the camera so labels stay readable.
    g.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={groupRef}>
      {AXES.map(({ axis, color, dir }) => (
        <group key={axis}>
          <primitive object={new THREE.ArrowHelper(new THREE.Vector3(...dir), new THREE.Vector3(0, 0, 0), 1.5, color, 0.3, 0.18)} />
          <Text position={[dir[0] * 1.85, dir[1] * 1.85, dir[2] * 1.85]} fontSize={0.55} color={color} anchorX="center" anchorY="middle">
            {axis}
          </Text>
        </group>
      ))}
    </group>
  );
}
