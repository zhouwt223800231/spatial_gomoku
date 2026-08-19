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
  const { stones, boardSize, ghostPosition, winLine, activeLayer } = useGameStore();
  const [cursorCell, setCursorCell] = useState<Position | null>(null);
  const offset = (boardSize - 1) / 2;

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

      {/* Active layer fill */}
      <mesh position={[0, 0, activeLayer - offset]} raycast={() => null}>
        <planeGeometry args={[boardSize - 0.2, boardSize - 0.2]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Active layer border */}
      <lineSegments position={[0, 0, activeLayer - offset]} raycast={() => null}>
        <edgesGeometry args={[new THREE.PlaneGeometry(boardSize - 0.2, boardSize - 0.2)]} />
        <lineBasicMaterial color="#67e8f9" transparent opacity={0.9} />
      </lineSegments>

      {/* Cursor cell highlight */}
      {cursorCell && cursorCell.z === activeLayer && (
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

      {/* Stones: active layer bright, other layers faded */}
      {stones.map((stone, idx) => (
        <Stone
          key={`stone-${idx}`}
          position={[stone.position.x - offset, stone.position.y - offset, stone.position.z - offset]}
          player={stone.player}
          opacity={stone.position.z === activeLayer ? 1 : 0.14}
        />
      ))}

      {ghostPosition && (
        <GhostStone
          position={[ghostPosition.x - offset, ghostPosition.y - offset, ghostPosition.z - offset]}
          blocked={ghostBlocked}
        />
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