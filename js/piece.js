// Draws a cat piece as one SVG: a jelly body traced from its cells, plus the
// face, tail and stamp decorations. Coordinates are in units of U per cell.

export const U = 100;
// Empty margin around the cells, in the same units. Lips, whiskers, squash and
// the drag lift all poke past the cells; keeping them inside the SVG's own box
// matters because Safari leaves smeared trails where a moving element paints
// outside its box.
export const PAD = 32;
const NS = 'http://www.w3.org/2000/svg';
const IMG = 'assets/img';

export const PALETTE = {
  orange: { light: '#FFC07A', fill: '#FEA342', deep: '#F78E2E', lip: '#E0702A', line: '#B5501C', stamp: '#E8772E' },
  blue: { light: '#A6E1FE', fill: '#6FC9FC', deep: '#55B8F5', lip: '#3C9BE0', line: '#1F6DB8', stamp: '#3E9FE4' },
  yellow: { light: '#FFEE94', fill: '#FEDC3F', deep: '#FBCB2A', lip: '#E9AE16', line: '#B97A0E', stamp: '#E8A91C' },
  pink: { light: '#FFC9D6', fill: '#FDA1B5', deep: '#FA8DA6', lip: '#E86E8E', line: '#C23E66', stamp: '#EB7896' },
  green: { light: '#C3EDA5', fill: '#98DA72', deep: '#85CF5E', lip: '#5FB343', line: '#2F7F2B', stamp: '#62B048' },
  lavender: { light: '#DFCCFE', fill: '#C2A0FB', deep: '#B08AF6', lip: '#9168E6', line: '#5E37B8', stamp: '#946CE6' },
};

// Sticker sizes in cell units, tuned so each sits comfortably on a cell.
const STICKER = { face: 108, sleeping: 104, tail: 86, paw: 80, yarn: 74, fish: 82, bell: 72 };

const key = (c, r) => `${c},${r}`;

export function rotateCells(cells, times) {
  let out = cells;
  for (let t = 0; t < ((times % 4) + 4) % 4; t++) {
    const h = Math.max(...out.map(([, r]) => r)) + 1;
    out = out.map(([c, r]) => [h - 1 - r, c]);
  }
  return out;
}

export function extent(cells) {
  return { w: Math.max(...cells.map(([c]) => c)) + 1, h: Math.max(...cells.map(([, r]) => r)) + 1 };
}

// Corners of the piece outline, walked clockwise (screen y points down).
function outline(cells) {
  const set = new Set(cells.map(([c, r]) => key(c, r)));
  const has = (c, r) => set.has(key(c, r));
  const next = new Map();
  for (const [c, r] of cells) {
    if (!has(c, r - 1)) next.set(key(c, r), [c + 1, r]);
    if (!has(c + 1, r)) next.set(key(c + 1, r), [c + 1, r + 1]);
    if (!has(c, r + 1)) next.set(key(c + 1, r + 1), [c, r + 1]);
    if (!has(c - 1, r)) next.set(key(c, r + 1), [c, r]);
  }
  const start = next.keys().next().value.split(',').map(Number);
  const points = [start];
  let p = next.get(key(...start));
  while (key(...p) !== key(...start)) {
    points.push(p);
    p = next.get(key(...p));
  }
  // Keep only the points where the outline turns.
  return points.filter((q, i) => {
    const a = points[(i - 1 + points.length) % points.length];
    const b = points[(i + 1) % points.length];
    return (q[0] - a[0]) * (b[1] - q[1]) - (q[1] - a[1]) * (b[0] - q[0]) !== 0;
  });
}

// Outline inset by `inset` units, with round convex and concave corners.
export function bodyPath(cells, inset = 4, rOut = 24, rIn = 12) {
  const pts = outline(cells);
  const n = pts.length;
  const corners = pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    const din = [Math.sign(p[0] - a[0]), Math.sign(p[1] - a[1])];
    const dout = [Math.sign(b[0] - p[0]), Math.sign(b[1] - p[1])];
    const convex = din[0] * dout[1] - din[1] * dout[0] > 0;
    // Inward normal of a clockwise edge is the direction turned right: (-dy, dx).
    const x = p[0] * U + inset * (-din[1] - dout[1]);
    const y = p[1] * U + inset * (din[0] + dout[0]);
    const r = convex ? rOut : rIn;
    return { a: [x - din[0] * r, y - din[1] * r], b: [x + dout[0] * r, y + dout[1] * r], r, convex };
  });
  const f = (v) => +v.toFixed(2);
  let d = `M${f(corners[n - 1].b[0])} ${f(corners[n - 1].b[1])}`;
  for (const c of corners) {
    d += `L${f(c.a[0])} ${f(c.a[1])}A${c.r} ${c.r} 0 0 ${c.convex ? 1 : 0} ${f(c.b[0])} ${f(c.b[1])}`;
  }
  return d + 'Z';
}

// Shared gradients, added once to the page.
export function installDefs() {
  if (document.getElementById('piece-defs')) return;
  const stops = Object.entries(PALETTE)
    .map(
      ([name, p]) => `<linearGradient id="jelly-${name}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.light}"/><stop offset=".45" stop-color="${p.fill}"/>
        <stop offset="1" stop-color="${p.deep}"/></linearGradient>`
    )
    .join('');
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<svg id="piece-defs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${stops}
      <linearGradient id="jelly-rim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/>
      </linearGradient></defs></svg>`
  );
}

export function createPieceSVG(id) {
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('piece');
  svg.dataset.id = id;
  return svg;
}

function image(href, cx, cy, size, extra = '') {
  return `<image href="${href}" x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" ${extra}/>`;
}

