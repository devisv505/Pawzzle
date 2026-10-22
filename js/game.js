// One level of play: the board, the tray, and dragging pieces between them.
import { generateLevel } from './level.js';
import { createPieceSVG, renderPiece, rotateCells, extent, PAD, U } from './piece.js';
import { sfx, startPurr, stopPurr } from './audio.js';
import { burst, sparkles, confetti, heart, reducedMotion } from './fx.js';

const key = (c, r) => `${c},${r}`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const HAND_TIP = [0.16, 0.07]; // fingertip position within hand.webp
const IDLE_NUDGE_MS = 25000;
const PAD_CELLS = PAD / U; // margin around a piece's cells inside its SVG
// Stroking a cat: this much vertical travel is one stroke, and this many
// strokes with no long pause between them start the purr.
const PET_STROKE_PX = 12;
const PET_STROKES = 3;
const PET_GAP_MS = 650;

export class Game {
  constructor(els, { onWin, onProgress, onIdle } = {}) {
    this.els = els;
    this.onWin = onWin;
    this.onProgress = onProgress;
    this.onIdle = onIdle;
    this.cell = 48;
    this.trayScale = 0.5;
    this.drag = null;
    this.lit = [];

    els.tray.addEventListener('pointerdown', (e) => this.pointerDown(e, 'tray'));
    els.pieces.addEventListener('pointerdown', (e) => this.pointerDown(e, 'board'));
    for (const area of [els.tray, els.pieces]) {
      area.addEventListener('pointermove', (e) => this.petMove(e));
      area.addEventListener('pointerleave', () => this.petEnd());
    }
    // A second finger, the R key, space or the mouse wheel rotates the piece being dragged.
    window.addEventListener('pointerdown', (e) => this.drag?.started && e.pointerId !== this.drag.id && this.rotateDragged(e), true);
    window.addEventListener('keydown', (e) => {
      if (this.drag?.started && (e.key === 'r' || e.key === 'R' || e.key === ' ')) this.rotateDragged(e);
    });
    window.addEventListener('wheel', (e) => this.drag?.started && this.rotateDragged(e), { passive: false });
    window.addEventListener('resize', () => this.level && this.layout());
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
  }

  load(n) {
    this.petEnd();
    const lvl = (this.level = generateLevel(n));
    const { tiles, highlights, pieces, tray, board } = this.els;
    this.occ = new Map();
    this.hints = 0;
    this.won = false;
    this.busy = false;
    this.placedOnce = false;
    this.playable = lvl.grid.flat().filter((t) => t === 'play').length;
    board.classList.remove('won');
    board.style.setProperty('--cols', lvl.cols);
    board.style.setProperty('--rows', lvl.rows);
    tiles.innerHTML = highlights.innerHTML = pieces.innerHTML = tray.innerHTML = '';

    this.hl = new Map();
    lvl.grid.forEach((row, r) =>
      row.forEach((type, c) => {
        const tile = document.createElement('div');
        const paw = type === 'play' && (c * 7 + r * 3 + n) % 5 === 0;
        tile.className = `tile tile-${paw ? 'paw' : type}`;
        tile.style.gridArea = `${r + 1} / ${c + 1}`;
        tile.style.setProperty('--d', `${(c + r) * 35}ms`);
        tiles.append(tile);
        const hl = document.createElement('div');
        hl.className = 'hl';
        hl.style.gridArea = `${r + 1} / ${c + 1}`;
        highlights.append(hl);
        this.hl.set(key(c, r), hl);
      })
    );

    this.pieces = lvl.pieces.map((def, i) => {
      const p = { ...def, base: def.cells, rot: def.startRot, at: null };
      p.cells = rotateCells(p.base, p.rot);
      p.svg = createPieceSVG(p.id);
      p.slot = document.createElement('div');
      p.slot.className = 'slot';
      p.slot.dataset.id = p.id;
      p.slot.style.setProperty('--d', `${150 + i * 60}ms`);
      p.slot.append(p.svg);
      tray.append(p.slot);
      renderPiece(p.svg, p, 'idle');
      return p;
    });
    this.byId = new Map(this.pieces.map((p) => [p.id, p]));
    this.layout();
    this.progress();
    this.touchIdle();
    if (n === 1) setTimeout(() => this.showHand(), 900);
    else this.hideHand();
  }

