import { useCallback, useRef } from 'react';
import * as Tone from 'tone';

// --- Wet-Hands-style dreamy pluck constants (tune here) ---
const PLUCK_SCALE = ['A4', 'C#5', 'E5', 'F#5', 'A5'];
const PLUCK_GAPS = [0.55, 0.45, 0.36, 0.28]; // slow -> fast
const PLUCK_DURATION = 1.2;                   // per-note ring before release
const PLUCK_STOP_MS = 3500;                   // let the last tail + reverb decay

export function useAudio() {
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const pluckSynthRef = useRef<Tone.PolySynth | null>(null);
  const pluckFilterRef = useRef<Tone.Filter | null>(null);
  const delayRef = useRef<Tone.FeedbackDelay | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const noiseSynthRef = useRef<Tone.NoiseSynth | null>(null);
  const noiseFilterRef = useRef<Tone.Filter | null>(null);
  const noiseGainRef = useRef<Tone.Gain | null>(null);
  const initialized = useRef(false);

  const init = useCallback(async () => {
    if (initialized.current) return;
    await Tone.start();

    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.5 },
    }).toDestination();
    synthRef.current.volume.value = -10;

    // Plucked music-box voice (short attack + fast exponential decay).
    pluckSynthRef.current = new Tone.PolySynth({
      maxPolyphony: 16,
      voice: Tone.Synth,
      options: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 1.0, sustain: 0.05, release: 0.5 },
      },
    });
    pluckSynthRef.current.volume.value = -12;

    // Spatial chain: pluck -> lowpass -> (feedback delay + reverb) -> out.
    pluckFilterRef.current = new Tone.Filter(3200, 'lowpass');
    delayRef.current = new Tone.FeedbackDelay(0.25, 0.2);
    reverbRef.current = new Tone.Reverb({ decay: 1.5, wet: 0.35 });

    pluckSynthRef.current.connect(pluckFilterRef.current);
    pluckFilterRef.current.connect(delayRef.current);
    pluckFilterRef.current.connect(reverbRef.current);
    pluckFilterRef.current.toDestination();
    delayRef.current.toDestination();
    reverbRef.current.toDestination();

    // Subtle pick transient: short filtered noise burst, per note.
    noiseSynthRef.current = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.002, decay: 0.02, sustain: 0, release: 0.01 },
    });
    noiseFilterRef.current = new Tone.Filter(4000, 'highpass');
    noiseGainRef.current = new Tone.Gain(0.18);
    noiseSynthRef.current.connect(noiseFilterRef.current);
    noiseFilterRef.current.connect(noiseGainRef.current);
    noiseGainRef.current.toDestination();

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

  // Wet-Hands-style pluck: A-major pentatonic ascent, slow -> fast.
  const playVictoryChime = useCallback(() => {
    if (!pluckSynthRef.current) return;
    const synth = pluckSynthRef.current;
    const noise = noiseSynthRef.current;

    Tone.Transport.cancel(0);
    let at = 0;
    PLUCK_SCALE.forEach((note, i) => {
      const time = at;
      Tone.Transport.schedule((t) => {
        synth.triggerAttackRelease(note, PLUCK_DURATION, t);
        if (noise) noise.triggerAttackRelease(0.03, t);
      }, time);
      at += PLUCK_GAPS[i] ?? 0.4;
    });

    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.start();
    // Reset only after the last tail + reverb has rung out.
    window.setTimeout(() => {
      Tone.Transport.stop();
      Tone.Transport.cancel(0);
    }, PLUCK_STOP_MS);
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
