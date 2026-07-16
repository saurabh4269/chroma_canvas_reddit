import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { InitResponse } from '../../shared/api';

export class UIScene extends Scene {
  corpseText!: Phaser.GameObjects.Text;
  timerText!: Phaser.GameObjects.Text;
  leftBtn!: Phaser.GameObjects.Rectangle;
  rightBtn!: Phaser.GameObjects.Rectangle;
  jumpBtn!: Phaser.GameObjects.Rectangle;
  startTime = 0;

  constructor() {
    super('UIScene');
  }

  create() {
    const init = this.registry.get('init') as InitResponse;
    this.startTime = Date.now();

    this.corpseText = this.add
      .text(16, 12, `${init.corpseCount} fallen`, {
        fontSize: '16px',
        color: '#e8d5ff',
        backgroundColor: '#1a0533aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.timerText = this.add
      .text(16, 44, '0.0s', {
        fontSize: '16px',
        color: '#7ee8fa',
        backgroundColor: '#1a0533aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    if (this.sys.game.device.input.touch) {
      this.buildTouchControls();
    }

    this.scale.on('resize', () => this.layoutTouch());
  }

  private buildTouchControls() {
    this.leftBtn = this.add
      .rectangle(60, 0, 70, 70, 0xffffff, 0.2)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive();

    this.rightBtn = this.add
      .rectangle(150, 0, 70, 70, 0xffffff, 0.2)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive();

    this.jumpBtn = this.add
      .rectangle(0, 0, 80, 80, 0x7ee8fa, 0.35)
      .setScrollFactor(0)
      .setDepth(100)
      .setInteractive();

    this.leftBtn.on('pointerdown', () => this.sendTouch(true, false, false));
    this.leftBtn.on('pointerup', () => this.sendTouch(false, false, false));
    this.leftBtn.on('pointerout', () => this.sendTouch(false, false, false));

    this.rightBtn.on('pointerdown', () => this.sendTouch(false, true, false));
    this.rightBtn.on('pointerup', () => this.sendTouch(false, false, false));
    this.rightBtn.on('pointerout', () => this.sendTouch(false, false, false));

    this.jumpBtn.on('pointerdown', () => this.sendTouch(false, false, true));

    this.layoutTouch();
  }

  private layoutTouch() {
    const { width, height } = this.scale;
    if (this.leftBtn) {
      this.leftBtn.setPosition(60, height - 60);
      this.rightBtn.setPosition(150, height - 60);
      this.jumpBtn.setPosition(width - 60, height - 60);
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
