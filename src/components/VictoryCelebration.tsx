import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const IGNITE_END = 1.8;      // energy pulse reaches the last stone
const SHOCK_START = 1.8;     // shockwave + particle burst
const SHOCK_DURATION = 0.9;
const PARTICLE_LIFE = 1.6;
const PARTICLE_COUNT = 60;

interface VictoryCelebrationProps {
  positions: [number, number, number][];
  player: 'black' | 'white';
}

export function VictoryCelebration({ positions, player }: VictoryCelebrationProps) {
  const color = player === 'black' ? '#fbbf24' : '#60a5fa';
  const glow = player === 'black' ? '#f59e0b' : '#3b82f6';

  const startRef = useRef<number | null>(null);
  const stonesRef = useRef<(THREE.Mesh | null)[]>([]);
  const pulseRef = useRef<THREE.Mesh | null>(null);
  const shockRef = useRef<THREE.Mesh | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const velocitiesRef = useRef<THREE.Vector3[]>([]);

  const last = positions[positions.length - 1];
  const lastVec = useMemo(() => new THREE.Vector3(...last), [last]);

  const line = useMemo(() => {
    const pts = positions.map((p) => new THREE.Vector3(...p));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35, depthTest: false, depthWrite: false });
    return new THREE.Line(geo, mat);
  }, [positions, color]);

  const points = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel: THREE.Vector3[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = lastVec.x;
      pos[i * 3 + 1] = lastVec.y;
      pos[i * 3 + 2] = lastVec.z;
      const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      if (dir.lengthSq() < 0.001) dir.set(0, 1, 0);
      dir.normalize();
      vel.push(dir.multiplyScalar(0.6 + Math.random() * 1.3));
    }
    velocitiesRef.current = vel;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: glow,
      size: 0.09,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.visible = false;
    return pts;
  }, [glow, lastVec]);

  useFrame((state) => {
    if (startRef.current === null) startRef.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - startRef.current;
    const progress = Math.min(1, t / IGNITE_END);

    // energy pulse travels along the line
    if (pulseRef.current) {
      const idxF = progress * (positions.length - 1);
      const i = Math.min(positions.length - 2, Math.floor(idxF));
      const f = idxF - i;
      const a = new THREE.Vector3(...positions[i]);
      const b = new THREE.Vector3(...positions[i + 1]);
      pulseRef.current.position.lerpVectors(a, b, f);
      const pmat = pulseRef.current.material as THREE.MeshBasicMaterial;
      pmat.opacity = 0.95 * (progress >= 1 ? Math.max(0, 1 - (t - IGNITE_END) / 0.3) : 1);
    }

    // stones ignite sequentially
    stonesRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const igniteAt = i / (positions.length - 1);
      const local = (progress - igniteAt) / 0.22;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (local <= 0) {
        mesh.scale.setScalar(0.45);
        mat.emissiveIntensity = 0.25;
      } else if (local < 1) {
        const s = 0.45 + 0.25 * (1 - Math.pow(1 - local, 3));
        mesh.scale.setScalar(s);
        mat.emissiveIntensity = 0.25 + 1.8 * local;
      } else {
        mesh.scale.setScalar(0.7 - 0.05 * Math.sin(t * 2 + i));
        mat.emissiveIntensity = 1.7;
      }
    });

    // shockwave shell
    if (shockRef.current) {
      const st = t - SHOCK_START;
      if (st >= 0 && st <= SHOCK_DURATION) {
        shockRef.current.visible = true;
        const p = st / SHOCK_DURATION;
        shockRef.current.scale.setScalar(0.3 + p * 2.2);
        (shockRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - p);
      } else {
        shockRef.current.visible = false;
      }
    }

    // particle burst
    if (pointsRef.current) {
      const st = t - SHOCK_START;
      const attr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const v = velocitiesRef.current[i];
        if (st <= 0) {
          arr[i * 3] = lastVec.x;
          arr[i * 3 + 1] = lastVec.y;
          arr[i * 3 + 2] = lastVec.z;
        } else {
          const life = Math.min(1, st / PARTICLE_LIFE);
          const damp = 1 - life;
          arr[i * 3] = lastVec.x + v.x * st * damp;
          arr[i * 3 + 1] = lastVec.y + v.y * st * damp;
          arr[i * 3 + 2] = lastVec.z + v.z * st * damp;
        }
      }
      attr.needsUpdate = true;
      const pmat = pointsRef.current.material as THREE.PointsMaterial;
      pmat.opacity = st <= 0 ? 0 : 0.9 * Math.max(0, 1 - st / PARTICLE_LIFE);
      pointsRef.current.visible = st > 0;
    }
  });

  return (
    <group>
      <primitive object={line} />

      {positions.map((p, i) => (
        <mesh
          key={i}
          position={p}
          raycast={() => null}
          ref={(el) => { stonesRef.current[i] = el; }}
        >
          <sphereGeometry args={[0.45, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={glow}
            emissiveIntensity={0.25}
            roughness={0.3}
            metalness={0.1}
            transparent
            opacity={0.95}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* travelling energy pulse */}
      <mesh ref={pulseRef} raycast={() => null}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthTest={false} depthWrite={false} />
      </mesh>

      {/* shockwave shell */}
      <mesh ref={shockRef} visible={false} position={last} raycast={() => null}>
        <sphereGeometry args={[0.6, 24, 24]} />
        <meshBasicMaterial color={glow} transparent opacity={0.5} side={THREE.BackSide} depthTest={false} depthWrite={false} />
      </mesh>

      {/* particle burst */}
      <primitive object={points} ref={pointsRef} />
    </group>
  );
}