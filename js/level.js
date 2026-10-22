// Level generator. A level is made by cutting the board into cat pieces, so the
// cut itself is a solution and every level is solvable. The level number seeds
// the random generator, so level N is the same puzzle on every device.

export const COLORS = ['orange', 'blue', 'yellow', 'pink', 'green', 'lavender'];

const NAMES = [
  'Meow Meadow', 'Purrfect Park', 'Whisker Woods', 'Catnip Cove', 'Tuna Terrace',
  'Yarn Valley', 'Paw Print Pier', 'Snooze Street', 'Fluffy Fields', 'Mitten Market',
  'Kitty Kitchen', 'Sunny Sill', 'Boxy Bay', 'Tabby Town', 'Velvet Vale',
  'Calico Canyon', 'Biscuit Bakery', 'Napping Nook', 'Pounce Plaza', 'Moonlit Mews',
];

export function levelName(n) {
  return NAMES[(n - 1) % NAMES.length];
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Difficulty curve. Pieces stay at 6 cells or fewer, which also rules out
// pieces with holes or corner-only joins (those need 7+ cells).
export function levelConfig(n) {
  if (n <= 1) return { cols: 4, rows: 4, minSize: 2, maxSize: 4, obstacles: 0, voids: 0, rotate: false };
  if (n <= 2) return { cols: 4, rows: 4, minSize: 3, maxSize: 4, obstacles: 0, voids: 0, rotate: false };
  if (n <= 3) return { cols: 5, rows: 5, minSize: 3, maxSize: 5, obstacles: 0, voids: 0, rotate: true };
  if (n <= 6) return { cols: 5, rows: 5, minSize: 3, maxSize: 5, obstacles: 1, voids: 0, rotate: true };
  if (n <= 12) return { cols: 6, rows: 6, minSize: 3, maxSize: 5, obstacles: 2, voids: 0, rotate: true };
  if (n <= 20) return { cols: 6, rows: 6, minSize: 4, maxSize: 5, obstacles: 2, voids: 2, rotate: true };
  return { cols: 6, rows: 6, minSize: 4, maxSize: 6, obstacles: 3, voids: 3, rotate: true };
}

const key = (c, r) => `${c},${r}`;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function pick(list, rnd) {
  return list[Math.floor(rnd() * list.length)];
}

function shuffle(list, rnd) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Lowest score wins; the random term breaks ties so shapes vary.
function pickMin(list, score) {
  let best = null;
  let bestScore = Infinity;
  for (const item of list) {
    const s = score(item);
    if (s < bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return best;
}

function isConnected(cells) {
  if (cells.length === 0) return true;
  const set = new Set(cells.map(([c, r]) => key(c, r)));
  const seen = new Set([key(...cells[0])]);
  const stack = [cells[0]];
  while (stack.length) {
    const [c, r] = stack.pop();
    for (const [dc, dr] of DIRS) {
      const k = key(c + dc, r + dr);
      if (set.has(k) && !seen.has(k)) {
        seen.add(k);
        stack.push([c + dc, r + dr]);
      }
    }
  }
  return seen.size === cells.length;
}

// Grid of 'play' | 'box' | 'plant' | 'void'. Voids carve the outline from the
// edges; obstacles sit inside. The playable area must stay in one piece.
function makeGrid(cfg, rnd) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const grid = Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill('play'));
    const border = [];
    const inner = [];
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        const edge = r === 0 || c === 0 || r === cfg.rows - 1 || c === cfg.cols - 1;
        (edge ? border : inner).push([c, r]);
      }
    }
    shuffle(border, rnd).slice(0, cfg.voids).forEach(([c, r]) => (grid[r][c] = 'void'));
    shuffle(inner, rnd).slice(0, cfg.obstacles).forEach(([c, r]) => (grid[r][c] = rnd() < 0.5 ? 'box' : 'plant'));
    const play = [];
    grid.forEach((row, r) => row.forEach((t, c) => t === 'play' && play.push([c, r])));
    if (isConnected(play)) return { grid, play };
  }
  throw new Error('could not build a connected board');
}

// Grow pieces one at a time from the most cornered free cell, always extending
// into the most cornered neighbour, so few cells get stranded.
function cut(play, cfg, rnd) {
  const free = new Set(play.map(([c, r]) => key(c, r)));
  const freeNeighbours = ([c, r]) => DIRS.filter(([dc, dr]) => free.has(key(c + dc, r + dr))).length;
  const pieces = [];
  while (free.size) {
    const cells = [...free].map((k) => k.split(',').map(Number));
    const seed = pickMin(cells, (cell) => freeNeighbours(cell) + rnd() * 0.9);
    const target = cfg.minSize + Math.floor(rnd() * (cfg.maxSize - cfg.minSize + 1));
    const region = [seed];
    free.delete(key(...seed));
    while (region.length < target) {
      const frontier = new Map();
      for (const [c, r] of region) {
        for (const [dc, dr] of DIRS) {
          const k = key(c + dc, r + dr);
          if (free.has(k)) frontier.set(k, [c + dc, r + dr]);
        }
      }
      if (!frontier.size) break;
      const next = pickMin([...frontier.values()], (cell) => freeNeighbours(cell) + rnd() * 1.6);
      region.push(next);
      free.delete(key(...next));
    }
    pieces.push(region);
  }
  return pieces;
}

