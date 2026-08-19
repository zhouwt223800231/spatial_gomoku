import { create } from 'zustand';
import { Position, Player, StoneData, GameMode, GamePhase, WinLineData, BoardSize, AIInsight, ViewMode, AiDifficulty } from '../types';

export type SliceAxis = 'x' | 'y' | 'z';

interface GameState {
  boardSize: BoardSize;
  stones: StoneData[];
  currentPlayer: Player;
  gamePhase: GamePhase;
  gameMode: GameMode;
  humanPlayer: Player;
  aiDifficulty: AiDifficulty;
  winner: Player | null;
  winLine: WinLineData | null;
  ghostPosition: Position | null;
  activeLayer: number;
  sliceAxis: SliceAxis;
  viewMode: ViewMode;
  showLines: boolean;
  resetViewTick: number;
  aiThinking: boolean;
  aiInsights: AIInsight[];
  movesCount: number;
  lastMove: Position | null;
  victoryChimePlayed: boolean;
  celebrationDismissed: boolean;
  reviewMode: boolean;

  setBoardSize: (size: BoardSize) => void;
  setGameMode: (mode: GameMode) => void;
  setHumanPlayer: (player: Player) => void;
  setAiDifficulty: (d: AiDifficulty) => void;
  startGame: () => void;
  placeStone: (position: Position) => void;
  setGhostPosition: (pos: Position | null) => void;
  setActiveLayer: (layer: number) => void;
  setSliceAxis: (axis: SliceAxis) => void;
  setViewMode: (mode: ViewMode) => void;
  setShowLines: (show: boolean) => void;
  requestOverview: () => void;
  setWinLine: (line: WinLineData | null) => void;
  setGamePhase: (phase: GamePhase) => void;
  setWinner: (winner: Player | null) => void;
  setAiThinking: (thinking: boolean) => void;
  setCelebrationDismissed: (dismissed: boolean) => void;
  setReviewMode: (mode: boolean) => void;
  addAiInsight: (insight: AIInsight) => void;
  clearAiInsights: () => void;
  resetGame: () => void;
  undoMove: () => void;
}

const centerOf = (size: BoardSize) => Math.floor(size / 2);

const createInitialState = () => ({
  boardSize: 5 as BoardSize,
  stones: [] as StoneData[],
  currentPlayer: 'black' as Player,
  gamePhase: 'menu' as GamePhase,
  gameMode: 'pvp' as GameMode,
  humanPlayer: 'black' as Player,
  aiDifficulty: 'normal' as AiDifficulty,
  winner: null as Player | null,
  winLine: null as WinLineData | null,
  ghostPosition: null as Position | null,
  activeLayer: 2,
  sliceAxis: 'z' as SliceAxis,
  viewMode: 'perspective' as ViewMode,
  showLines: true,
  resetViewTick: 0,
  aiThinking: false,
  aiInsights: [] as AIInsight[],
  movesCount: 0,
  lastMove: null as Position | null,
  victoryChimePlayed: false,
  celebrationDismissed: false,
  reviewMode: false,
});

export const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),

  setBoardSize: (size) => set({ boardSize: size, activeLayer: centerOf(size) }),
  setGameMode: (mode) => set({ gameMode: mode }),

  setHumanPlayer: (player) => set({ humanPlayer: player }),

  setAiDifficulty: (d) => set({ aiDifficulty: d }),

  startGame: () => set((state) => ({
    ...createInitialState(),
    gameMode: state.gameMode,
    boardSize: state.boardSize,
    humanPlayer: state.humanPlayer,
    activeLayer: centerOf(state.boardSize),
    currentPlayer: state.gameMode === 'ai' && state.humanPlayer === 'white' ? 'white' : 'black',
    gamePhase: 'playing',
  })),

  placeStone: (position) => {
    const state = get();
    if (state.gamePhase !== 'playing') return;
    if (state.stones.find(s => s.position.x === position.x && s.position.y === position.y && s.position.z === position.z)) return;

    const newStone: StoneData = { position, player: state.currentPlayer };
    const newStones = [...state.stones, newStone];
    const nextPlayer = state.currentPlayer === 'black' ? 'white' : 'black';

    set({
      stones: newStones,
      currentPlayer: nextPlayer,
      movesCount: state.movesCount + 1,
      lastMove: position,
      ghostPosition: null,
    });
  },

  setGhostPosition: (pos) => set({ ghostPosition: pos }),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setSliceAxis: (axis) => set({ sliceAxis: axis }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowLines: (show) => set({ showLines: show }),
  requestOverview: () => set((state) => ({ resetViewTick: state.resetViewTick + 1 })),
  setWinLine: (line) => set({ winLine: line }),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setWinner: (winner) => set({ winner }),
  setAiThinking: (thinking) => set({ aiThinking: thinking }),
  setCelebrationDismissed: (dismissed) => set({ celebrationDismissed: dismissed }),
  setReviewMode: (mode) => set({ reviewMode: mode }),
  addAiInsight: (insight) => set((state) => ({ aiInsights: [...state.aiInsights.slice(-4), insight] })),
  clearAiInsights: () => set({ aiInsights: [] }),

  resetGame: () => set({
    ...createInitialState(),
    gameMode: get().gameMode,
    boardSize: get().boardSize,
    humanPlayer: get().humanPlayer,
    activeLayer: centerOf(get().boardSize),
    currentPlayer: get().gameMode === 'ai' && get().humanPlayer === 'white' ? 'white' : 'black',
  }),

  undoMove: () => set((state) => {
    if (state.stones.length === 0) return state;

    if (state.gameMode === 'ai') {
      const total = state.stones.length;
      const removeCount = Math.min(2, total);
      const newStones = state.stones.slice(0, total - removeCount);
      return {
        stones: newStones,
        currentPlayer: 'black' as Player,
        movesCount: Math.max(0, state.movesCount - 2),
        lastMove: newStones.length > 0 ? newStones[newStones.length - 1].position : null,
        ghostPosition: null,
        sliceAxis: 'z' as SliceAxis,
      };
    }

    const newStones = state.stones.slice(0, -1);
    return {
      stones: newStones,
      currentPlayer: state.currentPlayer === 'black' ? 'white' : 'black',
      movesCount: state.movesCount - 1,
      lastMove: newStones.length > 0 ? newStones[newStones.length - 1].position : null,
      ghostPosition: null,
      sliceAxis: 'z' as SliceAxis,
    };
  }),
}));
