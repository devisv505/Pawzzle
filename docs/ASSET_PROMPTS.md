# Pawzzle: art asset prompts

Prompts for every image the browser version of Pawzzle needs. The target look is
`docs/reference/mockup.webp`. **Attach that image to every prompt.**

---

## 0. How to use this

1. Generate the sheets **in order**. Start with `01`, because it sets the cat style.
2. For every cat prompt after `01`, attach **two images**: the mockup, plus your
   approved `faces_idle.png`. Each of those prompts already includes the line
   *"Image 2 is the approved style"*.
3. Save each result under the exact filename shown (PNG or WebP) and put it in `assets/raw/`
   (commit it, or upload it in chat). I'll slice the sheets into single sprites,
   remove the background, and export retina sizes with `tools/slice_sheet.py`, so you
   don't need to crop anything.
4. Regenerate a sheet if it has the wrong number of items, if items touch or overlap,
   or if it contains text. Clean separation matters more than small details.

**Which tool:**
- **ChatGPT (GPT image):** recommended. It supports a transparent background and
  1024×1024 / 1536×1024 sizes.
- **Gemini:** good at keeping a consistent style, but it can't make transparent images.
  The prompts fall back to a flat magenta background, and I'll key it out.
- **Midjourney:** weak at exact grids. Generate one item per prompt instead: copy the
  sheet prompt and keep only one item.

**Gameplay:** a tiling puzzle. Each level is a grid, sometimes an irregular shape or one
with fixed obstacle cells. The tray holds cat-shaped jelly pieces of different shapes.
You drag them into the grid and tap a piece to rotate it. The level is won when every
cell is covered. The progress bar shows the percentage covered.

Levels are made by cutting the grid into random cat pieces, so every level is solvable,
and the hint button can show where one piece belongs.

---

## 1. Built in code (no image needed)

These parts are drawn with SVG/CSS so they stay sharp and work for **any** piece shape:

| Element | How |
|---|---|
| Jelly piece bodies (any shape, 6 colors, gloss, 3D lip, outline) | SVG path built from the piece's cells |
| Stripes and paw-print stamps on pieces, whisker lines next to the progress bar | SVG, tinted per color |
| All text and numbers (level, moves, % covered, level name) | Web font **Fredoka** (Google Fonts), brown `#733113` |
| Board frame and glow, bottom tray shelf, round buttons, level tab, progress bar, popups | CSS |
| Snap preview, "doesn't fit" shake, hint ghost outline, rotate and win animations | CSS / JS |

A piece is a code-drawn jelly body with image stickers placed on its cells:

```
 ┌──────────┬──────────┬──────────┐
 │ cat face │ stripes  │ tail or  │   1×3 piece = head cell + body cell + end cell
 │ (image)  │  (code)  │ paw(img) │
 └──────────┴──────────┴──────────┘
```

---

## 2. Palette

The six cat colors are sampled from the approved `faces_idle` sheet. The rest are
sampled from the mockup. Use these values so the stickers match the code-drawn blocks.

| Name | Fill | Outline | Note |
|---|---|---|---|
| Orange | `#FEA342` | `#9D2300` | tabby stripes `#E27A35` |
| Blue | `#6FC9FC` | `#0053A0` | |
| Yellow | `#FEDC3F` | `#A34400` | tabby stripes `#E8A92A` |
| Pink | `#FDA1B5` | `#BB1540` | |
| Green | `#98DA72` | `#1F6522` | |
| Lavender | `#C2A0FB` | `#4B2399` | |
| Board cell | `#F8E9CD` | paw watermark `#ECCDA6` | |
| Tan accent | `#F2D5A6` | `#D8B185` | empty stars |
| Wood background | `#F4CD98` → `#EEB37B` | | |
| Text / facial features | `#733113` / `#4A2414` | | |

---

## 3. Prompts: core set (needed to match the mockup)

### 01 · `faces_idle.png`: cat heads, calm (1536×1024)
Shown on the head cell of every piece.

