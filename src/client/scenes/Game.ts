import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { InitResponse } from '../../shared/api';
import type { CorpseRecord, LevelDef } from '../../shared/level';
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

type GameResult = {
  won: boolean;
  elapsedMs: number;
  x: number;
  y: number;
};

type PhysicsSprite = Phaser.GameObjects.Image & {
  body: Phaser.Physics.Arcade.Body;
};

export class Game extends Scene {
  player!: PhysicsSprite;
  orb!: Phaser.GameObjects.Image;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  jumpKey!: Phaser.Input.Keyboard.Key;
  level!: LevelDef;
  corpses: CorpseRecord[] = [];
  hazards: Phaser.GameObjects.GameObject[] = [];
  startTime = 0;
  carryingOrb = true;
  dead = false;
  touchLeft = false;
  touchRight = false;
  touchJump = false;
  journeyProgressSent = new Set<number>();

  constructor() {
    super('Game');
  }

  init() {
    this.dead = false;
    this.carryingOrb = true;
    this.hazards = [];
    this.corpses = [];
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

    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.cameras.resize(size.width, size.height);
    });
  }

  private buildParallax() {
    const w = this.level.width;
    const h = this.level.height;

    const sky = this.add.graphics().setScrollFactor(0.05);
    sky.fillGradientStyle(
      COLORS.skyDeep,
      COLORS.skyMid,
      COLORS.sand,
      COLORS.skyLight,
      1,
      1,
      1,
      1
    );
    sky.fillRect(0, 0, w, h);

    const sun = this.add
      .circle(w * 0.82, h * 0.18, 70, COLORS.sunSoft, 0.45)
      .setScrollFactor(0.08);
    this.tweens.add({
      targets: sun,
      alpha: 0.28,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Distant cool hills
    const far = this.add.graphics().setScrollFactor(0.2);
    far.fillStyle(COLORS.hillFar, 0.65);
    for (let i = 0; i < 8; i++) {
      far.fillEllipse(i * 480 + 120, h * 0.72, 520, 220);
    }

    // Mid green hills
    const mid = this.add.graphics().setScrollFactor(0.4);
    mid.fillStyle(COLORS.hillMid, 0.55);
    for (let i = 0; i < 10; i++) {
      mid.fillEllipse(i * 400 + 80, h * 0.82, 420, 180);
    }

    // Near warm dunes
    const near = this.add.graphics().setScrollFactor(0.55);
    near.fillStyle(COLORS.hillNear, 0.4);
    for (let i = 0; i < 12; i++) {
      near.fillEllipse(i * 340 + 40, h * 0.92, 360, 140);
    }
  }

  private buildPlatforms() {
    const group = this.physics.add.staticGroup();
    for (const p of this.level.platforms) {
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const rect = this.add
        .rectangle(cx, cy, p.w, p.h, COLORS.platform)
        .setStrokeStyle(1, COLORS.platformShadow, 0.55)
        .setDepth(2);
      // Grass cap for Sunny Hills readability without fragile tiled physics bodies
      this.add
        .rectangle(cx, p.y + 3, p.w, 6, COLORS.grass)
        .setDepth(3);
      group.add(rect);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(p.w, p.h);
    }
    this.registry.set('platforms', group);
  }

  private buildCorpses() {
    const group = this.physics.add.staticGroup();
    for (const c of this.corpses) {
      const stone = this.add
        .image(c.x, c.y, 'cc-corpse')
        .setDisplaySize(CORPSE_PLATFORM_W, CORPSE_PLATFORM_H)
        .setDepth(3);
      group.add(stone);
      const body = stone.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(CORPSE_PLATFORM_W, CORPSE_PLATFORM_H);
      this.add
        .text(c.x, c.y - 16, c.u.slice(0, 8), {
          fontFamily: FONTS.body,
          fontSize: '10px',
          fontStyle: '700',
          color: HEX.inkSoft,
          backgroundColor: '#fff8f099',
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(4);
    }
    this.registry.set('corpsePlatforms', group);
  }

  private buildHazards() {
    for (const h of this.level.hazards) {
      if (h.type === 'spike') {
        const spike = this.add.image(h.x, h.y, 'cc-spike').setDepth(5);
        this.physics.add.existing(spike);
        const body = spike.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(14, 14);
        this.hazards.push(spike);
      } else if (h.type === 'movingBlock') {
        const block = this.add.rectangle(h.x, h.y, 40, 16, COLORS.moving);
        block.setStrokeStyle(2, COLORS.cream, 0.5);
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
        const pit = this.add.rectangle(h.x, h.y + 20, 48, 8, COLORS.gap, 0.55);
        this.physics.add.existing(pit);
        const body = pit.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(48, 8);
        this.hazards.push(pit);
      } else if (h.type === 'crumble') {
        const crumble = this.add.rectangle(h.x, h.y, 56, 14, COLORS.crumble);
        crumble.setStrokeStyle(2, COLORS.corpseDeep, 0.6);
        this.physics.add.existing(crumble);
        const body = crumble.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(56, 14);
        crumble.setData('crumble', true);
        this.hazards.push(crumble);
      }
    }
  }

  private buildExit() {
    const zone = this.add.zone(
      this.level.exit.x,
      this.level.exit.y,
      80,
      100
    );
    this.physics.add.existing(zone);
    const body = zone.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.registry.set('exitZone', zone);

    const gate = this.add.graphics().setDepth(1);
    gate.lineStyle(5, COLORS.sun, 0.95);
    gate.strokeEllipse(this.level.exit.x, this.level.exit.y, 54, 78);
    gate.fillStyle(COLORS.orb, 0.18);
    gate.fillEllipse(this.level.exit.x, this.level.exit.y, 48, 70);

    this.add
      .text(this.level.exit.x, this.level.exit.y - 52, 'EXIT', {
        fontFamily: FONTS.display,
        fontSize: '18px',
        color: HEX.ink,
        stroke: HEX.sunSoft,
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.tweens.add({
      targets: gate,
      alpha: 0.55,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildPlayer() {
    const platforms = this.registry.get('platforms') as Phaser.Physics.Arcade.StaticGroup;
    const corpsePlatforms = this.registry.get(
      'corpsePlatforms'
    ) as Phaser.Physics.Arcade.StaticGroup;

    const playerImage = this.add
      .image(this.level.spawn.x, this.level.spawn.y, 'cc-player')
      .setDisplaySize(PLAYER_W, PLAYER_H)
      .setDepth(10);
    this.physics.add.existing(playerImage);
    this.player = playerImage as PhysicsSprite;
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(PLAYER_W - 4, PLAYER_H - 4);

    this.orb = this.add
      .image(this.level.spawn.x, this.level.spawn.y - 26, 'cc-orb')
      .setDisplaySize(22, 22)
      .setDepth(11);
    this.tweens.add({
      targets: this.orb,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0.75,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

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
    const speed = 220;
    const onGround = body.blocked.down || body.touching.down;

    let moveX = 0;
    if (this.cursors.left.isDown || this.touchLeft) moveX = -1;
    if (this.cursors.right.isDown || this.touchRight) moveX = 1;

    body.setVelocityX(moveX * speed);
    if (moveX !== 0) {
      this.player.setFlipX(moveX < 0);
    }

    if (
      (Phaser.Input.Keyboard.JustDown(this.jumpKey) ||
        (this.touchJump && onGround)) &&
      onGround
    ) {
      body.setVelocityY(-420);
      this.touchJump = false;
    }

    if (this.carryingOrb && this.orb) {
      this.orb.setPosition(this.player.x, this.player.y - 28);
    }

    this.trackJourneyProgress();

    if (this.player.y > this.level.height + 80 && !this.dead) {
      void this.handleDeath();
    }
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
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      lifespan: 380,
      scale: { start: 0.9, end: 0 },
      tint: [COLORS.player, COLORS.corpse, COLORS.sun],
      emitting: false,
    });
    emitter.explode(14);
    this.time.delayedCall(450, () => emitter.destroy());
  }

  private async handleDeath() {
    if (this.dead) return;
    this.dead = true;
    this.carryingOrb = false;
    this.orb?.setVisible(false);

    this.cameras.main.shake(150, 0.01);
    this.burstDeathShards();
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
    this.tweens.add({
      targets: this.orb,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 320,
    });

    try {
      await postWin({ elapsedMs });
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
    } satisfies GameResult);
  }
}
