import { Scene, GameObjects } from 'phaser';
import * as Phaser from 'phaser';
import type { InitResponse } from '../../shared/api';
import { getSkin } from '../../shared/skins';
import { getDailyTwist } from '../../shared/twist';
import { reportJourneyStart } from '../journeys';
import { fetchInit } from '../net/api';
import { COLORS, FONTS, HEX } from '../theme';
import {
  addCard,
  addDisplayTitle,
  addGameButton,
  drawSunnyBackdrop,
  floatBob,
  pulseHint,
  type UiButton,
} from '../ui/phaserUi';

export class MainMenu extends Scene {
  private starting = false;
  private title!: GameObjects.Container;
  private eyebrow!: GameObjects.Text;
  private levelBadge!: GameObjects.Container;
  private badgeText!: GameObjects.Text;
  private badgeBg!: GameObjects.Graphics;
  private card!: GameObjects.Container;
  private subtitle!: GameObjects.Text;
  private countdown!: GameObjects.Text;
  private podium!: GameObjects.Container;
  private podiumTitle!: GameObjects.Text;
  private podiumBody!: GameObjects.Text;
  private pulseText!: GameObjects.Text;
  private twistText!: GameObjects.Text;
  private archiveBtn!: UiButton;
  private skinsBtn!: UiButton;
  private cta!: UiButton;
  private hero!: GameObjects.Container;
  private footer!: GameObjects.Text;

  constructor() {
    super('MainMenu');
  }

