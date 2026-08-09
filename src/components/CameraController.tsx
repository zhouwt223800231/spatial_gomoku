import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';

export function CameraController() {
  const { camera } = useThree();
  const { gamePhase } = useGameStore();

  useEffect(() => {
    if (gamePhase === 'playing') {
      camera.position.set(5, 5, 5);
      camera.lookAt(0, 0, 0);
    }
  }, [gamePhase, camera]);

  return (
    <OrbitControls
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={3}
      maxDistance={15}
      autoRotate={gamePhase === 'menu'}
      autoRotateSpeed={0.5}
    />
  );
}
