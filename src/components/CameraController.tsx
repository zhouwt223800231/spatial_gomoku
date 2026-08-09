import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useGameStore } from '../store/gameStore';

export function CameraController() {
  const { camera, gl } = useThree();
  const { gamePhase } = useGameStore();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    if (gamePhase === 'playing') {
      camera.position.set(5, 5, 5);
      camera.lookAt(0, 0, 0);
    }
  }, [gamePhase, camera]);

  useEffect(() => {
    const controls = new OrbitControlsImpl(camera, gl.domElement);
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.autoRotate = gamePhase === 'menu';
    controls.autoRotateSpeed = 0.5;
    controls.update();
    controlsRef.current = controls;
    return () => {
      controlsRef.current = null;
      controls.dispose();
    };
  }, [camera, gl, gamePhase]);

  // OrbitControls 原生版必须每帧调用 update() 才能响应交互并驱动 autoRotate
  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}
