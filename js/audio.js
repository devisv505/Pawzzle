// Tiny synthesized sound effects, so the game ships without audio files.

let ctx = null;
let enabled = true;

export function setSoundEnabled(on) {
  enabled = on;
}

// Browsers only allow audio after a user gesture; call this from one.
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq, duration, { type = 'sine', volume = 0.12, delay = 0, slideTo = null } = {}) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export const sfx = {
  pick: () => tone(620, 0.09, { slideTo: 880, volume: 0.07 }),
  rotate: () => tone(900, 0.06, { type: 'triangle', volume: 0.06 }),
  place: (size = 3) => {
    tone(300 + size * 40, 0.12, { type: 'triangle', volume: 0.16, slideTo: 520 + size * 60 });
    tone(1200, 0.05, { volume: 0.04, delay: 0.05 });
  },
  bad: () => tone(220, 0.2, { type: 'square', volume: 0.04, slideTo: 140 }),
  back: () => tone(520, 0.08, { slideTo: 380, volume: 0.06 }),
  hint: () => [660, 880, 1100].forEach((f, i) => tone(f, 0.12, { volume: 0.07, delay: i * 0.07 })),
  click: () => tone(760, 0.05, { type: 'triangle', volume: 0.06 }),
  star: (i) => tone(880 + i * 220, 0.18, { type: 'triangle', volume: 0.1 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { type: 'triangle', volume: 0.13, delay: i * 0.11 })),
};
