import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { connectRealtime } from '@devvit/web/client';
import type { InitResponse, LiveEvent } from '../../shared/api';
import type { CorpseRecord, LevelDef, Platform } from '../../shared/level';
import {
  CORPSE_PLATFORM_H,
  CORPSE_PLATFORM_W,
  PLAYER_H,
  PLAYER_W,
} from '../../shared/constants';
import { postDeath, postWin } from '../net/api';
import {
  reportJourneyEnd,
  reportJourneyProgress,
} from '../journeys';
import { COLORS, FONTS, HEX } from '../theme';
import { getSkin } from '../../shared/skins';
import { getDailyTwist, type DailyTwist } from '../../shared/twist';
import { fillVerticalGradient } from '../ui/phaserUi';
import { sfx } from '../ui/sfx';

type GameResult = {
  won: boolean;
  elapsedMs: number;
  x: number;
  y: number;
  rank?: number | null;
};

type PhysicsSprite = Phaser.GameObjects.Image & {
  body: Phaser.Physics.Arcade.Body;
};

/** Deterministic 0..1 hash so platform decoration is stable per level. */
function hash01(x: number, y: number, salt = 0): number {
  let n = (Math.round(x) * 73856093) ^ (Math.round(y) * 19349663) ^ (salt * 83492791);
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

export class Game extends Scene {
  player!: PhysicsSprite;
  playerBaseW = PLAYER_W;
  playerBaseH = PLAYER_H;
  playerShadow!: Phaser.GameObjects.Image;
  orb!: Phaser.GameObjects.Image;
  orbTrail?: Phaser.GameObjects.Particles.ParticleEmitter;
  runDust?: Phaser.GameObjects.Particles.ParticleEmitter;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  jumpKey!: Phaser.Input.Keyboard.Key;
  level!: LevelDef;
  twist!: DailyTwist;
  corpses: CorpseRecord[] = [];
  hazards: Phaser.GameObjects.GameObject[] = [];
  startTime = 0;
  carryingOrb = true;
  dead = false;
  touchLeft = false;
  touchRight = false;
  touchJump = false;
  wasOnGround = false;
  // Precision-platformer input forgiveness
  lastGroundedAt = 0;
  jumpQueuedAt = 0;
  lastJumpAt = 0;
  airborneFromJump = false;
  journeyProgressSent = new Set<number>();

  // Slightly more forgiving on mobile: taller reach, longer buffer/coyote.
  static readonly COYOTE_MS = 110;
  static readonly JUMP_BUFFER_MS = 150;
  static readonly JUMP_VELOCITY = -450;
  static readonly JUMP_CUT_VELOCITY = -185;

  constructor() {
    super('Game');
  }

  init() {
    this.dead = false;
    this.carryingOrb = true;
    this.hazards = [];
    this.corpses = [];
    this.wasOnGround = false;
    this.lastGroundedAt = 0;
    this.jumpQueuedAt = 0;
    this.lastJumpAt = 0;
    this.airborneFromJump = false;
    this.journeyProgressSent = new Set();
  }

  create() {
    const init = this.registry.get('init') as InitResponse | undefined;
    if (!init?.level) {
      this.scene.start('MainMenu');
      return;
    }
    this.level = init.level;
    this.corpses = init.corpses;
    this.startTime = Date.now();

    // Daily Twist: seed-derived, so server and every client agree
    this.twist = getDailyTwist(this.level.seed);
    this.physics.world.gravity.y = this.twist.gravityY;

    this.physics.world.setBounds(0, 0, this.level.width, this.level.height + 200);
    this.cameras.main.setBounds(0, 0, this.level.width, this.level.height);
    this.cameras.main.setBackgroundColor(COLORS.skyMid);

    this.buildParallax();
    this.buildPlatforms();
    this.buildCorpses();
    this.buildHazards();
    this.buildExit();
    this.buildPlayer();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.jumpKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    const onResize = (size: Phaser.Structs.Size) => {
      this.cameras.resize(size.width, size.height);
    };
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    this.showSpawnHints();
    if (this.twist.id !== 'clear') {
      this.liveToast(`${this.twist.emoji} ${this.twist.name} — ${this.twist.desc}`);
    }
    this.connectLive(init);
  }

  /** First-seconds clarity: what to do and how, fading out on its own. */
  private showSpawnHints() {
    const isTouch = this.sys.game.device.input.touch;
    const lines = [
      'Carry the orb → the GOAL portal',
      isTouch ? 'Pads to move · big button to jump' : '←→ move · SPACE jump',
    ];
    // Keep the hint pills fully inside the camera's clamped left edge
    const hintX = Math.max(this.level.spawn.x + 10, 145);
    lines.forEach((line, i) => {
      const hint = this.add
        .text(hintX, this.level.spawn.y - 92 + i * 22, line, {
          fontFamily: FONTS.body,
          fontSize: i === 0 ? '14px' : '12px',
          fontStyle: '800',
          color: HEX.ink,
          backgroundColor: HEX.creamGlass,
          padding: { x: 9, y: 4 },
        })
        .setOrigin(0.5)
        .setDepth(20)
        .setAlpha(0);
      this.tweens.add({ targets: hint, alpha: 0.95, duration: 300, delay: 250 + i * 150 });
      this.tweens.add({
        targets: hint,
        alpha: 0,
        y: hint.y - 10,
        delay: 4200 + i * 200,
        duration: 500,
        onComplete: () => hint.destroy(),
      });
    });
  }

  /**
   * Live layer: other players' deaths land in YOUR run as new platforms,
   * in real time. Fail-safe no-op when realtime is unavailable.
   */
  private connectLive(init: InitResponse) {
    void (async () => {
      try {
        const connection = await connectRealtime({
          channel: 'cc_live',
          onMessage: (data) => this.onLiveEvent(data as LiveEvent, init),
        });
        this.events.once('shutdown', () => {
          void connection.disconnect().catch(() => {});
        });
      } catch {
        // Realtime unavailable (e.g. local demo) — game works without it
      }
    })();
  }

  private onLiveEvent(event: LiveEvent, init: InitResponse) {
    if (!event || this.dead || event.seq !== this.level.seq) return;
    if (event.u === init.username) return;

    if (event.kind === 'death') {
      const group = this.registry.get(
        'corpsePlatforms'
      ) as Phaser.Physics.Arcade.StaticGroup;
      if (group) {
        this.spawnCorpse(group, {
          u: event.u,
          x: event.x,
          y: event.y,
          t: Date.now(),
          ...(event.s ? { s: event.s } : {}),
        });
      }
      this.liveToast(`☠ u/${event.u} just petrified — new platform!`);
    } else if (event.kind === 'win') {
      this.liveToast(
        `🏆 u/${event.u} delivered the orb in ${(event.elapsedMs / 1000).toFixed(1)}s`
      );
    }
  }

  private liveToast(msg: string) {
    const toast = this.add
      .text(this.scale.width / 2, 48, msg, {
        fontFamily: FONTS.body,
        fontSize: '13px',
        fontStyle: '800',
        color: HEX.ink,
        backgroundColor: HEX.creamGlass,
        padding: { x: 12, y: 6 },
        align: 'center',
        wordWrap: { width: Math.min(this.scale.width - 48, 520) },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0);
    this.tweens.add({ targets: toast, alpha: 1, duration: 180 });
    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: 36,
      delay: 2400,
      duration: 350,
      onComplete: () => toast.destroy(),
    });
  }

  /* ---------------------------------------------------------------- */
  /* World building                                                     */
  /* ---------------------------------------------------------------- */

  private buildParallax() {
    const w = this.level.width;
    const h = this.level.height;
    const dusk = this.twist.dusk;

    // Sky ramp — daylight or Twilight-twist dusk
    const sky = this.add.graphics().setScrollFactor(0.02).setDepth(-10);
    fillVerticalGradient(
      sky,
      -100,
      -100,
      w + 200,
      h + 300,
      dusk
        ? [COLORS.duskTop, COLORS.duskMid, COLORS.duskWarm]
        : [COLORS.skyDeep, COLORS.skyMid, COLORS.skyLight, COLORS.horizon]
    );

    // Twilight stars
    if (dusk) {
      const stars = this.add.graphics().setScrollFactor(0.04).setDepth(-10);
      for (let i = 0; i < 60; i++) {
        const sx = hash01(i, 41, 7) * (w + 200) - 100;
        const sy = hash01(i, 43, 8) * h * 0.55;
        stars.fillStyle(0xffffff, 0.35 + hash01(i, 47, 9) * 0.5);
        stars.fillCircle(sx, sy, 0.8 + hash01(i, 53, 11) * 1);
      }
    }

    // Sun (or a pale twilight moon) with soft halo + slow-turning rays
    const sunX = w * 0.5;
    const sunY = h * 0.18;
    if (!dusk) {
      const rays = this.add.graphics({ x: sunX, y: sunY }).setScrollFactor(0.06).setDepth(-9);
      rays.fillStyle(COLORS.sunSoft, 0.16);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        rays.fillTriangle(
          0,
          0,
          Math.cos(a - 0.15) * 210,
          Math.sin(a - 0.15) * 210,
          Math.cos(a + 0.15) * 210,
          Math.sin(a + 0.15) * 210
        );
      }
      this.tweens.add({ targets: rays, angle: 360, duration: 80000, repeat: -1 });
    }

    const halo = this.add
      .circle(sunX, sunY, dusk ? 66 : 88, dusk ? 0xf5ead2 : COLORS.sunSoft, dusk ? 0.18 : 0.3)
      .setScrollFactor(0.06)
      .setDepth(-9);
    const orb = this.add
      .circle(sunX, sunY, dusk ? 40 : 58, dusk ? 0xf5ead2 : COLORS.sunCore, 0.95)
      .setScrollFactor(0.06)
      .setDepth(-9);
    if (dusk) {
      // Crescent bite
      this.add
        .circle(sunX + 14, sunY - 10, 32, COLORS.duskTop, 1)
        .setScrollFactor(0.06)
        .setDepth(-9);
      orb.setAlpha(0.92);
    }
    this.tweens.add({
      targets: halo,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: dusk ? 0.1 : 0.18,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Drifting clouds sprinkled across the level
    const cloudKeys = ['cc-cloud-1', 'cc-cloud-2', 'cc-cloud-3'];
    for (let i = 0; i < 9; i++) {
      const r = hash01(i * 311, 77, 5);
      const key = cloudKeys[i % cloudKeys.length]!;
      const cx = (w / 9) * i + r * 200;
      const cy = h * (0.08 + hash01(i, 13, 9) * 0.3);
      const cloud = this.add
        .image(cx, cy, key)
        .setScale(0.6 + hash01(i, 29, 3) * 0.7)
        .setAlpha(dusk ? 0.35 : 0.85)
        .setScrollFactor(0.12 + (i % 3) * 0.05)
        .setDepth(-8);
      this.tweens.add({
        targets: cloud,
        x: cx + 60 + r * 60,
        duration: 40000 + r * 30000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Distant haze hills
    const far = this.add.graphics().setScrollFactor(0.2).setDepth(-7);
    far.fillStyle(dusk ? 0x55568f : COLORS.hillFar, 0.8);
    for (let i = 0; i < 9; i++) {
      far.fillEllipse(i * 460 + 120, h * 1.02, 620, h * 0.62);
    }

    // Mid meadow hills with tiny trees
    const mid = this.add.graphics().setScrollFactor(0.4).setDepth(-6);
    mid.fillStyle(dusk ? 0x3f4078 : COLORS.hillMid, 1);
    for (let i = 0; i < 11; i++) {
      mid.fillEllipse(i * 400 + 60, h * 1.1, 560, h * 0.6);
    }
    mid.fillStyle(dusk ? 0x333366 : COLORS.hillMidDeep, 0.9);
    for (let i = 0; i < 11; i++) {
      const tx = i * 380 + 160 + hash01(i, 3, 1) * 120;
      const ty = h * (0.86 + hash01(i, 7, 2) * 0.05);
      // simple pine: trunk + two stacked triangles
      mid.fillRect(tx - 3, ty, 6, 14);
      mid.fillTriangle(tx - 14, ty + 2, tx + 14, ty + 2, tx, ty - 24);
      mid.fillTriangle(tx - 10, ty - 14, tx + 10, ty - 14, tx, ty - 34);
    }

    // Near rolling green with bushes
    const near = this.add.graphics().setScrollFactor(0.62).setDepth(-5);
    near.fillStyle(dusk ? 0x2e2e5c : COLORS.hillNear, 1);
    for (let i = 0; i < 13; i++) {
      near.fillEllipse(i * 340 + 40, h * 1.16, 480, h * 0.5);
    }
    near.fillStyle(dusk ? 0x26264f : COLORS.hillNearDeep, 0.85);
    for (let i = 0; i < 13; i++) {
      const bx = i * 330 + 90 + hash01(i, 11, 4) * 150;
      const by = h * (0.97 + hash01(i, 17, 6) * 0.03);
      near.fillCircle(bx, by, 16);
      near.fillCircle(bx + 18, by + 4, 12);
      near.fillCircle(bx - 16, by + 5, 11);
    }
  }

  private buildPlatforms() {
    const group = this.physics.add.staticGroup();
    const art = this.add.graphics().setDepth(2);

    for (const p of this.level.platforms) {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;

      // Invisible physics body — visuals are hand-drawn below
      const rect = this.add.rectangle(cx, cy, p.w, p.h).setVisible(false);
      group.add(rect);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(p.w, p.h);

      this.drawPlatform(art, p);
    }
    this.registry.set('platforms', group);
  }

  /** Grass-capped floating island slab with ink outline + decorations. */
  private drawPlatform(g: Phaser.GameObjects.Graphics, p: Platform) {
    const { x, y, w, h } = p;
    const capH = Math.min(9, h * 0.55);
    const r = Math.min(7, h / 2);

    // Soft contact shadow under the slab
    g.fillStyle(COLORS.ink, 0.1);
    g.fillEllipse(x + w / 2, y + h + 5, w * 0.9, 10);

    // Ink outline silhouette
    g.fillStyle(COLORS.inkOutline, 1);
    g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, r + 2);

    // Dirt body
    g.fillStyle(COLORS.dirt, 1);
    g.fillRoundedRect(x, y, w, h, r);
    g.fillStyle(COLORS.dirtDark, 0.75);
    g.fillRoundedRect(x, y + h * 0.55, w, h * 0.45, { tl: 0, tr: 0, bl: r, br: r });

    // Pebbles in the dirt
    const pebbles = Math.floor(w / 46);
    for (let i = 0; i < pebbles; i++) {
      const px = x + 14 + hash01(x + i, y, 21) * (w - 28);
      const py = y + capH + 2 + hash01(x, y + i, 22) * Math.max(1, h - capH - 7);
      g.fillStyle(COLORS.dirtDeep, 0.5);
      g.fillCircle(px, py, 1.6 + hash01(px, py, 23) * 1.4);
    }

    // Grass cap with scalloped lip
    g.fillStyle(COLORS.grass, 1);
    g.fillRoundedRect(x, y, w, capH, { tl: r, tr: r, bl: 0, br: 0 });
    const scallops = Math.max(2, Math.round(w / 22));
    for (let i = 0; i < scallops; i++) {
      const sx = x + ((i + 0.5) / scallops) * w;
      g.fillCircle(sx, y + capH, 4.5 + hash01(sx, y, 24) * 2);
    }
    // Sunlit top sliver
    g.fillStyle(COLORS.grassLight, 0.9);
    g.fillRoundedRect(x + 2, y, w - 4, 3, 1.5);

    // Grass blades poking above
    const blades = Math.max(2, Math.round(w / 30));
    g.fillStyle(COLORS.grassDeep, 1);
    for (let i = 0; i < blades; i++) {
      const bx = x + 8 + hash01(x + i * 7, y, 25) * (w - 16);
      const bh = 4 + hash01(bx, y, 26) * 4;
      g.fillTriangle(bx - 2.5, y + 1, bx + 2.5, y + 1, bx, y - bh);
    }

    // Occasional flower
    if (w > 70 && hash01(x, y, 27) > 0.45) {
      const fx = x + 16 + hash01(x, y, 28) * (w - 32);
      const fy = y - 4;
      g.fillStyle(0xffffff, 0.95);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.fillCircle(fx + Math.cos(a) * 3.4, fy + Math.sin(a) * 3.4, 2.4);
      }
      g.fillStyle(COLORS.sun, 1);
      g.fillCircle(fx, fy, 2.2);
    }
  }

  private buildCorpses() {
    const group = this.physics.add.staticGroup();
    for (const c of this.corpses) {
      this.spawnCorpse(group, c);
    }
    this.registry.set('corpsePlatforms', group);
  }

  /** Stone slab + (when available) a petrified snoovatar statue on top. */
  private spawnCorpse(
    group: Phaser.Physics.Arcade.StaticGroup,
    c: CorpseRecord
  ) {
    const stone = this.add
      .image(c.x, c.y, 'cc-corpse')
      .setDisplaySize(CORPSE_PLATFORM_W, CORPSE_PLATFORM_H)
      .setDepth(3);
    group.add(stone);
    const body = stone.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(CORPSE_PLATFORM_W, CORPSE_PLATFORM_H);
    this.add
      .image(c.x, c.y + CORPSE_PLATFORM_H, 'cc-shadow')
      .setDisplaySize(CORPSE_PLATFORM_W + 8, 8)
      .setDepth(2);

    // Petrified snoovatar statue (only the most recent falls carry one)
    let tagY = c.y - 15;
    const snooKeys =
      (this.registry.get('snooKeys') as Record<string, string> | undefined) ?? {};
    const statueKey = c.s ? snooKeys[c.s] : undefined;
    if (statueKey && this.textures.exists(statueKey)) {
      const src = this.textures.get(statueKey).getSourceImage() as {
        width: number;
        height: number;
      };
      const h = 26;
      const w = (h * src.width) / src.height;
      this.add
        .image(c.x, c.y - CORPSE_PLATFORM_H / 2 - h / 2 + 2, statueKey)
        .setDisplaySize(w, h)
        .setTint(0xa39a8e)
        .setAlpha(0.95)
        .setDepth(3);
      tagY = c.y - CORPSE_PLATFORM_H / 2 - h - 6;
    }

    this.add
      .text(c.x, tagY, c.u.slice(0, 10), {
        fontFamily: FONTS.body,
        fontSize: '9px',
        fontStyle: '800',
        color: HEX.inkSoft,
      })
      .setOrigin(0.5)
      .setAlpha(0.8)
      .setDepth(4);
  }

  private buildHazards() {
    for (const h of this.level.hazards) {
      if (h.type === 'spike') {
        const spike = this.add
          .image(h.x, h.y, 'cc-spike')
          .setDisplaySize(16, 17)
          .setDepth(5);
        this.physics.add.existing(spike);
        const body = spike.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(28, 28); // texture-space (32x34); ≈14x14 on screen
        this.hazards.push(spike);
      } else if (h.type === 'movingBlock') {
        const block = this.add
          .image(h.x, h.y, 'cc-block')
          .setDisplaySize(40, 16)
          .setDepth(5);
        this.physics.add.existing(block);
        const body = block.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        const range = h.meta?.range ?? 60;
        this.tweens.add({
          targets: block,
          x: h.x + range,
          duration: 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.hazards.push(block);
      } else if (h.type === 'gap') {
        // Shadowy rift with rising wisps
        const pitArt = this.add.graphics().setDepth(4);
        pitArt.fillStyle(COLORS.gap, 0.85);
        pitArt.fillRoundedRect(h.x - 24, h.y + 14, 48, 12, 6);
        pitArt.fillStyle(COLORS.gapGlow, 0.35);
        pitArt.fillRoundedRect(h.x - 20, h.y + 15, 40, 4, 2);
        for (let i = 0; i < 3; i++) {
          const wisp = this.add
            .circle(h.x - 12 + i * 12, h.y + 18, 2.5, COLORS.gapGlow, 0.6)
            .setDepth(4);
          this.tweens.add({
            targets: wisp,
            y: h.y + 2,
            alpha: 0,
            duration: 1300 + i * 250,
            repeat: -1,
            delay: i * 380,
            ease: 'Sine.easeOut',
          });
        }
        const pit = this.add.rectangle(h.x, h.y + 20, 48, 8).setVisible(false);
        this.physics.add.existing(pit);
        const body = pit.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(48, 8);
        this.hazards.push(pit);
      } else if (h.type === 'crumble') {
        const crumble = this.add
          .image(h.x, h.y, 'cc-crumble')
          .setDisplaySize(56, 14)
          .setDepth(5);
        this.physics.add.existing(crumble);
        const body = crumble.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(112, 28); // texture-space; ≈56x14 on screen
        crumble.setData('crumble', true);
        this.hazards.push(crumble);
      }
    }
  }

  private buildExit() {
    const { x, y } = this.level.exit;

    const zone = this.add.zone(x, y, 80, 100);
    this.physics.add.existing(zone);
    const body = zone.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.registry.set('exitZone', zone);

    // Inner glow
    const glow = this.add.ellipse(x, y, 52, 76, COLORS.orb, 0.16).setDepth(1);
    this.tweens.add({
      targets: glow,
      alpha: 0.32,
      scaleX: 1.1,
      scaleY: 1.06,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Rotating dashed ring (drawn round, squashed into an ellipse)
    const ring = this.add.graphics({ x, y }).setDepth(1);
    ring.lineStyle(5, COLORS.sun, 0.95);
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / segs * 0.62;
      ring.beginPath();
      ring.arc(0, 0, 34, a0, a1, false);
      ring.strokePath();
    }
    ring.scaleY = 78 / 68;
    ring.scaleX = 54 / 68;
    this.tweens.add({ targets: ring, angle: 360, duration: 9000, repeat: -1 });

    // Sparkles rising through the gate
    if (this.textures.exists('cc-sparkle')) {
      this.add
        .particles(x, y + 24, 'cc-sparkle', {
          x: { min: -16, max: 16 },
          speedY: { min: -34, max: -14 },
          scale: { start: 0.5, end: 0 },
          alpha: { start: 0.9, end: 0 },
          lifespan: 1500,
          frequency: 380,
          tint: [COLORS.sunSoft, COLORS.orb, 0xffffff],
        })
        .setDepth(1);
    }

    // Goal pennant
    const flag = this.add.graphics({ x: x + 30, y: y - 46 }).setDepth(6);
    flag.fillStyle(COLORS.inkOutline, 1);
    flag.fillRoundedRect(-2, 0, 4, 52, 2);
    flag.fillStyle(COLORS.coral, 1);
    flag.fillTriangle(2, 2, 2, 22, 30, 12);
    flag.fillStyle(COLORS.coralDeep, 0.6);
    flag.fillTriangle(2, 12, 2, 22, 16, 15);

    this.add
      .text(x, y - 62, 'GOAL', {
        fontFamily: FONTS.display,
        fontSize: '17px',
        fontStyle: '600',
        color: HEX.cream,
        stroke: '#2B3A63',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(6);
  }

  /* ---------------------------------------------------------------- */
  /* Player                                                             */
  /* ---------------------------------------------------------------- */

  private buildPlayer() {
    const platforms = this.registry.get('platforms') as Phaser.Physics.Arcade.StaticGroup;
    const corpsePlatforms = this.registry.get(
      'corpsePlatforms'
    ) as Phaser.Physics.Arcade.StaticGroup;

    this.playerShadow = this.add
      .image(this.level.spawn.x, this.level.spawn.y + PLAYER_H / 2, 'cc-shadow')
      .setDisplaySize(PLAYER_W + 10, 8)
      .setDepth(9);

    // Your actual snoovatar climbs — procedural sprite as fallback
    const useSnoo = this.textures.exists('snoo-self');
    let playerImage: Phaser.GameObjects.Image;
    if (useSnoo) {
      playerImage = this.add
        .image(this.level.spawn.x, this.level.spawn.y, 'snoo-self')
        .setDepth(10);
      const src = this.textures.get('snoo-self').getSourceImage() as {
        width: number;
        height: number;
      };
      playerImage.setScale((PLAYER_H + 6) / src.height);
    } else {
      playerImage = this.add
        .image(this.level.spawn.x, this.level.spawn.y, 'cc-player')
        .setDisplaySize(PLAYER_W, PLAYER_H)
        .setDepth(10);
    }
    this.physics.add.existing(playerImage);
    this.player = playerImage as PhysicsSprite;
    this.player.body.setCollideWorldBounds(true);
    // Body size in texture space so the world hitbox is ≈(W-4)x(H-4) regardless of art
    this.player.body.setSize(
      (PLAYER_W - 4) / this.player.scaleX,
      (PLAYER_H - 4) / this.player.scaleY,
      true
    );
    this.playerBaseW = this.player.displayWidth;
    this.playerBaseH = this.player.displayHeight;

    const initData = this.registry.get('init') as InitResponse | undefined;
    const skin = getSkin(initData?.player?.equippedSkin);
    if (skin.playerTint) {
      this.player.setTint(skin.playerTint);
    }

    // Run dust
    if (this.textures.exists('cc-dust')) {
      this.runDust = this.add
        .particles(0, 0, 'cc-dust', {
          follow: this.player,
          followOffset: { x: 0, y: PLAYER_H / 2 - 2 },
          speedX: { min: -26, max: 26 },
          speedY: { min: -14, max: -2 },
          scale: { start: 0.55, end: 0 },
          alpha: { start: 0.55, end: 0 },
          lifespan: 340,
          frequency: 90,
          emitting: false,
          tint: 0xfff2dd,
        })
        .setDepth(9);
    }

    this.orb = this.add
      .image(this.level.spawn.x, this.level.spawn.y - 26, 'cc-orb')
      .setDisplaySize(24, 24)
      .setDepth(11)
      .setTint(skin.orb);
    this.tweens.add({
      targets: this.orb,
      displayWidth: 27,
      displayHeight: 27,
      alpha: 0.85,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Faint sparkle trail behind the orb (skin-tinted, cosmetic only)
    if (this.textures.exists('cc-sparkle')) {
      this.orbTrail = this.add
        .particles(0, 0, 'cc-sparkle', {
          follow: this.orb,
          scale: { start: 0.34, end: 0 },
          alpha: { start: 0.75, end: 0 },
          speed: { min: 4, max: 14 },
          lifespan: 500,
          frequency: 160,
          tint: skin.trail,
        })
        .setDepth(10);
    }

    this.physics.add.collider(this.player, platforms);
    this.physics.add.collider(this.player, corpsePlatforms);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.12);

    for (const hazard of this.hazards) {
      this.physics.add.overlap(this.player, hazard, () => {
        if (!this.dead) {
          if (
            'getData' in hazard &&
            typeof hazard.getData === 'function' &&
            hazard.getData('crumble')
          ) {
            this.tweens.add({
              targets: hazard,
              alpha: 0,
              duration: 200,
              onComplete: () => {
                hazard.destroy();
                this.hazards = this.hazards.filter((item) => item !== hazard);
              },
            });
          }
          void this.handleDeath();
        }
      });
    }

    const exitZone = this.registry.get('exitZone') as Phaser.GameObjects.Zone;
    this.physics.add.overlap(this.player, exitZone, () => {
      if (!this.dead && this.carryingOrb) {
        void this.handleWin();
      }
    });
  }

  override update() {
    if (this.dead || !this.player?.body) return;

    const body = this.player.body;
    const speed = this.twist?.moveSpeed ?? 220;
    const onGround = body.blocked.down || body.touching.down;

    let moveX = 0;
    if (this.cursors.left.isDown || this.touchLeft) moveX = -1;
    if (this.cursors.right.isDown || this.touchRight) moveX = 1;

    body.setVelocityX(moveX * speed);
    if (moveX !== 0) {
      this.player.setFlipX(moveX < 0);
    }

    // Lean into the run
    const targetAngle = onGround ? moveX * 4 : Phaser.Math.Clamp(body.velocity.y * 0.014, -6, 8) * (this.player.flipX ? -1 : 1);
    this.player.angle += (targetAngle - this.player.angle) * 0.2;

    // --- Forgiving jump: coyote time + input buffering + variable height ---
    const now = this.time.now;
    if (onGround) {
      this.lastGroundedAt = now;
      if (body.velocity.y >= 0) this.airborneFromJump = false;
    }
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.jumpKey) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      this.touchJump;
    if (jumpPressed) {
      this.jumpQueuedAt = now;
      this.touchJump = false;
    }
    const buffered = this.jumpQueuedAt > 0 && now - this.jumpQueuedAt <= Game.JUMP_BUFFER_MS;
    const coyote = now - this.lastGroundedAt <= Game.COYOTE_MS;
    if (buffered && coyote && !this.airborneFromJump) {
      body.setVelocityY(Game.JUMP_VELOCITY);
      this.airborneFromJump = true;
      this.jumpQueuedAt = 0;
      this.lastJumpAt = now;
      this.squash(0.82, 1.16);
      sfx.play('jump');
    }
    // Early release cuts the jump short (keyboard); touch keeps full arcs
    if (
      this.airborneFromJump &&
      body.velocity.y < Game.JUMP_CUT_VELOCITY &&
      this.jumpKey.isUp &&
      !this.cursors.up.isDown &&
      now - this.lastJumpAt > 90
    ) {
      body.setVelocityY(Game.JUMP_CUT_VELOCITY);
    }

    // Landing squash + dust puff
    if (onGround && !this.wasOnGround) {
      this.squash(1.18, 0.84);
      this.runDust?.explode(6, this.player.x, this.player.y + PLAYER_H / 2 - 2);
      sfx.play('land');
    }
    this.wasOnGround = onGround;

    // Run dust while moving on the ground
    if (this.runDust) {
      this.runDust.emitting = onGround && moveX !== 0;
    }

    // Grounded shadow blob
    if (this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, this.player.y + PLAYER_H / 2 + 2);
      const fade = onGround ? 1 : Math.max(0.25, 1 - Math.abs(body.velocity.y) / 700);
      this.playerShadow.setAlpha(fade);
      this.playerShadow.setDisplaySize((PLAYER_W + 10) * fade, 8 * fade);
    }

    if (this.carryingOrb && this.orb) {
      const bobY = this.player.y - 30 + Math.sin(this.time.now / 260) * 2.5;
      this.orb.setPosition(
        this.orb.x + (this.player.x - this.orb.x) * 0.25,
        this.orb.y + (bobY - this.orb.y) * 0.25
      );
    }

    this.trackJourneyProgress();

    if (this.player.y > this.level.height + 80 && !this.dead) {
      void this.handleDeath();
    }
  }

  private squash(sx: number, sy: number) {
    this.tweens.add({
      targets: this.player,
      displayWidth: this.playerBaseW * sx,
      displayHeight: this.playerBaseH * sy,
      duration: 90,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.player.setDisplaySize(this.playerBaseW, this.playerBaseH);
      },
    });
  }

  setTouchInput(left: boolean, right: boolean, jump: boolean) {
    this.touchLeft = left;
    this.touchRight = right;
    if (jump) this.touchJump = true;
  }

  private trackJourneyProgress() {
    const spawnX = this.level.spawn.x;
    const exitX = this.level.exit.x;
    const totalDist = Math.abs(exitX - spawnX);
    if (totalDist <= 0) return;

    const traveled = Math.abs(this.player.x - spawnX);
    const progress = Math.min(traveled / totalDist, 0.99);

    for (const threshold of [0.25, 0.5, 0.75]) {
      if (progress >= threshold && !this.journeyProgressSent.has(threshold)) {
        this.journeyProgressSent.add(threshold);
        reportJourneyProgress(threshold, 'checkpoint', `x_${Math.round(this.player.x)}`);
      }
    }
  }

  private burstDeathShards() {
    if (!this.textures.exists('shard')) return;

    const emitter = this.add.particles(this.player.x, this.player.y, 'shard', {
      speed: { min: 70, max: 200 },
      angle: { min: 0, max: 360 },
      lifespan: 420,
      scale: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: [COLORS.player, COLORS.corpse, COLORS.sun],
      emitting: false,
    });
    emitter.explode(16);
    this.time.delayedCall(500, () => emitter.destroy());
  }

  private async handleDeath() {
    if (this.dead) return;
    this.dead = true;
    this.carryingOrb = false;
    this.orb?.setVisible(false);
    this.orbTrail?.destroy();
    this.runDust?.destroy();
    this.playerShadow?.setVisible(false);

    this.cameras.main.shake(150, 0.01);
    this.burstDeathShards();
    sfx.play('death');
    this.player.setTint(COLORS.corpseDeep);
    this.player.body.setVelocity(0, 0);
    this.physics.pause();

    const elapsedMs = Date.now() - this.startTime;
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);

    try {
      await postDeath({ x, y, clientTimeMs: elapsedMs });
    } catch (e) {
      console.error('death report failed', e);
    }

    reportJourneyEnd({ complete: false, win: false, score: elapsedMs });

    this.scene.stop('UIScene');
    this.scene.start('GameOver', { won: false, elapsedMs, x, y } satisfies GameResult);
  }

  private async handleWin() {
    if (this.dead) return;
    this.dead = true;

    const elapsedMs = Date.now() - this.startTime;
    this.physics.pause();

    this.cameras.main.flash(280, 255, 225, 102);
    sfx.play('win');
    this.tweens.add({
      targets: this.orb,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 320,
    });

    let rank: number | null = null;
    try {
      const res = await postWin({ elapsedMs });
      rank = res.rank;
    } catch (e) {
      console.error('win report failed', e);
    }

    reportJourneyEnd({ complete: true, win: true, score: elapsedMs });

    this.scene.stop('UIScene');
    this.scene.start('GameOver', {
      won: true,
      elapsedMs,
      x: this.player.x,
      y: this.player.y,
      rank,
    } satisfies GameResult);
  }
}
