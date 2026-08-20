import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Timeline (seconds):
// 0-0.8 freeze -> 0.8-2.6 collapse along bezier (per-particle birth time)
// -> 2.4-3.4 gather/orbit around core -> 3.2-4.8 halo expand + fade.
const COLLAPSE_START = 0.8;
const COLLAPSE_END = 2.6;
const ORBIT_START = 2.4;
const HALO_START = 3.2;
const END = 4.8;

// Denser core: more particles per stone.
const BASE_PER_STONE = 120; // scaled by board size so large boards stay dense
// Short trails only while flying (avoids clutter once gathered).
const TRAIL_LENGTH = 3;

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
  g.addColorStop(0.4, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.2)');
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
  const trailGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const trailMatRef = useRef<THREE.LineBasicMaterial | null>(null);

  // Player color + a soft white-hot core tone that fits the deep-space theme.
  const color = player === 'black' ? '#fcd34d' : '#7dd3fc'; // softer amber/blue
  const coreColor = '#ffffff';

  const n = positions.length;
  const centerVec = useMemo(() => {
    const a = new THREE.Vector3(...positions[Math.floor((n - 1) / 2)]);
    const b = new THREE.Vector3(...positions[Math.ceil((n - 1) / 2)]);
    return a.clone().add(b).multiplyScalar(0.5);
  }, [positions, n]);

  // Board extent from the win line so the halo scales with board size.
  const boardScale = useMemo(() => {
    let max = 1;
    positions.forEach((p) => {
      max = Math.max(max, Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
    });
    return max; // world units from origin to far edge
  }, [positions]);

  // Density scales with the board so the halo stays full on 7³/9³ too.
  const perStone = Math.max(60, Math.round(BASE_PER_STONE * boardScale));

  const { particles, positionsArray, geometry, total } = useMemo(() => {
    const list: Particle[] = [];
    const totalN = n * perStone;
    const arr = new Float32Array(totalN * 3);
    let i = 0;
    positions.forEach((p) => {
      const s = new THREE.Vector3(...p);
      const toCenter = centerVec.clone().sub(s);
      for (let k = 0; k < perStone; k++) {
        const away = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        if (away.lengthSq() < 0.01) away.set(0, 1, 0);
        away.normalize();
        const ctrl = s.clone().add(toCenter.clone().multiplyScalar(0.5)).add(away.multiplyScalar(0.5 + Math.random() * 0.7));
        // Uniform spherical direction (Box-Muller) so the halo is even, not
        // clustered toward cube diagonals.
        const u1 = Math.random(), u2 = Math.random();
        const r = Math.sqrt(-2 * Math.log(u1 + 1e-9));
        const hd = new THREE.Vector3(
          r * Math.cos(2 * Math.PI * u2),
          r * Math.sin(2 * Math.PI * u2),
          Math.sqrt(-2 * Math.log(u2 + 1e-9)),
        ).normalize();
        list.push({
          start: s.clone(),
          ctrl,
          end: centerVec.clone(),
          birth: (k / perStone) * 0.5 + Math.random() * 0.15,
          speed: 0.5 + Math.random() * 0.45,
          size: 0.09 + Math.random() * 0.09,
          haloDir: hd,
          orbit: { angle: Math.random() * Math.PI * 2, speed: 1.5 + Math.random() * 2.5, radius: 0.06 + Math.random() * 0.1 },
          seed: Math.random() * Math.PI * 2,
        });
        arr[i * 3] = s.x; arr[i * 3 + 1] = s.y; arr[i * 3 + 2] = s.z;
        i++;
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return { particles: list, positionsArray: arr, geometry: geo, total: totalN };
  }, [positions, centerVec, n, perStone]);

  const sprite = useMemo(() => makeSoftSprite(), []);

  const mat = useMemo(() => new THREE.PointsMaterial({
    color,
    size: 0.16,
    map: sprite,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }), [color, sprite]);

  // Trails: short (TRAIL_LENGTH points), faded, only visible while flying.
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

    // Halo radius scales with the board so it reads as a full sphere, not a flat disc.
    const haloR = 0.6 + halo * boardScale * 0.75;

    const arr = positionsArray;
    const tmp = new THREE.Vector3();
    let maxFlight = 0; // track how many are still flying (for trail visibility)

    particles.forEach((p, i) => {
      const u = Math.min(1, Math.max(0, (collapse - p.birth) * p.speed));
      const ease = u * u * (3 - 2 * u);

      if (halo > 0) {
        // Spherical halo: expand along each particle's own direction.
        tmp.copy(p.haloDir).multiplyScalar(haloR).add(p.end);
      } else if (u >= 1) {
        // Gathered near the core: damped micro-orbit, converging to the axis.
        const rr = p.orbit.radius * (1 - orbit);
        const a = p.orbit.angle + t * p.orbit.speed;
        const up = Math.abs(p.haloDir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
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
        maxFlight = Math.max(maxFlight, u);
      } else {
        tmp.copy(p.start);
      }

      arr[i * 3] = tmp.x; arr[i * 3 + 1] = tmp.y; arr[i * 3 + 2] = tmp.z;

      const hist = trailData.history[i];
      for (let k = TRAIL_LENGTH - 1; k > 0; k--) hist[k].copy(hist[k - 1]);
      hist[0].copy(tmp);
    });

    if (posAttrRef.current) posAttrRef.current.needsUpdate = true;

    // Write trail segments.
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

    // Opacity: particles strong during collapse, fade through halo; trails only faintly.
    let opacity = 0;
    if (fade > 0) opacity = 0.9 * (1 - fade);
    else if (halo > 0) opacity = 0.9 * (1 - halo * 0.6);
    else if (collapse > 0) opacity = Math.min(1, collapse * 2) * 0.95;
    if (matRef.current) matRef.current.opacity = opacity;
    if (trailMatRef.current) {
      // Trails only meaningful while particles are still flying.
      trailMatRef.current.opacity = opacity * (0.12 + 0.18 * maxFlight) * (1 - halo);
    }

    // Core mesh: white-hot with a colored ring.
    if (coreRef.current) {
      const m = coreRef.current.material as THREE.MeshBasicMaterial;
      if (halo > 0) {
        coreRef.current.visible = true;
        coreRef.current.scale.setScalar(0.3 + halo * 2.0);
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
  });

  return (
    <group>
      <points ref={pointsRef} geometry={geometry} material={mat} raycast={() => null} />
      <lineSegments
        ref={(el) => {
          trailGeoRef.current = el?.geometry ?? null;
        }}
        geometry={trailData.geo}
        material={trailData.matL}
        raycast={() => null}
      />

      {/* Star core: white-hot center so the glow reads on the dark background */}
      <mesh ref={coreRef} position={centerVec} visible={false} raycast={() => null}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={coreColor} transparent opacity={0.9} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
