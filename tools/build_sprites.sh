#!/usr/bin/env bash
# Rebuild every game sprite in assets/img from the approved sheets in assets/raw.
set -euo pipefail
cd "$(dirname "$0")/.."

slice() { python3 tools/slice_sheet.py "$@" >/dev/null; }
COLORS=orange,blue,yellow,pink,green,lavender

rm -rf assets/img/faces assets/img/sleeping assets/img/tails assets/img/stickers \
       assets/img/tiles assets/img/icons assets/img/decor assets/img/ui

# Both expressions share --frame 510 so swapping them does not change the head size.
slice assets/raw/faces_idle.webp    --grid 3x2 --names $COLORS --out assets/img/faces --prefix idle- --frame 510
slice assets/raw/faces_happy.webp   --grid 3x2 --names $COLORS --out assets/img/faces --prefix happy- --frame 510
slice assets/raw/cats_sleeping.webp --grid 3x2 --names $COLORS --out assets/img/sleeping --prefix sleeping-
slice assets/raw/tails.webp         --grid 3x2 --names $COLORS --out assets/img/tails --prefix tail-
slice assets/raw/specials.webp      --grid 2x2 --names paw,yarn,fish,bell --out assets/img/stickers --fit item
slice assets/raw/tiles.webp         --grid 2x2 --names empty,paw,box,plant --out assets/img/tiles --prefix tile- --fit stretch
slice assets/raw/icons.webp         --grid 4x4 --size 192 --out assets/img/icons \
      --names paw,settings,pause,play,restart,undo,home,hint,sound,mute,music,close,star,star-empty,heart,rotate
slice assets/raw/decor.webp         --grid 2x2 --names leaves-a,leaves-b,leaves-fern,ribbon --out assets/img/decor --fit trim --pad 0.02 --size 768
# Fingertip hotspot of the result: 16% from the left, 7% from the top.
slice assets/raw/hand.webp          --grid 1x1 --names hand --out assets/img/ui --fit trim --pad 0.02 --size 256

mkdir -p assets/img/bg
cp assets/raw/bg_wood.webp assets/img/bg/wood.webp
echo "sprites rebuilt: $(find assets/img -type f | wc -l) files, $(du -sh assets/img | cut -f1)"