```
Use the attached image as the ART-STYLE reference only (do not copy its layout).
Style: cute casual mobile puzzle game, kawaii cats, glossy jelly/candy look, chunky rounded shapes, soft cel shading with a small white highlight at top-left, outlines in a darker shade of each item's own color, facial features in dark brown #4A2414. Flat front view, no perspective.

Create a clean sprite sheet: 3 columns × 2 rows, each item centered in its own equal-size invisible cell with at least 12% empty margin; items never touch or overlap; no grid lines, no borders, no labels.

Six cute cat HEADS (head only, no neck, no body). All six have the identical head shape, size, position and expression; only the fur color changes:
Row 1: orange tabby #FEA342 with three darker #E27A35 stripes on the forehead; sky blue #6FC9FC; sunny yellow #FEDC3F with darker #E8A92A forehead stripes.
Row 2: pink #FDA1B5; green #98DA72; lavender #C2A0FB.
Each head: round head slightly wider than tall, two triangular ears with soft pink inner ears, small cream #FFF1DA muzzle patch, small dark-brown oval eyes with one white sparkle, tiny pink nose, small "ω" smiling mouth, soft pink blush cheeks, three thin dark whiskers on each side. Calm, friendly expression. The fur matches the given color exactly so the head blends into a jelly block of the same color; outline in a darker shade of that color.

No text, numbers, letters, watermark or signature. No cast shadow on the background.
Background: fully transparent PNG. If transparency is impossible, use a solid flat #FF00FF magenta background with no gradient or texture.
```

### 02 · `faces_happy.png`: cat heads, joyful (1536×1024)
Shown when a piece snaps into place, and on every cat when the grid is full.

```
Image 1 is the art-style reference. Image 2 is the approved style: match its head shape, colors, line weight, size and position EXACTLY. Only the expression changes.

Create a clean sprite sheet: 3 columns × 2 rows, same order as image 2 (row 1: orange tabby #FEA342, sky blue #6FC9FC, yellow #FEDC3F; row 2: pink #FDA1B5, green #98DA72, lavender #C2A0FB). Each item centered in its own equal-size invisible cell with at least 12% empty margin; items never touch; no grid lines, no labels.

Six cat HEADS with a JOYFUL expression: eyes closed as happy upturned arcs (^ ^), wide open smiling mouth with a tiny pink tongue, bigger pink blush, ears perked up. Same muzzle, nose and whiskers as image 2.

No text, numbers, letters, watermark. No cast shadow.
Background: fully transparent PNG (fallback: solid flat #FF00FF magenta).
```

### 03 · `cats_sleeping.png`: curled-up sleeping cats (1536×1024)
The sleeping cat seen on the blue piece. Placed on some body cells, and used for the idle state.

```
Image 1 is the art-style reference (see the sleeping cat on the blue block). Image 2 is the approved cat style: match its colors, face details and line weight.

Create a clean sprite sheet: 3 columns × 2 rows (row 1: orange tabby #FEA342, sky blue #6FC9FC, yellow #FEDC3F; row 2: pink #FDA1B5, green #98DA72, lavender #C2A0FB). Each item centered in its own equal-size invisible cell with at least 12% empty margin; items never touch; no grid lines, no labels.

Six cats sleeping curled up into a round loaf/cushion shape, seen from the front-side, eyes closed as gentle downward arcs, peaceful smile, tail wrapped around the body, paws tucked in. The silhouette fits a square and is slightly wider than tall. All six have identical pose and size; only the color changes. Outline in a darker shade of each cat's color.

No "Zzz" and no other text, numbers, letters or watermark. No cast shadow.
Background: fully transparent PNG (fallback: solid flat #FF00FF magenta).
```

### 04 · `tails.png`: curly tails (1536×1024)
Shown on the end cell of pieces, like the orange piece in the mockup.

> Done. Upright and centered, these tails read as a "?", so the game mirrors each one
> and tilts it away from the cat's head.

