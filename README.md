# Pawzzle

A cozy browser puzzle: drag the jelly cat pieces into the grid until every cell
is covered. Tap a piece in the tray to rotate it. While dragging, rotate it with
a second finger, the R key or the mouse wheel. Stroke a cat up and down with
the mouse and it purrs.

Plain HTML, CSS and JavaScript modules, with no build step. Every level is made
by cutting the board into cat pieces, so every level is solvable, and level N
is the same puzzle for everyone.

## Play locally

```sh
npm start        # serves the folder on http://localhost:8080
npm test         # level generator tests
```

Any static file server works. Opening `index.html` straight from disk doesn't,
because browsers block JavaScript modules on `file://`.

## Publish on GitHub Pages

1. On GitHub, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Pick the branch with the game and the **/ (root)** folder, then **Save**.
4. After a minute the game is live at `https://<user>.github.io/Pawzzle/`.

## Project layout

| Path | What |
|---|---|
| `index.html`, `css/style.css` | Page, layout and animations |
| `js/level.js` | Seeded level generator and difficulty curve |
| `js/piece.js` | Draws a jelly piece as SVG, with its cat stickers |
| `js/game.js` | Board, tray, drag and drop, hints, tutorial, win |
| `js/main.js` | Title screen, popups, settings, saved progress |
| `js/audio.js`, `js/fx.js` | Synthesized sounds, particles and confetti |
| `assets/raw/` | Approved AI-generated sheets |
| `assets/img/` | Sprites cut from those sheets (`tools/build_sprites.sh`) |
| `docs/ASSET_PROMPTS.md` | Prompts used to generate the art |
