import React, { useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from './store/gameStore';
import { Position } from './types';
import { checkWin, isDraw } from './game/rules';
import { findBestMove } from './game/ai';
import { getAdaptiveWeights } from './game/adaptiveAI';
import { usePlayerProfile } from './hooks/usePlayerProfile';
import { useAudio } from './hooks/useAudio';
import { Board3D } from './components/Board3D';
import { CameraController } from './components/CameraController';
import { WebGLDiagnostic } from './components/WebGLDiagnostic';
import { Starfield } from './components/Starfield';
import { LiveLines } from './components/LiveLines';
import { Menu } from './components/UI/Menu';
import { GameHUD } from './components/UI/GameHUD';
import { AIInsight } from './components/UI/AIInsight';
import { StrategyRadar } from './components/UI/StrategyRadar';
import { ProjectionMinimap } from './components/ProjectionMinimap';

const KEYMAP: Record<'xNeg' | 'xPos' | 'yNeg' | 'yPos' | 'zNeg' | 'zPos' | 'confirm' | 'cancel', readonly string[]> = {
  xNeg: ['a', 'arrowleft'],
  xPos: ['d', 'arrowright'],
  yNeg: ['s', 'arrowdown'],
  yPos: ['w', 'arrowup'],
  zNeg: ['q'],
  zPos: ['e'],
  confirm: ['enter', ' '],
  cancel: ['escape'],
};

const DOUBLE_CLICK_MS = 350;

export default function App() {
  const {
    gamePhase,
    stones,
    currentPlayer,
    boardSize,
    gameMode,
    placeStone,
    setGhostPosition,
    setActiveLayer,
    setSliceAxis,
    viewMode,
    setViewMode,
    requestOverview,
    setWinLine,
    setGamePhase,
    setWinner,
    setAiThinking,
    addAiInsight,
    clearAiInsights,
    movesCount,
  } = useGameStore();

  const { profile, recordMove, recordGame } = usePlayerProfile();
  const { init, playPlaceSound, playVictoryChime, cancelVictoryChime } = useAudio();
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const fineModeRef = useRef(false);
  const lastLockTimeRef = useRef(0);

  const placeAt = useCallback((pos: Position) => {
    const st = useGameStore.getState();
    if (st.gamePhase !== 'playing') return;
    if (st.gameMode === 'ai' && st.currentPlayer === 'white') return;
    const occupied = st.stones.some(s => s.position.x === pos.x && s.position.y === pos.y && s.position.z === pos.z);
    if (occupied) return;
    st.placeStone(pos);
    playPlaceSound(pos.z);
    recordMove(pos, [...st.stones, { position: pos, player: st.currentPlayer }], st.boardSize);
    st.setGhostPosition(null);
    st.setSliceAxis('z');
    fineModeRef.current = false;
  }, [playPlaceSound, recordMove]);

  const confirmPlace = useCallback(() => {
    const pos = useGameStore.getState().ghostPosition;
    if (pos) placeAt(pos);
  }, [placeAt]);

  const handleCellPlace = useCallback((pos: Position) => {
    placeAt(pos);
  }, [placeAt]);

  const handleCellLock = useCallback((pos: Position) => {
    const st = useGameStore.getState();
    if (st.gamePhase !== 'playing') return;
    if (st.gameMode === 'ai' && st.currentPlayer === 'white') return;
    const now = performance.now();
    const prev = st.ghostPosition;
    if (prev && fineModeRef.current && now - lastLockTimeRef.current < DOUBLE_CLICK_MS) {
      confirmPlace();
    } else {
      st.setGhostPosition(pos);
      st.setActiveLayer(pos.z);
      st.setSliceAxis('z');
      fineModeRef.current = true;
      lastLockTimeRef.current = now;
    }
  }, [confirmPlace]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const st = useGameStore.getState();
      if (st.gamePhase !== 'playing') return;
      if (st.gameMode === 'ai' && st.currentPlayer === 'white') return;

      const key = e.key.toLowerCase();
      const size = st.boardSize;
      const clamp = (v: number) => Math.max(0, Math.min(size - 1, v));

      // View controls (work regardless of a locked ghost)
      if (key === '0' || key === 'f') { e.preventDefault(); st.requestOverview(); return; }
      if (key === 'o') { e.preventDefault(); st.setViewMode(st.viewMode === 'orthographic' ? 'perspective' : 'orthographic'); return; }

      const move = (axis: 'x' | 'y' | 'z', delta: number) => {
        const cur = st.ghostPosition;
        if (!cur) {
          if (axis === 'z') st.setActiveLayer(clamp(st.activeLayer + delta));
          return;
        }
        const pos = { ...cur };
        if (axis === 'x') pos.x = clamp(cur.x + delta);
        else if (axis === 'y') pos.y = clamp(cur.y + delta);
        else pos.z = clamp(cur.z + delta);
        st.setGhostPosition(pos);
        st.setSliceAxis(axis);
        if (axis === 'z') st.setActiveLayer(pos.z);
      };

      if (KEYMAP.xNeg.includes(key)) { move('x', -1); e.preventDefault(); }
      else if (KEYMAP.xPos.includes(key)) { move('x', 1); e.preventDefault(); }
      else if (KEYMAP.yNeg.includes(key)) { move('y', -1); e.preventDefault(); }
      else if (KEYMAP.yPos.includes(key)) { move('y', 1); e.preventDefault(); }
      else if (KEYMAP.zNeg.includes(key)) { move('z', -1); e.preventDefault(); }
      else if (KEYMAP.zPos.includes(key)) { move('z', 1); e.preventDefault(); }
      else if (KEYMAP.confirm.includes(key)) { e.preventDefault(); confirmPlace(); }
      else if (KEYMAP.cancel.includes(key)) { e.preventDefault(); st.setGhostPosition(null); st.setSliceAxis('z'); fineModeRef.current = false; }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmPlace]);

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
      if (!useGameStore.getState().victoryChimePlayed) {
        useGameStore.setState({ victoryChimePlayed: true });
        playVictoryChime(win.positions, boardSize);
      }

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

  useEffect(() => () => { cancelVictoryChime(); }, [cancelVictoryChime]);

  const winner = useGameStore.getState().winner;

  return (
    <div className="w-screen h-screen relative space-bg" onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        key={viewMode}
        orthographic={viewMode === 'orthographic'}
        camera={viewMode === 'orthographic'
          ? { position: [6, 6, 6], zoom: 1, near: -100, far: 100, left: -1, right: 1, top: 1, bottom: -1 }
          : { position: [5, 5, 5], fov: 45, near: 0.1, far: 200 }}
        gl={{ alpha: true, antialias: true }}
      >
        <fog attach="fog" args={['#0b1020', 10, 30]} />
        <ambientLight intensity={0.45} />
        <hemisphereLight args={['#67e8f9', '#1e293b', 0.35]} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <pointLight position={[-5, -5, -5]} intensity={0.25} color="#3b82f6" />

        <Starfield />
        <Board3D onCellLock={handleCellLock} onCellPlace={handleCellPlace} />
        {gamePhase === 'playing' && <LiveLines />}
        <CameraController />
        <WebGLDiagnostic />
      </Canvas>

      {gamePhase === 'menu' && <Menu />}

      {gamePhase === 'playing' && (
        <>
          <GameHUD />
          <StrategyRadar />
          <ProjectionMinimap />
          {gameMode === 'ai' && <AIInsight />}
        </>
      )}

      {gamePhase === 'won' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0 victory-vignette" />
          <div className="relative text-center">
            <h2 className={`victory-title text-6xl font-light tracking-widest mb-4 ${winner === 'black' ? 'text-amber-400' : 'text-blue-400 victory-title--blue'}`}>
              {winner === 'black' ? 'Black Wins' : 'White Wins'}
            </h2>
            <p className="victory-subtitle text-white/50 text-sm uppercase tracking-widest mb-10">
              Five in a row in 3D space
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => useGameStore.getState().resetGame()} className="glass-button victory-btn">
                Play Again
              </button>
              <button onClick={() => useGameStore.setState({ gamePhase: 'menu' })} className="glass-button victory-btn">
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {gamePhase === 'draw' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#070b16]/40 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-5xl font-light text-white/60 mb-4">Draw</h2>
            <p className="text-white/40 mb-8">Board is full</p>
            <button onClick={() => useGameStore.getState().resetGame()} className="glass-button">
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
