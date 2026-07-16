import { Scene, GameObjects } from 'phaser';
import type { InitResponse } from '../../shared/api';
import { reportJourneyStart } from '../journeys';
import { fetchInit } from '../net/api';
import { COLORS, FONTS, HEX } from '../theme';
import {
  drawSunnyBackdrop,
  floatBob,
  pulseHint,
} from '../ui/phaserUi';

export class MainMenu extends Scene {
  private built = false;
  private brand!: GameObjects.Text;
  private levelBadge!: GameObjects.Text;
  private panel!: GameObjects.Image;
  private subtitle!: GameObjects.Text;
  private hint!: GameObjects.Text;
  private hintShade!: GameObjects.Rectangle;
  private orb!: GameObjects.Image;

  constructor() {
    super('MainMenu');
  }

  create() {
    this.build();
    this.refreshCopy();
    this.layout();

    this.scale.on('resize', () => {
      this.layout();
    });

    this.input.once('pointerdown', () => {
      void this.onPointer();
    });
  }

  private build() {
    if (this.built) return;
    this.built = true;

    const { width, height } = this.scale;
    drawSunnyBackdrop(this, width, height);

    this.orb = this.add.image(0, 0, 'cc-orb').setScale(1.45);
    floatBob(this, this.orb, 10);

    this.brand = this.add
      .text(0, 0, 'Chroma Canvas', {
        fontFamily: FONTS.display,
        fontSize: '52px',
        color: HEX.ink,
        stroke: HEX.sunSoft,
        strokeThickness: 9,
        align: 'center',
      })
      .setOrigin(0.5);

    this.levelBadge = this.add
      .text(0, 0, '', {
        fontFamily: FONTS.display,
        fontSize: '20px',
        color: HEX.coralDeep,
        backgroundColor: HEX.creamGlass,
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5);

    this.panel = this.add.image(0, 0, 'cc-panel');

    this.subtitle = this.add
      .text(0, 0, '', {
        fontFamily: FONTS.body,
        fontSize: '17px',
        color: HEX.ink,
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    this.hintShade = this.add
      .rectangle(0, 0, 170, 6, COLORS.coralDeep, 0.9)
      .setOrigin(0.5);

    this.hint = this.add
      .text(0, 0, 'Tap to Start', {
        fontFamily: FONTS.display,
        fontSize: '28px',
        color: HEX.cream,
        backgroundColor: HEX.coral,
        padding: { x: 22, y: 12 },
      })
      .setOrigin(0.5)
      .setShadow(0, 3, '#c74a3d88', 0, false, true);

    pulseHint(this, this.hint);
  }

  private refreshCopy() {
    const init = this.registry.get('init') as InitResponse | undefined;
    const initError = this.registry.get('initError') as string | null | undefined;
    const level = init?.level;
    const player = init?.player;
    const corpses = init?.corpseCount ?? 0;

    if (initError || !level) {
      this.levelBadge.setText(initError ? 'Retry needed' : 'Loading…');
      this.subtitle.setText(
        initError
          ? `Could not load level.\n${initError}\nTap to retry.`
          : 'Loading level…\nTap to retry if this sticks.'
      );
      this.hint.setText('Tap to Retry');
    } else {
      this.levelBadge.setText(`Level #${level.seq}`);
      this.subtitle.setText(
        [
          `${corpses} have fallen before you`,
          player ? `Streak ${player.streak} · ${player.flairTier}` : '',
          'Carry the Chroma Orb to the exit',
        ]
          .filter(Boolean)
          .join('\n')
      );
      this.hint.setText('Tap to Start');
    }
  }

  private layout() {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);
    const scaleFactor = Math.min(width / 1024, height / 768, 1.15);

    this.orb.setPosition(width * 0.18, height * 0.2);
    this.brand.setPosition(width / 2, height * 0.28).setScale(scaleFactor);
    this.levelBadge.setPosition(width / 2, height * 0.4).setScale(scaleFactor);
    this.panel
      .setPosition(width / 2, height * 0.54)
      .setDisplaySize(Math.min(width * 0.84, 360), 118);
    this.subtitle.setPosition(width / 2, height * 0.54).setScale(scaleFactor);
    this.hint.setPosition(width / 2, height * 0.78).setScale(scaleFactor);
    this.hintShade
      .setPosition(width / 2, height * 0.78 + 20 * scaleFactor)
      .setScale(scaleFactor, 1);
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
        this.refreshCopy();
        this.input.once('pointerdown', () => {
          void this.onPointer();
        });
        return;
      }
    }

    this.refreshCopy();
    reportJourneyStart();
    this.scene.start('Game');
    this.scene.launch('UIScene');
  }
}
