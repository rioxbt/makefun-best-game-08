// All of the game's sound is synthesised here, from oscillators alone: no file, no library. The
// graph is built on the first real sound, because a browser only allows audio after a gesture.

let ctx = null;
let master = null;
let muted = false;

function graph() {
  if (ctx !== null) return ctx;
  const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (typeof Ctor !== 'function') return null;
  try {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.24;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

/** One voice: a shaped oscillator that starts and stops itself. */
function voice(type, from, to, seconds, gain, delay = 0) {
  const node = graph();
  if (node === null || muted) return;
  const at = node.currentTime + delay;
  const osc = node.createOscillator();
  const amp = node.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + seconds);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + seconds);
  osc.connect(amp).connect(master);
  osc.start(at);
  osc.stop(at + seconds + 0.02);
}

/** A short burst of noise, for a hit that should not sound like a note. */
function noise(seconds, gain, lowpass) {
  const node = graph();
  if (node === null || muted) return;
  const frames = Math.max(1, Math.floor(node.sampleRate * seconds));
  const buffer = node.createBuffer(1, frames, node.sampleRate);
  const data = buffer.getChannelData(0);
  let state = 12345;
  for (let i = 0; i < frames; i += 1) {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    data[i] = ((state / 0x3fffffff) - 1) * (1 - i / frames);
  }
  const src = node.createBufferSource();
  const filter = node.createBiquadFilter();
  const amp = node.createGain();
  src.buffer = buffer;
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  amp.gain.value = gain;
  src.connect(filter).connect(amp).connect(master);
  src.start();
}

export const sfx = {
  /** Wake the audio graph on the player's first interaction. */
  open() {
    const node = graph();
    if (node !== null && node.state === 'suspended') node.resume();
  },
  mute(on) {
    muted = on;
  },
  isMuted() {
    return muted;
  },
  shot() {
    voice('square', 880, 240, 0.06, 0.1);
  },
  dry() {
    voice('sawtooth', 150, 60, 0.12, 0.09);
  },
  bolt() {
    voice('square', 240, 120, 0.16, 0.07);
  },
  charge() {
    voice('sine', 300, 540, 0.3, 0.05);
  },
  kill() {
    noise(0.12, 0.16, 2600);
    voice('triangle', 520, 120, 0.14, 0.08);
  },
  hurt() {
    noise(0.2, 0.24, 700);
    voice('sawtooth', 220, 70, 0.24, 0.14);
  },
  ember() {
    voice('triangle', 660, 1320, 0.16, 0.11);
    voice('sine', 990, 1760, 0.14, 0.06, 0.04);
  },
  wave() {
    voice('triangle', 330, 330, 0.16, 0.09);
    voice('triangle', 495, 495, 0.18, 0.09, 0.13);
    voice('triangle', 660, 660, 0.24, 0.1, 0.26);
  },
  win() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((hz, i) => voice('triangle', hz, hz, 0.34, 0.12, i * 0.14));
  },
  lose() {
    const notes = [392, 311, 247, 165];
    notes.forEach((hz, i) => voice('sawtooth', hz, hz * 0.96, 0.4, 0.11, i * 0.16));
  },
};
