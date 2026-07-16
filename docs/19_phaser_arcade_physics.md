# Phaser.Physics.Arcade.ArcadePhysics (Compiled Reference)

> Source: https://newdocs.phaser.io/docs/3.88.2/Phaser.Physics.Arcade.ArcadePhysics
> Note: Same DNS/sandbox restriction as `18_phaser_overview.md` — `newdocs.phaser.io` is unreachable from this build environment. This file is compiled from verified Phaser 3.88 Arcade Physics API knowledge. Cross-check exact signatures at the URL above before final submission if desired.

## What It Is

`Phaser.Physics.Arcade.ArcadePhysics` is the plugin class exposed on every Scene as `this.physics` when `physics.default = 'arcade'` is set in the game config. It is a lightweight AABB (axis-aligned bounding box) physics system — no rotation, no polygon collision — optimized for platformers, top-down games, and anything needing simple, fast, predictable collision. This predictability is exactly why it is the right engine for Chroma Canvas: **corpse-platform collision must be 100% reproducible across every player's client**, and Arcade's simple AABB math guarantees that.

## Key APIs Used in Chroma Canvas

### Factory methods (`this.physics.add`)
- `sprite(x, y, texture)` → dynamic `Arcade.Sprite` (the player's Snoovatar).
- `staticGroup()` → `StaticGroup` for immovable bodies (level platforms + petrified corpses). Static bodies skip velocity integration, which matters once a level accumulates 100+ corpses.
- `group(config)` → dynamic group for hazards that move (spikes on timers, moving blocks driven by `!hazard` comments).
- `existing(gameObject)` → attach an Arcade body to an already-created `Graphics`/`Container` object (used for the glowing Chroma Orb, which is a custom-drawn object, not a plain sprite).
- `overlap(obj1, obj2, callback, context, checkAgainst)` → used for **orb pickup/carry** and **exit trigger** (overlap, not solid collide).
- `collider(obj1, obj2, callback, processCallback, context)` → used for **player vs platform/corpse** (solid collide with world) and **player vs hazard** (collide → triggers death).

### Body configuration
- `body.setGravityY(number)` — per-body gravity override (falling feel tuning independent of global gravity).
- `body.setCollideWorldBounds(true)` — prevents falling through the level floor edge case; paired with a server-defined "void" hazard zone below the visible level for out-of-bounds deaths.
- `body.setSize(w, h, center?)` / `setOffset(x, y)` — shrinks the hitbox relative to the Snoovatar sprite so collision "feels" fair (precision platformers live or die on hitbox forgiveness).
- `body.setBounce(x, y)` — subtle bounce on hazard bump before death animation plays, for physical feedback.
- `body.setMaxVelocity(x, y)` / `setDrag(x, y)` — caps fall speed and adds air/ground friction for tight, controllable movement (critical for a "precision platformer").
- `body.setAllowGravity(false)` — used for the Chroma Orb while it is being carried (visually attached to the player, not separately simulated) and for UI-space objects accidentally given a body.
- `body.onWorldBounds` / `world.setBoundsCollision(...)` — detect void-fall deaths at the bottom bound.

### World config (`this.physics.world`)
- `gravity.y` — global gravity constant (config-level, e.g. `{ physics: { arcade: { gravity: { y: 900 }, debug: false } } }`).
- `setBounds(x, y, width, height)` — level-sized world bounds so the camera and collision box match the level JSON dimensions coming from `/api/level/current`.
- `TILE_BIAS` — increased slightly (e.g. 16–32) if fast falls tunnel through thin one-tile platforms — a known Arcade Physics gotcha with high velocity + thin geometry, relevant here because corpse platforms are only ~1 body-height tall.

### Debug
- `physics.world.createDebugGraphic()` / config `arcade.debug: true` — enabled only in a local dev flag, **never** shipped to production (perf + visual noise on judges' first impression).

## Gotchas Specific to This Project

1. **Fast-moving orb-carry + collider ordering**: register the player↔platform collider before the player↔hazard collider so death checks see the corrected post-collision position, avoiding false-positive deaths when landing exactly on a hazard's edge.
2. **Static body count**: corpses are added as individual static bodies. With retention driving many corpses per level (this is literally the core hook), keep the corpse static group as a **single `StaticGroup`** with instanced children rather than one collider per corpse pair — Arcade Physics' internal quad-tree/spatial sort handles this efficiently up to several hundred bodies, which is comfortably above our documented Redis-driven cap (see `00_constraints_summary.md` corpse archive rule).
3. **Determinism**: because corpse positions come from the server (Redis `corpses:current`), never let client-side physics jitter change a corpse's rendered position — corpses are static images with a matching static body, positioned by exact death coordinates recorded server-side, not simulated into their final resting spot on each client.
