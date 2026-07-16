import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type { InitResponse } from '../../shared/api';
import type { CorpseRecord, LevelDef } from '../../shared/level';
import {
  CORPSE_PLATFORM_H,
  CORPSE_PLATFORM_W,
  ORB_RADIUS,
  PLAYER_H,
  PLAYER_W,
} from '../../shared/constants';
import { postDeath, postWin } from '../net/api';
import {
  reportJourneyEnd,
  reportJourneyProgress,
} from '../journeys';

type GameResult = {
  won: boolean;
  elapsedMs: number;
  x: number;
  y: number;
};

export class Game extends Scene {
  player!: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
  orb!: Phaser.GameObjects.Arc;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  jumpKey!: Phaser.Input.Keyboard.Key;
  level!: LevelDef;
  corpses: CorpseRecord[] = [];
  hazards: Phaser.GameObjects.Rectangle[] = [];
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
    this.cameras.main.setBackgroundColor(0x5eb6e8);

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
    const h = this.level.height;
    this.add
      .rectangle(this.level.width / 2, h / 2, this.level.width, h, 0x1a0533)
      .setScrollFactor(0.2);
    this.add
      .rectangle(this.level.width / 2, h * 0.7, this.level.width, h * 0.5, 0x2d1b69)
      .setScrollFactor(0.5);
  }

  private buildPlatforms() {
    const group = this.physics.add.staticGroup();
    for (const p of this.level.platforms) {
      const rect = this.add.rectangle(p.x + p.w / 2, p.y + p.h / 2, p.w, p.h, 0x4a3f7a);
      group.add(rect);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(p.w, p.h);
    }
    this.registry.set('platforms', group);
  }

  private buildCorpses() {
    const group = this.physics.add.staticGroup();
    for (const c of this.corpses) {
      const rect = this.add.rectangle(
        c.x,
        c.y,
        CORPSE_PLATFORM_W,
        CORPSE_PLATFORM_H,
        0x8b7355
      );
      group.add(rect);
      const body = rect.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(CORPSE_PLATFORM_W, CORPSE_PLATFORM_H);
      this.add
        .text(c.x, c.y - 18, c.u.slice(0, 8), {
          fontSize: '10px',
          color: '#d4c4a8',
        })
        .setOrigin(0.5);
    }
    this.registry.set('corpsePlatforms', group);
  }

  private buildHazards() {
    for (const h of this.level.hazards) {
      if (h.type === 'spike') {
        const spike = this.add.triangle(
          h.x,
          h.y,
          0,
          16,
          8,
          0,
          16,
          16,
          0xff3366
        );
        this.physics.add.existing(spike);
        const body = spike.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(16, 16);
        this.hazards.push(spike as unknown as Phaser.GameObjects.Rectangle);
      } else if (h.type === 'movingBlock') {
        const block = this.add.rectangle(h.x, h.y, 40, 16, 0xff9944);
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
        const pit = this.add.rectangle(h.x, h.y + 20, 48, 8, 0x000000, 0.55);
        this.physics.add.existing(pit);
        const body = pit.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        body.setSize(48, 8);
        this.hazards.push(pit);
      } else if (h.type === 'crumble') {
        const crumble = this.add.rectangle(h.x, h.y, 56, 14, 0xaa6644);
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

    this.add
      .text(this.level.exit.x, this.level.exit.y - 40, 'EXIT', {
        fontFamily: 'Arial Black',
        fontSize: '20px',
        color: '#1a2744',
        stroke: '#ffe566',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
  }

  private buildPlayer() {
    const platforms = this.registry.get('platforms') as Phaser.Physics.Arcade.StaticGroup;
    const corpsePlatforms = this.registry.get(
      'corpsePlatforms'
    ) as Phaser.Physics.Arcade.StaticGroup;

    this.player = this.add.rectangle(
      this.level.spawn.x,
      this.level.spawn.y,
      PLAYER_W,
      PLAYER_H,
      0xff6bcb
    ) as Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(PLAYER_W - 4, PLAYER_H - 4);

    this.orb = this.add.circle(
      this.level.spawn.x,
      this.level.spawn.y - 24,
      ORB_RADIUS,
      0x7ee8fa,
      0.9
    );
    this.tweens.add({
      targets: this.orb,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.7,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    this.physics.add.collider(this.player, platforms);
    this.physics.add.collider(this.player, corpsePlatforms);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.12);

    for (const hazard of this.hazards) {
      this.physics.add.overlap(this.player, hazard, () => {
        if (!this.dead) {
          if (hazard.getData('crumble')) {
            this.tweens.add({
              targets: hazard,
              alpha: 0,
              duration: 200,
              onComplete: () => {
                hazard.destroy();
                this.hazards = this.hazards.filter((h) => h !== hazard);
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

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = 220;
    const onGround = body.blocked.down || body.touching.down;

    let moveX = 0;
    if (this.cursors.left.isDown || this.touchLeft) moveX = -1;
    if (this.cursors.right.isDown || this.touchRight) moveX = 1;

    body.setVelocityX(moveX * speed);

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
      lifespan: 350,
      scale: { start: 0.8, end: 0 },
      tint: [0xff6bcb, 0x8b7355],
      emitting: false,
    });
    emitter.explode(10);
    this.time.delayedCall(400, () => emitter.destroy());
  }

  private async handleDeath() {
    if (this.dead) return;
    this.dead = true;
    this.carryingOrb = false;
    this.orb?.setVisible(false);

    this.cameras.main.shake(150, 0.01);
    this.burstDeathShards();
    this.player.setFillStyle(0x8b7355);
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
