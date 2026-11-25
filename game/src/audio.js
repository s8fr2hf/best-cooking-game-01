// Tiny WebAudio synth: sizzle, ding, pop and buzz, no audio assets.
let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

function audio() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, dur, type, vol, when = 0) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  click() { tone(660, 0.06, 'triangle', 0.08); },
  pickup() { tone(520, 0.07, 'sine', 0.1); tone(780, 0.07, 'sine', 0.08, 0.05); },
  sizzle() { tone(180, 0.25, 'sawtooth', 0.04); tone(240, 0.2, 'sawtooth', 0.03, 0.05); },
  ding() { tone(880, 0.18, 'sine', 0.12); tone(1320, 0.3, 'sine', 0.1, 0.09); },
  coin() { tone(988, 0.08, 'square', 0.06); tone(1319, 0.16, 'square', 0.06, 0.07); },
  bad() { tone(160, 0.22, 'sawtooth', 0.09); },
  burn() { tone(110, 0.4, 'sawtooth', 0.1); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, i * 0.11)); },
};
