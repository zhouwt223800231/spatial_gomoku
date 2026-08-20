import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

const FREEZE_END = 1.2;      // phase 0: freeze & slow push-in
const IGNITE_END = 1.8;      // phase 1: line grows / stones ignite (camera holds)
const APPROACH_END = 3.0;    // phase 2: camera eases to the fixed 45°pose
const ORBIT_DURATION = 3.0;  // phase 3: 360°orbit (ends at APPROACH_END + ORBIT_DURATION)
const ORBIT_ANGLE = Math.PI / 4; // fixed 45°inclination to the winning line

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function CameraController() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const boardSize = useGameStore((s) => s.boardSize);
  const resetViewTick = useGameStore((s) => s.resetViewTick);
  const winLine = useGameStore((s) => s.winLine);
  const celebrationDismissed = useGameStore((s) => s.celebrationDismissed);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const phaseStartRef = useRef<number | null>(null);
  const approachStartPosRef = useRef<THREE.Vector3 | null>(null);
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
    controls.enablePan = true;
    controls.panSpeed = 0.8;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
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

  // Reset the phase state whenever we leave the won state.
  useEffect(() => {
    if (gamePhase !== 'won') {
      phaseStartRef.current = null;
      approachStartPosRef.current = null;
      orbitDoneRef.current = false;
    }
  }, [gamePhase]);

  useFrame((state) => {
    const controls = controlsRef.current;
    const celebrating = gamePhase === 'won' && !!winLine && winLine.positions.length >= 2 && !celebrationDismissed;

    if (celebrating) {
      if (phaseStartRef.current === null) {
        phaseStartRef.current = state.clock.elapsedTime;
        approachStartPosRef.current = null;
      }
      const t = state.clock.elapsedTime - phaseStartRef.current;
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
      let h = new THREE.Vector3().crossVectors(dir, up);
      if (h.lengthSq() < 0.001) h = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0));
      h.normalize();
      const v = new THREE.Vector3().crossVectors(dir, h).normalize();

      // 45-degree cone orbit: camera stays on a cone whose axis is the winning
      // line (view direction is 45° to the line), so the line's projection
      // visibly rotates through the full 360°.
      const coneDir = h.clone().multiplyScalar(Math.sin(ORBIT_ANGLE))
        .add(dir.clone().multiplyScalar(Math.cos(ORBIT_ANGLE)));
      const radius = Math.max(lineLen * 0.6 + 3, boardSize * 0.9);
      const orbitStart = mid.clone().add(coneDir.clone().multiplyScalar(radius));

      if (controls) controls.enabled = false;

      if (t < FREEZE_END) {
        // Phase 0: frozen moment - very slow push-in toward the winning line.
        if (approachStartPosRef.current === null) {
          approachStartPosRef.current = camera.position.clone();
        }
        const p = easeInOutCubic(t / FREEZE_END);
        const target = approachStartPosRef.current.clone().lerp(mid, p * 0.05);
        camera.position.copy(target);
        camera.lookAt(mid);
      } else if (t < APPROACH_END) {
        // Phase 1 (hold, watch the line grow) + Phase 2 (ease to the 45°pose).
        if (approachStartPosRef.current === null) {
          approachStartPosRef.current = camera.position.clone();
        }
        const p = easeInOutCubic(Math.max(0, Math.min(1, (t - IGNITE_END) / (APPROACH_END - IGNITE_END))));
        camera.position.lerpVectors(approachStartPosRef.current, orbitStart, p);
        camera.lookAt(mid);
      } else if (!orbitDoneRef.current && t <= APPROACH_END + ORBIT_DURATION) {
        // Phase 3: 360°orbit from the 45°pose.
        const p = easeInOut(Math.min(1, (t - APPROACH_END) / ORBIT_DURATION));
        const angle = p * Math.PI * 2;
        const q = new THREE.Quaternion().setFromAxisAngle(dir, angle);
        const pos = mid.clone().add(coneDir.clone().applyQuaternion(q).multiplyScalar(radius));
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
      phaseStartRef.current = null;
      approachStartPosRef.current = null;
      orbitDoneRef.current = false;
      if (controls) {
        controls.enabled = true;
        controls.update();
      }
    }
  });

  return null;
}
