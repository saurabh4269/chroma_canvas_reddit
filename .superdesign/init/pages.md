# Pages / Surfaces

## Splash
Entry: `src/client/splash.html`
Dependencies:
- `src/client/splash.css`
- `src/client/splash.ts`
- `public/snoo.png`

## Game shell
Entry: `src/client/game.html`
Dependencies:
- `src/client/game.css`
- `src/client/game.ts`
  - `src/client/scenes/Boot.ts`
  - `src/client/scenes/Preloader.ts`
  - `src/client/scenes/MainMenu.ts`
  - `src/client/scenes/Game.ts`
  - `src/client/scenes/UIScene.ts`
  - `src/client/scenes/GameOver.ts`
  - `src/client/journeys.ts`
  - `src/client/net/api.ts`
  - `public/assets/bg.png`, `logo.png`

## Main menu
Entry: `src/client/scenes/MainMenu.ts`

## In-game HUD
Entry: `src/client/scenes/UIScene.ts`

## Game over
Entry: `src/client/scenes/GameOver.ts`
