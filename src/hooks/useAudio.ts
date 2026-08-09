import { useCallback, useRef } from 'react';
import * as Tone from 'tone';

export function useAudio() {
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const initialized = useRef(false);

  const init = useCallback(async () => {
    if (initialized.current) return;
    await Tone.start();
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 },
    }).toDestination();
    synthRef.current.volume.value = -10;
    initialized.current = true;
  }, []);

  const playPlaceSound = useCallback((layer: number) => {
    if (!synthRef.current) return;
    const notes = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3'];
    const note = notes[layer % notes.length];
    synthRef.current.triggerAttackRelease(note, '8n');
  }, []);

  const playWinSound = useCallback(() => {
    if (!synthRef.current) return;
    synthRef.current.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '2n');
  }, []);

  const playAlertSound = useCallback(() => {
    if (!synthRef.current) return;
    synthRef.current.triggerAttackRelease('A3', '16n');
  }, []);

  return { init, playPlaceSound, playWinSound, playAlertSound };
}
