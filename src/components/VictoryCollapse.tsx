import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Timeline (seconds):
// 0-0.8 freeze -> 0.8-1.1 shatter (explode outward) -> 1.1-2.6 collapse to center
// -> 2.4-3.4 orbit around core -> 3.2-4.6 halo expand + fade -> 4.4-5.2 fade out.
const SHATTER_START = 0.8;
const SHATTER_END = 1.1;
const COLLAPSE_END = 2.6;
const ORBIT_START = 2.4;
const ORBIT_END = 3.4;
const HALO_START = 3.2;
const END = 4.6;

const PARTICLES_PER_STONE = 14;

interface Particle {
  start: THREE.Vector3;
  ctrl: THREE.Vector3;
  end: THREE.Vector3;
  delay: number;          // per-particle collapse delay (0..0.4)
  size: number;
  explodeDir: THREE.Vector3; // outward shatter direction
  orbit: { angle: number; speed: number; radius: number; height: number };
  seed: number;
}

interface VictoryCollapseProps {
  positions: [number, number, number][];
  player: 'black' | 'white';
}

export function VictoryCollapse({ positions, player }: VictoryCollapseProps) {
  const startRef = useRef<number | null>(null);
  const coreRef = useRef<THREE.Mesh | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const matRef = useRef<THREE.PointsMaterial | null>(null);
  const posAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const haloRingRefs = useRef<(THREE.Mesh | null)[]>([]);

  const color = player === 'black' ? '#fbbf24' : '#60a5fa';

  const n = positions.length;
  const centerVec = useMemo(() => {
    const a = new THREE.Vector3(...positions[Math.floor((n - 1) / 2)]);
    const b = new THREE.Vector3(...positions[Math.ceil((n - 1) / 2)]);
    return a.clone().add(b).multiplyScalar(0.5);
  }, [positions, n]);

  // CPU-driven particles: position attribute updated every frame (few dozen).
  const { particles, positionsArray, geometry } = useMemo(() => {
    const list: Particle[] = [];
    const total = n * PARTICLES_PER_STONE;
    const arr = new Float32Array(total * 3);
    let i = 0;
    positions.forEach((p) => {
      const s = new THREE.Vector3(...p);
      const toCenter = centerVec.clone().sub(s);
      for (let k = 0; k < PARTICLES_PER_STONE; k++) {
        // Random outward shatter direction (biased away from center a bit).
        const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        if (dir.lengthSq() < 0.01) dir.set(0, 1, 0);
        dir.normalize().add(toCenter.clone().normalize().multiplyScalar(0.4)).normalize();

        // Arc control point: lift toward center with a random swirl.
        const perp = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        const ctrl = s.clone().add(toCenter.clone().multiplyScalar(0.5)).add(perp.multiplyScalar(0.5 + Math.random() * 0.6));

        list.push({
          start: s.clone(),
          ctrl,
          end: centerVec.clone(),
          delay: (k / PARTICLES_PER_STONE) * 0.4 + Math.random() * 0.05,
          size: 0.07 + Math.random() * 0.07,
          explodeDir: dir,
          orbit: {
            angle: Math.random() * Math.PI * 2,
            speed: 2 + Math.random() * 3,
            radius: 0.12 + Math.random() * 0.22,
            height: (Math.random() - 0.5) * 0.18,
          },
          seed: Math.random() * Math.PI * 2,
        });
        arr[i * 3] = s.x; arr[i * 3 + 1] = s.y; arr[i * 3 + 2] = s.z;
        i++;
      }
    });
    const geo = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(arr, 3);
    geo.setAttribute('position', attr);
    return { particles: list, positionsArray: arr, geometry: geo };
  }, [positions, centerVec, n]);

  const mat = useMemo(() => new THREE.PointsMaterial({
    color,
    size: 0.14,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }), [color]);

  useFrame((state) => {
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startRef.current;

    const shatter = Math.min(1, Math.max(0, (t - SHATTER_START) / (SHATTER_END - SHATTER_START)));
    const collapse = Math.min(1, Math.max(0, (t - SHATTER_END) / (COLLAPSE_END - SHATTER_END)));
    const orbit = Math.min(1, Math.max(0, (t - ORBIT_START) / (ORBIT_END - ORBIT_START)));
    const halo = t >= HALO_START ? Math.min(1, (t - HALO_START) / (END - HALO_START)) : 0;
    const fade = t >= END ? Math.min(1, (t - END) / 0.8) : 0;

    const arr = positionsArray;
    particles.forEach((p, i) => {
      const out = new THREE.Vector3();

      // Phase A: shatter - burst outward from the stone.
      if (shatter > 0 && collapse <= 0) {
        const e = 0.35 * shatter * shatter;
        out.copy(p.start).addScaledVector(p.explodeDir, e);
      } else {
        // Phase B: bezier collapse toward center (with per-particle delay).
        const local = Math.min(1, Math.max(0, (collapse - p.delay) / (1 - p.delay || 1)));
        const b = local * local * (3 - 2 * local); // smoothstep
        out.copy(p.start)
          .multiplyScalar((1 - b) * (1 - b))
          .addScaledVector(p.ctrl, 2 * (1 - b) * b)
          .addScaledVector(p.end, b * b);
      }

      // Phase C: orbit around the core (subtle swirl).
      if (orbit > 0 && halo <= 0) {
        const a = p.orbit.angle + t * p.orbit.speed;
        const r = p.orbit.radius * (1 - orbit * 0.4);
        out.x = p.end.x + Math.cos(a) * r;
        out.y = p.end.y + p.orbit.height;
        out.z = p.end.z + Math.sin(a) * r;
      }

      // Phase D: halo - expand radially outward from the core and fade.
      if (halo > 0) {
        const dirFrom = out.clone().sub(p.end).normalize();
        if (dirFrom.lengthSq() < 0.01) dirFrom.set(1, 0, 0);
        const r = 0.2 + halo * (1.2 + p.seed * 0.4);
        out.copy(p.end).addScaledVector(dirFrom, r);
      }

      arr[i * 3] = out.x;
      arr[i * 3 + 1] = out.y;
      arr[i * 3 + 2] = out.z;
    });

    if (posAttrRef.current) posAttrRef.current.needsUpdate = true;

    // Material opacity across phases.
    if (matRef.current) {
      if (fade > 0) matRef.current.opacity = 0.9 * (1 - fade);
      else if (halo > 0) matRef.current.opacity = 0.9 * (1 - halo);
      else if (orbit > 0) matRef.current.opacity = 0.9;
      else if (collapse > 0) matRef.current.opacity = 0.95;
      else if (shatter > 0) matRef.current.opacity = 0.8 * shatter;
      else matRef.current.opacity = 0;
    }

    // Core mesh: appear when particles gather, pulse, then expand & fade in halo.
    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      const gather = Math.min(1, Math.max(0, (t - (COLLAPSE_END - 0.3)) / 0.5));
      if (gather > 0 && halo <= 0) {
        coreRef.current.visible = true;
        const pulse = 1 + 0.22 * Math.sin(t * 6);
        coreRef.current.scale.setScalar(0.3 + 0.12 * pulse);
        m.opacity = 0.85 * gather * (1 - orbit * 0.3);
      } else if (halo > 0) {
        coreRef.current.visible = true;
        const s = 0.3 + halo * 2.2;
        coreRef.current.scale.setScalar(s);
        m.opacity = 0.85 * (1 - halo) * (1 - fade);
      } else {
        coreRef.current.visible = false;
      }
    }

    // Halo rings: expand outward from the core.
    haloRingRefs.current.forEach((ring, idx) => {
      if (!ring) return;
      const rm = ring.material as THREE.MeshBasicMaterial;
      if (halo > 0) {
        const startR = 0.25 + idx * 0.18;
        const r = startR + halo * 1.4;
        ring.scale.setScalar(r);
        rm.opacity = 0.5 * (1 - halo) * (1 - fade);
        ring.visible = true;
      } else {
        ring.visible = false;
      }
    });
  });

  return (
    <group>
      <points ref={pointsRef} geometry={geometry} material={mat} raycast={() => null} />

      {/* Star core */}
      <mesh ref={coreRef} position={centerVec} visible={false} raycast={() => null}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Halo rings */}
      {[0, 1, 2].map((k) => (
        <mesh
          key={k}
          position={centerVec}
          visible={false}
          ref={(el) => { haloRingRefs.current[k] = el; }}
          raycast={() => null}
        >
          <ringGeometry args={[0.9, 1.0, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}
