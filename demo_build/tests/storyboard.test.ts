import {describe, expect, it} from 'vitest';
import {
  DURATION_SECONDS,
  FPS,
  GAMEPLAY_VIDEO,
  REQUIRED_SCREENSHOTS,
  REQUIRED_VIDEOS,
  SCENES,
  TOTAL_FRAMES,
  TRANSITION_FRAMES,
} from '../src/storyboard';

describe('storyboard contract', () => {
  it('has expected scene order', () => {
    expect(SCENES.map((s) => s.id)).toEqual([
      'cold-open',
      'mechanism',
      'gameplay',
      'community',
      'close',
    ]);
  });

  it('computes total frames with transition overlap', () => {
    const sum = SCENES.reduce((t, s) => t + s.durationInFrames, 0);
    expect(TOTAL_FRAMES).toBe(sum - TRANSITION_FRAMES * (SCENES.length - 1));
  });

  it('targets hackathon-friendly duration under 60s', () => {
    expect(DURATION_SECONDS).toBeGreaterThanOrEqual(35);
    expect(DURATION_SECONDS).toBeLessThanOrEqual(60);
  });

  it('requires real capture filenames', () => {
    expect(REQUIRED_SCREENSHOTS).toEqual([
      '01-splash.png',
      '02-main-menu.png',
      '04-death.png',
    ]);
    expect(REQUIRED_VIDEOS).toEqual([GAMEPLAY_VIDEO]);
  });

  it('centers the film on continuous gameplay video', () => {
    const gameplay = SCENES.find((s) => s.id === 'gameplay');
    expect(gameplay).toBeTruthy();
    const others = SCENES.filter((s) => s.id !== 'gameplay').reduce(
      (t, s) => t + s.durationInFrames,
      0,
    );
    expect(gameplay!.durationInFrames).toBeGreaterThan(others * 0.55);
  });

  it('uses positive scene durations', () => {
    for (const scene of SCENES) {
      expect(scene.durationInFrames).toBeGreaterThan(0);
    }
  });

  it('matches fps assumptions', () => {
    expect(FPS).toBe(30);
  });
});
