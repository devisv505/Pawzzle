// Screens, popups and saved progress around the game.
import { Game } from './game.js';
import { installDefs } from './piece.js';
import { levelName } from './level.js';
import { unlockAudio, setSoundEnabled, sfx } from './audio.js';
import { sparkles, reducedMotion } from './fx.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'pawzzle.v1';
const STAR = 'assets/img/icons/star.webp';
const STAR_EMPTY = 'assets/img/icons/star-empty.webp';
const WIN_TITLES = ['Purrfect!', 'Paw-some!', 'Meow-velous!', 'Clawsome!', 'Fur-tastic!'];

function readSave() {
  const fresh = { unlocked: 1, last: 1, best: {}, sound: true };
  try {
    return { ...fresh, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') };
  } catch {
    return fresh;
  }
}

const save = readSave();
function writeSave() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Private mode or storage disabled: progress just isn't kept.
  }
}

let current = Math.min(save.last, save.unlocked);

// Brand art is optional: if it is missing, the page falls back to text and cat faces.
document.querySelectorAll('img[data-optional]').forEach((img) => {
  const fail = () => {
    document.body.classList.add(img.dataset.optional);
    img.remove();
  };
  if (img.complete && !img.naturalWidth) fail();
  else img.addEventListener('error', fail);
});

installDefs();
setSoundEnabled(save.sound);

const game = new Game(
  {
    board: $('board'),
    boardWrap: $('board-wrap'),
    grid: $('grid'),
    tiles: $('tiles'),
    highlights: $('highlights'),
    pieces: $('pieces'),
    tray: $('tray'),
    dragLayer: $('drag-layer'),
    hand: $('hand'),
  },
  { onWin, onProgress, onIdle: (on) => $('btn-hint').classList.toggle('nudge', on) }
);

function bump(el) {
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function startLevel(n) {
  current = n;
  save.last = n;
  writeSave();
  $('level-num').textContent = n;
  bump($('level-num'));
  const name = $('level-name');
  name.textContent = levelName(n);
  name.classList.remove('enter');
  void name.offsetWidth;
  name.classList.add('enter');
  shownPct = 0;
  game.load(n);
}

// ---- progress and stars ----

let shownPct = 0;
let pctFrame = 0;
function onProgress(pct) {
  $('progress-fill').style.width = `${pct}%`;
  document.querySelector('.progress').setAttribute('aria-valuenow', pct);
  cancelAnimationFrame(pctFrame);
  const from = shownPct;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 400);
    shownPct = Math.round(from + (pct - from) * k);
    $('progress-text').textContent = `${shownPct}%`;
    if (k < 1) pctFrame = requestAnimationFrame(step);
  };
  pctFrame = requestAnimationFrame(step);
}

function showStarTotal(animate = false) {
  $('star-total').textContent = Object.values(save.best).reduce((a, b) => a + b, 0);
  if (animate) bump($('star-total'));
}

function onWin({ level, stars }) {
  save.best[level] = Math.max(save.best[level] ?? 0, stars);
  save.unlocked = Math.max(save.unlocked, level + 1);
  writeSave();
  $('win-title').textContent = WIN_TITLES[(level - 1) % WIN_TITLES.length];
  $('win-text').textContent = stars === 3 ? `Level ${level} complete!` : `Level ${level} complete! Solve it without hints for 3 stars.`;
  const imgs = [...$('win-stars').querySelectorAll('img')];
  imgs.forEach((img) => (img.src = STAR_EMPTY));
  openPopup('win');
  imgs.slice(0, stars).forEach((img, i) =>
    setTimeout(() => {
      img.src = STAR;
      sfx.star(i);
      if (!reducedMotion) {
        img.animate(
          [{ transform: 'scale(0) rotate(-45deg)' }, { transform: 'scale(1.3) rotate(10deg)', offset: 0.6 }, { transform: 'none' }],
          { duration: 450, easing: 'ease-out' }
        );
      }
      const r = img.getBoundingClientRect();
      sparkles(r.left + r.width / 2, r.top + r.height / 2, 3, r.width);
    }, 550 + i * 300)
  );
  setTimeout(() => showStarTotal(true), 650 + stars * 300);
}

// ---- popups ----

function openPopup(id) {
  const el = $(id);
  el.classList.remove('closing');
  el.hidden = false;
}

function closePopup(id) {
  const el = $(id);
  if (el.hidden) return Promise.resolve();
  el.classList.add('closing');
  return new Promise((done) =>
    setTimeout(() => {
      el.hidden = true;
      el.classList.remove('closing');
      done();
    }, 220)
  );
}

document.querySelectorAll('[data-close]').forEach((btn) =>
  btn.addEventListener('click', () => {
    sfx.click();
    closePopup(btn.closest('.overlay').id);
  })
);
for (const id of ['settings', 'levels']) {
  $(id).addEventListener('pointerdown', (e) => e.target === $(id) && closePopup(id));
}

function renderLevels() {
  const grid = $('level-grid');
  grid.innerHTML = '';
  for (let n = 1; n <= save.unlocked; n++) {
    const btn = document.createElement('button');
    btn.textContent = n;
    btn.className = n === current ? 'current' : '';
    const best = save.best[n] ?? 0;
    const mini = document.createElement('span');
    mini.className = 'mini';
    mini.innerHTML = [0, 1, 2].map((i) => `<img src="${i < best ? STAR : STAR_EMPTY}" alt="">`).join('');
    btn.append(mini);
    btn.setAttribute('aria-label', `Level ${n}, ${best} stars`);
    btn.addEventListener('click', () => {
      sfx.click();
      closePopup('levels');
      startLevel(n);
    });
    grid.append(btn);
  }
  requestAnimationFrame(() => grid.querySelector('.current')?.scrollIntoView({ block: 'center' }));
}

async function showLevels() {
  sfx.click();
  await closePopup('settings');
  renderLevels();
  openPopup('levels');
}

function showSound() {
  $('sound-icon').src = `assets/img/icons/${save.sound ? 'sound' : 'mute'}.webp`;
  $('sound-label').textContent = save.sound ? 'Sound on' : 'Sound off';
}

// ---- buttons ----

$('btn-play').addEventListener('click', () => {
  unlockAudio();
  sfx.click();
  closePopup('title');
  startLevel(current);
});

$('btn-next').addEventListener('click', async () => {
  sfx.click();
  await closePopup('win');
  startLevel(current + 1);
});

$('btn-replay').addEventListener('click', async () => {
  sfx.click();
  await closePopup('win');
  startLevel(current);
});

$('btn-hint').addEventListener('click', () => {
  if (!game.hint()) sfx.bad();
});

$('btn-settings').addEventListener('click', () => {
  sfx.click();
  const btn = $('btn-settings');
  btn.classList.remove('spin');
  void btn.offsetWidth;
  btn.classList.add('spin');
  showSound();
  openPopup('settings');
});

$('btn-sound').addEventListener('click', () => {
  save.sound = !save.sound;
  setSoundEnabled(save.sound);
  writeSave();
  showSound();
  sfx.click();
});

$('btn-restart').addEventListener('click', async () => {
  sfx.click();
  await closePopup('settings');
  startLevel(current);
});

$('btn-levels').addEventListener('click', showLevels);
$('btn-level').addEventListener('click', () => {
  renderLevels();
  sfx.click();
  openPopup('levels');
});

// ---- boot ----

showStarTotal();
$('title-level').textContent = current;
startLevel(current);
document.fonts?.ready.then(() => game.layout());

// Lets automated browser tests read the level state; inert for players.
if (new URLSearchParams(location.search).has('test')) window.pawzzle = { game, startLevel };
