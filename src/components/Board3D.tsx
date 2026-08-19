import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { Position } from '../types';
import { Stone } from './Stone';
import { GhostStone } from './GhostStone';
import { WinLine } from './WinLine';

interface Board3DProps {
  onCellLock?: (pos: Position) => void;
  onCellPlace?: (pos: Position) => void;
}

const clampCell = (v: number, max: number) => Math.max(0, Math.min(max, v));

export function Board3D({ onCellLock, onCellPlace }: Board3DProps) {
  const { stones, boardSize, ghostPosition, winLine, activeLayer, sliceAxis } = useGameStore();
  const [cursorCell, setCursorCell] = useState<Position | null>(null);
  const offset = (boardSize - 1) / 2;

  // The layer currently being "previewed": the ghost layer when aiming, otherwise the browsed layer.
  const focusLayer = ghostPosition ? ghostPosition.z : activeLayer;

  const pointToCell = (point: THREE.Vector3): Position => ({
    x: clampCell(Math.round(point.x + offset), boardSize - 1),
    y: clampCell(Math.round(point.y + offset), boardSize - 1),
    z: activeLayer,
  });

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
      <mesh raycast={() => null}>
        <boxGeometry args={[boardSize, boardSize, boardSize]} />
        <meshPhysicalMaterial
          color="#1e293b"
          transparent
          opacity={0.22}
          roughness={0.12}
          metalness={0.55}
          clearcoat={0.6}
        />
      </mesh>

      {/* Outer edges */}
      <lineSegments raycast={() => null}>
        <edgesGeometry args={[new THREE.BoxGeometry(boardSize, boardSize, boardSize)]} />
        <lineBasicMaterial color="#38bdf8" transparent opacity={0.85} />
      </lineSegments>

      {/* Full 3D grid (dimmed, gives spatial context) */}
      <lineSegments geometry={gridGeometry} raycast={() => null}>
        <lineBasicMaterial color="#7dd3fc" transparent opacity={0.13} />
      </lineSegments>

      {/* Slice plane (second brightest) */}
      <mesh position={slice.pos} rotation={slice.rot} raycast={() => null}>
        <planeGeometry args={[sliceSize, sliceSize]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.10} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments position={slice.pos} rotation={slice.rot} raycast={() => null}>
        <edgesGeometry args={[new THREE.PlaneGeometry(sliceSize, sliceSize)]} />
        <lineBasicMaterial color="#67e8f9" transparent opacity={0.6} />
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
        onContextMenu={(e) => { e.stopPropagation(); onCellLock?.(pointToCell(e.point)); }}
        onClick={(e) => { e.stopPropagation(); onCellPlace?.(pointToCell(e.point)); }}
      >
        <planeGeometry args={[boardSize, boardSize]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* All stones always visible; non-previewed layers halved in opacity */}
      {stones.map((stone, idx) => (
        <Stone
          key={`stone-${idx}`}
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
        <WinLine
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