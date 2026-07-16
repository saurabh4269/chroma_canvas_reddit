import { Scene } from 'phaser';
import type { GameObjects } from 'phaser';
import type { InitResponse } from '../../shared/api';
import { fetchInit } from '../net/api';
import { reportAppReady } from '../journeys';
import { FONTS, HEX, COLORS } from '../theme';
import { generateGameTextures } from '../ui/textures';
import { addDisplayTitle, drawSunnyBackdrop, floatBob } from '../ui/phaserUi';

export class Preloader extends Scene {
  private initReady!: Promise<void>;
  private barFill!: GameObjects.Graphics;
  private barW = 260;

  constructor() {
    super('Preloader');
  }

  init() {
    // Textures must exist before we draw the scene with them
    generateGameTextures(this);

    const { width, height } = this.scale;
    drawSunnyBackdrop(this, width, height);

    const orb = this.add
      .image(width / 2, height * 0.3, 'cc-orb')
      .setScale(1.6);
    floatBob(this, orb, 7);

    addDisplayTitle(this, width / 2, height * 0.44, 'Chroma Canvas', 46);

    this.add
      .text(width / 2, height * 0.53, 'Warming the canvas…', {
        fontFamily: FONTS.body,
        fontSize: '16px',
        fontStyle: '700',
        color: HEX.ink,
      })
      .setOrigin(0.5)
      .setAlpha(0.8);

    // Progress track + rounded fill
    const barX = width / 2 - this.barW / 2;
    const barY = height * 0.62;
    const track = this.add.graphics();
    track.fillStyle(COLORS.ink, 0.14);
    track.fillRoundedRect(barX + 2, barY + 3, this.barW, 16, 8);
    track.fillStyle(COLORS.cream, 0.95);
    track.fillRoundedRect(barX, barY, this.barW, 16, 8);
    track.lineStyle(2, COLORS.sun, 0.6);
    track.strokeRoundedRect(barX, barY, this.barW, 16, 8);

    this.barFill = this.add.graphics();
    const drawFill = (p: number) => {
      this.barFill.clear();
      const wFill = Math.max(12, this.barW * p - 6);
      this.barFill.fillStyle(COLORS.coral, 1);
      this.barFill.fillRoundedRect(barX + 3, barY + 3, wFill, 10, 5);
      this.barFill.fillStyle(0xffffff, 0.35);
      this.barFill.fillRoundedRect(barX + 5, barY + 4, Math.max(6, wFill - 4), 3, 1.5);
    };
    drawFill(0.06);

    this.load.on('progress', (p: number) => drawFill(Math.max(0.06, p)));

    this.initReady = fetchInit()
      .then((data) => {
        this.registry.set('init', data);
        this.registry.set('initAt', Date.now());
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
  }

  create() {
    void this.initReady
      .then(() => this.loadSnoovatars())
      .then(() => {
        reportAppReady();
        this.scene.start('MainMenu');
      });
  }

  /**
   * Second-phase loader: the player's snoovatar + the most recent petrified
   * snoovatars. Never blocks the game — resolves on completion, error, or a
   * 2.5s timeout, and the world falls back to procedural sprites per-texture.
   */
  private loadSnoovatars(): Promise<void> {
    return new Promise((resolve) => {
      const init = this.registry.get('init') as InitResponse | undefined;
      const keyByUrl = new Map<string, string>();
      const jobs: Array<[string, string]> = [];

      if (init?.snoovatarUrl) {
        jobs.push(['snoo-self', init.snoovatarUrl]);
      }
      for (const c of (init?.corpses ?? []).filter((c) => c.s).slice(-10)) {
        const url = c.s!;
        if (!keyByUrl.has(url)) {
          const key = `snoo-c-${keyByUrl.size}`;
          keyByUrl.set(url, key);
          jobs.push([key, url]);
        }
      }
      this.registry.set('snooKeys', Object.fromEntries(keyByUrl));

      if (jobs.length === 0) {
        resolve();
        return;
      }

      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      this.load.setPath(''); // preload() set 'assets'; snoovatar URLs are absolute
      this.load.crossOrigin = 'anonymous';
      for (const [key, url] of jobs) {
        this.load.image(key, url);
      }
      this.load.once('complete', done);
      this.time.delayedCall(2500, done);
      this.load.start();
    });
  }
}
