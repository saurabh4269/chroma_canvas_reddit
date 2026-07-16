import { Scene } from 'phaser';
import { postCommentDeath, postSubscribe, fetchInit } from '../net/api';
import {
  reportJourneyEnd,
  reportJourneyInteraction,
  reportJourneyStart,
} from '../journeys';

type ResultData = {
  won: boolean;
  elapsedMs: number;
  x: number;
  y: number;
};

export class GameOver extends Scene {
  resultData!: ResultData;

  constructor() {
    super('GameOver');
  }

  init(data: ResultData) {
    this.resultData = data;
  }

  create() {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);
    this.cameras.main.setBackgroundColor(this.resultData.won ? 0x7ec8f0 : 0xffb088);

    const bg = this.add.image(0, 0, 'background').setOrigin(0).setAlpha(0.85);
    bg.setDisplaySize(width, height);

    const title = this.resultData.won ? 'Orb Delivered!' : 'Petrified!';
    const color = this.resultData.won ? '#1a2744' : '#ff6f61';

    this.add
      .text(width / 2, height * 0.2, title, {
        fontFamily: 'Arial Black',
        fontSize: '48px',
        color,
        stroke: '#fff8f0',
        strokeThickness: 10,
      })
      .setOrigin(0.5);

    const seconds = (this.resultData.elapsedMs / 1000).toFixed(1);
    const subtitle = this.resultData.won
      ? `Completed in ${seconds}s`
      : `Your corpse is now a platform at (${Math.round(this.resultData.x)}, ${Math.round(this.resultData.y)})\nWill your fall help someone tomorrow?`;

    this.add
      .text(width / 2, height * 0.38, subtitle, {
        fontSize: '18px',
        color: '#1a2744',
        align: 'center',
      })
      .setOrigin(0.5);

    this.makeButton(width / 2, height * 0.55, 'Play Again', 0xff6f61, async () => {
      try {
        const init = await fetchInit();
        this.registry.set('init', init);
      } catch (e) {
        console.error('refresh init failed', e);
      }
      reportJourneyStart();
      this.scene.start('Game');
      this.scene.launch('UIScene');
    });

    if (!this.resultData.won) {
      this.makeButton(width / 2, height * 0.65, 'Comment My Death', 0xffc14a, async () => {
        reportJourneyInteraction('comment_death');
        try {
          const res = await postCommentDeath();
          this.showToast(res.message);
        } catch {
          this.showToast('Comment failed');
        }
      });
    }

    this.makeButton(width / 2, height * 0.75, 'Subscribe', 0x4ba3d9, async () => {
      reportJourneyInteraction('subscribe');
      try {
        const res = await postSubscribe();
        this.showToast(res.message);
      } catch {
        this.showToast('Subscribe failed');
      }
    });

    this.makeButton(width / 2, height * 0.85, 'Main Menu', 0x1a2744, () => {
      reportJourneyEnd({ complete: false });
      this.scene.start('MainMenu');
    });
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    bgColor: number,
    onClick: () => void
  ) {
    const btn = this.add
      .text(x, y, label, {
        fontFamily: 'Arial Black',
        fontSize: '20px',
        color: bgColor === 0xffc14a ? '#1a2744' : '#ffffff',
        backgroundColor: `#${bgColor.toString(16).padStart(6, '0')}`,
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
    return btn;
  }

  private showToast(msg: string) {
    const toast = this.add
      .text(this.scale.width / 2, this.scale.height * 0.92, msg, {
        fontSize: '14px',
        color: '#1a2744',
        backgroundColor: '#fff8f0ee',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5);
    this.time.delayedCall(2500, () => toast.destroy());
  }
}