  // Cell size from the space available, then the largest tray scale that fits.
  layout() {
    const { cols, rows } = this.level;
    const wrap = this.els.boardWrap;
    const pad = 2 * parseFloat(getComputedStyle(this.els.board).paddingLeft || 12);
    const maxW = wrap.clientWidth - pad - 8;
    const maxH = Math.max(150, innerHeight * 0.46) - pad;
    this.cell = Math.max(26, Math.floor(Math.min(maxW / cols, maxH / rows, 78)));
    document.documentElement.style.setProperty('--cell', `${this.cell}px`);
    this.fitTray();
    if (this.handOn) this.showHand();
  }

  // Checks the slots' layout boxes, not scrollHeight (piece margins may overhang a
  // slot harmlessly) and not their on-screen rects (the slide-in animation moves them).
  fitTray() {
    const tray = this.els.tray;
    const bottom = tray.clientHeight - 10;
    for (let s = 0.62; s >= 0.24; s -= 0.02) {
      this.trayScale = s;
      this.pieces.forEach((p) => this.size(p));
      const fits = this.pieces.every(
        ({ slot }) => slot.offsetTop + slot.offsetHeight <= bottom && slot.offsetLeft + slot.offsetWidth <= tray.clientWidth
      );
      if (fits) break;
    }
  }

  // Slots keep a fixed square size so rotating or placing a piece never reflows the tray.
  size(p) {
    const { w, h } = extent(p.cells);
    const base = extent(p.base);
    p.w = w;
    p.h = h;
    const side = Math.max(base.w, base.h) * this.cell * this.trayScale + 14;
    p.slot.style.width = p.slot.style.height = `${side}px`;
    const inTray = !p.at && !p.svg.classList.contains('dragging');
    const k = this.cell * (inTray ? this.trayScale : 1);
    p.svg.style.width = `${(w + 2 * PAD_CELLS) * k}px`;
    p.svg.style.height = `${(h + 2 * PAD_CELLS) * k}px`;
    // In the tray a negative margin keeps the slot sized to the cells alone.
    p.svg.style.margin = inTray ? `${-PAD_CELLS * k}px` : '';
    p.svg.style.left = p.at ? `${(p.at.c - PAD_CELLS) * this.cell}px` : '';
    p.svg.style.top = p.at ? `${(p.at.r - PAD_CELLS) * this.cell}px` : '';
  }

  // ---- pointer handling -------------------------------------------------

  pointerDown(e, where) {
    this.petEnd();
    if (this.won || this.busy || this.drag || e.button > 0) return;
    const el = where === 'tray' ? e.target.closest('.slot') : e.target.closest('svg.piece');
    const p = el && this.byId.get(+el.dataset.id);
    if (!p || (where === 'tray' && p.at)) return;
    e.preventDefault();
    this.drag = { p, id: e.pointerId, touch: e.pointerType === 'touch', x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, started: false, from: p.at, tilt: 0 };
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    this.touchIdle();
  }

