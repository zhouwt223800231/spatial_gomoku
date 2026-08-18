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
  hoveredLayer: number | null;
  aiThinking: boolean;
  aiInsights: AIInsight[];
  movesCount: number;
  lastMove: Position | null;

  setBoardSize: (size: BoardSize) => void;
  setGameMode: (mode: GameMode) => void;
  startGame: () => void;
  placeStone: (position: Position) => void;
  setGhostPosition: (pos: Position | null) => void;
  setHoveredLayer: (layer: number | null) => void;
  setWinLine: (line: WinLineData | null) => void;
  setGamePhase: (phase: GamePhase) => void;
  setWinner: (winner: Player | null) => void;
  setAiThinking: (thinking: boolean) => void;
  addAiInsight: (insight: AIInsight) => void;
  clearAiInsights: () => void;
  resetGame: () => void;
  undoMove: () => void;
}

const createInitialState = () => ({
  boardSize: 5 as BoardSize,
  stones: [] as StoneData[],
  currentPlayer: 'black' as Player,
  gamePhase: 'menu' as GamePhase,
  gameMode: 'pvp' as GameMode,
  winner: null as Player | null,
  winLine: null as WinLineData | null,
  ghostPosition: null as Position | null,
  hoveredLayer: null as number | null,
  aiThinking: false,
  aiInsights: [] as AIInsight[],
  movesCount: 0,
  lastMove: null as Position | null,
});

export const useGameStore = create<GameState>((set, get) => ({
  ...createInitialState(),

  setBoardSize: (size) => set({ boardSize: size }),
  setGameMode: (mode) => set({ gameMode: mode }),

  startGame: () => set((state) => ({
    ...createInitialState(),
    // 保留玩家已选择的模式与棋盘尺寸，避免把 AI 模式重置回 PvP
    gameMode: state.gameMode,
    boardSize: state.boardSize,
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
  setHoveredLayer: (layer) => set({ hoveredLayer: layer }),
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
  }),

  undoMove: () => set((state) => {
    if (state.stones.length === 0) return state;

    // AI 模式：人类落子后 AI 会立即回一子，因此撤销应回退“一整轮”（两步），
    // 否则会留下 AI 的棋子且 currentPlayer 错乱。人类执黑先手，撤销后回到黑方回合。
    if (state.gameMode === 'ai') {
      const total = state.stones.length;
      const removeCount = Math.min(2, total);
      const newStones = state.stones.slice(0, total - removeCount);
      return {
        stones: newStones,
        currentPlayer: 'black' as Player,
        movesCount: Math.max(0, state.movesCount - 2),
        lastMove: newStones.length > 0 ? newStones[newStones.length - 1].position : null,
      };
    }

    // PVP 模式：照旧只回退一步，并恢复上一步的玩家回合
    const newStones = state.stones.slice(0, -1);
    return {
      stones: newStones,
      currentPlayer: state.currentPlayer === 'black' ? 'white' : 'black',
      movesCount: state.movesCount - 1,
      lastMove: newStones.length > 0 ? newStones[newStones.length - 1].position : null,
    };
  }),
}));
