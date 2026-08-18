import { create } from 'zustand';
import { Position, Player, StoneData, GameMode, GamePhase, WinLineData, BoardSize, AIInsight } from '../types';

interface GameState {
  boardSize: BoardSize;
  stones: StoneData[];
  currentPlayer: Player;
  gamePhase: GamePhase;
  gameMode: GameMode;
  winner: Player | null;
  winLine: WinLineData | null;
  ghostPosition: Position | null;
  activeLayer: number;
  aiThinking: boolean;
  aiInsights: AIInsight[];
  movesCount: number;
  lastMove: Position | null;

  setBoardSize: (size: BoardSize) => void;
  setGameMode: (mode: GameMode) => void;
  startGame: () => void;
  placeStone: (position: Position) => void;
  setGhostPosition: (pos: Position | null) => void;
  setActiveLayer: (layer: number) => void;
  setWinLine: (line: WinLineData | null) => void;
  setGamePhase: (phase: GamePhase) => void;
  setWinner: (winner: Player | null) => void;
  setAiThinking: (thinking: boolean) => void;
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
  winner: null as Player | null,
  winLine: null as WinLineData | null,
  ghostPosition: null as Position | null,
  activeLayer: 2,
  aiThinking: false,
  aiInsights: [] as AIInsight[],
  movesCount: 0,
  lastMove: null as Position | null,
});

export const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),

  setBoardSize: (size) => set({ boardSize: size, activeLayer: centerOf(size) }),
  setGameMode: (mode) => set({ gameMode: mode }),

  startGame: () => set((state) => ({
    ...createInitialState(),
    gameMode: state.gameMode,
    boardSize: state.boardSize,
    activeLayer: centerOf(state.boardSize),
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
  setWinLine: (line) => set({ winLine: line }),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setWinner: (winner) => set({ winner }),
  setAiThinking: (thinking) => set({ aiThinking: thinking }),
  addAiInsight: (insight) => set((state) => ({ aiInsights: [...state.aiInsights.slice(-4), insight] })),
  clearAiInsights: () => set({ aiInsights: [] }),

  resetGame: () => set({
    ...createInitialState(),
    gameMode: get().gameMode,
    boardSize: get().boardSize,
    activeLayer: centerOf(get().boardSize),
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
      };
    }

    const newStones = state.stones.slice(0, -1);
    return {
      stones: newStones,
      currentPlayer: state.currentPlayer === 'black' ? 'white' : 'black',
      movesCount: state.movesCount - 1,
      lastMove: newStones.length > 0 ? newStones[newStones.length - 1].position : null,
      ghostPosition: null,
    };
  }),
}));