# Components

Phaser canvas game — no React/shadcn primitives. Shared UI is procedural GameObjects.

## Splash (DOM)

- `src/client/splash.html` + `splash.css` + `splash.ts`
- Brand title, description, level info, Play CTA, Snoo mascot

## Phaser scenes (UI surfaces)

- `MainMenu` — level intro / tap to start
- `UIScene` — HUD chips + touch pads
- `GameOver` — win/death result + action buttons
- `Preloader` — branded loading bar

No shared Button/Card component library exists yet; helpers live under `src/client/ui/`.
