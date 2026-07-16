import type { Scene } from 'phaser';
import { COLORS } from '../theme';

/**
 * Procedural sprite kit — sunny ink-outline cartoon.
 * Everything is drawn at 2x resolution and displayed at half size so
 * curves and outlines stay crisp inside the Reddit webview.
 */
export function generateGameTextures(scene: Scene): void {
  makePlayer(scene);
  makeOrb(scene);
  makeSpike(scene);
  makeMovingBlock(scene);
  makeCrumble(scene);
  makeCorpse(scene);
  makeClouds(scene);
  makeShadow(scene);
  makeParticles(scene);
  makeIcons(scene);
  makeTouchPads(scene);
}

/* ------------------------------------------------------------------ */
/* Characters & pickups                                                */
/* ------------------------------------------------------------------ */

function makePlayer(scene: Scene): void {
  if (scene.textures.exists('cc-player')) return;
  const g = scene.make.graphics({ x: 0, y: 0 });

  // Antenna
  g.lineStyle(4, COLORS.inkOutline, 1);
  g.beginPath();
  g.moveTo(28, 12);
  g.lineTo(28, 2);
  g.strokePath();
  g.fillStyle(COLORS.inkOutline, 1);
  g.fillCircle(28, 4, 6);
  g.fillStyle(COLORS.sunSoft, 1);
  g.fillCircle(28, 4, 4);

  // Feet (peek out under the body)
  g.fillStyle(COLORS.inkOutline, 1);
  g.fillRoundedRect(8, 66, 18, 13, 6);
  g.fillRoundedRect(30, 66, 18, 13, 6);
  g.fillStyle(COLORS.coralDeep, 1);
  g.fillRoundedRect(10, 68, 14, 9, 4);
  g.fillRoundedRect(32, 68, 14, 9, 4);

  // Body: outline layer then fill
  g.fillStyle(COLORS.inkOutline, 1);
  g.fillRoundedRect(2, 8, 52, 62, 20);
  g.fillStyle(COLORS.player, 1);
  g.fillRoundedRect(5, 11, 46, 56, 17);
  // Bottom shading
  g.fillStyle(COLORS.playerShade, 0.55);
  g.fillRoundedRect(5, 47, 46, 20, { tl: 0, tr: 0, bl: 17, br: 17 });
  // Belly patch
  g.fillStyle(COLORS.playerBelly, 1);
  g.fillEllipse(28, 52, 26, 20);
  // Top sheen
  g.fillStyle(0xffffff, 0.22);
  g.fillRoundedRect(9, 13, 38, 12, 8);

  // Eyes
  g.fillStyle(0xffffff, 1);
  g.fillCircle(18, 32, 8);
  g.fillCircle(38, 32, 8);
  g.fillStyle(COLORS.ink, 1);
  g.fillCircle(20, 33, 3.6);
  g.fillCircle(40, 33, 3.6);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(21.4, 31.6, 1.4);
  g.fillCircle(41.4, 31.6, 1.4);

  // Blush
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(12, 41, 8, 5);
  g.fillEllipse(44, 41, 8, 5);

  // Smile
  g.lineStyle(3, COLORS.ink, 1);
  g.beginPath();
  g.arc(28, 38, 6, 0.25 * Math.PI, 0.75 * Math.PI, false);
  g.strokePath();

  g.generateTexture('cc-player', 56, 80);
  g.destroy();
}

function makeOrb(scene: Scene): void {
  if (scene.textures.exists('cc-orb')) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  // Halo
  g.fillStyle(COLORS.orbGlow, 0.16);
  g.fillCircle(32, 32, 31);
  g.fillStyle(COLORS.orbGlow, 0.28);
  g.fillCircle(32, 32, 24);
  // Outlined core
  g.fillStyle(COLORS.inkOutline, 1);
  g.fillCircle(32, 32, 18);
  g.fillStyle(COLORS.orbDeep, 1);
  g.fillCircle(32, 32, 15);
  g.fillStyle(COLORS.orb, 1);
  g.fillCircle(30, 30, 12.5);
  // Glints
  g.fillStyle(0xffffff, 0.85);
  g.fillEllipse(26, 25, 8, 5);
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(37, 37, 2.2);
  g.generateTexture('cc-orb', 64, 64);
  g.destroy();
}

