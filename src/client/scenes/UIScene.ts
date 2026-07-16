import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { InitResponse } from '../../shared/api';
import { COLORS, FONTS, HEX } from '../theme';
import { addHudPill, type HudPill } from '../ui/phaserUi';
import { sfx } from '../ui/sfx';

type GameSceneLike = {
  player?: { x: number };
  level?: { spawn: { x: number }; exit: { x: number } };
  setTouchInput?: (l: boolean, r: boolean, j: boolean) => void;
};

export class UIScene extends Scene {
  corpsePill!: HudPill;
  timerPill!: HudPill;
  leftBtn!: Phaser.GameObjects.Image;
  rightBtn!: Phaser.GameObjects.Image;
  jumpBtn!: Phaser.GameObjects.Image;
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

    this.corpsePill = addHudPill(
      this,
      12,
      12,
      'cc-icon-skull',
      `${init.corpseCount} fallen`,
      HEX.ink
    );
    this.timerPill = addHudPill(this, 12, 50, 'cc-icon-clock', '0.0s', HEX.coralDeep);

    this.buildMuteButton();
    this.buildProgressMeter();

    if (this.sys.game.device.input.touch) {
      this.buildTouchControls();
    }

    const onResize = () => this.layoutTouch();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  private muteBtn!: Phaser.GameObjects.Text;

  private buildMuteButton() {
    this.muteBtn = this.add
      .text(this.scale.width - 12, 12, sfx.isMuted() ? '🔇' : '🔊', {
        fontFamily: FONTS.body,
        fontSize: '18px',
        backgroundColor: HEX.creamGlass,
        padding: { x: 8, y: 5 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerup', () => {
      const muted = sfx.toggle();
      this.muteBtn.setText(muted ? '🔇' : '🔊');
      if (!muted) sfx.play('click');
    });
  }

  private progressBg!: Phaser.GameObjects.Graphics;
  private progressFill!: Phaser.GameObjects.Graphics;
  private progressW = 150;

  /** Slim run-progress meter: spawn → GOAL, with a pennant at the end. */
  private buildProgressMeter() {
    const w = this.progressW;
    this.progressBg = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.progressBg.fillStyle(COLORS.ink, 0.18);
    this.progressBg.fillRoundedRect(-w / 2, -4, w, 8, 4);
    this.progressBg.lineStyle(1.5, COLORS.cream, 0.7);
    this.progressBg.strokeRoundedRect(-w / 2, -4, w, 8, 4);
    // Goal pennant
    this.progressBg.fillStyle(COLORS.coral, 1);
    this.progressBg.fillTriangle(w / 2 + 4, -10, w / 2 + 4, -2, w / 2 + 14, -6);
    this.progressBg.lineStyle(2, COLORS.cream, 0.9);
    this.progressBg.lineBetween(w / 2 + 4, -12, w / 2 + 4, 4);

    this.progressFill = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.layoutProgress();
  }

  private layoutProgress() {
    const { width, height } = this.scale;
    // Narrow screens: the top row belongs to the pills — tuck the meter
    // at the bottom center, between the touch pads.
    const x = width / 2;
    const y = width < 640 ? height - 18 : 22;
    this.progressBg?.setPosition(x, y);
    this.progressFill?.setPosition(x, y);
  }

  private updateProgress() {
    if (!this.progressFill) return;
    const game = this.scene.get('Game') as GameSceneLike;
    const level = game?.level;
    const px = game?.player?.x;
    if (!level || px === undefined) return;
    const total = Math.abs(level.exit.x - level.spawn.x) || 1;
    const pct = Phaser.Math.Clamp(Math.abs(px - level.spawn.x) / total, 0, 1);
    const w = this.progressW;
    this.progressFill.clear();
    this.progressFill.fillStyle(COLORS.orb, 0.95);
    this.progressFill.fillRoundedRect(-w / 2 + 1.5, -2.5, Math.max(5, (w - 3) * pct), 5, 2.5);
  }

  private makePad(texture: string, size: number): Phaser.GameObjects.Image {
    const pad = this.add
      .image(0, 0, texture)
      .setDisplaySize(size, size)
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0.92);
    pad.setInteractive();
    return pad;
  }

  private buildTouchControls() {
    this.leftBtn = this.makePad('cc-pad-left', 76);
    this.rightBtn = this.makePad('cc-pad-right', 76);
    this.jumpBtn = this.makePad('cc-pad-jump', 92);

    const bindHold = (
      btn: Phaser.GameObjects.Image,
      onDown: () => void
    ) => {
      btn.on('pointerdown', () => {
        btn.setScale(btn.scale * 0.92).setAlpha(1);
        onDown();
      });
      const release = () => {
        btn.setDisplaySize(76, 76).setAlpha(0.92);
        this.sendTouch(false, false, false);
      };
      btn.on('pointerup', release);
      btn.on('pointerout', release);
    };

    bindHold(this.leftBtn, () => this.sendTouch(true, false, false));
    bindHold(this.rightBtn, () => this.sendTouch(false, true, false));

    this.jumpBtn.on('pointerdown', () => {
      this.jumpBtn.setScale(this.jumpBtn.scale * 0.92).setAlpha(1);
      this.sendTouch(false, false, true);
      this.time.delayedCall(90, () => {
        this.jumpBtn.setDisplaySize(92, 92).setAlpha(0.92);
      });
    });

    this.layoutTouch();
  }

  private layoutTouch() {
    const { width, height } = this.scale;
    this.muteBtn?.setPosition(width - 12, 12);
    this.layoutProgress();
    if (this.leftBtn) {
      this.leftBtn.setPosition(56, height - 58);
      this.rightBtn.setPosition(146, height - 58);
      this.jumpBtn.setPosition(width - 62, height - 62);
    }
  }

  private sendTouch(left: boolean, right: boolean, jump: boolean) {
    const game = this.scene.get('Game') as GameSceneLike;
    game.setTouchInput?.(left, right, jump);
  }

  override update() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.timerPill?.setText(`${elapsed.toFixed(1)}s`);
    this.updateProgress();
  }
}
