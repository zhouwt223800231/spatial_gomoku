import React, { useMemo, useRef, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { Position } from '../types';
import { Stone } from './Stone';
import { GhostStone } from './GhostStone';
import { VictoryCelebration } from './VictoryCelebration';

interface Board3DProps {
  onCellSelect?: (pos: Position) => void;
}

const clampCell = (v: number, max: number) => Math.max(0, Math.min(max, v));
const DRAG_THRESHOLD_PX = 6;

const AXIS_TICK_COLORS: Record<'x' | 'y' | 'z', string> = {
  x: '#67e8f9',
  y: '#60a5fa',
  z: '#a78bfa',
};

export function Board3D({ onCellSelect }: Board3DProps) {
  const { stones, boardSize, ghostPosition, winLine, activeLayer, sliceAxis } = useGameStore();
  const [cursorCell, setCursorCell] = useState<Position | null>(null);
  const offset = (boardSize - 1) / 2;

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  // The layer currently being "previewed": the ghost layer when aiming, otherwise the browsed layer.
  const focusLayer = ghostPosition ? ghostPosition.z : activeLayer;

  const pointToCell = (point: THREE.Vector3): Position => ({
    x: clampCell(Math.round(point.x + offset), boardSize - 1),
    y: clampCell(Math.round(point.y + offset), boardSize - 1),
    z: activeLayer,
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    dragStartRef.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  };

  const handleClick = (e: ThreeEvent<MouseEvent>, pos: Position) => {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    // Ignore clicks that are actually part of a drag (view rotation).
    if (start) {
      const dx = e.nativeEvent.clientX - start.x;
      const dy = e.nativeEvent.clientY - start.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) return;
    }
    onCellSelect?.(pos);
  };

  const gridGeometry = useMemo(() => {
    const positions: number[] = [];
    for (let a = 0; a < boardSize; a++) {
      for (let b = 0; b < boardSize; b++) {
        const v = a - offset;
        const w = b - offset;
        positions.push(-offset, w, v, offset, w, v);
        positions.push(v, -offset, w, v, offset, w);
        positions.push(w, v, -offset, w, v, offset);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geo;
  }, [boardSize, offset]);

  // Axis coordinate ticks: short colored marks + (rendered separately) labels.
  const tickGeometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const ext = boardSize / 2 + 0.25;
    const inset = offset;
    const push = (a: number, b: number, c: number, color: string) => {
      positions.push(a, b, c);
      const col = new THREE.Color(color);
      colors.push(col.r, col.g, col.b);
    };
    for (let i = 0; i < boardSize; i++) {
      const v = i - offset;
      // X axis ticks at fixed Y/Z edges
      push(-ext, -inset, -inset, AXIS_TICK_COLORS.x); push(-ext + 0.3, -inset, -inset, AXIS_TICK_COLORS.x);
      push(ext - 0.3, -inset, -inset, AXIS_TICK_COLORS.x); push(ext, -inset, -inset, AXIS_TICK_COLORS.x);
      // Y axis ticks
      push(-inset, -ext, -inset, AXIS_TICK_COLORS.y); push(-inset, -ext + 0.3, -inset, AXIS_TICK_COLORS.y);
      push(-inset, ext - 0.3, -inset, AXIS_TICK_COLORS.y); push(-inset, ext, -inset, AXIS_TICK_COLORS.y);
      // Z axis ticks
      push(-inset, -inset, -ext, AXIS_TICK_COLORS.z); push(-inset, -inset, -ext + 0.3, AXIS_TICK_COLORS.z);
      push(-inset, -inset, ext - 0.3, AXIS_TICK_COLORS.z); push(-inset, -inset, ext, AXIS_TICK_COLORS.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [boardSize, offset]);

  // Dynamic slice plane: second-brightest plane through the preview point, oriented by the last-moved axis.
  const sliceSize = boardSize - 0.2;
  const slice = (() => {
    if (!ghostPosition) {
      return { pos: [0, 0, activeLayer - offset] as [number, number, number], rot: [0, 0, 0] as [number, number, number] };
    }
    if (sliceAxis === 'x') {
      return { pos: [ghostPosition.x - offset, 0, 0] as [number, number, number], rot: [0, Math.PI / 2, 0] as [number, number, number] };
    }
    if (sliceAxis === 'y') {
      return { pos: [0, ghostPosition.y - offset, 0] as [number, number, number], rot: [Math.PI / 2, 0, 0] as [number, number, number] };
    }
    return { pos: [0, 0, ghostPosition.z - offset] as [number, number, number], rot: [0, 0, 0] as [number, number, number] };
  })();

  const ghostBlocked = ghostPosition
    ? stones.some(s => s.position.x === ghostPosition.x && s.position.y === ghostPosition.y && s.position.z === ghostPosition.z)
    : false;

  return (
    <group>
      {/* Main glass box (visual only) */}
      <mesh raycast={() => null} renderOrder={-1}>
        <boxGeometry args={[boardSize, boardSize, boardSize]} />
        <meshPhysicalMaterial
          color="#1e293b"
          transparent
          opacity={0.22}
          roughness={0.12}
          metalness={0.55}
          clearcoat={0.6}
          depthWrite={false}
        />
      </mesh>

      {/* Outer edges */}
      <lineSegments raycast={() => null} renderOrder={-1}>
        <edgesGeometry args={[new THREE.BoxGeometry(boardSize, boardSize, boardSize)]} />
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.85} depthWrite={false} />
      </lineSegments>

      {/* Axis coordinate ticks */}
      <lineSegments geometry={tickGeometry} raycast={() => null} renderOrder={-1}>
        <lineBasicMaterial vertexColors transparent opacity={0.8} depthWrite={false} />
      </lineSegments>

      {/* Full 3D grid (dimmed, gives spatial context) */}
      <lineSegments geometry={gridGeometry} raycast={() => null} renderOrder={-1}>
        <lineBasicMaterial color="#7dd3fc" transparent opacity={0.13} depthWrite={false} />
      </lineSegments>

      {/* Slice plane (second brightest) */}
      <mesh position={slice.pos} rotation={slice.rot} raycast={() => null} renderOrder={-1}>
        <planeGeometry args={[sliceSize, sliceSize]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.10} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments position={slice.pos} rotation={slice.rot} raycast={() => null} renderOrder={-1}>
        <edgesGeometry args={[new THREE.PlaneGeometry(sliceSize, sliceSize)]} />
        <lineBasicMaterial color="#67e8f9" transparent opacity={0.6} depthWrite={false} />
      </lineSegments>

      {/* Cursor cell highlight (only when not aiming with a ghost) */}
      {!ghostPosition && cursorCell && cursorCell.z === activeLayer && (
        <mesh position={[cursorCell.x - offset, cursorCell.y - offset, activeLayer - offset]} raycast={() => null}>
          <boxGeometry args={[0.92, 0.92, 0.06]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.25} depthWrite={false} />
        </mesh>
      )}

      {/* Interaction plane: the only raycastable object, on the active layer */}
      <mesh
        position={[0, 0, activeLayer - offset]}
        onPointerMove={(e) => { e.stopPropagation(); setCursorCell(pointToCell(e.point)); }}
        onPointerOut={() => setCursorCell(null)}
        onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e); }}
        onContextMenu={(e) => { e.stopPropagation(); onCellSelect?.(pointToCell(e.point)); }}
        onClick={(e) => { e.stopPropagation(); handleClick(e, pointToCell(e.point)); }}
      >
        <planeGeometry args={[boardSize, boardSize]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* All stones always visible; non-previewed layers halved in opacity */}
      {stones.map((stone, idx) => (
        <Stone
          key={`${stone.position.x},${stone.position.y},${stone.position.z}`}
          position={[stone.position.x - offset, stone.position.y - offset, stone.position.z - offset]}
          player={stone.player}
          opacity={stone.position.z === focusLayer ? 1 : 0.5}
        />
      ))}

      {/* Preview point: brightest marker + glowing ghost */}
      {ghostPosition && (
        <>
          <mesh position={[ghostPosition.x - offset, ghostPosition.y - offset, ghostPosition.z - offset]} raycast={() => null}>
            <boxGeometry args={[0.96, 0.96, 0.96]} />
            <meshBasicMaterial color="#a5f3fc" transparent opacity={0.5} depthWrite={false} />
          </mesh>
          <GhostStone
            position={[ghostPosition.x - offset, ghostPosition.y - offset, ghostPosition.z - offset]}
            blocked={ghostBlocked}
          />
        </>
      )}

      {winLine && (
        <VictoryCelebration
          positions={winLine.positions.map(p => [
            p.x - offset,
            p.y - offset,
            p.z - offset,
          ] as [number, number, number])}
          player={winLine.player}
        />
      )}
    </group>
  );
}
