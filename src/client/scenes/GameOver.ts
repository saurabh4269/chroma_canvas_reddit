import { Scene } from 'phaser';
import type { GameObjects } from 'phaser';
import {
  postCommentDeath,
  postCommentHazard,
  postSubscribe,
  fetchInit,
} from '../net/api';
import {
  reportJourneyEnd,
  reportJourneyInteraction,
  reportJourneyStart,
} from '../journeys';
import { COLORS, FONTS, HEX } from '../theme';
import {
  addCard,
  addDisplayTitle,
  addGameButton,
  drawSunnyBackdrop,
  floatBob,
} from '../ui/phaserUi';

type ResultData = {
  won: boolean;
  elapsedMs: number;
  x: number;
  y: number;
  rank?: number | null;
};

/** Rotating human touches — nobody reads the same epitaph twice in a row. */
const EPITAPHS = [
  'Your corpse is now load-bearing.',
  'A staircase is built one regret at a time.',
  'The canvas thanks you for your donation.',
  'Somewhere, a future runner just got lucky.',
  'You died where you will be stood upon.',
  'Petrified, but with style.',
  'Your ancestors: also dead here, probably.',
];

const WIN_LINES = [
  'The canvas remembers your climb.',
  'The orb sings. The corpses cheer.',
  'You made the mountain of the fallen proud.',
  'Delivered. Against all geometry.',
  'The fallen lifted you. Literally.',
];

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
    const won = this.resultData.won;

    drawSunnyBackdrop(this, width, height, { dusk: !won });
    this.cameras.main.fadeIn(200, 255, 248, 240);

    if (won) {
      this.buildWinHero(width, height);
      this.burstConfetti(width);
    } else {
      this.buildDeathHero(width, height);
    }

    const title = won ? 'Orb Delivered!' : 'Petrified!';
    addDisplayTitle(this, width / 2, height * 0.27, title, 44);

    const seconds = (this.resultData.elapsedMs / 1000).toFixed(1);
    const rank = this.resultData.rank;
    const rankLine =
      won && rank
        ? rank === 1
          ? 'Daily rank #1 — Orb Bearer ✦'
          : `Daily rank #${rank}`
        : '';
    const flavorSeed = Math.round(this.resultData.x + this.resultData.elapsedMs);
    const subtitle = won
      ? [
          `Completed in ${seconds}s`,
          rankLine,
          WIN_LINES[flavorSeed % WIN_LINES.length],
        ]
          .filter(Boolean)
          .join('\n')
      : `Your corpse is now a platform at x${Math.round(this.resultData.x)}.\n${EPITAPHS[flavorSeed % EPITAPHS.length]}`;

    addCard(this, width / 2, height * 0.415, Math.min(width * 0.86, 384), 92, 18);
    this.add
      .text(width / 2, height * 0.415, subtitle, {
        fontFamily: FONTS.body,
        fontSize: '15.5px',
        fontStyle: '600',
        color: HEX.ink,
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    let y = height * 0.575;
    const gap = Math.min(62, height * 0.09);

    addGameButton(this, width / 2, y, won ? 'Play Again' : 'Try Again', 'coral', async () => {
      try {
        const init = await fetchInit();
        this.registry.set('init', init);
        this.registry.set('initAt', Date.now());
      } catch (e) {
        console.error('refresh init failed', e);
      }
      reportJourneyStart();
      this.scene.start('Game');
      this.scene.launch('UIScene');
    });
    y += gap;

    if (!won) {
      const deathBtn = addGameButton(
        this,
        width / 2,
        y,
        '💬 Comment My Death',
        'sky',
        async () => {
          reportJourneyInteraction('comment_death');
          deathBtn.setLabel('Posting…');
          try {
            const res = await postCommentDeath();
            this.showToast(res.message);
            deathBtn.setLabel('Commented ✓');
          } catch {
            this.showToast('Comment failed');
            deathBtn.setLabel('💬 Comment My Death');
          }
        }
      );
      y += gap;

      // Turn your death into tomorrow's trap: posts a prefilled !hazard comment
      const hazardBtn = addGameButton(
        this,
        width / 2,
        y,
        '☠ Drop a Spike Here',
        'sun',
        async () => {
          reportJourneyInteraction('comment_hazard');
          hazardBtn.setLabel('Posting…');
          try {
            const res = await postCommentHazard({
              hazardType: 'spike',
              x: Math.round(this.resultData.x),
              y: Math.round(this.resultData.y),
            });
            this.showToast(res.message);
            hazardBtn.setLabel('Spike Suggested ✓');
          } catch {
            this.showToast('Comment failed');
            hazardBtn.setLabel('☠ Drop a Spike Here');
          }
        }
      );
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

    addGameButton(this, width / 2, y, 'Main Menu', 'ghost', () => {
      reportJourneyEnd({ complete: false });
      this.scene.start('MainMenu');
    });

    if (!won) {
      this.add
        .text(
          width / 2,
          height - 14,
          'Top-voted !hazard comments are woven into tomorrow’s level',
          {
            fontFamily: FONTS.body,
            fontSize: '11.5px',
            fontStyle: '700',
            color: HEX.cream,
          }
        )
        .setOrigin(0.5)
        .setAlpha(0.85);
    }
  }

  /* ---------------------------------------------------------------- */

  private buildWinHero(width: number, height: number) {
    const orb = this.add
      .image(width / 2, height * 0.135, 'cc-orb')
      .setScale(1.9);
    floatBob(this, orb, 6);

    // Radiant ring pulses behind the orb
    const ring = this.add.circle(width / 2, height * 0.135, 34).setStrokeStyle(4, COLORS.sunSoft, 0.9);
    this.tweens.add({
      targets: ring,
      radius: 60,
      alpha: 0,
      duration: 1400,
      repeat: -1,
      ease: 'Sine.easeOut',
    });

    // A pair of proud sparkles
    for (const [dx, dy, d] of [
      [-64, -12, 0],
      [58, 8, 400],
    ] as const) {
      const s = this.add
        .image(width / 2 + dx, height * 0.135 + dy, 'cc-sparkle')
        .setScale(0.8)
        .setTint(COLORS.sunSoft);
      this.tweens.add({
        targets: s,
        angle: 180,
        alpha: 0.4,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        delay: d,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private burstConfetti(width: number) {
    if (!this.textures.exists('cc-confetti')) return;
    const emitter = this.add.particles(0, 0, 'cc-confetti', {
      x: { min: 0, max: width },
      y: -20,
      speedY: { min: 90, max: 220 },
      speedX: { min: -40, max: 40 },
      rotate: { start: 0, end: 540 },
      scale: { min: 0.5, max: 0.95 },
      lifespan: 3600,
      quantity: 2,
      frequency: 90,
      tint: [COLORS.confetti1, COLORS.confetti2, COLORS.confetti3, COLORS.confetti4],
    });
    emitter.setDepth(50);
    this.time.delayedCall(2600, () => emitter.stop());
  }

  private buildDeathHero(width: number, height: number) {
    const cx = width / 2;
    const cy = height * 0.14;

    const g = this.add.graphics({ x: cx, y: cy });
    // Mound
    g.fillStyle(0x3d3d73, 1);
    g.fillEllipse(0, 34, 110, 26);
    // Headstone with outline
    g.fillStyle(COLORS.inkOutline, 1);
    g.fillRoundedRect(-26, -32, 52, 64, { tl: 24, tr: 24, bl: 4, br: 4 });
    g.fillStyle(COLORS.corpse, 1);
    g.fillRoundedRect(-22, -28, 44, 58, { tl: 20, tr: 20, bl: 3, br: 3 });
    g.fillStyle(COLORS.corpseDeep, 0.5);
    g.fillRoundedRect(-22, 8, 44, 22, { tl: 0, tr: 0, bl: 3, br: 3 });
    // Sleeping face on the stone
    g.lineStyle(3, COLORS.ink, 0.8);
    g.beginPath();
    g.arc(-9, -8, 4.5, 0.15 * Math.PI, 0.85 * Math.PI, false);
    g.strokePath();
    g.beginPath();
    g.arc(9, -8, 4.5, 0.15 * Math.PI, 0.85 * Math.PI, false);
    g.strokePath();

    // Drifting soul wisp
    const wisp = this.add.image(cx + 30, cy - 36, 'cc-orb').setScale(0.5).setAlpha(0.5);
    this.tweens.add({
      targets: wisp,
      y: cy - 56,
      alpha: 0.15,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Floating "zzz"
    const zzz = this.add
      .text(cx - 42, cy - 34, 'z z', {
        fontFamily: FONTS.display,
        fontSize: '16px',
        color: HEX.cream,
      })
      .setOrigin(0.5)
      .setAlpha(0.8);
    this.tweens.add({
      targets: zzz,
      y: cy - 48,
      alpha: 0.2,
      duration: 1900,
      repeat: -1,
      ease: 'Sine.easeOut',
    });
  }

  private showToast(msg: string) {
    const label = this.add
      .text(0, 0, msg, {
        fontFamily: FONTS.body,
        fontSize: '14px',
        fontStyle: '700',
        color: HEX.ink,
      })
      .setOrigin(0.5);
    const w = label.width + 32;
    const h = 34;
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.ink, 0.16);
    bg.fillRoundedRect(-w / 2 + 1, -h / 2 + 3, w, h, h / 2);
    bg.fillStyle(COLORS.cream, 0.97);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const toast: GameObjects.Container = this.add
      .container(this.scale.width / 2, this.scale.height * 0.93, [bg, label])
      .setDepth(200)
      .setAlpha(0);
    this.tweens.add({ targets: toast, alpha: 1, y: toast.y - 6, duration: 180 });
    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 18,
      delay: 1900,
      duration: 380,
      onComplete: () => toast.destroy(),
    });
  }
}
