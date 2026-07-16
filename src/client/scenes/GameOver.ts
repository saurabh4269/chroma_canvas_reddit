import { Scene } from 'phaser';
import { postCommentDeath, postSubscribe, fetchInit } from '../net/api';
import {
  reportJourneyEnd,
  reportJourneyInteraction,
  reportJourneyStart,
} from '../journeys';
import { COLORS, FONTS, HEX } from '../theme';
import {
  addBodyText,
  addGameButton,
  drawSunnyBackdrop,
  floatBob,
} from '../ui/phaserUi';

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
    this.cameras.main.setBackgroundColor(
      this.resultData.won ? COLORS.skyMid : 0xffb088
    );

    drawSunnyBackdrop(this, width, height);

    if (this.resultData.won) {
      const orb = this.add.image(width / 2, height * 0.14, 'cc-orb').setScale(1.8);
      floatBob(this, orb, 6);
    }

    const title = this.resultData.won ? 'Orb Delivered!' : 'Petrified!';
    const titleColor = this.resultData.won ? HEX.ink : HEX.coralDeep;

    this.add
      .text(width / 2, height * 0.22, title, {
        fontFamily: FONTS.display,
        fontSize: '46px',
        color: titleColor,
        stroke: HEX.cream,
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    const seconds = (this.resultData.elapsedMs / 1000).toFixed(1);
    const subtitle = this.resultData.won
      ? `Completed in ${seconds}s\nThe canvas remembers your climb.`
      : `Your corpse is a platform at (${Math.round(this.resultData.x)}, ${Math.round(this.resultData.y)})\nWill your fall help someone tomorrow?`;

    this.add
      .image(width / 2, height * 0.38, 'cc-panel')
      .setDisplaySize(Math.min(width * 0.86, 380), 96);

    addBodyText(this, width / 2, height * 0.38, subtitle, 16);

    let y = height * 0.54;
    const gap = Math.min(58, height * 0.085);

    addGameButton(this, width / 2, y, 'Play Again', 'coral', async () => {
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
    y += gap;

    if (!this.resultData.won) {
      addGameButton(this, width / 2, y, 'Comment My Death', 'sun', async () => {
        reportJourneyInteraction('comment_death');
        try {
          const res = await postCommentDeath();
          this.showToast(res.message);
        } catch {
          this.showToast('Comment failed');
        }
      });
      y += gap;
    }

    addGameButton(this, width / 2, y, 'Subscribe', 'sky', async () => {
      reportJourneyInteraction('subscribe');
      try {
        const res = await postSubscribe();
        this.showToast(res.message);
      } catch {
        this.showToast('Subscribe failed');
      }
    });
    y += gap;

    addGameButton(this, width / 2, y, 'Main Menu', 'ink', () => {
      reportJourneyEnd({ complete: false });
      this.scene.start('MainMenu');
    });
  }

  private showToast(msg: string) {
    const toast = this.add
      .text(this.scale.width / 2, this.scale.height * 0.93, msg, {
        fontFamily: FONTS.body,
        fontSize: '14px',
        fontStyle: '700',
        color: HEX.ink,
        backgroundColor: HEX.creamGlass,
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(200);
    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 12,
      delay: 1800,
      duration: 400,
      onComplete: () => toast.destroy(),
    });
  }
}
