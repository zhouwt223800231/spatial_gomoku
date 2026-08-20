import { useCallback, useRef } from 'react';
import { Position } from '../types';

// Tone.js is loaded lazily on the first user gesture so the initial JS bundle
// stays small (it is split into its own chunk by vite.config.ts manualChunks).
type ToneModule = typeof import('tone');
let toneNS: ToneModule | null = null;

// --- Kalimba (Dual Harmonic) constants ---
// A-major pentatonic, two octaves (A3..A5): distance from board center -> pitch.
const PENTA = ['A3', 'B3', 'C#4', 'E4', 'F#4', 'A4', 'B4', 'C#5', 'E5', 'F#5', 'A5'];
const PLUCK_GAPS = [0.55, 0.45, 0.36, 0.28]; // slow -> fast
const PLUCK_STOP_MS = 3500;                   // let the last tail + reverb decay

// Placement tones: A-major chord tones (R-3-5 across three octaves), non-pentatonic.
const CHORD_TONES = ['A3', 'C#4', 'E4', 'A4', 'C#5', 'E5', 'A5'];

// Decay per use (natural kalimba decay, no hard cut).
const PLACE_DECAY = 0.8;
const VICTORY_DECAY = 1.4;
const WINCHORD_DECAY = 1.2;
const ALERT_DECAY = 0.4;

// Map a stone's grid position to an A-major pentatonic pitch based on its
// Euclidean distance from the board center: center = lowest, corners = highest.
const distancePitch = (pos: Position, boardSize: number): string => {
  const c = (boardSize - 1) / 2;
  const d = Math.hypot(pos.x - c, pos.y - c, pos.z - c);
  const dMax = Math.hypot(c, c, c); // center -> farthest corner
  const t = dMax > 0 ? d / dMax : 0;
  const index = Math.round(t * (PENTA.length - 1));
  return PENTA[Math.max(0, Math.min(PENTA.length - 1, index))];
};

/**
 * Dual-harmonic kalimba voice (audition preset B):
 * fundamental sine + ~3x harmonic sine + pink pick-noise transient,
 * through a light reverb so the tail rings out naturally.
 * The Tone namespace is injected so this module never imports Tone eagerly.
 */
class KalimbaVoice {
  readonly fund: InstanceType<ToneModule['Synth']>;
  readonly harm: InstanceType<ToneModule['Synth']>;
  readonly noise: InstanceType<ToneModule['NoiseSynth']>;
  readonly noiseGain: InstanceType<ToneModule['Gain']>;
  readonly reverb: InstanceType<ToneModule['Reverb']>;
  readonly master: InstanceType<ToneModule['Gain']>;
  private readonly tone: ToneModule;

  constructor(tone: ToneModule) {
    this.tone = tone;
    this.fund = new tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 1.2, sustain: 0, release: 0.96 },
    });
    this.fund.volume.value = -4;

    this.harm = new tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.84, sustain: 0, release: 0.72 },
    });
    this.harm.volume.value = -14;

    this.noise = new tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
    });
    this.noiseGain = new tone.Gain(0.5);

    this.reverb = new tone.Reverb({ decay: 1.0, wet: 0.2 });
    this.master = new tone.Gain(0.6);

    this.fund.connect(this.reverb);
    this.harm.connect(this.reverb);
    this.noise.connect(this.noiseGain);
    this.noiseGain.connect(this.reverb);
    this.reverb.connect(this.master);
    this.master.toDestination();
  }

  /** Set per-use decay: update both envelopes (kept as relative ratios). */
  setDecay(decay: number) {
    this.fund.set({ envelope: { attack: 0.002, decay, sustain: 0, release: decay * 0.8 } });
    this.harm.set({ envelope: { attack: 0.002, decay: decay * 0.7, sustain: 0, release: decay * 0.6 } });
  }

  /** Trigger one kalimba note (fundamental + harmonic + pick transient). */
  play(note: string, decay: number, time?: number) {
    const t = time ?? this.tone.now();
    this.setDecay(decay);
    this.fund.triggerAttackRelease(note, decay, t);
    this.harm.triggerAttackRelease(this.tone.Frequency(note).transpose(19).toNote(), decay, t);
    this.noise.triggerAttackRelease(0.03, t);
  }

  dispose() {
    this.fund.dispose();
    this.harm.dispose();
    this.noise.dispose();
    this.noiseGain.dispose();
    this.reverb.dispose();
    this.master.dispose();
  }
}

export function useAudio() {
  const placeKalimbaRef = useRef<KalimbaVoice | null>(null);
  const winKalimbaRef = useRef<KalimbaVoice | null>(null);
  const initialized = useRef(false);

  const init = useCallback(async () => {
    if (initialized.current) return;
    if (!toneNS) {
      toneNS = await import('tone');
    }
    await toneNS.start();
    placeKalimbaRef.current = new KalimbaVoice(toneNS);
    winKalimbaRef.current = new KalimbaVoice(toneNS);
    initialized.current = true;
  }, []);

  const playPlaceSound = useCallback((pos: Position, boardSize: number) => {
    const v = placeKalimbaRef.current;
    if (!v) return;
    const c = (boardSize - 1) / 2;
    const d = Math.hypot(pos.x - c, pos.y - c, pos.z - c);
    const dMax = Math.hypot(c, c, c);
    const t = dMax > 0 ? d / dMax : 0;
    const index = Math.round(t * (CHORD_TONES.length - 1));
    const note = CHORD_TONES[Math.max(0, Math.min(CHORD_TONES.length - 1, index))];
    v.play(note, PLACE_DECAY);
  }, []);

  const playWinSound = useCallback(() => {
    const v = winKalimbaRef.current;
    if (!v) return;
    ['C4', 'E4', 'G4', 'C5'].forEach((note) => v.play(note, WINCHORD_DECAY));
  }, []);

  // Victory kalimba: one note per winning stone, pitch derived from each stone's
  // distance to the board center, played in visual order with slow-to-fast rhythm.
  const playVictoryChime = useCallback((positions: Position[], boardSize: number) => {
    const v = winKalimbaRef.current;
    if (!v || !toneNS) return;
    const tone = toneNS;
    const scale = positions.map((p) => distancePitch(p, boardSize));

    tone.Transport.cancel(0);
    let at = 0;
    scale.forEach((note, i) => {
      const time = at;
      tone.Transport.schedule((t) => {
        v.play(note, VICTORY_DECAY, t);
      }, time);
      at += PLUCK_GAPS[i] ?? 0.4;
    });

    tone.Transport.stop();
    tone.Transport.position = 0;
    tone.Transport.start();
    // Reset only after the last tail + reverb has rung out.
    window.setTimeout(() => {
      if (!toneNS) return;
      tone.Transport.stop();
      tone.Transport.cancel(0);
    }, PLUCK_STOP_MS);
  }, []);

  const cancelVictoryChime = useCallback(() => {
    if (!toneNS) return;
    const tone = toneNS;
    tone.Transport.cancel(0);
    tone.Transport.stop();
    tone.Transport.position = 0;
  }, []);

  const playAlertSound = useCallback(() => {
    const v = placeKalimbaRef.current;
    if (!v) return;
    v.play('A3', ALERT_DECAY);
  }, []);

  return { init, playPlaceSound, playWinSound, playVictoryChime, cancelVictoryChime, playAlertSound };
}
