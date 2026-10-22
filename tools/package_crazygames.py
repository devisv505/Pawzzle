#!/usr/bin/env python3
"""Copy the game into a folder for upload to CrazyGames.

    python3 tools/package_crazygames.py      # -> dist/crazygames/

The folder has index.html at its root plus only what the game loads at runtime,
so source art, docs, tests, tools and prototypes stay out of the upload.
CrazyGames doesn't take archives: drag everything inside the folder into its
upload zone.
"""
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INCLUDE = ['index.html', 'css', 'js', 'assets/img', 'assets/fonts', 'assets/sounds']
OUT = os.path.join(ROOT, 'dist', 'crazygames')


def game_files():
    for item in INCLUDE:
        path = os.path.join(ROOT, item)
        if os.path.isfile(path):
            yield item
            continue
        for dirpath, dirnames, names in os.walk(path):
            dirnames.sort()
            for name in sorted(names):
                if not name.startswith('.'):
                    yield os.path.relpath(os.path.join(dirpath, name), ROOT)


def main():
    # Start clean, so files deleted from the game don't linger in the upload.
    shutil.rmtree(OUT, ignore_errors=True)
    count = size = 0
    for rel in game_files():
        dest = os.path.join(OUT, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copy2(os.path.join(ROOT, rel), dest)
        count += 1
        size += os.path.getsize(dest)
    print(f'{os.path.relpath(OUT, ROOT)}/: {count} files, {size / 1024 / 1024:.1f} MB')
    print('Drag everything inside that folder into the CrazyGames upload zone.')


if __name__ == '__main__':
    main()
