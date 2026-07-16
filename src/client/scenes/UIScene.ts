import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { InitResponse } from '../../shared/api';
import { COLORS, FONTS, HEX } from '../theme';
import { addHudChip } from '../ui/phaserUi';

export class UIScene extends Scene {
  corpseText!: Phaser.GameObjects.Text;
  timerText!: Phaser.GameObjects.Text;
  leftBtn!: Phaser.GameObjects.Container;
  rightBtn!: Phaser.GameObjects.Container;
  jumpBtn!: Phaser.GameObjects.Container;
  startTime = 0;

  constructor() {
    super('UIScene');
  }

  create() {
    const init = this.registry.get('init') as InitResponse | undefined;
    if (!init) {
      this.scene.stop();
      return;
    }
    this.startTime = Date.now();

    this.corpseText = addHudChip(this, 14, 12, `${init.corpseCount} fallen`, HEX.ink);
    this.corpseText.setOrigin(0, 0);

    this.timerText = addHudChip(this, 14, 44, '0.0s', HEX.coralDeep);
    this.timerText.setOrigin(0, 0);

    if (this.sys.game.device.input.touch) {
      this.buildTouchControls();
    }

    this.scale.on('resize', () => this.layoutTouch());
  }

  private makePad(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    fill: number,
    alpha: number
  ): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(0, 0, w, h, fill, alpha).setStrokeStyle(2, COLORS.cream, 0.55);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONTS.display,
        fontSize: label.length > 1 ? '16px' : '26px',
        color: HEX.cream,
      })
      .setOrigin(0.5);
    const pad = this.add.container(x, y, [bg, text]).setSize(w, h).setScrollFactor(0).setDepth(100);
    pad.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );
    return pad;
  }

  private buildTouchControls() {
    this.leftBtn = this.makePad(60, 0, 72, 72, '<', COLORS.ink, 0.28);
    this.rightBtn = this.makePad(150, 0, 72, 72, '>', COLORS.ink, 0.28);
    this.jumpBtn = this.makePad(0, 0, 88, 84, 'JUMP', COLORS.orb, 0.42);

    this.leftBtn.on('pointerdown', () => {
      this.leftBtn.setScale(0.94);
      this.sendTouch(true, false, false);
    });
    this.leftBtn.on('pointerup', () => {
      this.leftBtn.setScale(1);
      this.sendTouch(false, false, false);
    });
    this.leftBtn.on('pointerout', () => {
      this.leftBtn.setScale(1);
      this.sendTouch(false, false, false);
    });

    this.rightBtn.on('pointerdown', () => {
      this.rightBtn.setScale(0.94);
      this.sendTouch(false, true, false);
    });
    this.rightBtn.on('pointerup', () => {
      this.rightBtn.setScale(1);
      this.sendTouch(false, false, false);
    });
    this.rightBtn.on('pointerout', () => {
      this.rightBtn.setScale(1);
      this.sendTouch(false, false, false);
    });

    this.jumpBtn.on('pointerdown', () => {
      this.jumpBtn.setScale(0.94);
      this.sendTouch(false, false, true);
      this.time.delayedCall(80, () => this.jumpBtn.setScale(1));
    });

    this.layoutTouch();
  }

  private layoutTouch() {
    const { width, height } = this.scale;
    if (this.leftBtn) {
      this.leftBtn.setPosition(60, height - 58);
      this.rightBtn.setPosition(148, height - 58);
      this.jumpBtn.setPosition(width - 58, height - 62);
    }
  }

  private sendTouch(left: boolean, right: boolean, jump: boolean) {
    const game = this.scene.get('Game') as {
      setTouchInput?: (l: boolean, r: boolean, j: boolean) => void;
    };
    game.setTouchInput?.(left, right, jump);
  }

  override update() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.timerText.setText(`${elapsed.toFixed(1)}s`);
  }
}