```
Image 1 is the art-style reference (see the curly tail on the orange block at the top). Image 2 is the approved cat style: match its colors and line weight.

Create a clean sprite sheet: 3 columns × 2 rows (row 1: orange tabby #FEA342, sky blue #6FC9FC, yellow #FEDC3F; row 2: pink #FDA1B5, green #98DA72, lavender #C2A0FB). Each item centered in its own equal-size invisible cell with at least 12% empty margin; items never touch; no grid lines, no labels.

Six cute cartoon cat tails, each rising vertically from the bottom and curling at the top like a question mark, with 3 darker stripe bands. Thick, rounded and glossy. All six have the identical shape and size; only the color changes. Outline in a darker shade of each tail's color.

No text, numbers, letters, watermark. No cast shadow.
Background: fully transparent PNG (fallback: solid flat #FF00FF magenta).
```

### 05 · `specials.png`: paw and piece stickers (1024×1024)
The paw is for 1-cell pieces, like the pink paw block in the tray. The other three
stickers add variety to the body cells of long pieces.

```
Use the attached image as the ART-STYLE reference only (see the pink paw block in the bottom-right tray).
Style: cute casual mobile puzzle game, glossy jelly/candy look, chunky rounded shapes, soft cel shading, small white highlight at top-left, darker-shade outlines. Flat front view.

Create a clean sprite sheet: 2 columns × 2 rows, each item centered in its own equal-size invisible cell with at least 12% empty margin; items never touch; no grid lines, no labels.
1. A raised cat paw seen palm-forward: fluffy cream-white #FFF4E6 fur, four pink #F58FA8 toe beans and one big pink heart-shaped pad.
2. A round ball of pink-and-orange yarn with a loose curly thread end.
3. A cute blue-and-silver fish treat with a happy face.
4. A shiny golden cat-collar bell on a short red ribbon.

No text, numbers, letters, watermark. No cast shadow.
Background: fully transparent PNG (fallback: solid flat #FF00FF magenta).
```

### 06 · `tiles.png`: board tiles (1024×1024)
Two empty cells to cover, and two obstacles that sit in fixed cells and change the
shape the pieces must fill.

```
Use the attached image as the ART-STYLE reference only (see the empty cream board cells).
Style: cute casual mobile puzzle game, soft and clean, flat top-down view.

Create a clean sprite sheet: 2 columns × 2 rows, each item centered in its own equal-size invisible cell; each tile is a perfect square with rounded corners filling about 85% of its cell; tiles never touch; no grid lines, no labels.
1. Empty board cell: cream #F8E9CD rounded square, very subtle inner shadow along the top edge, otherwise plain.
2. The same cream cell with a faint, soft paw-print watermark in #ECCDA6 in the center.
3. Obstacle tile: the same cream cell with a cute closed cardboard box (classic "cat box") filling it, seen from the front.
4. Obstacle tile: the same cream cell with a small terracotta flower pot holding a round green plant, filling it, seen from the front.

No text, numbers, letters, watermark.
Background around the tiles: fully transparent PNG (fallback: solid flat #FF00FF magenta).
```

### 07 · `icons.png`: UI icons (1024×1024)
Icons only. The round cream button behind them is drawn in CSS.

```
Use the attached image as the ART-STYLE reference only (see the red paw icon and the brown gear icon in the top-right buttons).
Style: chunky, rounded, filled cartoon game icons, two-tone with soft shading and a small white highlight, darker-shade outline. Main icon color warm brown #8A4B2A unless stated otherwise. Flat front view.

Create a clean sprite sheet: 4 columns × 4 rows, each icon centered in its own equal-size invisible cell with at least 15% empty margin; all icons the same visual size; icons never touch; no grid lines, no button backgrounds, no labels.
Row 1: paw print (coral red #F2645A, for lives), gear (settings), pause, play.
Row 2: restart (circular arrow), undo (curved left arrow), home (house with cat ears on the roof), hint (light bulb with little cat ears, yellow #FEDC3F).
Row 3: speaker with sound waves, speaker muted with an X, music note, close (X).
Row 4: filled star (gold #FFC83D), empty star (outline only, tan #D8B185), heart (coral red #F2645A), rotate (two curved arrows chasing each other in a circle).

No text, numbers, letters, watermark. No cast shadow.
Background: fully transparent PNG (fallback: solid flat #FF00FF magenta).
```

