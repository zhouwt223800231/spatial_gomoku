import { useCallback, useRef } from 'react';
import * as Tone from 'tone';

export function useAudio() {
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const chimeSynthRef = useRef<Tone.PolySynth | null>(null);
  const initialized = useRef(false);

  const init = useCallback(async () => {
    if (initialized.current) return;
    await Tone.start();
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 },
    }).toDestination();
    synthRef.current.volume.value = -10;

    // FM bell / music-box timbre for the victory chime sequence.
    chimeSynthRef.current = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.01,
      modulationIndex: 14,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 1.2 },
      modulationEnvelope: { attack: 0.001, decay: 0.9, sustain: 0, release: 0.9 },
    }).toDestination();
    chimeSynthRef.current.volume.value = -12;
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

  // Pentatonic chimes (C5 D5 E5 G5 A5) aligned with the per-stone ignition
  // (0.45s apart, last stone at 1.8s), then a final C-major chord.
  const playVictoryChime = useCallback(() => {
    if (!chimeSynthRef.current) return;
    const synth = chimeSynthRef.current;
    const IGNITE_END = 1.8;
    const step = IGNITE_END / 4;
    const scale = ['C5', 'D5', 'E5', 'G5', 'A5'];
    const chord = ['C5', 'E5', 'G5', 'C6'];

    Tone.Transport.cancel(0);
    scale.forEach((note, i) => {
      Tone.Transport.schedule((time) => {
        synth.triggerAttackRelease(note, 1.1, time);
      }, i * step);
    });
    Tone.Transport.schedule((time) => {
      chord.forEach((n) => synth.triggerAttackRelease(n, 1.4, time));
    }, IGNITE_END + 0.1);

    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.start();
    // Stop the transport after the chord tail has rung out.
    window.setTimeout(() => {
      Tone.Transport.stop();
      Tone.Transport.cancel(0);
    }, 3600);
  }, []);

  const cancelVictoryChime = useCallback(() => {
    Tone.Transport.cancel(0);
    Tone.Transport.stop();
    Tone.Transport.position = 0;
  }, []);

  const playAlertSound = useCallback(() => {
    if (!synthRef.current) return;
    synthRef.current.triggerAttackRelease('A3', '16n');
  }, []);

  return { init, playPlaceSound, playWinSound, playVictoryChime, cancelVictoryChime, playAlertSound };
}
