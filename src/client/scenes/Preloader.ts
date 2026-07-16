import { Scene } from 'phaser';
import { fetchInit } from '../net/api';
import { reportAppReady } from '../journeys';
import { FONTS, HEX, COLORS } from '../theme';
import { generateGameTextures } from '../ui/textures';
import { drawSunnyBackdrop } from '../ui/phaserUi';

export class Preloader extends Scene {
  private initReady!: Promise<void>;

  constructor() {
    super('Preloader');
  }

  init() {
    const { width, height } = this.scale;
    drawSunnyBackdrop(this, width, height);

    this.add
      .text(width / 2, height * 0.32, 'Chroma Canvas', {
        fontFamily: FONTS.display,
        fontSize: '44px',
        color: HEX.ink,
        stroke: HEX.sunSoft,
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.42, 'Warming the canvas…', {
        fontFamily: FONTS.body,
        fontSize: '16px',
        color: HEX.inkSoft,
      })
      .setOrigin(0.5);

    this.add
      .rectangle(width / 2, height * 0.58, 280, 18, COLORS.cream, 0.9)
      .setStrokeStyle(2, COLORS.sunSoft);

    const bar = this.add
      .rectangle(width / 2 - 138, height * 0.58, 4, 12, COLORS.coral)
      .setOrigin(0, 0.5);

    this.load.on('progress', (p: number) => {
      bar.width = 4 + 268 * p;
    });

    this.initReady = fetchInit()
      .then((data) => {
        this.registry.set('init', data);
        this.registry.set('initError', null);
      })
      .catch((err) => {
        console.error('init fetch failed', err);
        this.registry.set(
          'initError',
          err instanceof Error ? err.message : 'init failed'
        );
      });
  }

  preload() {
    this.load.setPath('assets');
    this.load.image('logo', 'logo.png');
    generateGameTextures(this);
  }

  create() {
    void this.initReady.then(() => {
      reportAppReady();
      this.scene.start('MainMenu');
    });
  }
}
