#!/usr/bin/env python3
"""Make the game's sound effects and music with the ElevenLabs API.

    python3 tools/generate_sounds.py             # generate missing sounds
    python3 tools/generate_sounds.py place win   # generate these again

Needs ELEVENLABS_API_KEY in the environment or in .env, and ffmpeg. Each
download is kept in assets/raw/sounds/; the game loads a trimmed, level-matched
copy from assets/sounds/. Every run re-processes all the raw files, which
costs no credits.
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'assets', 'raw', 'sounds')
OUT = os.path.join(ROOT, 'assets', 'sounds')
SFX_API = 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128'
SFX_MODEL = 'eleven_text_to_sound_v3'
MUSIC_API = 'https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128'
MUSIC_MODEL = 'music_v1'
STYLE = 'cute cozy mobile puzzle game sound effect, clean, no music, no voice, no reverb'

# name, seconds, prompt. js/audio.js plays them by name.
SOUNDS = [
    ('click', 0.5, f'Soft round bubble pop for a button tap, tiny and gentle, {STYLE}'),
    ('pick', 0.5, f'Squishy jelly lifted up, soft rubbery bloop rising in pitch, {STYLE}'),
    ('rotate', 0.5, f'Quick soft swish with a tiny wooden tick, a toy piece turning, {STYLE}'),
    ('place', 0.8, f'Punchy squishy jelly plop, a soft gummy toy landing on a wooden table, clear and satisfying, {STYLE}'),
    ('back', 0.8, f'Quick cartoon whoosh followed by a little bouncy boing, clear and playful, {STYLE}'),
    ('bad', 0.5, f'Gentle low wobbly boing, a soft friendly "nope" error, not harsh, {STYLE}'),
    ('hint', 1.2, f'Magical sparkle shimmer rising upward, twinkling fairy dust chime, {STYLE}'),
    ('star', 0.7, f'Single bright crystal twinkle ding, a star collected, {STYLE}'),
    ('win', 2.5, 'Short cheerful level complete jingle on xylophone and glockenspiel with sparkles, '
                 'happy and bouncy, cute cozy mobile puzzle game, clean, no voice'),
    ('meow', 1.0, 'A happy little kitten meows once, sweet and short, close-up, clean recording, no background noise'),
    ('purr', 5.0, 'Close-up recording of a content house cat purring steadily, warm soft rhythmic rumble, '
                  'clean, no other sounds'),
    # Background music: quiet enough to play for an hour without wearing thin.
    ('music', 120, 'Cozy, gentle instrumental background music for a cute cat puzzle game. Soft felt piano and '
                   'music box over warm marimba and light pizzicato strings, slow relaxed tempo around 75 BPM, '
                   'calm, warm and sparse. No drums, no vocals, no strong lead melody, no big build-ups or '
                   'sudden changes. The same mellow mood from start to end, with no intro or ending, so it loops.'),
]
MUSIC = {'music'}
# Loops and how many seconds of their end crossfade into their start, so the loop point is seamless.
LOOPS = {'purr': 0.4, 'music': 4.0}
TARGET_DB = -20  # average loudness; js/audio.js sets each sound's volume from there
PEAK_DB = -1


def api_key():
    key = os.environ.get('ELEVENLABS_API_KEY')
    env = os.path.join(ROOT, '.env')
    if not key and os.path.exists(env):
        for line in open(env):
            name, _, value = line.strip().partition('=')
            if name.strip() == 'ELEVENLABS_API_KEY':
                key = value.strip().strip('"\'')
    if not key:
        sys.exit('Set ELEVENLABS_API_KEY in the environment or in .env')
    return key


def generate(key, name, seconds, prompt):
    if name in MUSIC:
        url = MUSIC_API
        body = {'prompt': prompt, 'music_length_ms': int(seconds * 1000), 'force_instrumental': True, 'model_id': MUSIC_MODEL}
    else:
        url = SFX_API
        body = {'text': prompt, 'duration_seconds': seconds, 'prompt_influence': 0.5, 'model_id': SFX_MODEL}
        if name in LOOPS:
            body['loop'] = True
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=600) as res:
            data = res.read()
    except urllib.error.HTTPError as err:
        sys.exit(f'{name}: HTTP {err.code} {err.read().decode(errors="replace")[:400]}')
    with open(os.path.join(RAW, f'{name}.mp3'), 'wb') as f:
        f.write(data)


def ffmpeg(*args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                         capture_output=True, text=True, check=True).stdout
    return float(out)


def levels(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'volumedetect', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    mean = float(re.search(r'mean_volume: (-?[\d.]+) dB', err).group(1))
    peak = float(re.search(r'max_volume: (-?[\d.]+) dB', err).group(1))
    return mean, peak


def process(name):
    raw = os.path.join(RAW, f'{name}.mp3')
    trimmed = os.path.join(OUT, f'{name}.trim.wav')
    wav = os.path.join(OUT, f'{name}.tmp.wav')
    channels = '2' if name in MUSIC else '1'
    # Trim the silence at both ends, measured from the sound's own peak so
    # quiet downloads keep their tails.
    _, peak = levels(raw)
    ffmpeg('-i', raw, '-af',
           f'silenceremove=start_periods=1:start_threshold={peak - 40:.1f}dB,areverse,'
           f'silenceremove=start_periods=1:start_threshold={peak - 50:.1f}dB,areverse',
           '-ac', channels, trimmed)
    end = duration(trimmed)
    if name in LOOPS:
        # The last few seconds fade out over the fading-in start, and the result
        # is that much shorter, so its end runs straight into its start.
        x = LOOPS[name]
        ffmpeg('-i', trimmed, '-filter_complex',
               f'[0]atrim=start={end - x},asetpts=PTS-STARTPTS,afade=t=out:d={x}:curve=qsin[tail];'
               f'[0]atrim=end={end - x},asetpts=PTS-STARTPTS,afade=t=in:d={x}:curve=qsin[body];'
               '[body][tail]amix=inputs=2:duration=first:normalize=0',
               wav)
        os.remove(trimmed)
        fade = ''
    else:
        # Fade the end so it never clicks.
        os.replace(trimmed, wav)
        tail = min(0.3, end / 4)
        fade = f',afade=t=in:d=0.004,afade=t=out:st={end - tail:.3f}:d={tail:.3f}'
    mean, peak = levels(wav)
    gain = min(TARGET_DB - mean, PEAK_DB - peak)
    out = os.path.join(OUT, f'{name}.mp3')
    quality = ['-b:a', '96k'] if name in MUSIC else ['-q:a', '4']
    ffmpeg('-i', wav, '-af', f'volume={gain:.2f}dB{fade}', '-ar', '44100', '-c:a', 'libmp3lame', *quality, out)
    os.remove(wav)
    print(f'{name}: {duration(out):.2f}s, {os.path.getsize(out) / 1024:.0f} KB, gain {gain:+.1f} dB')


def main():
    names = [name for name, _, _ in SOUNDS]
    redo = sys.argv[1:]
    unknown = [n for n in redo if n not in names]
    if unknown:
        sys.exit(f'Unknown sound: {", ".join(unknown)}. Sounds: {", ".join(names)}')
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    key = None
    for name, seconds, prompt in SOUNDS:
        if name in redo or not os.path.exists(os.path.join(RAW, f'{name}.mp3')):
            key = key or api_key()
            print(f'{name}: generating {seconds}s', flush=True)
            generate(key, name, seconds, prompt)
    for name in names:
        process(name)


if __name__ == '__main__':
    main()
