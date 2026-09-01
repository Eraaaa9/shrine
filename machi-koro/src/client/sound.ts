/**
 * The game's noises, synthesized in real-time with Web Audio API.
 */

export type Cue =
  | 'dice'
  | 'dice2'
  | 'doubles'
  | 'coin'
  | 'lose'
  | 'steal'
  | 'build'
  | 'landmark'
  | 'event'
  | 'reaction'
  | 'win';

let context: AudioContext | null = null;

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

/** One tone with an envelope. `to` bends the pitch over the note. */
function tone(at: number, from: number, to: number, seconds: number, gain: number, type: OscillatorType): void {
  const ctx = context!;
  const osc = ctx.createOscillator();
  const level = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + seconds);
  level.gain.setValueAtTime(0.0001, at);
  level.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  level.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(level).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + seconds + 0.02);
}

/** Filtered noise burst for dice rattle. */
function rattle(at: number, seconds: number, gain: number, freq = 1600): void {
  const ctx = context!;
  const frames = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = freq;
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
      rattle(now, 0.24, 0.15, 1600);
      tone(now + 0.22, 340, 180, 0.08, 0.05, 'triangle');
      break;

    case 'dice2':
      rattle(now, 0.32, 0.18, 1400);
      tone(now + 0.22, 380, 200, 0.07, 0.05, 'triangle');
      tone(now + 0.29, 320, 170, 0.08, 0.05, 'triangle');
      break;

    case 'doubles':
      // Celebratory rolling trill
      tone(now, 523.25, 523.25, 0.08, 0.06, 'triangle');
      tone(now + 0.07, 659.25, 659.25, 0.08, 0.06, 'triangle');
      tone(now + 0.14, 783.99, 783.99, 0.08, 0.07, 'triangle');
      tone(now + 0.21, 1046.5, 1046.5, 0.18, 0.08, 'triangle');
      break;

    case 'coin':
      // Melodic metallic coin ping
      tone(now, 987.77, 987.77, 0.06, 0.06, 'sine');
      tone(now + 0.045, 1318.51, 1318.51, 0.09, 0.06, 'triangle');
      tone(now + 0.09, 1975.53, 1975.53, 0.14, 0.05, 'sine');
      break;

    case 'lose':
      tone(now, 380, 190, 0.2, 0.06, 'sine');
      break;

    case 'steal':
      // Dramatic extortion sound
      tone(now, 440, 330, 0.1, 0.07, 'sawtooth');
      tone(now + 0.08, 554.37, 440, 0.15, 0.06, 'triangle');
      break;

    case 'build':
      // Wood/paper snap placement
      tone(now, 260, 260, 0.06, 0.08, 'square');
      tone(now + 0.05, 523.25, 659.25, 0.15, 0.06, 'triangle');
      break;

    case 'landmark': {
      // Landmark completed fanfare
      const chord = [392.0, 523.25, 659.25, 783.99, 1046.5];
      chord.forEach((note, i) => {
        tone(now + i * 0.09, note, note, 0.25, 0.07, 'triangle');
      });
      break;
    }

    case 'event':
      // Town hall chime / gong
      tone(now, 587.33, 587.33, 0.4, 0.08, 'sine');
      tone(now + 0.03, 880, 880, 0.5, 0.06, 'triangle');
      tone(now + 0.2, 440, 440, 0.6, 0.07, 'sine');
      break;

    case 'reaction':
      // Cute bubble / pop sound
      tone(now, 400, 900, 0.08, 0.07, 'sine');
      tone(now + 0.04, 1200, 1600, 0.09, 0.06, 'triangle');
      break;

    case 'win': {
      const victory = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.5];
      const times = [0, 0.12, 0.24, 0.36, 0.5, 0.7];
      const lens = [0.1, 0.1, 0.1, 0.12, 0.18, 0.55];
      victory.forEach((note, i) => {
        tone(now + times[i], note, note, lens[i], 0.08, 'triangle');
      });
      break;
    }
  }
}
