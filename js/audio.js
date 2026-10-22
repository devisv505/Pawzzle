// Sound effects made with ElevenLabs (tools/generate_sounds.py). They load in
// the background; a sound that isn't ready yet is skipped.

const NAMES = ['click', 'pick', 'rotate', 'place', 'back', 'bad', 'hint', 'star', 'win', 'meow', 'purr'];
const buffers = {};
let ctx = null;
let enabled = true;

// Decoded with an offline context, which needs no user gesture, so the sounds
// are usually ready before the first tap. Decoded audio plays in any context.
function loadSounds() {
  let decoder;
  try {
    decoder = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100);
  } catch {
    return;
  }
  for (const name of NAMES) {
    fetch(new URL(`../assets/sounds/${name}.mp3`, import.meta.url))
      .then((res) => res.arrayBuffer())
      .then((data) => decoder.decodeAudioData(data))
      .then((buffer) => (buffers[name] = buffer))
      .catch(() => {});
  }
}
loadSounds();

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

// `rate` speeds the sound up and raises its pitch with it.
function play(name, { volume = 1, rate = 1, delay = 0, loop = false } = {}) {
  const buffer = buffers[name];
  if (!enabled || !ctx || !buffer) return null;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  src.loop = loop;
  src.playbackRate.value = rate;
  gain.gain.value = volume;
  src.connect(gain).connect(ctx.destination);
  src.start(ctx.currentTime + delay);
  return { src, gain };
}

// A slight random pitch, so sounds heard over and over don't feel canned.
const vary = (rate = 1) => rate * (0.96 + Math.random() * 0.08);

// ---- purring ----

let purr = null;

// Bigger cats purr a little deeper and slower.
export function startPurr(size = 3) {
  if (purr) return;
  purr = play('purr', { loop: true, rate: 1.1 - size * 0.04, volume: 0.0001 });
  if (!purr) return;
  const t = ctx.currentTime;
  purr.gain.gain.setValueAtTime(0.0001, t);
  purr.gain.gain.exponentialRampToValueAtTime(0.7, t + 0.3);
}

export function stopPurr() {
  if (!purr || !ctx) return;
  const { src, gain } = purr;
  purr = null;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  src.stop(t + 0.4);
}

export const sfx = {
  pick: () => play('pick', { volume: 0.45, rate: vary() }),
  rotate: () => play('rotate', { volume: 0.35, rate: vary() }),
  // Bigger pieces land a little lower.
  place: (size = 3) => play('place', { volume: 0.6, rate: vary(1.12 - size * 0.04) }),
  bad: () => play('bad', { volume: 0.45 }),
  back: () => play('back', { volume: 0.4, rate: vary() }),
  hint: () => play('hint', { volume: 0.6 }),
  click: () => play('click', { volume: 0.4, rate: vary() }),
  // Each star rings a step higher.
  star: (i) => play('star', { volume: 0.5, rate: [1, 1.25, 1.5][i] ?? 1 }),
  win: () => {
    play('win', { volume: 0.65 });
    play('meow', { volume: 0.5, delay: 0.6 });
  },
};
