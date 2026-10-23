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

## Sound and music

The sound effects and the music loop are made with the ElevenLabs API. Put
`ELEVENLABS_API_KEY=...` in `.env` (it's git-ignored) and install ffmpeg, then:

```sh
python3 tools/generate_sounds.py             # generate missing sounds
python3 tools/generate_sounds.py place win   # generate these again
python3 tools/generate_sounds.py music       # a new music track
```

The prompts and lengths are at the top of the script. Each download is kept in
`assets/raw/sounds/`, and the trimmed, level-matched copy the game loads goes
to `assets/sounds/`. Loops (the purr and the music) get their end crossfaded
into their start so they repeat without a seam. Playback volume and pitch for
each sound are in `js/audio.js`.

The music streams once the player taps Play, fades out when the tab is hidden,
and dips while the win jingle plays. Settings has its own Music switch and
volume slider, separate from Sound.

## Project layout

| Path | What |
|---|---|
| `index.html`, `css/style.css` | Page, layout and animations |
| `js/level.js` | Seeded level generator and difficulty curve |
| `js/piece.js` | Draws a jelly piece as SVG, with its cat stickers |
| `js/game.js` | Board, tray, drag and drop, hints, tutorial, win |
| `js/main.js` | Title screen, popups, settings, progress saved in `localStorage` |
| `js/audio.js`, `js/fx.js` | Sound effects, music, particles and confetti |
| `assets/fonts/` | Fredoka font, self-hosted (SIL Open Font License) |
| `tools/generate_sounds.py` | Makes the sound effects and music with ElevenLabs |
| `assets/sounds/` | Sound effects and music the game loads |
| `assets/raw/` | Approved AI-generated sheets |
| `assets/img/` | Sprites cut from those sheets (`tools/build_sprites.sh`) |
| `assets/raw/sounds/` | ElevenLabs downloads, before trimming |
| `docs/ASSET_PROMPTS.md` | Prompts used to generate the art |
