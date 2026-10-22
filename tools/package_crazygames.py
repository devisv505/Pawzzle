#!/usr/bin/env python3
"""Zip the game for upload to CrazyGames.

    python3 tools/package_crazygames.py      # -> dist/pawzzle-crazygames.zip

The zip has index.html at its root plus only what the game loads at runtime,
so source art, docs, tests, tools and prototypes stay out of the upload.
"""
import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INCLUDE = ['index.html', 'css', 'js', 'assets/img', 'assets/fonts']
OUT = os.path.join(ROOT, 'dist', 'pawzzle-crazygames.zip')


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
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    count = 0
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as zf:
        for rel in game_files():
            zf.write(os.path.join(ROOT, rel), rel.replace(os.sep, '/'))
            count += 1
    print(f'{os.path.relpath(OUT, ROOT)}: {count} files, {os.path.getsize(OUT) / 1024:.0f} KB')


if __name__ == '__main__':
    main()
