import React, { useCallback, useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

const IGNITE_END = 1.8;      // phase 1: line grows / stones ignite (camera holds)
const APPROACH_END = 3.0;    // phase 2: camera eases to the fixed 45 deg cone
const ORBIT_DURATION = 3.0;  // phase 3: 360 deg orbit (ends at APPROACH_END + ORBIT_DURATION)
const ORBIT_ANGLE = Math.PI / 4; // fixed 45 deg inclination to the winning line

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
  const approachStartQuatRef = useRef<THREE.Quaternion | null>(null);
  const orbitDoneRef = useRef(false);

  // Fit the whole board into view whenever size / view / overview changes or
  // when the canvas element resizes (e.g. the mobile D-pad drawer opens and
  // the board band shrinks so the board is never covered).
  const fitToBoard = useCallback(() => {
    const dir = new THREE.Vector3(1, 1, 1).normalize();
    const isOrtho = (camera as THREE.OrthographicCamera).isOrthographicCamera === true;
    const dom = gl.domElement;
    const aspect = (dom.clientWidth || 1) / (dom.clientHeight || 1);

    if (isOrtho) {
      const cam = camera as THREE.OrthographicCamera;
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
      let dist = (boardSize / 2) / Math.sin((fov * Math.PI) / 360) * 1.25;
      if (aspect < 1) {
        // Portrait: the horizontal FOV is narrower, so also fit the board
        // horizontally or the sides get clipped.
        const half = (boardSize / 2) * 1.25;
        const hDist = half / (Math.tan((fov * Math.PI) / 360) * aspect);
        dist = Math.max(dist, hDist);
      }
      cam.position.copy(dir).multiplyScalar(dist);
      cam.lookAt(0, 0, 0);
    }

    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [camera, gl, boardSize]);

  useEffect(() => {
    fitToBoard();
  }, [fitToBoard, resetViewTick, gamePhase]);

  // Refit when the canvas element itself resizes (mobile panel open/close,
  // orientation changes, window resizes).
  useEffect(() => {
    const el = gl.domElement;
    const ro = new ResizeObserver(() => fitToBoard());
    ro.observe(el);
    return () => ro.disconnect();
  }, [gl, fitToBoard]);

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
    controls.autoRotate = false;
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

      // Axial lines need the 45 deg cone so the rotation reads clearly; diagonal
      // lines keep the classic plane orbit (better spatial feel).
      const isAxial =
        Math.abs(dir.x) > 0.999 || Math.abs(dir.y) > 0.999 || Math.abs(dir.z) > 0.999;
      const radius = Math.max(lineLen * 0.6 + 3, boardSize * 0.9);
      const coneDir = h.clone().multiplyScalar(Math.sin(ORBIT_ANGLE))
        .add(dir.clone().multiplyScalar(Math.cos(ORBIT_ANGLE)));
      const radial = h.clone().multiplyScalar(Math.cos(ORBIT_ANGLE))
        .add(v.clone().multiplyScalar(Math.sin(ORBIT_ANGLE)));
      const tangent = new THREE.Vector3().crossVectors(dir, radial).normalize();
      const orbitStart = mid.clone().add((isAxial ? coneDir : radial).clone().multiplyScalar(radius));

      if (controls) controls.enabled = false;

      if (t < APPROACH_END) {
        // Smooth swing from the moment the last stone is placed: capture the
        // current view (position + orientation) at t=0 and arc to the orbit start.
        if (approachStartPosRef.current === null) {
          approachStartPosRef.current = camera.position.clone();
          approachStartQuatRef.current = camera.quaternion.clone();
        }
        const p = easeInOutCubic(t / APPROACH_END);
        const d0 = approachStartPosRef.current.clone().sub(mid).normalize();
        const d1 = orbitStart.clone().sub(mid).normalize();
        const dist0 = approachStartPosRef.current.distanceTo(mid);
        const q0 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d0);
        const q1 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d1);
        const q = q0.clone().slerp(q1, p);
        const dirP = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
        const dist = THREE.MathUtils.lerp(dist0, radius, p);
        camera.position.copy(mid).addScaledVector(dirP, dist);
        // Smoothly swing orientation from the user's last-stone view to
        // looking at the line midpoint (no hard snap on the view direction).
        if (approachStartQuatRef.current) {
          const qTarget = new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().lookAt(orbitStart, mid, up)
          );
          camera.quaternion.slerpQuaternions(approachStartQuatRef.current, qTarget, p);
        } else {
          camera.lookAt(mid);
        }
      } else if (!orbitDoneRef.current && t <= APPROACH_END + ORBIT_DURATION) {
        // Phase 3: 360 deg orbit from the 45 deg cone.
        const p = easeInOut(Math.min(1, (t - APPROACH_END) / ORBIT_DURATION));
        const angle = p * Math.PI * 2;
        let pos;
        if (isAxial) {
          const q = new THREE.Quaternion().setFromAxisAngle(dir, angle);
          pos = mid.clone().add(coneDir.clone().applyQuaternion(q).multiplyScalar(radius));
        } else {
          pos = mid.clone()
            .add(radial.clone().multiplyScalar(Math.cos(angle) * radius))
            .add(tangent.clone().multiplyScalar(Math.sin(angle) * radius));
        }
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
