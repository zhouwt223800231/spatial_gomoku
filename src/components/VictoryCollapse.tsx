import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Timeline (seconds):
// 0-0.8 freeze -> 0.8-2.6 collapse along bezier (per-particle birth time)
// -> 2.4-3.4 gather/orbit around core -> 3.2-4.6 halo expand + fade -> 4.4-5.2 fade out.
const COLLAPSE_START = 0.8;
const COLLAPSE_END = 2.6;
const ORBIT_START = 2.4;
const HALO_START = 3.2;
const END = 4.6;

const PARTICLES_PER_STONE = 22;
const TRAIL_LENGTH = 8;      // history points per particle
const HALO_MAX_RADIUS = 1.4;

interface Particle {
  start: THREE.Vector3;
  ctrl: THREE.Vector3;
  end: THREE.Vector3;
  birth: number;
  speed: number;
  size: number;
  haloDir: THREE.Vector3;
  orbit: { angle: number; speed: number; radius: number };
  seed: number;
}

interface VictoryCollapseProps {
  positions: [number, number, number][];
  player: 'black' | 'white';
}

/** Soft round sprite so particles look like glowing dust, not squares. */
function makeSoftSprite(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function VictoryCollapse({ positions, player }: VictoryCollapseProps) {
  const startRef = useRef<number | null>(null);
  const coreRef = useRef<THREE.Mesh | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const matRef = useRef<THREE.PointsMaterial | null>(null);
  const posAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const trailRef = useRef<THREE.LineSegments | null>(null);
  const trailGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const haloRingRefs = useRef<(THREE.Mesh | null)[]>([]);

  const color = player === 'black' ? '#fbbf24' : '#60a5fa';

  const n = positions.length;
  const centerVec = useMemo(() => {
    const a = new THREE.Vector3(...positions[Math.floor((n - 1) / 2)]);
    const b = new THREE.Vector3(...positions[Math.ceil((n - 1) / 2)]);
    return a.clone().add(b).multiplyScalar(0.5);
  }, [positions, n]);

  const { particles, positionsArray, geometry, total } = useMemo(() => {
    const list: Particle[] = [];
    const totalN = n * PARTICLES_PER_STONE;
    const arr = new Float32Array(totalN * 3);
    let i = 0;
    positions.forEach((p) => {
      const s = new THREE.Vector3(...p);
      const toCenter = centerVec.clone().sub(s);
      for (let k = 0; k < PARTICLES_PER_STONE; k++) {
        const away = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        if (away.lengthSq() < 0.01) away.set(0, 1, 0);
        away.normalize();
        const ctrl = s.clone().add(toCenter.clone().multiplyScalar(0.5)).add(away.multiplyScalar(0.5 + Math.random() * 0.7));
        const hd = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        if (hd.lengthSq() < 0.01) hd.set(1, 0, 0);
        hd.normalize();
        list.push({
          start: s.clone(),
          ctrl,
          end: centerVec.clone(),
          birth: (k / PARTICLES_PER_STONE) * 0.5 + Math.random() * 0.15,
          speed: 0.55 + Math.random() * 0.5,
          size: 0.07 + Math.random() * 0.06,
          haloDir: hd,
          orbit: { angle: Math.random() * Math.PI * 2, speed: 1.5 + Math.random() * 2.5, radius: 0.08 + Math.random() * 0.12 },
          seed: Math.random() * Math.PI * 2,
        });
        arr[i * 3] = s.x; arr[i * 3 + 1] = s.y; arr[i * 3 + 2] = s.z;
        i++;
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return { particles: list, positionsArray: arr, geometry: geo, total: totalN };
  }, [positions, centerVec, n]);

  const sprite = useMemo(() => makeSoftSprite(), []);

  const mat = useMemo(() => new THREE.PointsMaterial({
    color,
    size: 0.13,
    map: sprite,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }), [color, sprite]);

  // Trails: each particle keeps TRAIL_LENGTH history points drawn as lines.
  const trailData = useMemo(() => {
    const history = Array.from({ length: total }, () => Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector3()));
    const pos = new Float32Array(total * TRAIL_LENGTH * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const matL = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    return { history, pos, geo, matL };
  }, [total, color]);

  useFrame((state) => {
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startRef.current;

    const collapse = Math.min(1, Math.max(0, (t - COLLAPSE_START) / (COLLAPSE_END - COLLAPSE_START)));
    const orbit = Math.min(1, Math.max(0, (t - ORBIT_START) / (HALO_START - ORBIT_START)));
    const halo = t >= HALO_START ? Math.min(1, (t - HALO_START) / (END - HALO_START)) : 0;
    const fade = t >= END ? Math.min(1, (t - END) / 0.8) : 0;

    const arr = positionsArray;
    const tmp = new THREE.Vector3();

    particles.forEach((p, i) => {
      const u = Math.min(1, Math.max(0, (collapse - p.birth) * p.speed));
      const ease = u * u * (3 - 2 * u);

      if (halo > 0) {
        // Halo: expand along haloDir, starting from the gathered offset (0.05)
        // so it continues seamlessly from the orbit phase.
        const r = 0.05 + halo * HALO_MAX_RADIUS;
        tmp.copy(p.haloDir).multiplyScalar(r).add(p.end);
      } else if (u >= 1) {
        // Gathered near the core: damped micro-orbit. The orbit plane is
        // perpendicular to haloDir so the halo expands from the same line.
        const a = p.orbit.angle + t * p.orbit.speed;
        const rr = p.orbit.radius * (1 - orbit * 0.7);
        const up = Math.abs(p.haloDir.y) < 0.9
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(1, 0, 0);
        const tan = new THREE.Vector3().crossVectors(p.haloDir, up).normalize();
        const bin = new THREE.Vector3().crossVectors(p.haloDir, tan).normalize();
        tmp.copy(p.end)
          .addScaledVector(tan, Math.cos(a) * rr)
          .addScaledVector(bin, Math.sin(a) * rr)
          .addScaledVector(p.haloDir, 0.05);
      } else if (u > 0) {
        const inv = 1 - ease;
        tmp.copy(p.start).multiplyScalar(inv * inv)
          .addScaledVector(p.ctrl, 2 * inv * ease)
          .addScaledVector(p.end, ease * ease);
      } else {
        tmp.copy(p.start);
      }

      arr[i * 3] = tmp.x; arr[i * 3 + 1] = tmp.y; arr[i * 3 + 2] = tmp.z;

      // Shift trail history (drop oldest, push newest).
      const hist = trailData.history[i];
      for (let k = TRAIL_LENGTH - 1; k > 0; k--) hist[k].copy(hist[k - 1]);
      hist[0].copy(tmp);
    });

    if (posAttrRef.current) posAttrRef.current.needsUpdate = true;

    // Write trail segments: particle i connects history[k] -> history[k+1].
    if (trailGeoRef.current) {
      const tp = trailGeoRef.current.getAttribute('position') as THREE.BufferAttribute;
      const tarr = tp.array as Float32Array;
      let ti = 0;
      for (let i = 0; i < total; i++) {
        const hist = trailData.history[i];
        for (let k = 0; k < TRAIL_LENGTH - 1; k++) {
          const a = hist[k];
          const b = hist[k + 1];
          tarr[ti * 3] = a.x; tarr[ti * 3 + 1] = a.y; tarr[ti * 3 + 2] = a.z;
          tarr[(ti + 1) * 3] = b.x; tarr[(ti + 1) * 3 + 1] = b.y; tarr[(ti + 1) * 3 + 2] = b.z;
          ti += 2;
        }
      }
      tp.needsUpdate = true;
    }

    // Global alpha (points + trails).
    let opacity = 0;
    if (fade > 0) opacity = 0.9 * (1 - fade);
    else if (halo > 0) opacity = 0.9 * (1 - halo);
    else if (collapse > 0) opacity = Math.min(1, collapse * 2) * 0.9;
    if (matRef.current) matRef.current.opacity = opacity;
    trailData.matL.opacity = opacity * 0.35;

    // Core mesh.
    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      if (halo > 0) {
        coreRef.current.visible = true;
        coreRef.current.scale.setScalar(0.3 + halo * 2.4);
        m.opacity = 0.9 * (1 - halo) * (1 - fade);
      } else if (collapse > 0.7) {
        coreRef.current.visible = true;
        const g = Math.min(1, (collapse - 0.7) / 0.3);
        coreRef.current.scale.setScalar(0.3 + 0.14 * Math.sin(t * 6) * g);
        m.opacity = 0.9 * g;
      } else {
        coreRef.current.visible = false;
      }
    }

    // Halo rings.
    haloRingRefs.current.forEach((ring, idx) => {
      if (!ring) return;
      const rm = ring.material as THREE.MeshBasicMaterial;
      if (halo > 0) {
        const r = 0.3 + idx * 0.25 + halo * 1.3;
        ring.scale.setScalar(r);
        rm.opacity = 0.45 * (1 - halo) * (1 - fade);
        ring.visible = true;
      } else {
        ring.visible = false;
      }
    });
  });

  return (
    <group>
      <points ref={pointsRef} geometry={geometry} material={mat} raycast={() => null} />
      <lineSegments
        ref={(el) => {
          trailRef.current = el;
          trailGeoRef.current = el?.geometry ?? null;
        }}
        geometry={trailData.geo}
        material={trailData.matL}
        raycast={() => null}
      />

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
