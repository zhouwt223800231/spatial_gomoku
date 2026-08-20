import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from './store/gameStore';
import { Position, Player } from './types';
import { checkWin, isDraw } from './game/rules';
import { findBestMove, findBlockingMoves, findThreatEnds } from './game/ai';
import { getAdaptiveWeights } from './game/adaptiveAI';
import { loadAIExperience, updateAIExperience } from './game/aiExperience';
import { recordGameOutcome, stonesToMoves } from './game/openingBook';
import { computeThreatFeature, recordThreatFeature } from './game/threatLearning';
import { runSelfPlayGame } from './game/selfPlay';
import { usePlayerProfile } from './hooks/usePlayerProfile';
import { useAudio } from './hooks/useAudio';
import { Board3D } from './components/Board3D';
import { CameraController } from './components/CameraController';
import { WebGLDiagnostic } from './components/WebGLDiagnostic';
import { Starfield } from './components/Starfield';
import { LiveLines } from './components/LiveLines';
import { Menu } from './components/UI/Menu';
import { PlayerPanel, StatusBar, ControlsPanel, BottomBar, ConfirmBar } from './components/UI/panels';
import { MobilePreviewPad } from './components/UI/MobilePreviewPad';
import { AIInsight } from './components/UI/AIInsight';
import { StrategyRadar } from './components/UI/StrategyRadar';
import { ProjectionMinimap } from './components/ProjectionMinimap';
import { InfoDrawer } from './components/UI/InfoDrawer';

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

