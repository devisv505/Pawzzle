import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateLevel, levelConfig } from '../js/level.js';

const LEVELS = Array.from({ length: 80 }, (_, i) => i + 1);
const key = (c, r) => `${c},${r}`;

test('solution covers every playable cell exactly once', () => {
  for (const n of LEVELS) {
    const lvl = generateLevel(n);
    const covered = new Map();
    for (const p of lvl.pieces) {
      for (const [c, r] of p.cells) {
        const k = key(c + p.solution.c, r + p.solution.r);
        assert.equal(lvl.grid[r + p.solution.r]?.[c + p.solution.c], 'play', `level ${n}: piece on non-playable ${k}`);
        assert.ok(!covered.has(k), `level ${n}: ${k} covered twice`);
        covered.set(k, p.id);
      }
    }
    const playable = lvl.grid.flat().filter((t) => t === 'play').length;
    assert.equal(covered.size, playable, `level ${n}: ${playable - covered.size} cells uncovered`);
  }
});

test('every cell is playable or holds an obstacle, none left empty', () => {
  for (const n of LEVELS) {
    for (const t of generateLevel(n).grid.flat()) {
      assert.ok(['play', 'box', 'plant'].includes(t), `level ${n}: ${t} cell`);
    }
  }
});

test('pieces are connected, sized to the level and normalised', () => {
  for (const n of LEVELS) {
    const cfg = levelConfig(n);
    const lvl = generateLevel(n);
    const small = lvl.pieces.filter((p) => p.cells.length < cfg.minSize).length;
    assert.ok(small <= 1, `level ${n}: ${small} undersized pieces`);
    for (const p of lvl.pieces) {
      assert.ok(p.cells.length <= cfg.maxSize, `level ${n}: piece of ${p.cells.length}`);
      assert.equal(Math.min(...p.cells.map(([c]) => c)), 0);
      assert.equal(Math.min(...p.cells.map(([, r]) => r)), 0);
      const set = new Set(p.cells.map(([c, r]) => key(c, r)));
      const seen = new Set([key(...p.cells[0])]);
      const stack = [p.cells[0]];
      while (stack.length) {
        const [c, r] = stack.pop();
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = key(c + dc, r + dr);
          if (set.has(k) && !seen.has(k)) {
            seen.add(k);
            stack.push([c + dc, r + dr]);
          }
        }
      }
      assert.equal(seen.size, p.cells.length, `level ${n}: piece ${p.id} not connected`);
      assert.equal(p.decor.length, p.cells.length);
      assert.equal(p.decor.filter((d) => d === 'face').length, p.cells.length > 1 ? 1 : 0);
    }
  }
});

test('touching pieces have different colors', () => {
  for (const n of LEVELS) {
    const lvl = generateLevel(n);
    const owner = new Map();
    for (const p of lvl.pieces) for (const [c, r] of p.cells) owner.set(key(c + p.solution.c, r + p.solution.r), p);
    for (const [k, p] of owner) {
      const [c, r] = k.split(',').map(Number);
      for (const [dc, dr] of [[1, 0], [0, 1]]) {
        const q = owner.get(key(c + dc, r + dr));
        if (q && q !== p) assert.notEqual(q.color, p.color, `level ${n}: pieces ${p.id} and ${q.id}`);
      }
    }
  }
});

test('levels are deterministic', () => {
  for (const n of [1, 7, 23, 64]) {
    assert.deepEqual(generateLevel(n), generateLevel(n));
  }
});
