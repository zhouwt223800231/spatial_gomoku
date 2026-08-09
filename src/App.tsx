import React, { useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from './store/gameStore';
import { checkWin, isDraw } from './game/rules';
import { findBestMove } from './game/ai';
import { getAdaptiveWeights } from './game/adaptiveAI';
import { usePlayerProfile } from './hooks/usePlayerProfile';
import { useAudio } from './hooks/useAudio';
import { Board3D } from './components/Board3D';
import { CameraController } from './components/CameraController';
import { WebGLDiagnostic } from './components/WebGLDiagnostic';
import { Menu } from './components/UI/Menu';
import { GameHUD } from './components/UI/GameHUD';
import { AIInsight } from './components/UI/AIInsight';
import { StrategyRadar } from './components/UI/StrategyRadar';
import * as THREE from 'three';

export default function App() {
  const {
    gamePhase,
    stones,
    currentPlayer,
    boardSize,
    gameMode,
    placeStone,
    setGhostPosition,
    setHoveredLayer,
    setWinLine,
    setGamePhase,
    setWinner,
    setAiThinking,
    addAiInsight,
    clearAiInsights,
    movesCount,
  } = useGameStore();

  const { profile, recordMove, recordGame } = usePlayerProfile();
  const { init, playPlaceSound, playWinSound } = useAudio();
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handlePointerMove = useCallback((e: any) => {
    if (gamePhase !== 'playing') return;
    if (gameMode === 'ai' && currentPlayer === 'white') return;

    // 保护：部分环境 e.intersections 可能为 undefined
    if (!e || !e.intersections || e.intersections.length === 0) return;
    const intersection = e.intersections[0];
    if (!intersection) return;

    const point = intersection.point;
    const offset = (boardSize - 1) / 2;
    const x = Math.round(point.x + offset);
    const y = Math.round(point.y + offset);
    const z = Math.round(point.z + offset);

    if (x >= 0 && x < boardSize && y >= 0 && y < boardSize && z >= 0 && z < boardSize) {
      const occupied = stones.find(s => s.position.x === x && s.position.y === y && s.position.z === z);
      if (!occupied) {
        setGhostPosition({ x, y, z });
        setHoveredLayer(z);
      } else {
        setGhostPosition(null);
      }
    }
  }, [gamePhase, gameMode, currentPlayer, boardSize, stones, setGhostPosition, setHoveredLayer]);

  const handleClick = useCallback((e: any) => {
    if (gamePhase !== 'playing') return;
    if (gameMode === 'ai' && currentPlayer === 'white') return;

    // 保护：部分环境 e.intersections 可能为 undefined
    if (!e || !e.intersections || e.intersections.length === 0) return;
    const intersection = e.intersections[0];
    if (!intersection) return;

    const point = intersection.point;
    const offset = (boardSize - 1) / 2;
    const x = Math.round(point.x + offset);
    const y = Math.round(point.y + offset);
    const z = Math.round(point.z + offset);

    if (x >= 0 && x < boardSize && y >= 0 && y < boardSize && z >= 0 && z < boardSize) {
      const occupied = stones.find(s => s.position.x === x && s.position.y === y && s.position.z === z);
      if (!occupied) {
        const pos = { x, y, z };
        placeStone(pos);
        playPlaceSound(z);
        recordMove(pos, [...stones, { position: pos, player: currentPlayer }], boardSize);
      }
    }
  }, [gamePhase, gameMode, currentPlayer, boardSize, stones, placeStone, playPlaceSound, recordMove]);

  // 声音改为首次用户点击时才初始化，避免“AudioContext was not allowed to start”警告
  useEffect(() => {
    const onFirstGesture = () => {
      init();
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
    window.addEventListener('pointerdown', onFirstGesture);
    window.addEventListener('keydown', onFirstGesture);
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
  }, [init]);

  useEffect(() => {
    if (stones.length === 0) return;

    const win = checkWin(stones, boardSize);

    if (win) {
      setWinLine(win);
      setWinner(win.player);
      setGamePhase('won');
      playWinSound();

      const isPlayerWin = gameMode === 'ai' && win.player === 'black';
      recordGame(isPlayerWin, gameMode === 'ai' && win.player === 'white', movesCount);
    } else if (isDraw(stones, boardSize)) {
      setGamePhase('draw');
      recordGame(false, false, movesCount);
    }
  }, [stones, boardSize]);

  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === 'white' && gamePhase === 'playing') {
      setAiThinking(true);

      aiTimeoutRef.current = setTimeout(() => {
        const { weights, maxDepth, insight } = getAdaptiveWeights(profile, movesCount);
        if (insight) {
          addAiInsight({ id: Date.now().toString(), type: 'adapted', message: insight, timestamp: Date.now() });
        }

        const move = findBestMove(stones, 'white', boardSize, weights, maxDepth);
        placeStone(move);
        playPlaceSound(move.z);
        setAiThinking(false);
      }, 800);

      return () => clearTimeout(aiTimeoutRef.current);
    }
  }, [currentPlayer, gameMode, gamePhase, stones, boardSize, profile, movesCount]);

  useEffect(() => {
    if (gamePhase === 'playing') {
      clearAiInsights();
    }
  }, [gamePhase]);

  const winner = useGameStore.getState().winner;

  return (
    <div className="w-screen h-screen bg-black relative">
      <Canvas
        camera={{ position: [5, 5, 5], fov: 45 }}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
        style={{ background: '#000000' }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
        <pointLight position={[-5, -5, -5]} intensity={0.2} color="#3b82f6" />

        <Board3D />
        <CameraController />
        <WebGLDiagnostic />
      </Canvas>

      {gamePhase === 'menu' && <Menu />}

      {gamePhase === 'playing' && (
        <>
          <GameHUD />
          <StrategyRadar />
          {gameMode === 'ai' && <AIInsight />}
        </>
      )}

      {gamePhase === 'won' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 backdrop-blur-sm">
          <div className="text-center">
            <h2 className={`text-5xl font-light mb-4 ${winner === 'black' ? 'text-amber-400' : 'text-blue-400'}`}>
              {winner === 'black' ? '黑方胜利' : '白方胜利'}
            </h2>
            <p className="text-white/40 mb-8">空间五连达成</p>
            <button onClick={() => useGameStore.getState().resetGame()} className="glass-button">
              再来一局
            </button>
          </div>
        </div>
      )}

      {gamePhase === 'draw' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/40 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-5xl font-light text-white/60 mb-4">平局</h2>
            <p className="text-white/40 mb-8">棋盘已满</p>
            <button onClick={() => useGameStore.getState().resetGame()} className="glass-button">
              再来一局
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
