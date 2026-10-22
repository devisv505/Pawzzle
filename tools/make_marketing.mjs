#!/usr/bin/env node
// Store art for CrazyGames: three cover images and two preview videos.
//
//     node tools/make_marketing.mjs          # covers and videos -> dist/marketing/
//     node tools/make_marketing.mjs covers   # just the covers
//
// Needs Google Chrome and ffmpeg. Covers are screenshots of
// tools/marketing/cover.html. Videos open on the cover, then show level 14
// being solved in the real game at normal speed, with the tutorial hand as
// the pointer. No sound, as CrazyGames asks.
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'dist', 'marketing');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LEVEL = 14;
const FPS = 30;
const COVER_HOLD = 1.2; // seconds the cover shows before fading into play
const FADE = 0.5;

const COVERS = [
  { name: 'cover-landscape', layout: 'landscape', width: 1920, height: 1080 },
  { name: 'cover-portrait', layout: 'portrait', width: 800, height: 1200 },
  { name: 'cover-square', layout: 'square', width: 800, height: 800 },
];
// Viewport in CSS pixels times the scale gives the 1080p video size.
const VIDEOS = [
  { name: 'video-landscape', layout: 'landscape', width: 960, height: 540, scale: 2 },
  { name: 'video-portrait', layout: 'portrait', width: 540, height: 810, scale: 2 },
];

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// ---- a static file server for the game folder ----

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.json': 'application/json' };