### 08 · `bg_wood.png`: background texture (1024×1024, opaque)

```
Use the attached image as the reference for the background only (the light wooden table behind the board).
A SEAMLESS TILEABLE square texture of light honey-colored wooden planks, planks running horizontally, soft low-contrast wood grain, colors between #F4CD98 and #EEB37B, a few gentle darker grain lines, no knots, no nails, no strong shadows, no vignette. It must tile perfectly on all four edges. Calm and simple so game pieces stand out on top.
No objects, no UI, no text, no watermark. Fully opaque, no transparency.
```

### 09 · `decor.png`: decorations (1024×1024)
The leaves in the corners of the mockup, plus a banner for popups.

```
Use the attached image as the ART-STYLE reference only (see the green leaves at the screen edges).
Style: cute casual mobile game, soft cel shading, small highlight, darker-shade outlines, flat front view.

Create a clean sprite sheet: 2 columns × 2 rows, each item centered in its own equal-size invisible cell with at least 10% empty margin; items never touch; no grid lines, no labels.
1. A cluster of 3 soft green #8DBF5A leaves fanning toward the upper-left (to tuck into a top-right screen corner).
2. A cluster of 3 green leaves fanning toward the upper-right (bottom-left corner).
3. A cluster of 2 leaves and a small fern sprig fanning toward the upper-left (bottom-right corner).
4. An EMPTY wide ribbon banner, orange #FEA342 with darker #DE7034 folded ends and a glossy top highlight (a title will be written on it by code).

No text, numbers, letters, watermark. No cast shadow.
Background: fully transparent PNG (fallback: solid flat #FF00FF magenta).
```

### 10 · `hand.png`: tutorial pointer (1024×1024)

```
Use the attached image as the ART-STYLE reference only (see the cartoon hand tapping the pink piece).
A single cute cartoon hand with the index finger extended, pointing up and to the left, other fingers curled, cream skin #FFE6C7 with soft peach shading and a warm brown #8A4B2A outline, simple and chunky. Centered, filling about 70% of the image.

No text, watermark, or cast shadow.
Background: fully transparent PNG (fallback: solid flat #FF00FF magenta).
```

---

## 4. Prompts: polish set (optional, nice to have)

### 11 · `faces_worried.png`: cat heads, worried (1536×1024)
Shown when you drop a piece somewhere it doesn't fit.

```
Image 1 is the art-style reference. Image 2 is the approved style: match its head shape, colors, line weight, size and position EXACTLY. Only the expression changes.

Create a clean sprite sheet: 3 columns × 2 rows, same color order as image 2 (row 1: orange tabby #FEA342, sky blue #6FC9FC, yellow #FEDC3F; row 2: pink #FDA1B5, green #98DA72, lavender #C2A0FB). Each item centered in its own equal-size invisible cell with at least 12% empty margin; items never touch; no grid lines, no labels.

Six cat HEADS with a WORRIED/SURPRISED expression: big round eyes with large sparkles, small open "o" mouth, ears slightly lowered, one small light-blue sweat drop near the forehead.

No text, numbers, letters, watermark. No cast shadow.
Background: fully transparent PNG (fallback: solid flat #FF00FF magenta).
```

### 12 · `mascot.png`: mascot poses (1024×1024)
For the menu, win, hint, and pause screens.