function stamp(kind, x, y, color) {
  if (kind === 'stripes') {
    return `<g stroke="${color}" stroke-width="8" stroke-linecap="round" fill="none" opacity=".5">
      <path d="M${x + 34} ${y + 14}q3 10 0 20"/><path d="M${x + 50} ${y + 12}q3 13 0 28"/><path d="M${x + 66} ${y + 14}q3 10 0 20"/></g>`;
  }
  const cx = x + 50;
  const cy = y + 58;
  return `<g fill="${color}" opacity=".45"><ellipse cx="${cx}" cy="${cy}" rx="15" ry="12"/>
    <circle cx="${cx - 17}" cy="${cy - 16}" r="6.5"/><circle cx="${cx - 6}" cy="${cy - 26}" r="6.5"/>
    <circle cx="${cx + 6}" cy="${cy - 26}" r="6.5"/><circle cx="${cx + 17}" cy="${cy - 16}" r="6.5"/></g>`;
}

// Tails lean away from the body; upright and centred they read as a "?".
function tailTransform(cells, i, cx, cy) {
  const [c, r] = cells[i];
  const set = new Set(cells.map(([a, b]) => key(a, b)));
  const out = set.has(key(c - 1, r)) ? 'right' : set.has(key(c + 1, r)) ? 'left' : set.has(key(c, r + 1)) ? 'up' : 'down';
  const mirror = `translate(${cx} 0) scale(-1 1) translate(${-cx} 0)`;
  if (out === 'left') return `rotate(-24 ${cx} ${cy})`;
  if (out === 'up') return `rotate(10 ${cx} ${cy}) ${mirror}`;
  return `rotate(24 ${cx} ${cy}) ${mirror}`;
}

// mood: 'idle' (in the tray) or 'happy' (placed on the board).
export function renderPiece(svg, piece, mood = 'idle') {
  const { cells, decor, color } = piece;
  const pal = PALETTE[color];
  const { w, h } = extent(cells);
  const set = new Set(cells.map(([c, r]) => key(c, r)));
  const d = bodyPath(cells);

  let seams = '';
  let gloss = '';
  let stamps = '';
  let stickers = '';
  cells.forEach(([c, r], i) => {
    const x = c * U;
    const y = r * U;
    if (set.has(key(c + 1, r))) seams += `<path d="M${x + U} ${y + 24}V${y + U - 24}"/>`;
    if (set.has(key(c, r + 1))) seams += `<path d="M${x + 24} ${y + U}H${x + U - 24}"/>`;
    if (!set.has(key(c, r - 1))) {
      gloss += `<rect x="${x + 15}" y="${y + 11}" width="26" height="9" rx="4.5" opacity=".85"/><circle cx="${x + 50}" cy="${y + 15.5}" r="4.5" opacity=".7"/>`;
    }
    const kind = decor[i];
    const cx = x + U / 2;
    const cy = y + U / 2;
    if (kind === 'stripes' || kind === 'paws') stamps += stamp(kind, x, y, pal.stamp);
    else if (kind === 'face') {
      if (piece.sleepy && mood === 'idle') {
        stickers += image(`${IMG}/sleeping/sleeping-${color}.webp`, cx, cy + 4, STICKER.sleeping, 'class="sleeper"');
        stickers += `<text class="zzz" x="${cx + 18}" y="${cy - 22}">z</text><text class="zzz late" x="${cx + 36}" y="${cy - 40}">z</text>`;
      } else {
        stickers += image(`${IMG}/faces/${mood === 'happy' ? 'happy' : 'idle'}-${color}.webp`, cx, cy - 2, STICKER.face, 'class="face"');
      }
    } else if (kind === 'tail') {
      stickers += image(`${IMG}/tails/tail-${color}.webp`, cx, cy, STICKER.tail, `transform="${tailTransform(cells, i, cx, cy)}"`);
    } else {
      stickers += image(`${IMG}/stickers/${kind}.webp`, cx, cy, STICKER[kind]);
    }
  });

  svg.setAttribute('viewBox', `${-PAD} ${-PAD} ${w * U + 2 * PAD} ${h * U + 2 * PAD}`);
  svg.dataset.w = w;
  svg.dataset.h = h;
  svg.innerHTML = `<path class="shadow" d="${d}" transform="translate(0 16)"/><g class="jelly">
    <path class="hit lip" d="${d}" transform="translate(0 7)" fill="${pal.lip}" stroke="${pal.line}" stroke-width="5" stroke-linejoin="round"/>
    <path class="hit body" d="${d}" fill="url(#jelly-${color})" stroke="${pal.line}" stroke-width="5" stroke-linejoin="round"/>
    <path d="${bodyPath(cells, 12, 16, 4)}" fill="none" stroke="url(#jelly-rim)" stroke-width="6"/>
    <g stroke="${pal.lip}" stroke-width="4" stroke-linecap="round" opacity=".55">${seams}</g>
    <g fill="#fff">${gloss}</g>${stamps}${stickers}</g>`;
}