function serve() {
  const server = createServer((req, res) => {
    let file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

// ---- a minimal Chrome DevTools Protocol client ----

async function launchChrome() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pawzzle-chrome-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--no-first-run', 'about:blank'], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const url = await new Promise((resolve, reject) => {
    let log = '';
    proc.stderr.on('data', (chunk) => {
      log += chunk;
      const m = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) resolve(m[1]);
    });
    proc.on('exit', () => reject(new Error(`Chrome exited:\n${log}`)));
  });
  const ws = new WebSocket(url);
  await new Promise((done) => ws.addEventListener('open', done));
  let nextId = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else {
      listeners.get(msg.method)?.(msg.params);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = {
    send: (method, params) => send(method, params, sessionId),
    on: (method, fn) => listeners.set(method, fn),
    async eval(expression) {
      const { result, exceptionDetails } = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      return result.value;
    },
    async waitFor(expression, ms = 20000) {
      for (const end = Date.now() + ms; Date.now() < end; await sleep(100)) {
        if (await this.eval(expression)) return;
      }
      throw new Error(`timed out waiting for ${expression}`);
    },
    async open(url, { width, height, scale = 1 }) {
      await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
      await this.send('Page.navigate', { url });
      await sleep(300);
    },
  };
  // Chrome keeps writing its profile while it shuts down, so wait for it to exit.
  const close = async () => {
    if (proc.exitCode === null) {
      const exited = new Promise((done) => proc.once('exit', done));
      proc.kill();
      await exited;
    }
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  return { page, close };
}

// ---- covers ----

async function cover(page, base, { layout, width, height }, file, scale = 1) {
  await page.open(`${base}/tools/marketing/cover.html?layout=${layout}`, { width, height, scale });
  await page.waitFor('document.body.dataset.ready === "1"');
  await sleep(200);
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
}

// ---- gameplay ----

// The tutorial hand stands in for the mouse pointer, which CrazyGames asks to hide.
const HAND = `(() => {
  const hand = document.createElement('img');
  hand.src = 'assets/img/ui/hand.webp';
  const size = Math.round(Math.min(innerWidth, innerHeight) * 0.11);
  Object.assign(hand.style, { position: 'fixed', left: 0, top: 0, width: size + 'px', zIndex: 9999, pointerEvents: 'none', transformOrigin: '16% 7%' });
  let x = innerWidth * 0.85, y = innerHeight * 1.1, down = false;
  const draw = () => (hand.style.transform = 'translate(' + (x - size * 0.16) + 'px,' + (y - size * 0.07) + 'px) scale(' + (down ? 0.86 : 1) + ')');
  addEventListener('pointermove', (e) => { x = e.clientX; y = e.clientY; draw(); }, true);
  addEventListener('pointerdown', () => { down = true; draw(); }, true);
  addEventListener('pointerup', () => { down = false; draw(); }, true);
  draw();
  document.body.append(hand);
})()`;

function mouse(page) {
  let at = [0, 0];
  const send = (type, [x, y], held) =>
    page.send('Input.dispatchMouseEvent', { type, x, y, button: held || type !== 'mouseMoved' ? 'left' : 'none', buttons: held ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 });
  return {
    jump(to) {
      at = to;
      return send('mouseMoved', to, false);
    },
    // Eased glide that takes `ms` of real time however slow each event is.
    async glide(to, ms, held = false) {
      const from = at;
      const start = performance.now();
      for (let t = 0; t < 1; ) {
        t = Math.min(1, (performance.now() - start) / ms);
        const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        at = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
        await send('mouseMoved', at, held);
        await sleep(8);
      }
    },
    down: () => send('mousePressed', at, true),
    up: () => send('mouseReleased', at, false),
    async tap() {
      await this.down();
      await sleep(70);
      await this.up();
    },
  };
}

const center = (r) => [r.x + r.width / 2, r.y + r.height / 2];

async function solve(page) {
  const m = mouse(page);
  await m.jump(await page.eval('[innerWidth * 0.85, innerHeight * 1.05]'));
  await page.eval(`window.pawzzle.startLevel(${LEVEL}); document.getElementById('app').style.visibility = ''`);
  await sleep(900);
  // Top row first, so the board fills like a person working through it.
  const order = await page.eval(`window.pawzzle.game.pieces.map((p) => ({ id: p.id, r: p.solution.r, c: p.solution.c })).sort((a, b) => a.r - b.r || a.c - b.c).map((p) => p.id)`);
  for (const [i, id] of order.entries()) {
    const piece = `window.pawzzle.game.byId.get(${id})`;
    const slot = await page.eval(`(({ x, y, width, height }) => ({ x, y, width, height }))(${piece}.slot.getBoundingClientRect())`);
    await m.glide(center(slot), 300);
    await sleep(60);
    // Turn it to the way it sits in the solution with taps, as a player would.
    while (await page.eval(`${piece}.rot !== 0`)) {
      await m.tap();
      await sleep(250);
    }
    // Grab it from the middle of its body.
    const grab = await page.eval(`(() => {
      const p = ${piece};
      const r = p.svg.getBoundingClientRect();
      const [c, row] = p.cells[Math.floor(p.cells.length / 2)];
      const k = r.width / (p.w + 2 * ${PAD_CELLS()});
      return [r.x + (c + 0.5 + ${PAD_CELLS()}) * k, r.y + (row + 0.5 + ${PAD_CELLS()}) * k];
    })()`);
    await m.glide(grab, 120);
    await m.down();
    await m.glide([grab[0], grab[1] - 12], 50, true);
    // Where the pointer must be for the piece's cells to land on its spot.
    const target = await page.eval(`(() => {
      const g = window.pawzzle.game;
      const d = g.drag, p = d.p, cell = g.cell, pad = ${PAD_CELLS()};
      const grid = g.els.grid.getBoundingClientRect();
      return [grid.left + (p.solution.c - pad) * cell + d.fx * (p.w + 2 * pad) * cell,
              grid.top + (p.solution.r - pad) * cell + d.fy * (p.h + 2 * pad) * cell + d.lift];
    })()`);
    await m.glide(target, 450, true);
    await sleep(50);
    await m.up();
    await sleep(180);
    // Halfway through, stroke a cat on the board until it purrs.
    if (i === 3) await pet(page, m, order[0]);
  }
  // The win: board glow, confetti, then the stars popup. The hand moves out of the way.
  await m.glide(await page.eval('[innerWidth * 0.9, innerHeight * 1.08]'), 700);
  await sleep(2500);
}

async function pet(page, m, id) {
  const [x, y] = await page.eval(`(() => {
    const p = window.pawzzle.game.byId.get(${id});
    const r = p.svg.getBoundingClientRect();
    const face = Math.max(0, p.decor.indexOf('face'));
    const k = r.width / (p.w + 2 * ${PAD_CELLS()});
    const [c, row] = p.cells[face];
    return [r.x + (c + 0.5 + ${PAD_CELLS()}) * k, r.y + (row + 0.7 + ${PAD_CELLS()}) * k];
  })()`);
  await m.glide([x, y], 280);
  for (let i = 0; i < 6; i++) await m.glide([x, y + (i % 2 ? -1 : 1) * 22], 150);
  await sleep(100);
}

// PAD / U from js/piece.js, read once from the page.
let padCells = 0.32;
const PAD_CELLS = () => padCells;

async function record(page, base, video, coverFile, file) {
  const { width, height, scale } = video;
  const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'pawzzle-frames-'));
  await page.open(`${base}/?test`, video);
  await page.waitFor('window.pawzzle && !document.getElementById("btn-play").disabled');
  padCells = await page.eval(`import('/js/piece.js').then((m) => m.PAD / m.U)`);
  // The level pops in once recording starts; until then only the wood shows.
  await page.eval(`document.getElementById('title').hidden = true; document.getElementById('app').style.visibility = 'hidden'`);
  await page.eval(HAND);
  await sleep(300);

  const shots = [];
  page.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const name = `f${String(shots.length).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(frames, name), Buffer.from(data, 'base64'));
    shots.push({ name, t: metadata.timestamp });
    page.send('Page.screencastFrameAck', { sessionId });
  });
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  await page.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: w, maxHeight: h, everyNthFrame: 1 });
  await solve(page);
  await page.send('Page.stopScreencast');
  await sleep(200);

  // Each frame stays up until the next one arrived, so timing matches real play.
  const list = shots.map((s, i) => `file '${s.name}'\nduration ${((shots[i + 1]?.t ?? s.t + 1 / FPS) - s.t).toFixed(4)}`);
  list.push(`file '${shots.at(-1).name}'`);
  fs.writeFileSync(path.join(frames, 'list.txt'), list.join('\n'));
  execFileSync('ffmpeg', [
    '-v', 'error', '-y',
    '-loop', '1', '-t', String(COVER_HOLD + FADE), '-i', coverFile,
    '-f', 'concat', '-safe', '0', '-i', path.join(frames, 'list.txt'),
    '-filter_complex',
    `[0]scale=${w}:${h},fps=${FPS},format=yuv420p,setsar=1[a];` +
      `[1]fps=${FPS},scale=${w}:${h}:flags=lanczos,format=yuv420p,setsar=1[b];` +
      `[a][b]xfade=transition=fade:duration=${FADE}:offset=${COVER_HOLD}[v]`,
    '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file,
  ]);
  fs.rmSync(frames, { recursive: true, force: true });
  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]));
  return { frames: shots.length, seconds };
}

// ---- main ----

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const { page, close } = await launchChrome();
const coversOnly = process.argv[2] === 'covers';
fs.mkdirSync(OUT, { recursive: true });
try {
  await page.send('Page.enable');
  for (const c of COVERS) {
    await cover(page, base, c, path.join(OUT, `${c.name}.png`));
    console.log(`${c.name}.png  ${c.width}x${c.height}`);
  }
  for (const v of coversOnly ? [] : VIDEOS) {
    // The video opens on its cover, rendered at the video's size.
    const c = COVERS.find((x) => x.layout === v.layout);
    const opener = path.join(os.tmpdir(), `pawzzle-${v.layout}-opener.png`);
    await cover(page, base, c, opener, Math.round(v.width * v.scale) / c.width);
    const file = path.join(OUT, `${v.name}.mp4`);
    const { frames, seconds } = await record(page, base, v, opener, file);
    fs.rmSync(opener);
    const mb = fs.statSync(file).size / 1024 / 1024;
    console.log(`${v.name}.mp4  ${Math.round(v.width * v.scale)}x${Math.round(v.height * v.scale)}, ${seconds.toFixed(1)} s, ${mb.toFixed(1)} MB, ${frames} frames`);
    if (seconds > 20) console.warn(`  longer than CrazyGames' 20 s limit`);
  }
} finally {
  await close();
  server.close();
}
