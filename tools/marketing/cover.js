// Store cover art, drawn with the game's own board and cats: the board of
// level 14 with one cat still floating above its spot. tools/make_marketing.mjs
// screenshots it at each cover size, picked with ?layout=landscape|portrait|square.
import { generateLevel } from '../../js/level.js';
import { installDefs, createPieceSVG, renderPiece, extent, PAD, U } from '../../js/piece.js';

const LEVEL = 14;
const FLOATING = 0; // id of the cat that hasn't landed yet: the pink one in the top-right corner
const PAD_CELLS = PAD / U;
const LEAVES = 'assets/img/decor/leaves';

// Centres and sizes in pixels, rotations in degrees. The floating cat's
// offset is in cells. Leaves: [image, x, y, width, rotation].
const LAYOUTS = {
  landscape: {
    size: [1920, 1080],
    glow: { at: [590, 540], d: 1150 },
    logo: { at: [590, 440], font: 200, rot: -4 },
    cats: { at: [590, 670], w: 470 },
    board: { at: [1350, 600], cell: 108, rot: -3 },
    float: [0.3, -1, 9],
    leaves: [[`${LEAVES}-b.webp`, 95, 985, 330, 8], [`${LEAVES}-a.webp`, 1840, 95, 300, 160], [`${LEAVES}-fern.webp`, 1825, 990, 320, -6]],
  },
  portrait: {
    size: [800, 1200],
    glow: { at: [400, 250], d: 900 },
    logo: { at: [400, 160], font: 150, rot: -4 },
    cats: { at: [400, 310], w: 330 },
    board: { at: [400, 815], cell: 96, rot: -2 },
    float: [0, -0.85, 8],
    leaves: [[`${LEAVES}-b.webp`, 40, 1150, 250, 8], [`${LEAVES}-fern.webp`, 760, 1150, 250, -6]],
  },
  square: {
    size: [800, 800],
    glow: { at: [400, 120], d: 720 },
    logo: { at: [400, 100], font: 124, rot: -4 },
    board: { at: [400, 485], cell: 80, rot: -2 },
    float: [0.1, -0.6, 8],
    leaves: [[`${LEAVES}-b.webp`, 30, 760, 210, 8], [`${LEAVES}-fern.webp`, 770, 765, 210, -6]],
  },
};

const layout = LAYOUTS[new URLSearchParams(location.search).get('layout')] ?? LAYOUTS.landscape;
const $ = (sel) => document.querySelector(sel);

function place(el, [x, y], rot = 0) {
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.setProperty('--rot', `${rot}deg`);
}

const [w, h] = layout.size;
document.body.style.width = `${w}px`;
document.body.style.height = `${h}px`;

const glow = $('.glow');
place(glow, layout.glow.at);
glow.style.width = glow.style.height = `${layout.glow.d}px`;

const logo = $('.logo-text');
place(logo, layout.logo.at, layout.logo.rot);
logo.style.fontSize = `${layout.logo.font}px`;
logo.style.webkitTextStroke = `${layout.logo.font * 0.11}px var(--brown)`;
logo.style.textShadow = `0 ${layout.logo.font * 0.09}px 0 var(--brown)`;

const cats = $('.cats-row');
cats.hidden = !layout.cats;
if (layout.cats) {
  place(cats, layout.cats.at);
  cats.style.width = `${layout.cats.w}px`;
}

// Leaves go first in the page, so everything else sits on top of them.
for (const [src, x, y, width, rot] of layout.leaves) {
  const leaf = Object.assign(document.createElement('img'), { src, alt: '', className: 'decor' });
  leaf.style.width = `${width}px`;
  place(leaf, [x, y], rot);
  document.body.prepend(leaf);
}

// The board, built the way js/game.js builds it.
installDefs();
const lvl = generateLevel(LEVEL);
const { cell } = layout.board;
const grid = $('#grid');
grid.style.setProperty('--cols', lvl.cols);
grid.style.setProperty('--rows', lvl.rows);
grid.style.setProperty('--cell', `${cell}px`);
$('.board').style.setProperty('--cell', `${cell}px`);
place($('.stage'), layout.board.at, layout.board.rot);

lvl.grid.forEach((row, r) =>
  row.forEach((type, c) => {
    const tile = document.createElement('div');
    const paw = type === 'play' && (c * 7 + r * 3 + LEVEL) % 5 === 0;
    tile.className = `tile tile-${paw ? 'paw' : type}`;
    tile.style.gridArea = `${r + 1} / ${c + 1}`;
    $('#tiles').append(tile);
  })
);

for (const def of lvl.pieces) {
  const floating = def.id === FLOATING;
  // The floating cat is wide awake, looking for its spot.
  const p = { ...def, sleepy: def.sleepy && !floating };
  const svg = createPieceSVG(p.id);
  renderPiece(svg, p, floating ? 'idle' : 'happy');
  const { w: pw, h: ph } = extent(p.cells);
  svg.style.width = `${(pw + 2 * PAD_CELLS) * cell}px`;
  svg.style.height = `${(ph + 2 * PAD_CELLS) * cell}px`;
  svg.style.left = `${(p.solution.c - PAD_CELLS) * cell}px`;
  svg.style.top = `${(p.solution.r - PAD_CELLS) * cell}px`;
  if (floating) {
    // Lifted off its spot like a cat being dragged in, with its drop shadow.
    svg.classList.add('dragging', 'floating');
    const [dx, dy, rot] = layout.float;
    svg.style.transform = `translate(${dx * cell}px, ${dy * cell}px) rotate(${rot}deg)`;
  }
  $('#pieces').append(svg);
}

// Ready for the screenshot once the font and every sprite have loaded.
const sprites = [...document.querySelectorAll('img, image')].map((el) => el.getAttribute('src') ?? el.getAttribute('href'));
await document.fonts.load('700 100px Fredoka');
await Promise.all(sprites.map((src) => Object.assign(new Image(), { src }).decode().catch(() => {})));
document.body.dataset.ready = '1';