/* ------------------------------------------------------------------ */
/* Hazards & platforms                                                 */
/* ------------------------------------------------------------------ */

function makeSpike(scene: Scene): void {
  if (scene.textures.exists('cc-spike')) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  // Base plate
  g.fillStyle(COLORS.inkOutline, 1);
  g.fillRoundedRect(0, 26, 32, 8, 3);
  g.fillStyle(COLORS.dirtDark, 1);
  g.fillRoundedRect(2, 28, 28, 5, 2);
  // Thorn with outline
  g.fillStyle(COLORS.inkOutline, 1);
  g.fillTriangle(3, 29, 16, 0, 29, 29);
  g.fillStyle(COLORS.hazard, 1);
  g.fillTriangle(7, 27, 16, 5, 25, 27);
  // Shaded facet + highlight
  g.fillStyle(COLORS.hazardDeep, 0.8);
  g.fillTriangle(16, 5, 25, 27, 16, 27);
  g.fillStyle(0xffffff, 0.35);
  g.fillTriangle(11, 24, 15, 9, 16, 24);
  g.generateTexture('cc-spike', 32, 34);
  g.destroy();
}

function makeMovingBlock(scene: Scene): void {
  if (scene.textures.exists('cc-block')) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(COLORS.inkOutline, 1);
  g.fillRoundedRect(0, 0, 80, 32, 10);
  g.fillStyle(COLORS.moving, 1);
  g.fillRoundedRect(3, 3, 74, 26, 8);
  g.fillStyle(COLORS.movingDeep, 0.7);
  g.fillRoundedRect(3, 18, 74, 11, { tl: 0, tr: 0, bl: 8, br: 8 });
  g.fillStyle(0xffffff, 0.28);
  g.fillRoundedRect(7, 5, 66, 7, 4);
  // Warning chevrons
  g.fillStyle(COLORS.inkOutline, 0.5);
  g.fillTriangle(16, 24, 22, 10, 28, 24);
  g.fillTriangle(36, 24, 42, 10, 48, 24);
  g.fillTriangle(56, 24, 62, 10, 68, 24);
  g.generateTexture('cc-block', 80, 32);
  g.destroy();
}

function makeCrumble(scene: Scene): void {
  if (scene.textures.exists('cc-crumble')) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(COLORS.inkOutline, 1);
  g.fillRoundedRect(0, 0, 112, 28, 9);
  g.fillStyle(COLORS.crumble, 1);
  g.fillRoundedRect(3, 3, 106, 22, 7);
  g.fillStyle(COLORS.dirtDark, 0.5);
  g.fillRoundedRect(3, 15, 106, 10, { tl: 0, tr: 0, bl: 7, br: 7 });
  g.fillStyle(0xffffff, 0.2);
  g.fillRoundedRect(7, 5, 98, 5, 3);
  // Cracks
  g.lineStyle(2.5, COLORS.inkOutline, 0.6);
  g.beginPath();
  g.moveTo(30, 3);
  g.lineTo(36, 12);
  g.lineTo(30, 20);
  g.lineTo(35, 25);
  g.moveTo(70, 25);
  g.lineTo(76, 15);
  g.lineTo(71, 8);
  g.lineTo(76, 3);
  g.strokePath();
  // Chipped notches
  g.fillStyle(COLORS.inkOutline, 0.35);
  g.fillTriangle(50, 3, 56, 3, 53, 8);
  g.fillTriangle(90, 25, 96, 25, 93, 19);
  g.generateTexture('cc-crumble', 112, 28);
  g.destroy();
}

