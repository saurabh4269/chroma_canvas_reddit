import { Scene, GameObjects } from 'phaser';
import type { InitResponse } from '../../shared/api';
import { reportJourneyStart } from '../journeys';

export class MainMenu extends Scene {
  background: GameObjects.Image | null = null;
  title: GameObjects.Text | null = null;
  subtitle: GameObjects.Text | null = null;
  hint: GameObjects.Text | null = null;

  constructor() {
    super('MainMenu');
  }

  init(): void {
    this.background = null;
    this.title = null;
    this.subtitle = null;
    this.hint = null;
  }

  create() {
    this.refreshLayout();
    this.scale.on('resize', () => this.refreshLayout());

    this.input.once('pointerdown', () => {
      reportJourneyStart();
      this.scene.start('Game');
      this.scene.launch('UIScene');
    });
  }

  private refreshLayout(): void {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);

    const init = this.registry.get('init') as InitResponse | undefined;
    const level = init?.level;
    const player = init?.player;
    const corpses = init?.corpseCount ?? 0;

    if (!this.background) {
      this.background = this.add.image(0, 0, 'background').setOrigin(0).setAlpha(0.35);
    }
    this.background.setDisplaySize(width, height);

    const scaleFactor = Math.min(width / 1024, height / 768, 1);

    if (!this.title) {
      this.title = this.add
        .text(0, 0, '', {
          fontFamily: 'Arial Black',
          fontSize: '48px',
          color: '#ff6bcb',
          stroke: '#1a0a2e',
          strokeThickness: 8,
          align: 'center',
        })
        .setOrigin(0.5);
    }

    if (!this.subtitle) {
      this.subtitle = this.add
        .text(0, 0, '', {
          fontFamily: 'Arial',
          fontSize: '22px',
          color: '#e8d5ff',
          align: 'center',
        })
        .setOrigin(0.5);
    }

    if (!this.hint) {
      this.hint = this.add
        .text(0, 0, 'Tap to Start', {
          fontFamily: 'Arial Black',
          fontSize: '28px',
          color: '#7ee8fa',
          stroke: '#0a1628',
          strokeThickness: 4,
        })
        .setOrigin(0.5);
    }

    this.title.setText(level ? `Level #${level.seq}` : 'Chroma Canvas');
    this.subtitle.setText(
      [
        `${corpses} have fallen before you`,
        player ? `Streak: ${player.streak} · ${player.flairTier}` : '',
        'Carry the Chroma Orb to the exit',
      ]
        .filter(Boolean)
        .join('\n')
    );

    this.title.setPosition(width / 2, height * 0.32).setScale(scaleFactor);
    this.subtitle.setPosition(width / 2, height * 0.52).setScale(scaleFactor);
    this.hint.setPosition(width / 2, height * 0.78).setScale(scaleFactor);
  }
}
