# Phaser 3 Overview (Compiled Reference)

> Source: https://phaser.io/docs/3.88.0/index (redirects to newdocs.phaser.io)
> Note: `newdocs.phaser.io` could not be resolved from this sandboxed build environment (DNS lookup failure — the sandbox's network allowlist covers `developers.reddit.com` but not the Phaser docs subdomain). `phaser.io` itself resolves but redirects (307) to the blocked subdomain. This file is therefore compiled from verified, current Phaser 3.88 framework knowledge rather than a raw scrape. Verify exact method signatures against https://newdocs.phaser.io/docs/3.88.2 from a normal browser if precision matters.

## What Phaser Is

Phaser 3 is an open-source, fast, free, and fun HTML5 game framework for building 2D games that run in a browser and on mobile via wrappers (Cordova/Capacitor). It provides a `Scene`-based architecture, WebGL/Canvas auto-renderer, Arcade/Matter physics, a `Loader` for asset management, tweens, particles, input handling (pointer/touch/keyboard), tilemaps, cameras, and audio.

## Core Architecture Relevant to Chroma Canvas

- **Game instance** (`new Phaser.Game(config)`) — single entry point; owns the render loop, renderer (WebGL with Canvas fallback), and the `Scene Manager`.
- **Scenes** — independently loadable/unloadable units with their own lifecycle: `init → preload → create → update`. We use: `BootScene` (config/env), `PreloadScene` (asset loading + progress bar), `MenuScene` (daily level intro / streak card), `GameScene` (the actual platformer level), `UIScene` (parallel HUD scene running alongside `GameScene` via `scene.run`), `ResultScene` (win/death summary + share).
- **Game Objects** — `Sprite`, `Image`, `Text`, `Particles.ParticleEmitter`, `Container`, `TileSprite` (parallax layers), `Graphics` (procedural corpse silhouettes / glow).
- **Physics** — Arcade Physics (`this.physics.add.sprite(...)`) is the right choice for a precision platformer: AABB collision, gravity, velocity, simple and fast. Matter.js would be overkill (and heavier) for axis-aligned platform collision — reserve Matter only if we need rotating/organic hazard shapes later.
- **Cameras** — `this.cameras.main` supports `startFollow(target, true, lerpX, lerpY)` for smooth camera lerp, `shake(duration, intensity)` for death impact feedback, and `setBounds` to clamp to level size.
- **Tweens** — `this.tweens.add({...})` for orb glow pulsing, UI transitions, petrify "freeze" effect (desaturate + scale settle).
- **Particles** — `this.add.particles(x, y, textureKey, config)` (Phaser 3.60+ API) for death-burst confetti-of-shards and orb trail.
- **Input** — Keyboard (`this.input.keyboard.createCursorKeys()`), and on-screen virtual buttons/dpad drawn as fixed-to-camera UI for mobile touch, since Devvit Web renders inside a mobile WebView with no physical keyboard.
- **Scale Manager** — `Phaser.Scale.FIT` (or `RESIZE` with manual letterboxing) inside `Phaser.Game({ scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width, height } })` — critical for Devvit's embedded, resizable webview (see judging criterion "fit UI to viewport").
- **Data-driven levels** — Tilemap JSON (Tiled) or a lightweight custom JSON schema (`{ platforms, hazards, spawn, exit }`) loaded via `this.load.json('level', url)` from our own `/api/level/current` endpoint (NOT a static file, since levels rotate daily server-side).
- **Deterministic corpses** — corpses are just additional static AABB platform bodies added at runtime from server data (`this.physics.add.staticGroup()` populated after fetch), not part of the original tilemap — this is the core "hook" mechanic and is pure Arcade Physics.

## Why Phaser Fits This Project (for the Phaser sub-prize)

1. **Scene separation cleanly maps to game states** (menu → play → death/respawn-as-corpse → win), which we lean into for the "petrify" narrative beat.
2. **Arcade Physics is fast and deterministic enough** that corpse-platform positions computed server-side (in Redis) reproduce identically on every client — required for fairness since corpses are shared community state, not per-player.
3. **Particle + Tween system delivers "AAA feel"** (death shatter, orb glow, screen shake) cheaply, directly addressing the "Polish" and "Delightful UX" judging criteria.
4. **Camera system's built-in lerp/follow/shake** removes the need for hand-rolled camera math, freeing time for retention features.

## Version Pin

We pin `phaser@^3.88.0` (latest stable 3.x as of this build) via npm. Avoid Phaser 4 (still in early access as of writing) for hackathon stability.