// Fold undersized pieces into a neighbour when the result still fits maxSize.
function mergeSmall(pieces, cfg) {
  let merged = true;
  while (merged) {
    merged = false;
    const owner = new Map();
    pieces.forEach((p, i) => p.forEach(([c, r]) => owner.set(key(c, r), i)));
    for (let i = 0; i < pieces.length && !merged; i++) {
      if (pieces[i].length >= cfg.minSize) continue;
      const near = new Set();
      for (const [c, r] of pieces[i]) {
        for (const [dc, dr] of DIRS) {
          const j = owner.get(key(c + dc, r + dr));
          if (j !== undefined && j !== i) near.add(j);
        }
      }
      const into = [...near]
        .filter((j) => pieces[j].length + pieces[i].length <= cfg.maxSize)
        .sort((a, b) => pieces[a].length - pieces[b].length)[0];
      if (into !== undefined) {
        pieces[into] = pieces[into].concat(pieces[i]);
        pieces.splice(i, 1);
        merged = true;
      }
    }
  }
  return pieces;
}

// At most one undersized piece (it becomes a cute 1-2 cell piece), never above maxSize.
function acceptable(pieces, cfg) {
  const small = pieces.filter((p) => p.length < cfg.minSize).length;
  return small <= 1 && pieces.every((p) => p.length >= 1 && p.length <= cfg.maxSize);
}

// Neighbouring pieces get different colors, favouring the least used color.
function colorPieces(pieces, rnd) {
  const owner = new Map();
  pieces.forEach((p, i) => p.forEach(([c, r]) => owner.set(key(c, r), i)));
  const used = Object.fromEntries(COLORS.map((c) => [c, 0]));
  return pieces.map((p, i, all) => {
    const taken = new Set();
    for (const [c, r] of p) {
      for (const [dc, dr] of DIRS) {
        const j = owner.get(key(c + dc, r + dr));
        if (j !== undefined && j < i) taken.add(all[j].color);
      }
    }
    const options = COLORS.filter((c) => !taken.has(c));
    const color = pickMin(shuffle(options.length ? options : [...COLORS], rnd), (c) => used[c]);
    used[color]++;
    p.color = color;
    return color;
  });
}

// Which picture goes on each cell: the head is an end cell, the tail is the
// cell farthest from it, and the body cells get stripes, paw prints or a sticker.
function decorate(cells, rnd) {
  if (cells.length === 1) return { decor: ['paw'], sleepy: false };
  const index = new Map(cells.map(([c, r], i) => [key(c, r), i]));
  const neighbours = (i) =>
    DIRS.map(([dc, dr]) => index.get(key(cells[i][0] + dc, cells[i][1] + dr))).filter((j) => j !== undefined);
  const head = pickMin(cells.map((_, i) => i), (i) => neighbours(i).length + rnd() * 0.5);
  const dist = new Map([[head, 0]]);
  const queue = [head];
  while (queue.length) {
    const i = queue.shift();
    for (const j of neighbours(i)) {
      if (!dist.has(j)) {
        dist.set(j, dist.get(i) + 1);
        queue.push(j);
      }
    }
  }
  const decor = cells.map(() => (rnd() < 0.55 ? 'stripes' : 'paws'));
  decor[head] = 'face';
  if (cells.length >= 3) {
    const tail = pickMin(cells.map((_, i) => i), (i) => -dist.get(i) + rnd() * 0.5);
    decor[tail] = 'tail';
  }
  if (cells.length >= 4 && rnd() < 0.5) {
    const body = cells.map((_, i) => i).filter((i) => decor[i] === 'stripes' || decor[i] === 'paws');
    const nextToHead = body.filter((i) => dist.get(i) === 1);
    if (nextToHead.length && rnd() < 0.35) decor[pick(nextToHead, rnd)] = 'bell';
    else if (body.length) decor[pick(body, rnd)] = rnd() < 0.5 ? 'yarn' : 'fish';
  }
  return { decor, sleepy: cells.length >= 2 && rnd() < 0.2 };
}

export function generateLevel(n) {
  const cfg = levelConfig(n);
  const rnd = mulberry32(n * 7919 + 17);
  let best = null;
  for (let attempt = 0; attempt < 300; attempt++) {
    const { grid, play } = makeGrid(cfg, rnd);
    const pieces = mergeSmall(cut(play, cfg, rnd), cfg);
    if (acceptable(pieces, cfg)) {
      best = { grid, pieces };
      break;
    }
    if (!best) best = { grid, pieces };
  }
  const { grid, pieces } = best;
  colorPieces(pieces, rnd);
  const out = pieces.map((cells, i) => {
    const minC = Math.min(...cells.map(([c]) => c));
    const minR = Math.min(...cells.map(([, r]) => r));
    const local = cells.map(([c, r]) => [c - minC, r - minR]);
    return {
      id: i,
      color: cells.color,
      cells: local,
      ...decorate(local, rnd),
      solution: { c: minC, r: minR },
      startRot: cfg.rotate ? Math.floor(rnd() * 4) : 0,
    };
  });
  return {
    n,
    name: levelName(n),
    cols: cfg.cols,
    rows: cfg.rows,
    grid,
    pieces: n === 1 ? out : shuffle(out, rnd),
  };
}
