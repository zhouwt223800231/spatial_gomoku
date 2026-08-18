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
    // Left-drag rotates, wheel zooms. Right-button pan is disabled so the
    // right button stays free for stone placement.
    controls.enablePan = false;
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

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}