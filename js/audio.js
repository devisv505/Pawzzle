// Sound effects and music made with ElevenLabs (tools/generate_sounds.py). The
// effects load in the background; one that isn't ready yet is skipped.

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
  syncMusic();
}

// ---- music ----

// One long, quiet loop. It streams instead of being decoded up front, which
// would take tens of MB, and plays through a gain node because iOS ignores a
// media element's own volume.
const MUSIC_MAX = 0.5; // gain with the volume slider all the way up
let music = null;
let musicOn = true;
let musicVolume = 0.6;
const musicLevel = () => MUSIC_MAX * musicVolume;

export function setMusicEnabled(on) {
  musicOn = on;
  syncMusic();
}

export const isMusicEnabled = () => musicOn;

// 0 to 1, from the volume slider in settings.
export function setMusicVolume(volume) {
  musicVolume = volume;
  if (music && musicOn && !document.hidden) fadeMusic(musicLevel(), 0.1);
}

// Glide the music volume to `to` over `seconds`, from wherever it is now.
function fadeMusic(to, seconds) {
  const g = music.gain.gain;
  const t = ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(to, t + seconds);
}

// Plays while it's switched on and the tab is visible; fades in and out.
function syncMusic() {
  if (!ctx || (!music && !musicOn)) return;
  if (!music) {
    const el = new Audio(new URL('../assets/sounds/music.mp3', import.meta.url));
    el.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    ctx.createMediaElementSource(el).connect(gain).connect(ctx.destination);
    music = { el, gain, timer: 0 };
  }
  clearTimeout(music.timer);
  if (musicOn && !document.hidden) {
    music.el.play().catch(() => {});
    fadeMusic(musicLevel(), 1.5);
  } else {
    fadeMusic(0, 0.3);
    music.timer = setTimeout(() => music.el.pause(), 350);
  }
}
document.addEventListener('visibilitychange', syncMusic);

// Lowers the music for a moment, so the win jingle stands out.
function duckMusic(seconds) {
  if (!music || !musicOn || document.hidden) return;
  const low = musicLevel() * 0.3;
  fadeMusic(low, 0.2);
  const g = music.gain.gain;
  const t = ctx.currentTime;
  g.setValueAtTime(low, t + seconds);
  g.linearRampToValueAtTime(musicLevel(), t + seconds + 1.5);
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
    if (enabled) duckMusic(3);
    play('win', { volume: 0.65 });
    play('meow', { volume: 0.5, delay: 0.6 });
  },
};
