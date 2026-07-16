#!/usr/bin/env python3
"""Render representative stills for visual inspection before full render."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STILLS = ROOT / "stills"
# Keep within composition duration (currently ~1223 frames @ 30fps).
FRAMES = [24, 140, 320, 520, 780, 1000, 1180]


def main() -> None:
    STILLS.mkdir(exist_ok=True)
    for frame in FRAMES:
        out = STILLS / f"frame-{frame:04d}.png"
        subprocess.run(
            [
                "npx",
                "remotion",
                "still",
                "src/index.ts",
                "Demo",
                str(out),
                f"--frame={frame}",
            ],
            cwd=str(ROOT),
            check=True,
        )
    print(f"Rendered {len(FRAMES)} stills to {STILLS}")


if __name__ == "__main__":
    main()
