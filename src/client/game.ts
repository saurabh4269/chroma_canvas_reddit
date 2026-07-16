import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { MainMenu } from './scenes/MainMenu';
import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';
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
  scene: [Boot, Preloader, MainMenu, MainGame, UIScene, GameOver],
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

document.addEventListener('DOMContentLoaded', () => {
  StartGame('game-container');
});