  create() {
    this.starting = false;
    this.build();
    this.refreshCopy();
    this.layout();

    const onResize = () => this.layout();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    // Whole-screen start, but never steal clicks from Archive / CTA / tips
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.starting) return;
      const hits = this.input.hitTestPointer(pointer);
      if (hits.length > 0) return;
      void this.onPointer();
    });

    const captureMode =
      typeof window !== 'undefined' && window.location.search.includes('capture=1');
    if (captureMode) {
      this.registry.set('sessionTipsSeen', true);
    } else if (!this.registry.get('sessionTipsSeen')) {
      this.showSessionTips();
    }
  }

  private build() {
    const { width, height } = this.scale;
    drawSunnyBackdrop(this, width, height);

    // Hero: your snoovatar (fallback: the little climber) carrying its orb
    let heroSprite: GameObjects.Image;
    if (this.textures.exists('snoo-self')) {
      heroSprite = this.add.image(0, 0, 'snoo-self');
      const src = this.textures.get('snoo-self').getSourceImage() as {
        width: number;
        height: number;
      };
      heroSprite.setScale(76 / src.height);
    } else {
      heroSprite = this.add.image(0, 0, 'cc-player').setScale(1.6);
    }
    const initPreview = this.registry.get('init') as InitResponse | undefined;
    const heroSkin = getSkin(initPreview?.player?.equippedSkin);
    const heroOrb = this.add
      .image(2, -44, 'cc-orb')
      .setScale(0.75)
      .setTint(heroSkin.orb);
    const heroShadow = this.add
      .image(0, 34, 'cc-shadow')
      .setDisplaySize(64, 12);
    this.hero = this.add.container(0, 0, [heroShadow, heroOrb, heroSprite]);
    floatBob(this, heroSprite, 5);
    this.tweens.add({
      targets: heroOrb,
      y: -50,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 180,
    });

    this.eyebrow = this.add
      .text(0, 0, 'DAILY CLIMB', {
        fontFamily: FONTS.body,
        fontSize: '13px',
        fontStyle: '800',
        color: HEX.coralDeep,
        letterSpacing: 3,
      })
      .setOrigin(0.5);

    this.title = addDisplayTitle(this, 0, 0, 'Chroma Canvas', 52);

    // Level badge pill
    this.badgeBg = this.add.graphics();
    this.badgeText = this.add
      .text(0, 0, '', {
        fontFamily: FONTS.display,
        fontSize: '17px',
        fontStyle: '600',
        color: HEX.coralDeep,
      })
      .setOrigin(0.5);
    this.levelBadge = this.add.container(0, 0, [this.badgeBg, this.badgeText]);

    this.countdown = this.add
      .text(0, 0, '', {
        fontFamily: FONTS.body,
        fontSize: '13px',
        fontStyle: '800',
        color: HEX.ink,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    this.twistText = this.add
      .text(0, 0, '', {
        fontFamily: FONTS.body,
        fontSize: '13px',
        fontStyle: '800',
        color: HEX.coralDeep,
      })
      .setOrigin(0.5);

    this.card = addCard(this, 0, 0, 344, 116, 20);
    this.subtitle = this.add
      .text(0, 0, '', {
        fontFamily: FONTS.body,
        fontSize: '15px',
        fontStyle: '600',
        color: HEX.ink,
        align: 'center',
        lineSpacing: 7,
      })
      .setOrigin(0.5);

    // Today on the Canvas — podium + the community tug-of-war
    const podiumCard = addCard(this, 0, 0, 344, 136, 18);
    this.podiumTitle = this.add
      .text(0, -52, 'TODAY ON THE CANVAS', {
        fontFamily: FONTS.body,
        fontSize: '11px',
        fontStyle: '800',
        color: HEX.coralDeep,
        letterSpacing: 2,
      })
      .setOrigin(0.5);
    this.podiumBody = this.add
      .text(0, -12, '', {
        fontFamily: FONTS.body,
        fontSize: '13.5px',
        fontStyle: '700',
        color: HEX.ink,
        align: 'center',
        lineSpacing: 5,
      })
      .setOrigin(0.5);
    const divider = this.add.graphics();
    divider.lineStyle(1.5, COLORS.creamDark, 1);
    divider.lineBetween(-140, 26, 140, 26);
    this.pulseText = this.add
      .text(0, 44, '', {
        fontFamily: FONTS.body,
        fontSize: '12px',
        fontStyle: '800',
        color: HEX.inkSoft,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);
    this.podium = this.add.container(0, 0, [
      podiumCard,
      this.podiumTitle,
      this.podiumBody,
      divider,
      this.pulseText,
    ]);

    this.archiveBtn = addGameButton(
      this,
      0,
      0,
      '📜 The Archive',
      'ghost',
      () => {
        this.scene.start('Archive');
      },
      144,
      36
    );

    this.skinsBtn = addGameButton(
      this,
      0,
      0,
      '✦ Skins',
      'ghost',
      () => {
        this.scene.start('Skins');
      },
      110,
      36
    );

    this.cta = addGameButton(this, 0, 0, 'Tap to Start', 'coral', () => {
      void this.onPointer();
    }, 232, 56);
    pulseHint(this, this.cta.container);

    this.footer = this.add
      .text(0, 0, 'Fall, and you become tomorrow’s foothold', {
        fontFamily: FONTS.body,
        fontSize: '12.5px',
        fontStyle: '700',
        color: HEX.inkSoft,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);
  }

  private redrawBadge() {
    const w = this.badgeText.width + 34;
    const h = 32;
    this.badgeBg.clear();
    this.badgeBg.fillStyle(COLORS.ink, 0.12);
    this.badgeBg.fillRoundedRect(-w / 2 + 1, -h / 2 + 3, w, h, h / 2);
    this.badgeBg.fillStyle(COLORS.cream, 0.95);
    this.badgeBg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    this.badgeBg.lineStyle(2, COLORS.sun, 0.6);
    this.badgeBg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  }

  private refreshCopy() {
    const init = this.registry.get('init') as InitResponse | undefined;
    const initError = this.registry.get('initError') as string | null | undefined;
    const level = init?.level;
    const player = init?.player;
    const corpses = init?.corpseCount ?? 0;

    if (initError || !level) {
      this.badgeText.setText(initError ? 'Retry needed' : 'Loading…');
      this.subtitle.setText(
        initError
          ? `Could not load level.\n${initError}\nTap to retry.`
          : 'Loading level…\nTap to retry if this sticks.'
      );
      this.cta.setLabel('Tap to Retry');
    } else {
      this.badgeText.setText(`Level #${level.seq}`);
      const queued = init?.pendingHazards?.length ?? 0;
      const blessingLine =
        level.blessing === 'mercy'
          ? '🕊  The fallen earned today a Mercy Ledge'
          : level.blessing === 'cruel'
            ? '😈  Yesterday’s victors made today crueler'
            : '';
      this.subtitle.setText(
        [
          `☠  ${corpses} have fallen before you`,
          player ? `⚡  Streak ${player.streak} · ${player.flairTier}` : '',
          blessingLine,
          queued > 0
            ? `⚠  ${queued} community hazard${queued === 1 ? '' : 's'} queued for tomorrow`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      );
      this.cta.setLabel('Tap to Start');

      const twist = getDailyTwist(level.seed);
      this.twistText.setText(
        twist.id === 'clear'
          ? `${twist.emoji} Today's twist: none — pure skill`
          : `${twist.emoji} Today's twist: ${twist.name}`
      );
    }

    const daily = init?.dailyLeaderboard ?? [];
    if (daily.length === 0) {
      this.podiumBody.setText('No one has delivered the orb yet.\nBe the first — claim Orb Bearer ✦');
    } else {
      const medals = ['🥇', '🥈', '🥉'];
      this.podiumBody.setText(
        daily
          .slice(0, 3)
          .map(
            (e, i) =>
              `${medals[i]}  u/${e.username} — ${(e.score / 1000).toFixed(1)}s`
          )
          .join('\n')
      );
    }

    // The tug-of-war and its prophecy for tomorrow's terrain
    const pulse = init?.dailyPulse;
    if (pulse) {
      const prophecy =
        pulse.deaths >= 10 && pulse.deaths >= pulse.wins * 8
          ? 'The fallen may earn tomorrow a Mercy Ledge 🕊'
          : pulse.wins >= 15 && pulse.wins > pulse.deaths / 2
            ? 'So many victors… the canvas grows cruel 😈'
            : 'Their fates weigh tomorrow’s terrain';
      this.pulseText.setText(
        `⚔  ${pulse.wins} delivered · ${pulse.deaths} petrified\n${prophecy}`
      );
    } else {
      this.pulseText.setText('');
    }
    this.redrawBadge();
  }

  override update() {
    const init = this.registry.get('init') as InitResponse | undefined;
    const initAt = this.registry.get('initAt') as number | undefined;
    if (!init?.nextRotationAt || !initAt) {
      this.countdown?.setText('');
      return;
    }
    const serverNowEst = init.serverNow + (Date.now() - initAt);
    const remaining = Math.max(0, init.nextRotationAt - serverNowEst);
    const h = Math.floor(remaining / 3_600_000);
    const m = Math.floor((remaining % 3_600_000) / 60_000);
    const s = Math.floor((remaining % 60_000) / 1000);
    const label =
      h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
    this.countdown?.setText(`⏳ New level + community hazards in ${label}`);
  }

  private layout() {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);
    // Keep phones readable: never let the UI shrink below ~width-fit scale
    const s = Math.max(
      Math.min(width / 1024, height / 768, 1.15),
      Math.min(0.82, width / 440)
    );
    const cardScale = Math.min(s, (width - 24) / 348);
    const compact = height < 620;

    this.hero.setPosition(width * 0.5, height * (compact ? 0.13 : 0.115)).setScale(
      s * (compact ? 0.72 : 0.95)
    );
    if (compact) {
      this.eyebrow.setPosition(width / 2, height * 0.235).setScale(s * 0.85);
      this.title.setPosition(width / 2, height * 0.3).setScale(s * 0.82);
      this.levelBadge.setPosition(width / 2, height * 0.405).setScale(s * 0.85);
      this.countdown.setPosition(width / 2, height * 0.462).setScale(s * 0.9);
      this.twistText.setPosition(width / 2, height * 0.503).setScale(s * 0.9);
      this.podium.setVisible(false);
      this.card.setPosition(width / 2, height * 0.645).setScale(cardScale * 0.92);
      this.subtitle.setPosition(width / 2, height * 0.645).setScale(cardScale * 0.92);
      this.cta.container.setPosition(width / 2, height * 0.845).setScale(s * 0.9);
      this.archiveBtn.container
        .setVisible(true)
        .setPosition(Math.min(92, width * 0.22), 28)
        .setScale(Math.min(s, 0.9));
      this.skinsBtn.container
        .setVisible(true)
        .setPosition(Math.max(width - 72, width * 0.78), 28)
        .setScale(Math.min(s, 0.9));
    } else {
      this.eyebrow.setPosition(width / 2, height * 0.238).setScale(s * 0.95);
      this.title.setPosition(width / 2, height * 0.29).setScale(s * 0.95);
      this.levelBadge.setPosition(width / 2, height * 0.368).setScale(s * 0.95);
      this.countdown.setPosition(width / 2, height * 0.416).setScale(s);
      this.twistText.setPosition(width / 2, height * 0.451).setScale(s);
      this.podium.setVisible(true);
      this.card.setPosition(width / 2, height * 0.545).setScale(cardScale);
      this.subtitle.setPosition(width / 2, height * 0.545).setScale(cardScale);
      this.podium.setPosition(width / 2, height * 0.705).setScale(cardScale);
      this.cta.container.setPosition(width / 2, height * 0.875).setScale(s);
      this.archiveBtn.container
        .setVisible(true)
        .setPosition(width - 92, 30)
        .setScale(Math.min(s, 1));
      this.skinsBtn.container
        .setVisible(true)
        .setPosition(92, 30)
        .setScale(Math.min(s, 1));
    }
    this.footer.setPosition(width / 2, height - 14).setScale(Math.min(s, 1));
  }

  /** Soft every-session tip card — no localStorage (Devvit webview). */
  private showSessionTips() {
    const { width, height } = this.scale;
    const dim = this.add
      .rectangle(width / 2, height / 2, width + 40, height + 40, COLORS.ink, 0.42)
      .setInteractive()
      .setDepth(300);
    const card = addCard(this, width / 2, height / 2, Math.min(width - 36, 360), 228, 20);
    card.setDepth(301);
    const title = this.add
      .text(width / 2, height / 2 - 78, 'Quick climb tips', {
        fontFamily: FONTS.display,
        fontSize: '22px',
        fontStyle: '600',
        color: HEX.ink,
      })
      .setOrigin(0.5)
      .setDepth(302);
    const body = this.add
      .text(
        width / 2,
        height / 2 - 8,
        [
          '1. Carry the aqua orb to the GOAL portal',
          '2. Die → your corpse becomes a platform',
          '3. Comment !hazard to shape tomorrow',
        ].join('\n'),
        {
          fontFamily: FONTS.body,
          fontSize: '15px',
          fontStyle: '700',
          color: HEX.ink,
          align: 'left',
          lineSpacing: 10,
        }
      )
      .setOrigin(0.5)
      .setDepth(302);
    const dismiss = addGameButton(
      this,
      width / 2,
      height / 2 + 78,
      'Got it',
      'coral',
      () => {
        this.registry.set('sessionTipsSeen', true);
        dim.destroy();
        card.destroy();
        title.destroy();
        body.destroy();
        dismiss.container.destroy();
      },
      160,
      44
    );
    dismiss.container.setDepth(302);
  }

  private async onPointer(): Promise<void> {
    if (this.starting) return;
    if (!this.registry.get('sessionTipsSeen')) return;
    this.starting = true;

    let init = this.registry.get('init') as InitResponse | undefined;
    if (!init?.level) {
      try {
        init = await fetchInit();
        this.registry.set('init', init);
        this.registry.set('initAt', Date.now());
        this.registry.set('initError', null);
      } catch (err) {
        this.registry.set(
          'initError',
          err instanceof Error ? err.message : 'init failed'
        );
        this.refreshCopy();
        this.starting = false;
        return;
      }
    }

    this.refreshCopy();
    reportJourneyStart();
    this.cameras.main.fadeOut(160, 255, 248, 240);
    this.time.delayedCall(170, () => {
      this.scene.start('Game');
      this.scene.launch('UIScene');
    });
  }
}
