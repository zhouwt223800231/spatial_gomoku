import { useState, useCallback } from 'react';
import { PlayerProfile, Position, StoneData, BoardSize } from '../types';
import { loadProfile, saveProfile, updateProfileAfterMove, updateProfileAfterGame, createDefaultProfile } from '../game/playerProfile';

export function usePlayerProfile() {
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile());

  const recordMove = useCallback((position: Position, stones: StoneData[], boardSize: BoardSize) => {
    const updated = updateProfileAfterMove(profile, position, stones, boardSize);
    setProfile(updated);
    saveProfile(updated);
  }, [profile]);

  const recordGame = useCallback((won: boolean, lost: boolean, moves: number) => {
    const updated = updateProfileAfterGame(profile, won, lost, moves);
    setProfile(updated);
    saveProfile(updated);
  }, [profile]);

  const resetProfile = useCallback(() => {
    const defaultProfile = createDefaultProfile();
    setProfile(defaultProfile);
    saveProfile(defaultProfile);
  }, []);

  return { profile, recordMove, recordGame, resetProfile };
}
