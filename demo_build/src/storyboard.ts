export const FPS = 30;
export const TRANSITION_FRAMES = 15;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Continuous headed Playwright capture (Phaser CANVAS / capture=1). */
export const GAMEPLAY_VIDEO = 'video/gameplay.mp4';
export const GAMEPLAY_VIDEO_SECONDS = 34.67;

/**
 * Video-first arc for Games with a Hook:
 * cold open → mechanism → continuous gameplay → community → close.
 */
export const SCENES = [
  {id: 'cold-open', durationInFrames: 105},
  {id: 'mechanism', durationInFrames: 135},
  {
    id: 'gameplay',
    durationInFrames: Math.round(GAMEPLAY_VIDEO_SECONDS * FPS) + 30,
    videos: [GAMEPLAY_VIDEO],
    screenshots: ['02-main-menu.png', '04-death.png'],
  },
  {
    id: 'community',
    durationInFrames: 165,
    screenshots: ['06-reddit-subreddit.png', '07-reddit-posts.png'],
  },
  {id: 'close', durationInFrames: 135},
] as const;

const sceneFrames = SCENES.reduce((total, scene) => total + scene.durationInFrames, 0);

export const TOTAL_FRAMES =
  sceneFrames - TRANSITION_FRAMES * (SCENES.length - 1);

export const DURATION_SECONDS = TOTAL_FRAMES / FPS;

export const REQUIRED_SCREENSHOTS = [
  '01-splash.png',
  '02-main-menu.png',
  '04-death.png',
] as const;

export const REQUIRED_VIDEOS = [GAMEPLAY_VIDEO] as const;

export const OPTIONAL_SCREENSHOTS = [
  '05-win.png',
  '06-reddit-subreddit.png',
  '07-reddit-posts.png',
  '08-devvit-app.png',
] as const;

export type SceneId = (typeof SCENES)[number]['id'];