function makeCorpse(scene: Scene): void {
  if (scene.textures.exists('cc-corpse')) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  // Sleeping stone cocoon — a fallen climber, now a foothold
  g.fillStyle(COLORS.inkOutline, 1);
  g.fillRoundedRect(0, 0, 96, 28, 13);
  g.fillStyle(COLORS.corpse, 1);
  g.fillRoundedRect(3, 3, 90, 22, 10);
  g.fillStyle(COLORS.corpseDeep, 0.55);
  g.fillRoundedRect(3, 15, 90, 10, { tl: 0, tr: 0, bl: 10, br: 10 });
  g.fillStyle(COLORS.corpseLight, 0.8);
  g.fillRoundedRect(8, 5, 80, 6, 4);
  // Closed eyes (peaceful)
  g.lineStyle(2.5, COLORS.ink, 0.75);
  g.beginPath();
  g.arc(38, 13, 4, 0.15 * Math.PI, 0.85 * Math.PI, false);
  g.strokePath();
  g.beginPath();
  g.arc(56, 13, 4, 0.15 * Math.PI, 0.85 * Math.PI, false);
  g.strokePath();
  g.generateTexture('cc-corpse', 96, 28);
  g.destroy();
}

/* ------------------------------------------------------------------ */
/* Atmosphere                                                          */
/* ------------------------------------------------------------------ */

function makeClouds(scene: Scene): void {
  const defs: Array<{ key: string; w: number; h: number; puffs: number[][] }> = [
    {
      key: 'cc-cloud-1',
      w: 140,
      h: 56,
      puffs: [
        [30, 38, 22],
        [62, 28, 26],
        [96, 34, 24],
        [118, 42, 15],
      ],
    },
    {
      key: 'cc-cloud-2',
      w: 96,
      h: 44,
      puffs: [
        [24, 30, 17],
        [50, 22, 20],
        [74, 30, 16],
      ],
    },
    {
      key: 'cc-cloud-3',
      w: 64,
      h: 32,
      puffs: [
        [18, 20, 12],
        [40, 16, 14],
        [52, 22, 9],
      ],
    },
  ];
  for (const def of defs) {
    if (scene.textures.exists(def.key)) continue;
    const g = scene.make.graphics({ x: 0, y: 0 });
    // Soft blue underside first, then white puffs on top
    g.fillStyle(COLORS.cloudShade, 0.9);
    for (const [x, y, r] of def.puffs) g.fillCircle(x!, y! + 4, r!);
    g.fillStyle(COLORS.cloud, 1);
    for (const [x, y, r] of def.puffs) g.fillCircle(x!, y!, r!);
    // Flat-ish base
    g.fillRect(
      def.puffs[0]![0]! - 10,
      def.h - 16,
      def.puffs[def.puffs.length - 1]![0]! - def.puffs[0]![0]! + 20,
      8
    );
    g.generateTexture(def.key, def.w, def.h);
    g.destroy();
  }
}

function makeShadow(scene: Scene): void {
  if (scene.textures.exists('cc-shadow')) return;
  const g = scene.make.graphics({ x: 0, y: 0 });
  g.fillStyle(COLORS.ink, 0.08);
  g.fillEllipse(32, 12, 64, 22);
  g.fillStyle(COLORS.ink, 0.1);
  g.fillEllipse(32, 12, 48, 16);
  g.fillStyle(COLORS.ink, 0.12);
  g.fillEllipse(32, 12, 32, 11);
  g.generateTexture('cc-shadow', 64, 24);
  g.destroy();
}