  onMove(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    if (!d.started) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 7) return;
      this.beginDrag();
    }
    d.tilt = clamp(d.tilt + (e.clientX - d.x) * 0.5, -12, 12);
    d.x = e.clientX;
    d.y = e.clientY;
    this.moveDrag();
  }

  beginDrag() {
    const d = this.drag;
    const p = d.p;
    d.started = true;
    const r = p.svg.getBoundingClientRect();
    d.fx = clamp((d.x0 - r.left) / r.width, 0.05, 0.95);
    d.fy = clamp((d.y0 - r.top) / r.height, 0.05, 0.95);
    d.lift = d.touch ? this.cell * 0.8 : 0;
    const from = p.at ? 1 : this.trayScale;
    if (p.at) this.release(p);
    p.at = null;
    p.svg.classList.add('dragging');
    this.els.dragLayer.append(p.svg);
    this.size(p);
    p.svg.querySelector('.jelly').animate([{ transform: `scale(${from})` }, { transform: 'scale(1.06)' }], { duration: 160, easing: 'ease-out' });
    sfx.pick();
    this.hideHand();
    // Let the tilt relax back to level when the pointer stops.
    const settle = () => {
      if (this.drag !== d) return;
      d.tilt *= 0.85;
      this.moveDrag();
      requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  }

  moveDrag() {
    const d = this.drag;
    const { p } = d;
    const cell = this.cell;
    // fx/fy are fractions of the whole SVG box, margin included.
    const boxLeft = d.x - d.fx * (p.w + 2 * PAD_CELLS) * cell;
    const boxTop = d.y - d.fy * (p.h + 2 * PAD_CELLS) * cell - d.lift;
    p.svg.style.transform = `translate(${boxLeft}px,${boxTop}px) rotate(${d.tilt.toFixed(2)}deg)`;
    const left = boxLeft + PAD_CELLS * cell;
    const top = boxTop + PAD_CELLS * cell;
    const g = this.els.grid.getBoundingClientRect();
    const c = Math.round((left - g.left) / cell);
    const r = Math.round((top - g.top) / cell);
    d.over = left + p.w * cell > g.left + cell / 2 && left < g.right - cell / 2 && top + p.h * cell > g.top + cell / 2 && top < g.bottom - cell / 2;
    d.target = d.over && this.fits(p, c, r) ? { c, r } : null;
    this.highlight(d.over ? p.cells.map(([a, b]) => key(a + c, b + r)) : [], d.target ? 'ok' : 'bad', p.color);
  }

  onUp(e) {
    const d = this.drag;
    if (!d || e.pointerId !== d.id) return;
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    this.drag = null;
    const { p } = d;
    if (!d.started) {
      if (p.at) {
        this.toTray(p);
        sfx.back();
      } else this.rotateInTray(p);
      return;
    }
    this.highlight([]);
    p.svg.classList.remove('dragging');
    if (e.type === 'pointerup' && d.target) this.place(p, d.target);
    else if (d.from && d.over) {
      // Dropped on a spot that doesn't fit: go back to where it was.
      this.place(p, d.from, { quiet: true });
      this.shake(p);
      sfx.bad();
    } else {
      this.toTray(p, { shake: d.over });
      d.over ? sfx.bad() : sfx.back();
    }
    if (this.level.n === 1 && !this.placedOnce) setTimeout(() => this.showHand(), 500);
  }

  rotateDragged(e) {
    e.preventDefault();
    e.stopPropagation();
    const d = this.drag;
    // One trackpad swipe sends a burst of wheel events; count it as one turn.
    if (e.type === 'wheel' && performance.now() - (d.spunAt ?? 0) < 350) return;
    d.spunAt = performance.now();
    const { p } = d;
    p.rot = (p.rot + 1) % 4;
    p.cells = rotateCells(p.base, p.rot);
    [d.fx, d.fy] = [1 - d.fy, d.fx];
    renderPiece(p.svg, p, 'idle');
    this.size(p);
    this.moveDrag();
    sfx.rotate();
  }

  rotateInTray(p) {
    p.rot = (p.rot + 1) % 4;
    p.cells = rotateCells(p.base, p.rot);
    renderPiece(p.svg, p, 'idle');
    this.size(p);
    sfx.rotate();
    if (!reducedMotion) {
      // Spin the whole SVG, not its contents, so the turn never paints outside the element.
      const o = { transformOrigin: '50% 50%' };
      p.svg.animate(
        [{ transform: 'rotate(-90deg) scale(.85)', ...o }, { transform: 'rotate(10deg) scale(1.05)', offset: 0.7, ...o }, { transform: 'none', ...o }],
        { duration: 300, easing: 'ease-out' }
      );
    }
  }

  // ---- board rules ----------------------------------------------------------

  fits(p, c, r) {
    return p.cells.every(([a, b]) => this.level.grid[b + r]?.[a + c] === 'play' && !this.occ.has(key(a + c, b + r)));
  }

  release(p) {
    p.cells.forEach(([a, b]) => {
      const k = key(a + p.at.c, b + p.at.r);
      if (this.occ.get(k) === p) this.occ.delete(k);
    });
  }

  place(p, at, { quiet = false } = {}) {
    p.at = { ...at };
    p.cells.forEach(([a, b]) => this.occ.set(key(a + at.c, b + at.r), p));
    p.svg.classList.remove('dragging');
    renderPiece(p.svg, p, 'happy');
    this.flyTo(p, () => {
      this.els.pieces.append(p.svg);
      this.size(p);
    });
    if (!quiet) {
      this.squash(p);
      sfx.place(p.cells.length);
      const r = p.svg.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, p.color, 8 + p.cells.length * 2);
      this.placedOnce = true;
      this.hideHand();
      this.touchIdle();
    }
    this.progress();
    if (this.occ.size === this.playable) this.finish();
  }

  toTray(p, { shake = false } = {}) {
    if (p.at) this.release(p);
    p.at = null;
    renderPiece(p.svg, p, 'idle');
    this.flyTo(p, () => {
      p.slot.append(p.svg);
      this.size(p);
    });
    if (shake) this.shake(p);
    this.progress();
  }

  // Animate a piece from where it is now to wherever `mount` puts it.
  flyTo(p, mount) {
    const svg = p.svg;
    const a = svg.getBoundingClientRect();
    svg.style.transform = '';
    mount();
    const b = svg.getBoundingClientRect();
    if (reducedMotion || !a.width || !b.width) return;
    svg.animate(
      [{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px) scale(${a.width / b.width},${a.height / b.height})` }, { transform: 'none' }],
      { duration: 260, easing: 'cubic-bezier(.2,.9,.25,1.12)' }
    );
  }

  squash(p) {
    if (reducedMotion) return;
    const o = { transformOrigin: '50% 100%' };
    p.svg.querySelector('.jelly').animate(
      [
        { transform: 'scale(1.1,.86)', ...o },
        { transform: 'scale(.94,1.06)', offset: 0.45, ...o },
        { transform: 'scale(1.03,.98)', offset: 0.75, ...o },
        { transform: 'none', ...o },
      ],
      { duration: 420, easing: 'ease-out' }
    );
  }

  shake(p) {
    if (reducedMotion) return;
    p.svg.querySelector('.jelly').animate(
      [0, -12, 12, -8, 8, -4, 0].map((x) => ({ transform: `translateX(${x}px) rotate(${x / 3}deg)` })),
      { duration: 380, easing: 'ease-in-out' }
    );
  }

  highlight(keys, kind, color) {
    this.lit.forEach((k) => this.hl.get(k)?.classList.remove('ok', 'bad', 'hint', 'guide'));
    this.lit = keys.filter((k) => this.hl.has(k));
    if (color) this.els.highlights.style.setProperty('--hl', `var(--${color})`);
    this.lit.forEach((k) => this.hl.get(k).classList.add(kind));
  }

  progress() {
    this.onProgress?.(Math.round((100 * this.occ.size) / this.playable));
  }

  touchIdle() {
    clearTimeout(this.idleTimer);
    this.onIdle?.(false);
    this.idleTimer = setTimeout(() => !this.won && this.onIdle?.(true), IDLE_NUDGE_MS);
  }

  // ---- petting -------------------------------------------------------------

  // Hovering the mouse up and down over a cat strokes it; enough strokes and it purrs.
  petMove(e) {
    const el = e.pointerType !== 'touch' && !e.buttons && !this.drag && !this.won && e.target.closest('svg.piece');
    const p = el && this.byId.get(+el.dataset.id);
    if (!p) return this.petEnd();
    if (this.pet?.p !== p) {
      this.petEnd();
      this.pet = { p, y: e.clientY, dir: 0, travel: 0, strokes: 0, lastStroke: 0 };
    }
    const pet = this.pet;
    const dy = e.clientY - pet.y;
    pet.y = e.clientY;
    if (!dy) return;
    if (Math.sign(dy) === pet.dir) {
      pet.travel += Math.abs(dy);
      return;
    }
    const stroked = pet.travel >= PET_STROKE_PX;
    pet.dir = Math.sign(dy);
    pet.travel = Math.abs(dy);
    if (!stroked) return;
    const now = performance.now();
    if (now - pet.lastStroke > PET_GAP_MS) pet.strokes = 0;
    pet.strokes++;
    pet.lastStroke = now;
    if (pet.strokes < PET_STROKES) return;
    if (!pet.purring) this.purr(pet);
    clearTimeout(pet.timer);
    pet.timer = setTimeout(() => this.petEnd(), PET_GAP_MS + 200);
  }

  purr(pet) {
    const { p } = pet;
    const size = p.cells.length;
    pet.purring = true;
    startPurr(size);
    if (!p.at) renderPiece(p.svg, p, 'happy');
    p.svg.classList.add('purring');
    const face = Math.max(0, p.decor.indexOf('face'));
    const love = () => {
      const r = p.svg.getBoundingClientRect();
      const k = r.width / (p.w + 2 * PAD_CELLS);
      const [c, row] = p.cells[face];
      heart(r.left + (PAD_CELLS + c + 0.5) * k, r.top + (PAD_CELLS + row) * k);
    };
    love();
    pet.hearts = setInterval(love, 550);
  }

  petEnd() {
    const pet = this.pet;
    if (!pet) return;
    this.pet = null;
    clearTimeout(pet.timer);
    if (!pet.purring) return;
    clearInterval(pet.hearts);
    stopPurr();
    const { p } = pet;
    p.svg.classList.remove('purring');
    if (!p.at && !p.svg.classList.contains('dragging')) renderPiece(p.svg, p, 'idle');
  }

  // ---- hint, tutorial and win ---------------------------------------------

  // The piece a hint would place: one still in the tray, else one sitting in the wrong spot.
  hintTarget() {
    if (this.won || this.busy || this.drag) return null;
    const abs = (cells, at) => cells.map(([a, b]) => key(a + at.c, b + at.r)).sort().join('|');
    const solved = (p) => p.at && abs(p.cells, p.at) === abs(p.base, p.solution);
    return this.pieces.find((q) => !q.at) ?? this.pieces.find((q) => !solved(q)) ?? null;
  }

  canHint() {
    return this.hintTarget() !== null;
  }

  // Puts one piece where the original cut had it, moving aside anything in the way.
  hint() {
    const p = this.hintTarget();
    if (!p) return false;
    this.hints++;
    this.busy = true;
    const want = p.base.map(([a, b]) => key(a + p.solution.c, b + p.solution.r));
    new Set(want.map((k) => this.occ.get(k)).filter((q) => q && q !== p)).forEach((q) => this.toTray(q));
    if (p.at) this.release(p);
    p.rot = 0;
    p.cells = p.base;
    this.highlight(want, 'hint', p.color);
    sfx.hint();
    this.hideHand();
    setTimeout(() => {
      this.highlight([]);
      this.busy = false;
      this.place(p, p.solution);
      const r = p.svg.getBoundingClientRect();
      sparkles(r.left + r.width / 2, r.top + r.height / 2, 5, Math.max(r.width, r.height));
    }, 420);
    return true;
  }

  showHand() {
    if (this.level.n !== 1 || this.placedOnce || this.won) return;
    const p = this.pieces[0];
    if (p.at) return;
    const hand = this.els.hand;
    this.handOn = true;
    hand.hidden = false;
    const size = hand.offsetWidth;
    const s = p.slot.getBoundingClientRect();
    const g = this.els.grid.getBoundingClientRect();
    const sx = s.left + s.width / 2 - size * HAND_TIP[0];
    const sy = s.top + s.height / 2 - size * HAND_TIP[1];
    const tx = g.left + (p.solution.c + p.w / 2) * this.cell - size * HAND_TIP[0];
    const ty = g.top + (p.solution.r + p.h / 2) * this.cell - size * HAND_TIP[1];
    const at = (x, y, scale, opacity, offset) => ({ transform: `translate(${x}px,${y}px) scale(${scale})`, opacity, offset });
    this.handAnim?.cancel();
    this.handAnim = hand.animate(
      [at(sx, sy, 1, 0, 0), at(sx, sy, 1, 1, 0.12), at(sx, sy, 0.85, 1, 0.22), at(tx, ty, 0.85, 1, 0.65), at(tx, ty, 1, 1, 0.75), at(tx, ty, 1, 0, 1)],
      { duration: 2400, iterations: Infinity, easing: 'ease-in-out' }
    );
    this.highlight(p.base.map(([a, b]) => key(a + p.solution.c, b + p.solution.r)), 'guide', p.color);
  }

  hideHand() {
    if (!this.handOn) return;
    this.handOn = false;
    this.handAnim?.cancel();
    this.els.hand.hidden = true;
    if (!this.drag) this.highlight([]);
  }

  finish() {
    this.won = true;
    this.petEnd();
    clearTimeout(this.idleTimer);
    this.onIdle?.(false);
    this.els.board.classList.add('won');
    const stars = this.hints === 0 ? 3 : this.hints === 1 ? 2 : 1;
    const order = [...this.pieces].sort((a, b) => a.at.c + a.at.r - (b.at.c + b.at.r));
    const o = { transformOrigin: '50% 100%' };
    if (!reducedMotion) {
      order.forEach((p, i) =>
        p.svg.querySelector('.jelly').animate(
          [
            { transform: 'none', ...o },
            { transform: 'translateY(-18px) scale(1.05,.95)', offset: 0.35, ...o },
            { transform: 'scale(1.08,.9)', offset: 0.7, ...o },
            { transform: 'none', ...o },
          ],
          { duration: 520, delay: 300 + i * 80, easing: 'ease-out' }
        )
      );
    }
    setTimeout(() => {
      sfx.win();
      confetti();
    }, 250);
    setTimeout(() => this.onWin?.({ level: this.level.n, stars }), 1100 + order.length * 80);
  }
}
