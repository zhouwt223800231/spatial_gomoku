import { useState, useCallback } from 'react';
import { PlayerProfile, Player, Position, StoneData, BoardSize } from '../types';
import { loadProfile, saveProfile, updateProfileAfterMove, updateProfileAfterGame, createDefaultProfile } from '../game/playerProfile';

export function usePlayerProfile() {
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile);

  const recordMove = useCallback((player: Player, position: Position, stones: StoneData[], boardSize: BoardSize) => {
    setProfile((prev) => {
      const updated = updateProfileAfterMove(prev, player, position, stones, boardSize);
      saveProfile(updated);
      return updated;
    });
  }, []);

  const recordGame = useCallback((won: boolean, lost: boolean, moves: number) => {
    setProfile((prev) => {
      const updated = updateProfileAfterGame(prev, won, lost, moves);
      saveProfile(updated);
      return updated;
    });
  }, []);

  const resetProfile = useCallback(() => {
    const defaultProfile = createDefaultProfile();
    setProfile(defaultProfile);
    saveProfile(defaultProfile);
  }, []);

  return { profile, recordMove, recordGame, resetProfile };
}
