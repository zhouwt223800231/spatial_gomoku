import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

export function CameraController() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const boardSize = useGameStore((s) => s.boardSize);
  const resetViewTick = useGameStore((s) => s.resetViewTick);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  // Fit the whole board into view whenever size / view / overview changes.
  useEffect(() => {
    const dir = new THREE.Vector3(1, 1, 1).normalize();
    const isOrtho = (camera as THREE.OrthographicCamera).isOrthographicCamera === true;

    if (isOrtho) {
      const cam = camera as THREE.OrthographicCamera;
      const dom = gl.domElement;
      const aspect = (dom.clientWidth || 1) / (dom.clientHeight || 1);
      const half = (boardSize / 2) * 1.25;
      cam.zoom = 1;
      if (aspect >= 1) {
        cam.left = -half * aspect;
        cam.right = half * aspect;
        cam.top = half;
        cam.bottom = -half;
      } else {
        cam.left = -half;
        cam.right = half;
        cam.top = half / aspect;
        cam.bottom = -half / aspect;
      }
      cam.updateProjectionMatrix();
      cam.position.copy(dir).multiplyScalar(6 + boardSize);
      cam.lookAt(0, 0, 0);
    } else {
      const cam = camera as THREE.PerspectiveCamera;
      const fov = cam.fov || 45;
      const dist = (boardSize / 2) / Math.sin((fov * Math.PI) / 360) * 1.25;
      cam.position.copy(dir).multiplyScalar(dist);
      cam.lookAt(0, 0, 0);
    }

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [camera, gl, boardSize, resetViewTick, gamePhase]);

  useEffect(() => {
    const controls = new OrbitControlsImpl(camera, gl.domElement);
    // Left-drag rotates, wheel zooms. Right button stays free for stone placement.
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = 3;
    controls.maxDistance = boardSize * 3;
    controls.target.set(0, 0, 0);
    controls.autoRotate = gamePhase === 'menu';
    controls.autoRotateSpeed = 0.5;
    controls.update();
    controlsRef.current = controls;
    return () => {
      controlsRef.current = null;
      controls.dispose();
    };
  }, [camera, gl, gamePhase, boardSize]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
}