export default function App() {
  const {
    gamePhase,
    stones,
    currentPlayer,
    boardSize,
    gameMode,
    humanPlayer,
    aiDifficulty,
    placeStone,
    setGhostPosition,
    setActiveLayer,
    setSliceAxis,
    setViewMode,
    viewMode,
    requestOverview,
    setWinLine,
    setGamePhase,
    setWinner,
    setAiThinking,
    addAiInsight,
    clearAiInsights,
    movesCount,
    reviewMode,
  } = useGameStore();

  const { profile, recordMove, recordGame } = usePlayerProfile();
  const { init, playPlaceSound, playVictoryChime, cancelVictoryChime } = useAudio();
  const aiPlayer: Player = humanPlayer === 'black' ? 'white' : 'black';
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const aiBlocksRef = useRef(0);
  const aiThreatFeaturesRef = useRef<{ feature: ReturnType<typeof computeThreatFeature> }[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const fineModeRef = useRef(false);

  const placeAt = useCallback((pos: Position) => {
    const st = useGameStore.getState();
    if (st.gamePhase !== 'playing') return;
    const ai = st.humanPlayer === 'black' ? 'white' as Player : 'black' as Player;
    if (st.gameMode === 'ai' && st.currentPlayer === ai) return;
    const occupied = st.stones.some(s => s.position.x === pos.x && s.position.y === pos.y && s.position.z === pos.z);
    if (occupied) return;
    st.placeStone(pos);
    playPlaceSound(pos, st.boardSize);
    recordMove(pos, [...st.stones, { position: pos, player: st.currentPlayer }], st.boardSize);
    st.setGhostPosition(null);
    st.setSliceAxis('z');
    fineModeRef.current = false;
  }, [playPlaceSound, recordMove]);

  const confirmPlace = useCallback(() => {
    const pos = useGameStore.getState().ghostPosition;
    if (pos) placeAt(pos);
  }, [placeAt]);

  const cancelPreview = useCallback(() => {
    const st = useGameStore.getState();
    st.setGhostPosition(null);
    st.setSliceAxis('z');
    fineModeRef.current = false;
  }, []);

  const handleCellSelect = useCallback((pos: Position) => {
    const st = useGameStore.getState();
    if (st.gamePhase !== 'playing') return;
    const ai = st.humanPlayer === 'black' ? 'white' as Player : 'black' as Player;
    if (st.gameMode === 'ai' && st.currentPlayer === ai) return;
    st.setGhostPosition(pos);
    st.setActiveLayer(pos.z);
    st.setSliceAxis('z');
    fineModeRef.current = true;
  }, []);

  // Shared preview-move logic used by keyboard (desktop) and D-pad (mobile).
  const moveGhost = useCallback((axis: 'x' | 'y' | 'z', delta: number) => {
    const st = useGameStore.getState();
    if (st.gamePhase !== 'playing') return;
    const size = st.boardSize;
    const clamp = (v: number) => Math.max(0, Math.min(size - 1, v));
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
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const st = useGameStore.getState();
      if (st.gamePhase !== 'playing') return;
      const ai = st.humanPlayer === 'black' ? 'white' as Player : 'black' as Player;
      if (st.gameMode === 'ai' && st.currentPlayer === ai) return;

      const key = e.key.toLowerCase();
      const size = st.boardSize;
      const clamp = (v: number) => Math.max(0, Math.min(size - 1, v));

      if (key === '0' || key === 'f' || key === 'r') { e.preventDefault(); st.requestOverview(); return; }
      if (key === 'o') { e.preventDefault(); st.setViewMode(st.viewMode === 'orthographic' ? 'perspective' : 'orthographic'); return; }

      const move = moveGhost;

      if (KEYMAP.xNeg.includes(key)) { move('x', -1); e.preventDefault(); }
      else if (KEYMAP.xPos.includes(key)) { move('x', 1); e.preventDefault(); }
      else if (KEYMAP.yNeg.includes(key)) { move('y', -1); e.preventDefault(); }
      else if (KEYMAP.yPos.includes(key)) { move('y', 1); e.preventDefault(); }
      else if (KEYMAP.zNeg.includes(key)) { move('z', -1); e.preventDefault(); }
      else if (KEYMAP.zPos.includes(key)) { move('z', 1); e.preventDefault(); }
      else if (KEYMAP.confirm.includes(key)) { e.preventDefault(); confirmPlace(); }
      else if (KEYMAP.cancel.includes(key)) { e.preventDefault(); cancelPreview(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmPlace, cancelPreview, moveGhost]);

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

      const st = useGameStore.getState();
      const isPlayerWin = gameMode === 'ai' && win.player === st.humanPlayer;
      recordGame(isPlayerWin, gameMode === 'ai' && win.player === (st.humanPlayer === 'black' ? 'white' : 'black'), movesCount);

      if (gameMode === 'ai') {
        const ai = st.humanPlayer === 'black' ? 'white' as Player : 'black' as Player;
        const aiWon = win.player === ai;
        const aiLost = win.player !== ai;
        const opp = ai === 'black' ? 'white' as Player : 'black' as Player;
        const leftoverThreats = findBlockingMoves(stones, opp, boardSize);
        updateAIExperience(loadAIExperience(), {
          aiWin: aiWon,
          aiLost,
          draw: false,
          lossByOpenThree: aiLost && leftoverThreats.size > 0,
          blocks: aiBlocksRef.current,
        });
        aiBlocksRef.current = 0;
        for (const f of aiThreatFeaturesRef.current) recordThreatFeature(f.feature, ai, win.player);
        aiThreatFeaturesRef.current = [];
        recordGameOutcome(stonesToMoves(stones), win.player);
      }
    } else if (isDraw(stones, boardSize)) {
      setGamePhase('draw');
      recordGame(false, false, movesCount);
      if (gameMode === 'ai') {
        updateAIExperience(loadAIExperience(), {
          aiWin: false,
          aiLost: false,
          draw: true,
          lossByOpenThree: false,
          blocks: aiBlocksRef.current,
        });
        aiBlocksRef.current = 0;
        aiThreatFeaturesRef.current = [];
        recordGameOutcome(stonesToMoves(stones), null);
      }
    }
  }, [stones, boardSize, gameMode, movesCount, recordGame]);

  useEffect(() => {
    if (gameMode !== 'ai' || gamePhase !== 'playing') return;
    const ai = humanPlayer === 'black' ? 'white' as Player : 'black' as Player;
    if (currentPlayer !== ai) return;

    setAiThinking(true);
    aiTimeoutRef.current = setTimeout(() => {
      const { weights, maxDepth, blockWeight, nodeBudget, useBook, insight } = getAdaptiveWeights(profile, movesCount, aiDifficulty, loadAIExperience());
      if (insight) {
        addAiInsight({ id: Date.now().toString(), type: 'adapted', message: insight, timestamp: Date.now() });
      }
      const result = findBestMove(stones, ai, boardSize, weights, maxDepth, blockWeight, nodeBudget, useBook);
      aiThreatFeaturesRef.current.push({ feature: computeThreatFeature(stones, result.position, ai, boardSize) });
      const opp = ai === 'black' ? 'white' as Player : 'black' as Player;
      const threat3 = findThreatEnds(stones, opp, boardSize, 3);
      const threat4 = findThreatEnds(stones, opp, boardSize, 4);
      const isBlock = threat3.has(`${result.position.x},${result.position.y},${result.position.z}`) ||
                      threat4.has(`${result.position.x},${result.position.y},${result.position.z}`);
      aiBlocksRef.current += isBlock || result.blocked ? 1 : 0;
      placeStone(result.position);
      playPlaceSound(result.position, boardSize);
      setAiThinking(false);
    }, 800);

    return () => clearTimeout(aiTimeoutRef.current);
  }, [currentPlayer, gameMode, gamePhase, stones, boardSize, profile, movesCount, humanPlayer, aiDifficulty, placeStone, playPlaceSound, addAiInsight, setAiThinking]);

  useEffect(() => {
    if (gamePhase === 'playing') {
      clearAiInsights();
    }
  }, [gamePhase, clearAiInsights]);

  // Background self-play training while idle in the menu: the AI gradually
  // strengthens its opening book across consecutive sessions.
  useEffect(() => {
    if (gamePhase !== 'menu') return;
    let cancelled = false;
    let runs = 0;
    const tick = () => {
      if (cancelled || runs >= 2) return;
      const deadline = (performance.now() + 60);
      while (performance.now() < deadline && runs < 2) {
        void runSelfPlayGame(useGameStore.getState().boardSize);
        runs += 1;
      }
      if (runs < 2) requestIdleCallback(tick, { timeout: 4000 });
    };
    const id = requestIdleCallback(tick, { timeout: 4000 });
    return () => {
      cancelled = true;
      cancelIdleCallback(id);
    };
  }, [gamePhase]);

  useEffect(() => () => { cancelVictoryChime(); }, [cancelVictoryChime]);

  // Post-game compensation training: after a finished AI game, run one light
  // self-play game so the threat library keeps growing (rate-limited by phase change).
  useEffect(() => {
    if (gameMode !== 'ai' || (gamePhase !== 'won' && gamePhase !== 'draw')) return;
    const id = window.setTimeout(() => {
      void runSelfPlayGame(useGameStore.getState().boardSize);
    }, 400);
    return () => clearTimeout(id);
  }, [gamePhase, gameMode]);

  const winner = useGameStore.getState().winner;
  const dismissCelebration = () => {
    useGameStore.getState().setCelebrationDismissed(true);
    useGameStore.getState().setReviewMode(true);
  };

  return (
    <div className="w-screen relative space-bg" style={{ height: "100dvh" }} onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        dpr={[1, 2]}
        key={viewMode}
        orthographic={viewMode === 'orthographic'}
        camera={viewMode === 'orthographic'
          ? { position: [6, 6, 6], zoom: 1, near: -100, far: 100, left: -1, right: 1, top: 1, bottom: -1 }
          : { position: [5, 5, 5], fov: 45, near: 0.1, far: 200 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <fog attach="fog" args={['#0b1020', 10, 30]} />
        <ambientLight intensity={0.45} />
        <hemisphereLight args={['#67e8f9', '#1e293b', 0.35]} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <pointLight position={[-5, -5, -5]} intensity={0.25} color="#3b82f6" />

        <Starfield />
        <Board3D onCellSelect={handleCellSelect} />
        {(gamePhase === 'playing' || reviewMode) && <LiveLines />}
        <CameraController />
        <WebGLDiagnostic />
      </Canvas>

      {gamePhase === 'menu' && <Menu />}

      {gamePhase === 'playing' && (
        <>
          {/* Mobile: single flex column - status bar, board, bottom bar (+ preview pad) */}
          <div className="absolute inset-0 z-10 flex md:hidden flex-col pointer-events-none p-3">
            <div className="pointer-events-auto"><StatusBar /></div>
            <div className="flex-1" />
            <div className="pointer-events-auto flex flex-col items-center gap-2">
              <MobilePreviewPad onMove={moveGhost} onConfirm={confirmPlace} onCancel={cancelPreview} />
              <BottomBar onToggleDrawer={() => setDrawerOpen(true)} />
            </div>
          </div>

          {/* Desktop: three-column grid */}
          <div className="absolute inset-0 z-10 hidden md:grid grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto] gap-3 p-4 pointer-events-none overflow-hidden">
            <div className="col-start-1 row-start-1 pointer-events-auto"><PlayerPanel /></div>
            <div className="col-start-2 row-start-1 self-start justify-self-center pointer-events-auto"><StatusBar /></div>
            <div className="col-start-3 row-start-1 justify-self-end pointer-events-auto"><ControlsPanel /></div>
            <div className="col-start-1 row-start-2 self-start pointer-events-auto"><StrategyRadar /></div>
            <div className="col-start-1 row-start-2 self-end pointer-events-auto"><ProjectionMinimap /></div>
            {gameMode === 'ai' && <div className="col-start-3 row-start-2 self-end pointer-events-auto w-64"><AIInsight /></div>}
            <div className="col-start-2 row-start-3 self-end justify-self-center pointer-events-auto"><BottomBar /></div>
            <ConfirmBar onConfirm={confirmPlace} onCancel={cancelPreview} />
          </div>
        </>
      )}

      <InfoDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {gamePhase === 'won' && !reviewMode && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="absolute inset-0 victory-vignette" />
          <div className="relative text-center">
            <h2 style={{ fontSize: "clamp(2rem, 10vw, 3.75rem)" }} className={`victory-title font-light tracking-widest mb-4 ${winner === 'black' ? 'victory-title--amber' : 'victory-title--blue'}`}>
              {winner === 'black' ? 'Black Wins' : 'White Wins'}
            </h2>
            <p className="victory-subtitle text-white/50 text-sm uppercase tracking-widest mb-10">
              Five in a row in 3D space
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
              <button onClick={dismissCelebration} className="glass-button victory-btn px-6 py-2.5">
                View Board
              </button>
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

      {gamePhase === 'draw' && !reviewMode && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#070b16]/40 backdrop-blur-sm">
          <div className="text-center">
            <h2 className="text-5xl font-light text-white/60 mb-4">Draw</h2>
            <p className="text-white/40 mb-8">Board is full</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
              <button onClick={dismissCelebration} className="glass-button px-6 py-2.5">
                View Board
              </button>
              <button onClick={() => useGameStore.getState().resetGame()} className="glass-button">
                Play Again
              </button>
              <button onClick={() => useGameStore.setState({ gamePhase: 'menu' })} className="glass-button">
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {(gamePhase === 'won' || gamePhase === 'draw') && reviewMode && (
        <div className="absolute inset-x-3 top-3 md:inset-x-auto md:bottom-6 md:left-1/2 md:-translate-x-1/2 z-30">
          <div className="glass-panel px-5 py-3 flex flex-wrap items-center justify-center gap-3 md:gap-4">
            <span className="panel-label">Reviewing final board</span>
            <button onClick={() => useGameStore.getState().resetGame()} className="glass-button text-sm">Play Again</button>
            <button onClick={() => useGameStore.setState({ gamePhase: 'menu' })} className="glass-button text-sm">Main Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
