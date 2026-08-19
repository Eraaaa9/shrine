/**
 * The game's noises, synthesised rather than loaded.
 *
 * Four short cues do not justify shipping audio files — and this repo carries
 * no artwork or recordings on purpose — so they are built out of oscillators
 * and a noise burst at play time. Nothing is fetched, nothing is decoded, and
 * the whole thing costs a couple of hundred bytes in the bundle.
 */

export type Cue = 'dice' | 'coin' | 'lose' | 'build' | 'win';

let context: AudioContext | null = null;

/**
 * Browsers refuse to start an AudioContext outside a user gesture, so the first
 * one is created lazily and a context that is still suspended (a cue that fired
 * from a bot's turn before the player ever clicked) is nudged awake.
 */
function audio(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) {
    try {
      context = new Ctor();
    } catch {
      return null;
    }
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** One tone with a plucked envelope. `to` bends the pitch over the note. */
function tone(at: number, from: number, to: number, seconds: number, gain: number, type: OscillatorType): void {
  const ctx = context!;
  const osc = ctx.createOscillator();
  const level = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, at + seconds);
  // Ramping to a true zero is undefined for an exponential curve, hence the floor.
  level.gain.setValueAtTime(0.0001, at);
  level.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  level.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(level).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + seconds + 0.02);
}

/** A filtered noise burst — dice landing on a table. */
function rattle(at: number, seconds: number, gain: number): void {
  const ctx = context!;
  const frames = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    // Decaying white noise: loud at the throw, gone by the time it settles.
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1600;
  band.Q.value = 0.8;
  const level = ctx.createGain();
  level.gain.value = gain;
  source.connect(band).connect(level).connect(ctx.destination);
  source.start(at);
}

export function play(cue: Cue): void {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;

  switch (cue) {
    case 'dice':
      rattle(now, 0.26, 0.16);
      tone(now + 0.24, 320, 180, 0.09, 0.05, 'triangle');
      break;
    case 'coin':
      // Two quick rising notes: the sound of being paid.
      tone(now, 880, 880, 0.07, 0.06, 'triangle');
      tone(now + 0.055, 1320, 1320, 0.1, 0.05, 'triangle');
      break;
    case 'lose':
      tone(now, 400, 220, 0.16, 0.05, 'sine');
      break;
    case 'build':
      tone(now, 300, 300, 0.09, 0.07, 'square');
      tone(now + 0.07, 450, 600, 0.16, 0.05, 'triangle');
      break;
    case 'win': {
      const fanfare = [523.25, 659.25, 783.99, 1046.5];
      fanfare.forEach((note, i) => tone(now + i * 0.13, note, note, 0.3, 0.07, 'triangle'));
      break;
    }
  }
}
