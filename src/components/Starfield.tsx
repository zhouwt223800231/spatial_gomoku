import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

interface StarfieldProps {
  maxCount?: number;
  radius?: number;
  animate?: boolean;
}

// Fixed reveal fraction of the far-star pool (the "5x3 density" look).
const VISIBLE = 0.42;
const DUST_COUNT = 60;
const DIM_MENU = 1.0; // full brightness in the main menu
const FADE_LAMBDA = 0.8; // slow fade in/out between menu and game (~3s)

const FAR_VERT = `
attribute float aReveal;
uniform float uVisible;
uniform float uSize;
uniform float uScale;
uniform float uTime;
uniform float uTwinkle;
uniform float uBrightness;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min(uSize * (uScale / max(0.1, -mv.z)), 16.0);
  float reveal = smoothstep(aReveal, aReveal + 0.04, uVisible);
  float tw = 1.0 + (uTwinkle > 0.5 ? 0.14 * sin(uTime * 2.0 + position.x * 6.0 + position.y * 4.0) : 0.0);
  vAlpha = reveal * uBrightness * tw;
}
`;

const FAR_FRAG = `
varying float vAlpha;
void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  float a = smoothstep(0.5, 0.06, d) * vAlpha;
  gl_FragColor = vec4(0.75, 0.85, 1.0, a);
}
`;

/**
 * Starfield behind the main menu and during games.
 * - Main menu: slow drift + gentle twinkle at a fixed "5x3 density" count.
 * - Board interface: the stars slowly fade out to invisible (uBrightness -> 0),
 *   then drift back in when returning to the menu.
 * - Coordinates and rotation phase are generated once and never reset.
 */
export function Starfield({ maxCount = 1750, radius = 30, animate: animateProp }: StarfieldProps) {
  const gl = useThree((s) => s.gl);
  const gamePhase = useGameStore((s) => s.gamePhase);
  const animate = animateProp ?? (gamePhase === 'menu');

  const bgGroup = useRef<THREE.Group>(null);
  const fgGroup = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const fgMatRef = useRef<THREE.PointsMaterial>(null);

  const farData = useMemo(() => {
    const pos = new Float32Array(maxCount * 3);
    const reveal = new Float32Array(maxCount);
    for (let i = 0; i < maxCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.4 + Math.random() * 0.4);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      reveal[i] = Math.random();
    }
    return { pos, reveal };
  }, [maxCount, radius]);

  const dustPositions = useMemo(() => {
    const arr = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * (0.22 + Math.random() * 0.35);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [radius]);

  // Stable uniform object (never recreated) so the shader keeps its state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const uniforms = useMemo(() => ({
    uVisible: { value: VISIBLE },
    uSize: { value: 0.24 },
    uScale: { value: 300 },
    uTime: { value: 0 },
    uTwinkle: { value: animate ? 1 : 0 },
    uBrightness: { value: animate ? DIM_MENU : 0 },
  }), []);

  useFrame((state, delta) => {
    if (matRef.current) {
      const u = matRef.current.uniforms;
      u.uVisible.value = VISIBLE; // fixed 5x3 density (no longer follows board size)
      u.uTime.value = state.clock.elapsedTime;
      u.uScale.value = (gl.domElement.height || 600) * 0.5;
      u.uTwinkle.value = animate ? 1 : 0;
      // Slowly fade out in the board interface, back in on the menu.
      u.uBrightness.value = THREE.MathUtils.damp(u.uBrightness.value, animate ? DIM_MENU : 0, FADE_LAMBDA, delta);
    }
    if (fgMatRef.current) {
      fgMatRef.current.opacity = THREE.MathUtils.damp(fgMatRef.current.opacity, animate ? 0.5 : 0, FADE_LAMBDA, delta);
    }

    // Drift only in the menu.
    if (animate) {
      if (bgGroup.current) {
        bgGroup.current.rotation.y += delta * 0.02;
        bgGroup.current.rotation.x += delta * 0.005;
      }
      if (fgGroup.current) {
        fgGroup.current.rotation.y += delta * 0.06;
        fgGroup.current.rotation.z += delta * 0.012;
      }
    }
  });

  return (
    <group>
      <group ref={bgGroup}>
        <points raycast={() => null} frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[farData.pos, 3]} />
            <bufferAttribute attach="attributes-aReveal" args={[farData.reveal, 1]} />
          </bufferGeometry>
          <shaderMaterial
            ref={matRef}
            vertexShader={FAR_VERT}
            fragmentShader={FAR_FRAG}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            fog={false}
          />
        </points>
      </group>
      <group ref={fgGroup}>
        <points raycast={() => null}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={fgMatRef}
            color="#e8f1ff"
            size={0.17}
            transparent
            opacity={0.5}
            sizeAttenuation
            depthWrite={false}
            fog={false}
          />
        </points>
      </group>
    </group>
  );
}
