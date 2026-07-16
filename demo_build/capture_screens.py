#!/usr/bin/env python3
"""Capture 1920x1080 screenshots from local demo server and Reddit."""

from __future__ import annotations

import json
import os
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
SCREENSHOTS = ROOT / "screenshots"
STATIC = ROOT / "static"
VALIDATOR = Path.home() / ".claude/skills/hackathon-demo-generator/scripts/validate_screenshots.py"

VIEWPORT = {"width": 1920, "height": 1080}


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def wait_for_json(url: str, timeout: float = 30.0) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                payload = json.loads(response.read().decode())
            if payload.get("ok") or payload.get("type") == "init":
                return payload
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            pass
        time.sleep(0.25)
    raise RuntimeError(f"timed out waiting for {url}")


def start_demo_server(port: int) -> subprocess.Popen[str]:
    env = os.environ.copy()
    env["DEMO_PORT"] = str(port)
    proc = subprocess.Popen(
        ["node", str(ROOT / "demo_server.mjs")],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
        cwd=str(ROOT),
    )
    assert proc.stdout is not None
    line = proc.stdout.readline().strip()
    if not line.isdigit():
        raise RuntimeError(f"demo server failed to start: {line}")
    return proc


def stop_process(proc: subprocess.Popen[str] | None) -> None:
    if proc is None or proc.poll() is not None:
        return
    proc.send_signal(signal.SIGTERM)
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


def capture_local(base_url: str, page, shots: dict[str, Path]) -> None:
    page.set_viewport_size(VIEWPORT)

    page.goto(f"{base_url}/static/splash-demo.html", wait_until="networkidle")
    page.wait_for_timeout(800)
    page.screenshot(path=str(shots["01-splash.png"]), full_page=False)

    page.goto(f"{base_url}/game.html", wait_until="networkidle")
    page.wait_for_function(
        "() => document.querySelector('canvas') !== null", timeout=30000
    )
    page.wait_for_timeout(2500)
    page.screenshot(path=str(shots["02-main-menu.png"]), full_page=False)

    canvas = page.locator("canvas").first
    box = canvas.bounding_box()
    if box:
        page.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] * 0.78)
    page.wait_for_timeout(1500)

    for _ in range(8):
        page.keyboard.down("ArrowRight")
        page.wait_for_timeout(120)
    page.keyboard.up("ArrowRight")
    for _ in range(3):
        page.keyboard.press("Space")
        page.wait_for_timeout(350)
    page.wait_for_timeout(1200)
    page.screenshot(path=str(shots["03-gameplay.png"]), full_page=False)

    page.evaluate(
        """() => {
          const canvas = document.querySelector('canvas');
          if (!canvas || !canvas.__PHASER_GAME__) {
            const game = window.Phaser?.Games?.[0];
            if (game) game.scene.start('GameOver', { won: false, elapsedMs: 14200, x: 450, y: 280 });
            return;
          }
        }"""
    )
    page.evaluate(
        """() => {
          const games = window.Phaser?.Games ?? [];
          for (const game of games) {
            if (game.scene?.keys?.GameOver) {
              game.scene.start('GameOver', { won: false, elapsedMs: 14200, x: 450, y: 280 });
              return;
            }
          }
        }"""
    )
    page.wait_for_timeout(1500)
    page.screenshot(path=str(shots["04-death.png"]), full_page=False)

    page.evaluate(
        """() => {
          const games = window.Phaser?.Games ?? [];
          for (const game of games) {
            if (game.scene?.keys?.GameOver) {
              game.scene.start('GameOver', { won: true, elapsedMs: 11800, x: 0, y: 0 });
              return;
            }
          }
        }"""
    )
    page.wait_for_timeout(1200)
    page.screenshot(path=str(shots["05-win.png"]), full_page=False)


def capture_reddit(page, shots: dict[str, Path]) -> list[str]:
    warnings: list[str] = []
    username = os.environ.get("REDDIT_USER")
    password = os.environ.get("REDDIT_PASS")
    if not username or not password:
        return ["Reddit credentials not in env — skipping live Reddit captures"]

    try:
        page.goto("https://www.reddit.com/login/", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(2000)
        user_field = page.locator('input[name="username"]')
        pass_field = page.locator('input[name="password"]')
        if user_field.count() == 0:
            user_field = page.get_by_label("Email or username")
            pass_field = page.get_by_label("Password")
        user_field.fill(username)
        pass_field.fill(password)
        page.get_by_role("button", name="Log In").click()
        page.wait_for_timeout(5000)
    except Exception as exc:
        return [f"Reddit login failed: {exc}"]

    targets = [
        ("https://www.reddit.com/r/chroma_canvas_dev/", "06-reddit-subreddit.png"),
        ("https://www.reddit.com/r/chroma_canvas_dev/new/", "07-reddit-posts.png"),
    ]
    for url, name in targets:
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=60000)
            page.wait_for_timeout(4000)
            shots[name].parent.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(shots[name]), full_page=False)
        except Exception as exc:
            warnings.append(f"Could not capture {url}: {exc}")

    try:
        page.goto("https://developers.reddit.com/apps/chroma-canvas", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(3000)
        page.screenshot(path=str(shots["08-devvit-app.png"]), full_page=False)
    except Exception as exc:
        warnings.append(f"Devvit app page capture failed: {exc}")

    return warnings


def validate(shots: list[Path]) -> None:
    if not VALIDATOR.exists():
        print(f"warning: validator missing at {VALIDATOR}", file=sys.stderr)
        return
    subprocess.run(
        ["python3", str(VALIDATOR), *[str(p) for p in shots]],
        check=True,
    )


def main() -> None:
    SCREENSHOTS.mkdir(parents=True, exist_ok=True)
    profile_dir = tempfile.mkdtemp(prefix="chroma-capture-")
    server_proc: subprocess.Popen[str] | None = None
    warnings: list[str] = []

    shots = {
        "01-splash.png": SCREENSHOTS / "01-splash.png",
        "02-main-menu.png": SCREENSHOTS / "02-main-menu.png",
        "03-gameplay.png": SCREENSHOTS / "03-gameplay.png",
        "04-death.png": SCREENSHOTS / "04-death.png",
        "05-win.png": SCREENSHOTS / "05-win.png",
        "06-reddit-subreddit.png": SCREENSHOTS / "06-reddit-subreddit.png",
        "07-reddit-posts.png": SCREENSHOTS / "07-reddit-posts.png",
        "08-devvit-app.png": SCREENSHOTS / "08-devvit-app.png",
    }

    try:
        port = free_port()
        server_proc = start_demo_server(port)
        base_url = f"http://127.0.0.1:{port}"
        wait_for_json(f"{base_url}/health")

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(viewport=VIEWPORT, device_scale_factor=1)
            page = context.new_page()
            capture_local(base_url, page, shots)
            warnings.extend(capture_reddit(page, shots))
            browser.close()

        core = [shots[k] for k in ("01-splash.png", "02-main-menu.png", "03-gameplay.png", "04-death.png")]
        validate(core)
        print("Captured screenshots:")
        for path in sorted(SCREENSHOTS.glob("*.png")):
            print(f"  {path.name}: {path.stat().st_size:,} bytes")
        if warnings:
            print("\nWarnings:")
            for w in warnings:
                print(f"  - {w}")
    finally:
        stop_process(server_proc)
        shutil.rmtree(profile_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
