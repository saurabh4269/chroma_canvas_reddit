# Chroma Canvas — Hackathon Demo Video

Reproducible Remotion product film for the Reddit **Games with a Hook** submission.
The core of the film is **continuous Phaser gameplay video** (not a screenshot slideshow).

## Quick start

```bash
cd demo_build
npm install
npx playwright install chromium   # first time only

# From repo root, ensure the client is built:
# npm run build

npm run capture:gameplay          # headed Chromium + continuous gameplay.mp4
npm run check                     # tests + typecheck + compositions
npm run stills                    # representative frames for visual QA
npm run render                    # canonical demo.mp4
```

## Capture method

`capture_gameplay.mjs` starts `demo_server.mjs` (mock `/api/init`), launches **headed** Playwright Chromium with Phaser `capture=1` (CANVAS renderer), drives an in-page platformer bot, and records the viewport with Playwright `recordVideo`. Output is transcoded to `screenshots/gameplay.mp4` (1920×1080).

Legacy still-only capture remains as `npm run capture` → `capture_screens.mjs`.

## What gets captured

| Asset | Source |
|---|---|
| `gameplay.mp4` | Continuous headed run: menu → climb → death → win |
| `01-splash.png` | Static splash |
| `02-main-menu.png` | Phaser main menu |
| `04-death.png` / `05-win.png` | GameOver stills |
| `06–08` | Reddit thread demo HTML + GitHub repo |

No Reddit login or credentials are required or stored.

## Audio

Original sunny-arcade score (no copyrighted music), generated locally:

```bash
python3 generate_score.py public/audio/score.wav --duration 54 --bpm 128
# or via asset prep (preferred):
npm run assets
```

`prepare_assets.py` syncs score length and scene-hit stingers to `src/storyboard.ts`.
Wired in Remotion via `@remotion/media` `<Audio>` with boundary fades.

## Output

- **Canonical video:** `demo_build/demo.mp4`
- **Poster frame:** `npm run poster` → `poster.png`

## Verify encoded output

```bash
ffprobe -v error \
  -show_entries format=duration,size,bit_rate:stream=codec_name,codec_type,width,height,r_frame_rate,pix_fmt,sample_rate,channels \
  -of default=noprint_wrappers=1 demo.mp4

ffmpeg -v error -i demo.mp4 \
  -vf "fps=1/5,scale=480:-1,tile=4x2" -frames:v 1 contact-sheet.png
```
