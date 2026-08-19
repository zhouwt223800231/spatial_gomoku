import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

const ORBIT_DURATION = 3.0;

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function CameraController() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const boardSize = useGameStore((s) => s.boardSize);
  const resetViewTick = useGameStore((s) => s.resetViewTick);
  const winLine = useGameStore((s) => s.winLine);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const orbitStartRef = useRef<number | null>(null);
  const orbitDoneRef = useRef(false);

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

  // Reset the orbit state whenever we leave the won state.
  useEffect(() => {
    if (gamePhase !== 'won') {
      orbitStartRef.current = null;
      orbitDoneRef.current = false;
    }
  }, [gamePhase]);

  useFrame((state) => {
    const controls = controlsRef.current;
    const orbiting = gamePhase === 'won' && !!winLine && winLine.positions.length >= 2;

    if (orbiting) {
      if (orbitStartRef.current === null) orbitStartRef.current = state.clock.elapsedTime;
      const t = state.clock.elapsedTime - orbitStartRef.current;
      const offset = (boardSize - 1) / 2;
      const a = new THREE.Vector3(
        winLine.positions[0].x - offset,
        winLine.positions[0].y - offset,
        winLine.positions[0].z - offset,
      );
      const last = winLine.positions[winLine.positions.length - 1];
      const b = new THREE.Vector3(last.x - offset, last.y - offset, last.z - offset);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const dir = b.clone().sub(a);
      const lineLen = dir.length();
      dir.normalize();
      const up = new THREE.Vector3(0, 1, 0);
      let u = new THREE.Vector3().crossVectors(dir, up);
      if (u.lengthSq() < 0.001) u = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0));
      u.normalize();
      const v = new THREE.Vector3().crossVectors(dir, u).normalize();
      const radius = lineLen * 0.6 + 3;

      if (!orbitDoneRef.current && t <= ORBIT_DURATION) {
        if (controls) controls.enabled = false;
        const p = easeInOut(Math.min(1, t / ORBIT_DURATION));
        const angle = p * Math.PI * 2;
        const pos = mid.clone()
          .add(u.clone().multiplyScalar(Math.cos(angle) * radius))
          .add(v.clone().multiplyScalar(Math.sin(angle) * radius));
        camera.position.copy(pos);
        camera.lookAt(mid);
      } else {
        orbitDoneRef.current = true;
        if (controls) {
          controls.target.copy(mid);
          controls.enabled = true;
          controls.update();
        }
      }
    } else {
      orbitStartRef.current = null;
      orbitDoneRef.current = false;
      controls?.update();
    }
  });

  return null;
}