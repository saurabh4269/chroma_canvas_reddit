import type { Scene } from 'phaser';
import { COLORS } from '../theme';

/** Procedural sprites for readable sunny-arcade world/UI at Reddit webview sizes. */
export function generateGameTextures(scene: Scene): void {
  if (!scene.textures.exists('cc-platform')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.platformShadow, 1);
    g.fillRoundedRect(0, 4, 64, 20, 4);
    g.fillStyle(COLORS.platform, 1);
    g.fillRoundedRect(0, 0, 64, 18, 4);
    g.fillStyle(COLORS.grass, 1);
    g.fillRoundedRect(0, 0, 64, 6, { tl: 4, tr: 4, bl: 0, br: 0 });
    g.fillStyle(COLORS.grassDeep, 0.55);
    g.fillRect(4, 2, 8, 3);
    g.fillRect(20, 1, 10, 3);
    g.fillRect(42, 2, 12, 3);
    g.generateTexture('cc-platform', 64, 24);
    g.destroy();
  }

  if (!scene.textures.exists('cc-corpse')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.corpseDeep, 1);
    g.fillRoundedRect(0, 2, 48, 12, 3);
    g.fillStyle(COLORS.corpse, 1);
    g.fillRoundedRect(0, 0, 48, 12, 3);
    g.fillStyle(0xffffff, 0.12);
    g.fillRect(4, 2, 16, 3);
    g.generateTexture('cc-corpse', 48, 14);
    g.destroy();
  }

  if (!scene.textures.exists('cc-player')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.playerShade, 1);
    g.fillRoundedRect(2, 6, 24, 32, 6);
    g.fillStyle(COLORS.player, 1);
    g.fillRoundedRect(0, 4, 24, 32, 6);
    g.fillStyle(COLORS.cream, 1);
    g.fillCircle(8, 14, 3);
    g.fillCircle(16, 14, 3);
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(8.5, 14.5, 1.4);
    g.fillCircle(16.5, 14.5, 1.4);
    g.fillStyle(COLORS.sunSoft, 1);
    g.fillRoundedRect(6, 0, 12, 6, 3);
    g.generateTexture('cc-player', 28, 40);
    g.destroy();
  }

  if (!scene.textures.exists('cc-orb')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.orbGlow, 0.35);
    g.fillCircle(16, 16, 16);
    g.fillStyle(COLORS.orb, 0.95);
    g.fillCircle(16, 16, 10);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(12, 12, 3.5);
    g.generateTexture('cc-orb', 32, 32);
    g.destroy();
  }

  if (!scene.textures.exists('cc-spike')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.hazard, 1);
    g.fillTriangle(0, 16, 8, 0, 16, 16);
    g.fillStyle(0xffffff, 0.25);
    g.fillTriangle(5, 14, 8, 4, 9, 14);
    g.generateTexture('cc-spike', 16, 16);
    g.destroy();
  }

  if (!scene.textures.exists('cc-btn-coral')) {
    makeButtonTexture(scene, 'cc-btn-coral', COLORS.coral, COLORS.coralDeep);
  }
  if (!scene.textures.exists('cc-btn-sun')) {
    makeButtonTexture(scene, 'cc-btn-sun', COLORS.sun, 0xe0a830);
  }
  if (!scene.textures.exists('cc-btn-sky')) {
    makeButtonTexture(scene, 'cc-btn-sky', COLORS.skyDeep, 0x2f7fb0);
  }
  if (!scene.textures.exists('cc-btn-ink')) {
    makeButtonTexture(scene, 'cc-btn-ink', COLORS.ink, 0x0f1729);
  }

  if (!scene.textures.exists('cc-panel')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.cream, 0.92);
    g.fillRoundedRect(0, 0, 320, 120, 18);
    g.lineStyle(3, COLORS.sunSoft, 0.7);
    g.strokeRoundedRect(1.5, 1.5, 317, 117, 18);
    g.generateTexture('cc-panel', 320, 120);
    g.destroy();
  }

  if (!scene.textures.exists('shard')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 6, 6, 2);
    g.generateTexture('shard', 6, 6);
    g.destroy();
  }
}

function makeButtonTexture(
  scene: Scene,
  key: string,
  fill: number,
  shade: number
): void {
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(shade, 1);
  g.fillRoundedRect(0, 6, 220, 44, 14);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(0, 0, 220, 44, 14);
  g.fillStyle(0xffffff, 0.18);
  g.fillRoundedRect(8, 4, 204, 14, 8);
  g.generateTexture(key, 220, 50);
  g.destroy();
}
