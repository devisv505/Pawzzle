// Tiny synthesized sound effects, so the game ships without audio files.

let ctx = null;
let enabled = true;

export function setSoundEnabled(on) {
  enabled = on;
  if (!on) stopPurr();
}

export const isSoundEnabled = () => enabled;

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

// ---- purring ----

let noise = null;
let purr = null;

// Brown noise: a soft, low rumble rather than white-noise hiss.
function noiseBuffer(ac) {
  if (noise?.sampleRate === ac.sampleRate) return noise;
  noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = noise.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  return noise;
}

// A purr is a low rumble pulsed ~25 times a second that swells with each breath.
// `rate` is pulses per second; `tone` is the low-pass cutoff (bigger cat, lower).
// Takes the context as a parameter so it can also be rendered offline.
export function buildPurr(ac, dest, { rate = 25, tone = 320, volume = 0.65 } = {}) {
  const t = ac.currentTime;
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(volume, t + 0.3);

  const rumble = ac.createBufferSource();
  rumble.buffer = noiseBuffer(ac);
  rumble.loop = true;
  const buzz = ac.createOscillator();
  buzz.type = 'sawtooth';
  buzz.frequency.value = rate * 2;
  const buzzLevel = ac.createGain();
  buzzLevel.gain.value = 0.18;
  const lowpass = ac.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = tone;
  lowpass.Q.value = 0.9;

  // Chop the rumble into pulses at the purr rate.
  const chop = ac.createGain();
  chop.gain.value = 0.5;
  const pulse = ac.createOscillator();
  pulse.type = 'triangle';
  pulse.frequency.value = rate;
  const pulseDepth = ac.createGain();
  pulseDepth.gain.value = 0.5;
  pulse.connect(pulseDepth).connect(chop.gain);

  // Breathing: louder and slightly faster on the out-breath.
  const swell = ac.createGain();
  swell.gain.value = 0.8;
  const breath = ac.createOscillator();
  breath.frequency.value = 0.55;
  const breathDepth = ac.createGain();
  breathDepth.gain.value = 0.2;
  const breathRate = ac.createGain();
  breathRate.gain.value = 2;
  breath.connect(breathDepth).connect(swell.gain);
  breath.connect(breathRate).connect(pulse.frequency);

  rumble.connect(lowpass);
  buzz.connect(buzzLevel).connect(lowpass);
  lowpass.connect(chop).connect(swell).connect(out).connect(dest);
  const sources = [rumble, buzz, pulse, breath];
  sources.forEach((s) => s.start(t));
  return { out, sources };
}

export function startPurr(options) {
  if (!enabled || !ctx || purr) return;
  purr = buildPurr(ctx, ctx.destination, options);
}

export function stopPurr() {
  if (!purr || !ctx) return;
  const { out, sources } = purr;
  purr = null;
  const t = ctx.currentTime;
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  sources.forEach((s) => s.stop(t + 0.4));
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