function makeParticles(scene: Scene): void {
  if (!scene.textures.exists('shard')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 8, 8, 3);
    g.generateTexture('shard', 8, 8);
    g.destroy();
  }
  if (!scene.textures.exists('cc-dust')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(8, 8, 5);
    g.generateTexture('cc-dust', 16, 16);
    g.destroy();
  }
  if (!scene.textures.exists('cc-sparkle')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(10, 0, 7.5, 7.5, 12.5, 7.5);
    g.fillTriangle(10, 20, 7.5, 12.5, 12.5, 12.5);
    g.fillTriangle(0, 10, 7.5, 7.5, 7.5, 12.5);
    g.fillTriangle(20, 10, 12.5, 7.5, 12.5, 12.5);
    g.fillCircle(10, 10, 3);
    g.generateTexture('cc-sparkle', 20, 20);
    g.destroy();
  }
  if (!scene.textures.exists('cc-confetti')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 10, 14, 2);
    g.generateTexture('cc-confetti', 10, 14);
    g.destroy();
  }
}

/* ------------------------------------------------------------------ */
/* HUD icons & touch pads                                              */
/* ------------------------------------------------------------------ */

function makeIcons(scene: Scene): void {
  if (!scene.textures.exists('cc-icon-skull')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.inkOutline, 1);
    g.fillRoundedRect(2, 1, 24, 19, 10);
    g.fillRoundedRect(7, 16, 14, 10, 3);
    g.fillStyle(COLORS.cream, 1);
    g.fillRoundedRect(4, 3, 20, 15, 8);
    g.fillRoundedRect(9, 16, 10, 7, 2);
    g.fillStyle(COLORS.inkOutline, 1);
    g.fillCircle(10, 11, 3.2);
    g.fillCircle(18, 11, 3.2);
    g.fillRect(11.5, 18, 1.8, 4);
    g.fillRect(15, 18, 1.8, 4);
    g.generateTexture('cc-icon-skull', 28, 28);
    g.destroy();
  }
  if (!scene.textures.exists('cc-icon-clock')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.inkOutline, 1);
    g.fillCircle(14, 14, 12.5);
    g.fillStyle(COLORS.cream, 1);
    g.fillCircle(14, 14, 9.5);
    g.lineStyle(2.5, COLORS.inkOutline, 1);
    g.beginPath();
    g.moveTo(14, 14);
    g.lineTo(14, 8);
    g.moveTo(14, 14);
    g.lineTo(19, 16);
    g.strokePath();
    g.generateTexture('cc-icon-clock', 28, 28);
    g.destroy();
  }
  if (!scene.textures.exists('cc-icon-bolt')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.inkOutline, 1);
    g.fillTriangle(16, 0, 4, 16, 13, 16);
    g.fillTriangle(11, 12, 24, 12, 12, 28);
    g.fillStyle(COLORS.sunSoft, 1);
    g.fillTriangle(15.5, 3, 7, 14.5, 14, 14.5);
    g.fillTriangle(12.5, 13.5, 20.5, 13.5, 13, 24.5);
    g.generateTexture('cc-icon-bolt', 28, 28);
    g.destroy();
  }
}

function makeTouchPads(scene: Scene): void {
  const arrow = (key: string, flip: boolean) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.ink, 0.32);
    g.fillCircle(44, 44, 43);
    g.lineStyle(4, COLORS.cream, 0.65);
    g.strokeCircle(44, 44, 41);
    g.fillStyle(COLORS.cream, 0.95);
    if (flip) {
      g.fillTriangle(56, 24, 56, 64, 28, 44);
    } else {
      g.fillTriangle(32, 24, 32, 64, 60, 44);
    }
    g.generateTexture(key, 88, 88);
    g.destroy();
  };
  arrow('cc-pad-left', true);
  arrow('cc-pad-right', false);

  if (!scene.textures.exists('cc-pad-jump')) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(COLORS.orbDeep, 0.55);
    g.fillCircle(52, 52, 51);
    g.lineStyle(4, COLORS.cream, 0.8);
    g.strokeCircle(52, 52, 48);
    g.fillStyle(COLORS.cream, 0.98);
    g.fillTriangle(52, 22, 26, 52, 78, 52);
    g.fillRoundedRect(42, 50, 20, 26, 5);
    g.generateTexture('cc-pad-jump', 104, 104);
    g.destroy();
  }
}
