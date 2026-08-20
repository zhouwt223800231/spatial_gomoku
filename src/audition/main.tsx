import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import * as Tone from 'tone';
import '../index.css';

type VoiceName = 'A' | 'B' | 'C' | 'D';

interface VoiceDef {
  name: VoiceName;
  title: string;
  desc: string;
}

const VOICES: VoiceDef[] = [
  { name: 'A', title: 'Metal Pluck', desc: 'MetalSynth: bright metallic tine, crisp' },
  { name: 'B', title: 'Dual Harmonic', desc: 'fundamental + 3x harmonic + pick noise, closest to kalimba' },
  { name: 'C', title: 'Pluck', desc: 'PluckSynth: plucked-string feel, natural decay' },
  { name: 'D', title: 'FM Bell (reference)', desc: 'FMSynth: brighter, more bell-like (comparison)' },
];

const KEY_NOTES = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'];
const ARP_NOTES = ['C5', 'E5', 'G5', 'C6'];

class KalimbaEngine {
  reverb = new Tone.Reverb({ decay: 1.0, wet: 0.2 });
  voice: VoiceName = 'B';
  synthA?: Tone.MetalSynth;
  synthB?: { fund: Tone.Synth; harm: Tone.Synth; noise: Tone.NoiseSynth; gain: Tone.Gain };
  synthC?: Tone.PluckSynth;
  synthD?: Tone.FMSynth;
  master = new Tone.Gain(0.6);
  decay = 1.2;

  constructor() {
    this.reverb.connect(this.master);
    this.master.toDestination();
  }

  build(voice: VoiceName, decay: number) {
    this.voice = voice;
    this.decay = decay;
    this.disposeVoices();
    if (voice === 'A') {
      this.synthA = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay, release: decay },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        volume: -6,
      });
      this.synthA.connect(this.reverb);
    } else if (voice === 'B') {
      this.synthB = {
        fund: new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.002, decay, sustain: 0, release: decay * 0.8 },
        }),
        harm: new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.002, decay: decay * 0.7, sustain: 0, release: decay * 0.6 },
        }),
        noise: new Tone.NoiseSynth({
          noise: { type: 'pink' },
          envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 },
        }),
        gain: new Tone.Gain(0.5),
      };
      this.synthB.fund.volume.value = -4;
      this.synthB.harm.volume.value = -14;
      this.synthB.fund.connect(this.reverb);
      this.synthB.harm.connect(this.reverb);
      this.synthB.noise.connect(this.synthB.gain);
      this.synthB.gain.connect(this.reverb);
    } else if (voice === 'C') {
      this.synthC = new Tone.PluckSynth({
        attackNoise: 2,
        dampening: 6000,
        resonance: 0.98,
        release: decay,
        volume: -8,
      });
      this.synthC.connect(this.reverb);
    } else {
      this.synthD = new Tone.FMSynth({
        harmonicity: 4,
        modulationIndex: 8,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: decay * 1.2, sustain: 0, release: decay * 1.2 },
        modulation: { type: 'sine' },
        volume: -6,
      });
      this.synthD.connect(this.reverb);
    }
  }

  play(note: string) {
    switch (this.voice) {
      case 'A':
        this.synthA?.triggerAttackRelease(note, this.decay);
        break;
      case 'B':
        this.synthB?.fund.triggerAttackRelease(note, this.decay);
        this.synthB?.harm.triggerAttackRelease(Tone.Frequency(note).transpose(19).toNote(), this.decay);
        this.synthB?.noise.triggerAttackRelease(0.03);
        break;
      case 'C':
        this.synthC?.triggerAttackRelease(note, this.decay);
        break;
      default:
        this.synthD?.triggerAttackRelease(note, this.decay);
    }
  }

  disposeVoices() {
    this.synthA?.dispose();
    this.synthB?.fund.dispose();
    this.synthB?.harm.dispose();
    this.synthB?.noise.dispose();
    this.synthB?.gain.dispose();
    this.synthC?.dispose();
    this.synthD?.dispose();
    this.synthA = undefined;
    this.synthB = undefined;
    this.synthC = undefined;
    this.synthD = undefined;
  }
}

function Audition() {
  const [started, setStarted] = useState(false);
  const [voice, setVoice] = useState<VoiceName>('B');
  const [decay, setDecay] = useState(1.2);
  const [volume, setVolume] = useState(0.6);
  const engineRef = useRef<KalimbaEngine | null>(null);
  if (!engineRef.current) engineRef.current = new KalimbaEngine();
  const engine = engineRef.current;

  const start = useCallback(async () => {
    await Tone.start();
    engine.build('B', 1.2);
    setStarted(true);
  }, [engine]);

  useEffect(() => {
    if (!started) return;
    engine.build(voice, decay);
  }, [voice, decay, started, engine]);

  useEffect(() => {
    engine.master.gain.value = volume;
  }, [volume, engine]);

  const playNote = useCallback((note: string) => {
    engine.play(note);
  }, [engine]);

  const playArp = useCallback((notes: string[]) => {
    notes.forEach((n, i) => {
      setTimeout(() => engine.play(n), 250 * i);
    });
  }, [engine]);

  const selected = VOICES.find((v) => v.name === voice)!;

  return (
    <div className="min-h-screen w-full space-bg text-white p-6 flex flex-col items-center">
      <h1 className="font-display text-3xl font-light tracking-widest mb-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-violet-300">
        Kalimba Voice Audition
      </h1>
      <p className="text-white/40 text-sm mb-6">Click start, pick a voice, play keys - natural decay</p>

      {!started ? (
        <button onClick={start} className="glass-button--primary px-8 py-3 text-lg">Start Audio</button>
      ) : (
        <div className="w-full max-w-3xl space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VOICES.map((v) => (
              <div
                key={v.name}
                className={`glass-panel p-4 cursor-pointer transition-all ${voice === v.name ? 'ring-2 ring-cyan-300/60 shadow-glow' : 'hover:bg-white/10'}`}
                onClick={() => setVoice(v.name)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display text-sm">{v.title}</span>
                  <span className="mono-num text-cyan-200/80">{v.name}</span>
                </div>
                <p className="text-white/50 text-xs mb-2">{v.desc}</p>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); playArp(ARP_NOTES); }} className="glass-button px-3 py-1 text-xs">
                    Arpeggio
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); playNote('A5'); }} className="glass-button px-3 py-1 text-xs">
                    Single
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-panel p-4">
            <h2 className="panel-label mb-3">Keyboard</h2>
            <div className="flex flex-wrap gap-1.5">
              {KEY_NOTES.map((n) => (
                <button key={n} onClick={() => playNote(n)} className="glass-button mono-num px-2 py-1.5 text-xs min-w-[38px]">
                  {n.replace('4', '').replace('5', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel p-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/40">Decay / Release</span>
                <span className="mono-num text-white/70">{decay.toFixed(1)}s</span>
              </div>
              <input type="range" min={0.3} max={3} step={0.1} value={decay} onChange={(e) => setDecay(parseFloat(e.target.value))} className="w-full accent-cyan-400" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/40">Volume</span>
                <span className="mono-num text-white/70">{Math.round(volume * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full accent-cyan-400" />
            </div>
          </div>

          <div className="text-center text-white/50 text-sm">
            Current: <span className="text-cyan-200">{selected.title}</span>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Audition />
  </React.StrictMode>
);
