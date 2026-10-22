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

## Publish on CrazyGames

1. Run `npm run package`. It writes `dist/pawzzle-crazygames.zip`, with
   `index.html` at the root and only the files the game loads (about 2.2 MB,
   most of it the music).
2. In the CrazyGames developer portal, submit an HTML5 game and upload the zip.
3. In the submission form, turn on saving progress. The SDK's data module is
   off without it.
4. Test in CrazyGames' QA tool before release. It shows test ads, and saved
   data works there but doesn't sync to player accounts.

How the integration works:

- `js/platform.js` is the only file that talks to CrazyGames (SDK v3). Off
  CrazyGames (GitHub Pages, offline, SDK blocked) it falls back to
  `localStorage`, and there are no ads.
- Progress (levels, stars, sound and music settings, hint balance) is saved
  through the SDK's data module, so logged-in players keep it across devices.
- New players get 3 free hints (`FREE_HINTS` in `js/main.js`). After that, a
  hint costs a rewarded video. Off CrazyGames, hints stay free.
- The game reports gameplay start and stop around popups and ads, sends loading
  events at boot and a "happy time" event when a level is won, and follows the
  site's mute setting.

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
| `js/main.js` | Title screen, popups, settings, saved progress |
| `js/audio.js`, `js/fx.js` | Sound effects, music, particles and confetti |
| `js/platform.js` | CrazyGames SDK: saves, rewarded videos, gameplay events |
| `assets/fonts/` | Fredoka font, self-hosted (SIL Open Font License) |
| `tools/package_crazygames.py` | Builds the CrazyGames upload zip |
| `tools/generate_sounds.py` | Makes the sound effects and music with ElevenLabs |
| `assets/sounds/` | Sound effects and music the game loads |
| `assets/raw/` | Approved AI-generated sheets |
| `assets/img/` | Sprites cut from those sheets (`tools/build_sprites.sh`) |
| `assets/raw/sounds/` | ElevenLabs downloads, before trimming |
| `docs/ASSET_PROMPTS.md` | Prompts used to generate the art |
