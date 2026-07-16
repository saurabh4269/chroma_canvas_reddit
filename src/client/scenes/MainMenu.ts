import { Scene, GameObjects } from 'phaser';
import type { InitResponse } from '../../shared/api';
import { reportJourneyStart } from '../journeys';
import { fetchInit } from '../net/api';

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
      void this.onPointer();
    });
  }

  private async onPointer(): Promise<void> {
    let init = this.registry.get('init') as InitResponse | undefined;
    if (!init?.level) {
      try {
        init = await fetchInit();
        this.registry.set('init', init);
        this.registry.set('initError', null);
      } catch (err) {
        this.registry.set(
          'initError',
          err instanceof Error ? err.message : 'init failed'
        );
        this.refreshLayout();
        this.input.once('pointerdown', () => {
          void this.onPointer();
        });
        return;
      }
    }

    reportJourneyStart();
    this.scene.start('Game');
    this.scene.launch('UIScene');
  }

  private refreshLayout(): void {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);

    const init = this.registry.get('init') as InitResponse | undefined;
    const initError = this.registry.get('initError') as string | null | undefined;
    const level = init?.level;
    const player = init?.player;
    const corpses = init?.corpseCount ?? 0;

    if (!this.background) {
      this.background = this.add.image(0, 0, 'background').setOrigin(0).setAlpha(0.92);
    }
    this.background.setDisplaySize(width, height);

    const scaleFactor = Math.min(width / 1024, height / 768, 1);

    if (!this.title) {
      this.title = this.add
        .text(0, 0, '', {
          fontFamily: 'Arial Black',
          fontSize: '48px',
          color: '#ff6f61',
          stroke: '#fff8f0',
          strokeThickness: 10,
          align: 'center',
        })
        .setOrigin(0.5);
    }

    if (!this.subtitle) {
      this.subtitle = this.add
        .text(0, 0, '', {
          fontFamily: 'Arial',
          fontSize: '22px',
          color: '#1a2744',
          align: 'center',
        })
        .setOrigin(0.5);
    }

    if (!this.hint) {
      this.hint = this.add
        .text(0, 0, 'Tap to Start', {
          fontFamily: 'Arial Black',
          fontSize: '28px',
          color: '#fff8f0',
          stroke: '#ff6f61',
          strokeThickness: 8,
        })
        .setOrigin(0.5);
    }

    if (initError || !level) {
      this.title.setText('Chroma Canvas');
      this.subtitle.setText(
        initError
          ? `Could not load level.\n${initError}\nTap to retry.`
          : 'Loading level…\nTap to retry if this sticks.'
      );
      this.hint.setText('Tap to Retry');
    } else {
      this.title.setText(`Level #${level.seq}`);
      this.subtitle.setText(
        [
          `${corpses} have fallen before you`,
          player ? `Streak: ${player.streak} · ${player.flairTier}` : '',
          'Carry the Chroma Orb to the exit',
        ]
          .filter(Boolean)
          .join('\n')
      );
      this.hint.setText('Tap to Start');
    }

    this.title.setPosition(width / 2, height * 0.32).setScale(scaleFactor);
    this.subtitle.setPosition(width / 2, height * 0.52).setScale(scaleFactor);
    this.hint.setPosition(width / 2, height * 0.78).setScale(scaleFactor);
  }
}
