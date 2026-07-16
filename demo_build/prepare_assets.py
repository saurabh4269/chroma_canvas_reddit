#!/usr/bin/env python3
"""Validate, copy screenshots/video and generate audio into public/."""

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCREENSHOTS = ROOT / "screenshots"
PUBLIC = ROOT / "public"
PUBLIC_SHOTS = PUBLIC / "screenshots"
PUBLIC_VIDEO = PUBLIC / "video"
PUBLIC_AUDIO = PUBLIC / "audio"
VALIDATOR = Path.home() / ".claude/skills/hackathon-demo-generator/scripts/validate_screenshots.py"
GENERATOR = ROOT / "generate_audio.py"
META = SCREENSHOTS / "gameplay.meta.json"

REQUIRED = [
    "01-splash.png",
    "02-main-menu.png",
    "04-death.png",
]

OPTIONAL = [
    "05-win.png",
    "06-reddit-subreddit.png",
    "07-reddit-posts.png",
    "08-devvit-app.png",
]

REQUIRED_VIDEO = "gameplay.mp4"


def storyboard_duration() -> float:
    """Approximate composition length for score generation."""
    # cold-open 105 + mechanism 135 + gameplay(~23.77s*30+30) + community 165 + close 135
    # minus 4 transitions * 15 = keep in sync with src/storyboard.ts
    gameplay_seconds = 23.77
    if META.exists():
        try:
            gameplay_seconds = float(json.loads(META.read_text()).get("durationSeconds", gameplay_seconds))
        except (json.JSONDecodeError, TypeError, ValueError):
            pass
    gameplay_frames = round(gameplay_seconds * 30) + 30
    scene_frames = 105 + 135 + gameplay_frames + 165 + 135
    total_frames = scene_frames - 15 * 4
    return total_frames / 30.0


def main() -> None:
    missing = [name for name in REQUIRED if not (SCREENSHOTS / name).exists()]
    video_src = SCREENSHOTS / REQUIRED_VIDEO
    if not video_src.exists():
        missing.append(REQUIRED_VIDEO)
    if missing:
        raise SystemExit(
            f"Missing required captures: {', '.join(missing)}\n"
            "Run: npm run capture:gameplay"
        )

    to_validate = [SCREENSHOTS / name for name in REQUIRED]
    if VALIDATOR.exists():
        subprocess.run(
            ["python3", str(VALIDATOR), *[str(p) for p in to_validate]],
            check=True,
        )

    if video_src.stat().st_size < 80_000:
        raise SystemExit(f"Gameplay video suspiciously small: {video_src}")

    if PUBLIC.exists():
        shutil.rmtree(PUBLIC)
    PUBLIC_SHOTS.mkdir(parents=True)
    PUBLIC_VIDEO.mkdir(parents=True)
    PUBLIC_AUDIO.mkdir(parents=True)

    for name in REQUIRED + OPTIONAL:
        src = SCREENSHOTS / name
        if src.exists():
            shutil.copy2(src, PUBLIC_SHOTS / name)

    shutil.copy2(video_src, PUBLIC_VIDEO / REQUIRED_VIDEO)

    duration = max(40.0, storyboard_duration() + 2.0)
    subprocess.run(
        ["python3", str(GENERATOR), str(PUBLIC_AUDIO / "score.wav"), "--duration", str(duration)],
        check=True,
    )

    print(f"Prepared {PUBLIC} (score {duration:.1f}s)")
    for path in sorted(PUBLIC.rglob("*")):
        if path.is_file():
            print(f"  {path.relative_to(PUBLIC)} ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
