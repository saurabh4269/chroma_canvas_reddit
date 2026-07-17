import { Archive } from './scenes/Archive';
import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
import { Skins } from './scenes/Skins';
import { UIScene } from './scenes/UIScene';

const isCaptureMode =
  typeof window !== 'undefined' && window.location.search.includes('capture=1');

const config: Phaser.Types.Core.GameConfig = {
  type: isCaptureMode ? Phaser.CANVAS : AUTO,
  parent: 'game-container',
  backgroundColor: '#7ec8f0',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 768,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1200 },
      debug: false,
    },
  },
  scene: [Boot, Preloader, MainMenu, MainGame, UIScene, GameOver, Archive, Skins],
};

const StartGame = (parent: string) => {
  const game = new Game({ ...config, parent });
  window.__CHROMA_GAME__ = game;
  return game;
};

declare global {
  interface Window {
    __CHROMA_GAME__?: Game;
  }
}

/**
 * Canvas text never triggers webfont downloads, so explicitly load the
 * display faces (with a timeout guard) before booting Phaser.
 */
async function loadFonts(): Promise<void> {
  if (!('fonts' in document)) return;
  const wanted = [
    '600 32px Fredoka',
    '700 32px Fredoka',
    '600 16px Nunito',
    '700 16px Nunito',
    '800 16px Nunito',
  ];
  await Promise.race([
    Promise.all(wanted.map((f) => document.fonts.load(f))),
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ]).catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
  void loadFonts().then(() => {
    StartGame('game-container');
  });
});
