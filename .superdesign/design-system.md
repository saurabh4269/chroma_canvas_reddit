# Chroma Canvas Design System

**Art direction:** Sunny ink-outline cartoon — the look of a high-end casual platformer. Chunky rounded shapes with a consistent dark-navy (`#2B3A63`) outline on every world sprite, warm daylight palette, cream cards, coral CTAs, aqua chroma orb. Not purple neon, not flat programmer-art rectangles.

## Tokens

Single source of truth: `src/client/theme.ts` (`COLORS`/`HEX`). Sky ramp `skyDeep → skyMid → skyLight → horizon`; dusk ramp (`duskTop/Mid/Warm`) reserved for the death screen.

## Craft rules

- All procedural sprites are drawn at **2x resolution** and displayed at half size (`src/client/ui/textures.ts`) so curves and outlines stay crisp.
- Gradients are painted as interpolated bands (`fillVerticalGradient`) — `fillGradientStyle` is WebGL-only and breaks on the Canvas renderer.
- Panels/buttons are drawn at exact size with Graphics (never stretched textures): cream card + soft shadow + warm border; buttons are 3D chunks whose face physically drops on press.
- Webfonts are explicitly loaded before Phaser boots (`game.ts loadFonts`) — canvas text never triggers font downloads.

## Type pairing

- Display / titles: Fredoka 600–700 (big titles = cream face, ink outline, coral drop-chunk via `addDisplayTitle`)
- UI / body: Nunito 600–800
- HUD: Nunito 800 15px in icon pills (`addHudPill`)

## Surfaces

- Splash: scenic hero — rotating sun rays, CSS puffy clouds, layered SVG hills with trees/bushes, floating outlined orb, pill CTA with hard bottom chunk
- Main menu: bobbing player-with-orb hero, eyebrow pill, display title, level badge pill, cream info card, pulsing chunky CTA
- World: banded sky, sun rays, drifting clouds, 3 hill layers (haze / pines / bushes), hand-drawn grass-capped platforms (scalloped lip, blades, flowers, pebbles, contact shadow), sleeping corpse stones, ink-outlined hazards, dashed rotating portal + GOAL pennant
- Player juice: squash & stretch on jump/land, run lean, dust puffs, grounded shadow blob, orb sparkle trail with soft-follow
- HUD: two icon pills (skull fallen / clock timer); circular glass touch pads with drawn arrows
- Win: bright sky, radiant orb hero + pulse ring, confetti rain; Death: dusk gradient, sleeping headstone + soul wisp + zzz

## Motion (purposeful only)

1. Sun-ray slow rotation + halo breathe
2. Primary CTA pulse; button press drops face onto chunk
3. Player squash/stretch + dust; death shards / win flash + confetti
