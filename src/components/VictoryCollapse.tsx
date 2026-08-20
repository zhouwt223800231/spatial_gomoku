import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Timeline (seconds):
// 0-0.8 freeze -> 0.8-2.4 shatter/collapse -> 2.2-3.4 core pulse -> 3.2-4.6 halo
// -> 4.4-5.2 fade out.
const COLLAPSE_START = 0.8;
const COLLAPSE_END = 2.4;
const CORE_START = 2.2;
const HALO_START = 3.2;
const END = 4.6;

const PARTICLES_PER_STONE = 10;

interface VictoryCollapseProps {
  positions: [number, number, number][];
  player: 'black' | 'white';
}

const vertexShader = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aCtrl;
  attribute vec3 aEnd;
  attribute float aDelay;
  attribute float aSize;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uPhase;
  uniform float uPixelRatio;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float local = clamp((uTime - aDelay) / 1.6, 0.0, 1.0);
    // Quadratic bezier: start -> ctrl -> end (collapse toward the core).
    vec3 pos = mix(mix(aStart, aCtrl, local), mix(aCtrl, aEnd, local), local);
    // Halo phase: push outward from the core.
    if (uPhase >= 2.0) {
      float halo = uPhase - 2.0; // 0..1
      vec3 dir = normalize(pos - aEnd + 0.0001);
      pos = aEnd + dir * (0.3 + halo * 1.2);
    }
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * uPixelRatio * (1.0 + local * 0.3);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vAlpha = (1.0 - local) * (1.0 - abs(uPhase - 0.0) * 0.0);
    if (uPhase >= 1.0 && uPhase < 2.0) {
      vAlpha = 0.9; // gathered into the core
    }
    if (uPhase >= 2.0) {
      float h = uPhase - 2.0;
      vAlpha = 0.7 * (1.0 - h);
    }
    vAlpha = clamp(vAlpha, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float alpha = smoothstep(0.5, 0.15, d) * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export function VictoryCollapse({ positions, player }: VictoryCollapseProps) {
  const gl = useThree((s) => s.gl);
  const startRef = useRef<number | null>(null);
  const coreRef = useRef<THREE.Mesh | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const simpleMatRef = useRef<THREE.PointsMaterial | null>(null);
  const simplePosRef = useRef<Float32Array | null>(null);

  const color = player === 'black' ? '#fbbf24' : '#60a5fa';
  const colorVec = useMemo(() => new THREE.Color(color), [color]);

  const n = positions.length;
  const centerVec = useMemo(() => {
    const a = new THREE.Vector3(...positions[Math.floor((n - 1) / 2)]);
    const b = new THREE.Vector3(...positions[Math.ceil((n - 1) / 2)]);
    return a.clone().add(b).multiplyScalar(0.5);
  }, [positions, n]);

  // Detect shader support for a lightweight fallback.
  const supportsShader = useMemo(() => {
    try {
      const c = gl.getContext() as WebGLRenderingContext;
      return !!c && !!c.getExtension('OES_standard_derivatives');
    } catch {
      return false;
    }
  }, [gl]);

  // GPU particle geometry (shader path).
  const { geometry, count } = useMemo(() => {
    const total = n * PARTICLES_PER_STONE;
    const pos = new Float32Array(total * 3);
    const ctrl = new Float32Array(total * 3);
    const end = new Float32Array(total * 3);
    const delay = new Float32Array(total);
    const size = new Float32Array(total);
    const col = new Float32Array(total * 3);

    let i = 0;
    positions.forEach((p) => {
      const s = new THREE.Vector3(...p);
      const dirToCenter = centerVec.clone().sub(s);
      // random perpendicular-ish control offset for an arc
      const perp = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      ).normalize().multiplyScalar(0.4 + Math.random() * 0.5);
      const c = s.clone().add(dirToCenter.clone().multiplyScalar(0.5)).add(perp);

      for (let k = 0; k < PARTICLES_PER_STONE; k++) {
        pos[i * 3] = s.x; pos[i * 3 + 1] = s.y; pos[i * 3 + 2] = s.z;
        ctrl[i * 3] = c.x; ctrl[i * 3 + 1] = c.y; ctrl[i * 3 + 2] = c.z;
        end[i * 3] = centerVec.x; end[i * 3 + 1] = centerVec.y; end[i * 3 + 2] = centerVec.z;
        delay[i] = (k / PARTICLES_PER_STONE) * 0.25;
        size[i] = 0.06 + Math.random() * 0.08;
        col[i * 3] = colorVec.r; col[i * 3 + 1] = colorVec.g; col[i * 3 + 2] = colorVec.b;
        i++;
      }
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));
    geo.setAttribute('aStart', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aCtrl', new THREE.BufferAttribute(ctrl, 3));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 3));
    geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    return { geometry: geo, count: total };
  }, [positions, centerVec, colorVec, n]);

  const shaderMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
  }), []);

  // Simple fallback material (CPU-driven positions).
  const simpleMat = useMemo(() => new THREE.PointsMaterial({
    color,
    size: 0.12,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }), [color]);

  const simplePositions = useMemo(() => new Float32Array(count * 3), [count]);

  useFrame((state) => {
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startRef.current;

    const collapse = Math.min(1, Math.max(0, (t - COLLAPSE_START) / (COLLAPSE_END - COLLAPSE_START)));
    const core = Math.min(1, Math.max(0, (t - CORE_START) / 1.2));
    const halo = t >= HALO_START ? Math.min(1, (t - HALO_START) / (END - HALO_START)) : 0;
    const fade = t >= END ? Math.min(1, (t - END) / 0.8) : 0;

    if (supportsShader && shaderMatRef.current && pointsRef.current) {
      shaderMatRef.current.uniforms.uTime.value = t;
      shaderMatRef.current.uniforms.uPhase.value = collapse < 1 ? 0 : core < 1 ? 1 : 1 + halo;
      shaderMatRef.current.opacity = 1 - fade;
    } else if (simpleMatRef.current && pointsRef.current) {
      // CPU fallback: move each particle along the same quadratic bezier.
      const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const starts = geometry.getAttribute('aStart').array as Float32Array;
      const ctrls = geometry.getAttribute('aCtrl').array as Float32Array;
      const ends = geometry.getAttribute('aEnd').array as Float32Array;
      const delays = geometry.getAttribute('aDelay').array as Float32Array;
      for (let i = 0; i < count; i++) {
        const local = Math.min(1, Math.max(0, (t - delays[i]) / 1.6));
        const bx = (1 - local) * (1 - local) * starts[i * 3] + 2 * (1 - local) * local * ctrls[i * 3] + local * local * ends[i * 3];
        const by = (1 - local) * (1 - local) * starts[i * 3 + 1] + 2 * (1 - local) * local * ctrls[i * 3 + 1] + local * local * ends[i * 3 + 1];
        const bz = (1 - local) * (1 - local) * starts[i * 3 + 2] + 2 * (1 - local) * local * ctrls[i * 3 + 2] + local * local * ends[i * 3 + 2];
        arr[i * 3] = bx; arr[i * 3 + 1] = by; arr[i * 3 + 2] = bz;
      }
      posAttr.needsUpdate = true;
      simpleMatRef.current.opacity = (collapse < 1 ? 0 : core < 1 ? 0.9 : 0.7 * (1 - halo)) * (1 - fade);
    }

    // Core: pulse during phase ③, expand & fade during ④.
    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      if (core > 0) {
        const pulse = 1 + 0.25 * Math.sin(core * Math.PI * 4);
        coreRef.current.scale.setScalar(Math.max(0.01, pulse * (1 + halo * 3)));
        m.opacity = (1 - core * 0.5) * (1 - halo) * (1 - fade);
        coreRef.current.visible = true;
      } else {
        coreRef.current.visible = false;
      }
    }
  });

  return (
    <group>
      {supportsShader ? (
        <points ref={pointsRef} geometry={geometry} material={shaderMat} raycast={() => null} />
      ) : (
        <points ref={pointsRef} geometry={geometry} material={simpleMat} raycast={() => null} />
      )}

      {/* Star core */}
      <mesh ref={coreRef} position={centerVec} visible={false} raycast={() => null}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