```
Image 1 is the art-style reference. Image 2 is the approved cat style: the mascot is the ORANGE TABBY cat from image 2 (same face, colors and line weight), drawn full-body as a chubby chibi cat.

Create a clean sprite sheet: 2 columns × 2 rows, each pose centered in its own equal-size invisible cell with at least 10% empty margin; poses never touch; no grid lines, no labels. Same character and size in all four:
1. Cheering: standing on hind legs, both front paws raised high, joyful closed-eye smile (level complete).
2. Thinking: sitting, one paw on its chin, eyes looking up, a curious little smile (hint).
3. Waving: sitting and waving one paw, friendly smile (main menu).
4. Sleeping: curled up asleep on top of a small orange jelly cube (pause).

No text, numbers, letters, watermark. No cast shadow.
Background: fully transparent PNG (fallback: solid flat #FF00FF magenta).
```

### 13 · `logo.png`: game title (1536×1024)

```
Use the attached image as the ART-STYLE reference only.
A cute game logo with the single word "Pawzzle", spelled exactly P-a-w-z-z-l-e. Chunky rounded bubbly letters, glossy jelly look with an orange #FEA342 to yellow #FEDC3F vertical gradient, thick dark-brown #733113 outline, white glossy highlight on the top of each letter. Small cat ears on top of the "P", and the dot-like counter of the "a" replaced with a small paw print. Slight playful bounce: letters tilted a little up and down. Centered, filling about 80% of the width.

No other text, no watermark, no background scene.
Background: fully transparent PNG (fallback: solid flat #FF00FF magenta).
```

### 14 · `app_icon.png`: favicon and home-screen icon (1024×1024, opaque)

```
Use the attached image as the ART-STYLE reference only.
A square app icon: the cute orange tabby cat head (calm smile, as in the reference) peeking over the top edge of a glossy orange jelly block, with a small pink jelly block and a blue jelly block beside it, on a warm cream #F8E9CD background with a soft radial glow. Bold, simple, readable at small sizes, centered composition, full bleed to the edges, no rounded corners (the platform adds them).

No text, letters, numbers, watermark. Fully opaque, no transparency.
```

### 15 · `fx.png`: effect particles (1024×1024)

```
Use the attached image as the ART-STYLE reference only.
Style: cute casual mobile game effects, glossy, soft shading, simple shapes, flat front view.

Create a clean sprite sheet: 3 columns × 3 rows, each item centered in its own equal-size invisible cell with at least 15% empty margin; items never touch; no grid lines, no labels.
Row 1: a four-point white-and-pale-yellow sparkle; a glossy gold #FFC83D star; a glossy coral-pink heart.
Row 2: a soft white puffy smoke cloud; a white circular "pop" burst ring with small rays; a small cluster of multicolor confetti pieces (orange, blue, yellow, pink, green).
Row 3: a glowing yellow paw print; a gold coin with an embossed paw print; a small cream fish-shaped cookie.

No text, numbers, letters, watermark. No cast shadow.
Background: fully transparent PNG (fallback: solid flat #FF00FF magenta).
```

---

## 5. Checklist

| # | File | Size | Set | Status |
|---|---|---|---|---|
| 01 | `faces_idle.png` | 1536×1024 | core | ✅ done |
| 02 | `faces_happy.png` | 1536×1024 | core | ✅ done |
| 03 | `cats_sleeping.png` | 1536×1024 | core | ✅ done |
| 04 | `tails.png` | 1536×1024 | core | ✅ done |
| 05 | `specials.png` | 1024×1024 | core | ✅ done |
| 06 | `tiles.png` | 1024×1024 | core | ✅ done |
| 07 | `icons.png` | 1024×1024 | core | ✅ done |
| 08 | `bg_wood.png` | 1024×1024 | core | ✅ done |
| 09 | `decor.png` | 1024×1024 | core |  |
| 10 | `hand.png` | 1024×1024 | core |  |
| 11 | `faces_worried.png` | 1536×1024 | polish |  |
| 12 | `mascot.png` | 1024×1024 | polish |  |
| 13 | `logo.png` | 1536×1024 | polish |  |
| 14 | `app_icon.png` | 1024×1024 | polish |  |
| 15 | `fx.png` | 1024×1024 | polish |  |

Sounds aren't covered here; free SFX can be added later.
