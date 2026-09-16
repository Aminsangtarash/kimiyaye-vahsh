/** Lightweight procedural SFX (no external audio files required). */

let sharedCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

function tone(
  audio: AudioContext,
  {
    type = "sawtooth",
    freq,
    freqEnd,
    start,
    dur,
    gain = 0.08,
    filterFreq = 900,
  }: {
    type?: OscillatorType;
    freq: number;
    freqEnd?: number;
    start: number;
    dur: number;
    gain?: number;
    filterFreq?: number;
  },
) {
  const osc = audio.createOscillator();
  const g = audio.createGain();
  const f = audio.createBiquadFilter();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), start + dur);
  f.type = "lowpass";
  f.frequency.value = filterFreq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(f);
  f.connect(g);
  g.connect(audio.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** Pack-leader / hunter-realm change cue. */
export function playHunterRoar() {
  const audio = ctx();
  if (!audio) return;
  void audio.resume();
  const t = audio.currentTime;
  tone(audio, { type: "sawtooth", freq: 180, freqEnd: 70, start: t, dur: 0.55, gain: 0.11, filterFreq: 500 });
  tone(audio, { type: "triangle", freq: 90, freqEnd: 45, start: t + 0.05, dur: 0.7, gain: 0.09, filterFreq: 300 });
  tone(audio, { type: "square", freq: 240, freqEnd: 110, start: t + 0.08, dur: 0.35, gain: 0.04, filterFreq: 700 });
}

export function playCardWhoosh() {
  const audio = ctx();
  if (!audio) return;
  void audio.resume();
  const t = audio.currentTime;
  tone(audio, { type: "triangle", freq: 520, freqEnd: 180, start: t, dur: 0.18, gain: 0.045, filterFreq: 1400 });
}

export function playDealTick() {
  const audio = ctx();
  if (!audio) return;
  void audio.resume();
  const t = audio.currentTime;
  tone(audio, { type: "sine", freq: 660, freqEnd: 420, start: t, dur: 0.07, gain: 0.03, filterFreq: 1800 });
}
