import * as Phaser from 'phaser';
import type { Scene, GameObjects } from 'phaser';
import { COLORS, FONTS, HEX } from '../theme';
import { sfx } from './sfx';

export type ButtonVariant = 'coral' | 'sun' | 'sky' | 'ink' | 'ghost';

type ButtonStyle = {
  fill: number;
  shade: number;
  label: string;
};

const BUTTON_STYLES: Record<ButtonVariant, ButtonStyle> = {
  coral: { fill: COLORS.coral, shade: COLORS.coralShadow, label: HEX.white },
  sun: { fill: COLORS.sun, shade: 0xd08f22, label: HEX.ink },
  sky: { fill: COLORS.skyDeep, shade: 0x22699c, label: HEX.white },
  ink: { fill: COLORS.inkSoft, shade: 0x2b3a63, label: HEX.white },
  ghost: { fill: COLORS.cream, shade: COLORS.creamDark, label: HEX.ink },
};

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

/** Big display title: cream face, ink outline, hard coral drop-chunk. */
export function addDisplayTitle(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  size = 52
): GameObjects.Container {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: FONTS.display,
    fontSize: `${size}px`,
    fontStyle: '600',
    align: 'center',
  };
  const chunk = scene.add
    .text(0, size * 0.09, text, {
      ...style,
      color: HEX.coralShadow,
      stroke: HEX.coralShadow,
      strokeThickness: size * 0.22,
    })
    .setOrigin(0.5)
    .setAlpha(0.9);
  const face = scene.add
    .text(0, 0, text, {
      ...style,
      color: HEX.cream,
      stroke: '#2B3A63',
      strokeThickness: size * 0.18,
    })
    .setOrigin(0.5);
  return scene.add.container(x, y, [chunk, face]);
}

export function addTitleText(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  size = 48
): GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONTS.display,
      fontSize: `${size}px`,
      color: HEX.coral,
      stroke: HEX.cream,
      strokeThickness: 8,
      align: 'center',
    })
    .setOrigin(0.5);
}

export function addBodyText(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  size = 18
): GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONTS.body,
      fontSize: `${size}px`,
      fontStyle: '600',
      color: HEX.ink,
      align: 'center',
      lineSpacing: 7,
    })
    .setOrigin(0.5);
}

/* ------------------------------------------------------------------ */
/* Cards & pills                                                       */
/* ------------------------------------------------------------------ */

/** Cream rounded card with soft shadow + warm border, drawn at exact size. */
export function addCard(
  scene: Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 20
): GameObjects.Container {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.ink, 0.14);
  g.fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, radius);
  g.fillStyle(COLORS.cream, 0.97);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  g.fillStyle(COLORS.creamDark, 0.7);
  g.fillRoundedRect(-w / 2, h / 2 - 8, w, 8, {
    tl: 0,
    tr: 0,
    bl: radius,
    br: radius,
  });
  g.lineStyle(2.5, COLORS.sun, 0.5);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  return scene.add.container(x, y, [g]);
}

/** HUD pill: icon + bold text on a cream capsule with a soft shadow. */
export type HudPill = {
  container: GameObjects.Container;
  setText: (next: string) => void;
};

export function addHudPill(
  scene: Scene,
  x: number,
  y: number,
  iconKey: string,
  text: string,
  color: string = HEX.ink
): HudPill {
  const padX = 12;
  const iconSize = 17;
  const label = scene.add
    .text(0, 0, text, {
      fontFamily: FONTS.body,
      fontSize: '15px',
      fontStyle: '800',
      color,
    })
    .setOrigin(0, 0.5);

  const bg = scene.add.graphics();
  const icon = scene.add
    .image(0, 0, iconKey)
    .setDisplaySize(iconSize, iconSize)
    .setOrigin(0, 0.5);

  const container = scene.add
    .container(x, y, [bg, icon, label])
    .setScrollFactor(0)
    .setDepth(100);

  const redraw = () => {
    const w = padX + iconSize + 7 + label.width + padX;
    const h = 30;
    bg.clear();
    bg.fillStyle(COLORS.ink, 0.16);
    bg.fillRoundedRect(1, 3, w, h, h / 2);
    bg.fillStyle(COLORS.cream, 0.94);
    bg.fillRoundedRect(0, 0, w, h, h / 2);
    bg.lineStyle(2, COLORS.sun, 0.45);
    bg.strokeRoundedRect(0, 0, w, h, h / 2);
    icon.setPosition(padX, h / 2);
    label.setPosition(padX + iconSize + 7, h / 2);
  };
  redraw();

  return {
    container,
    setText: (next: string) => {
      if (label.text !== next) {
        label.setText(next);
        redraw();
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export type UiButton = {
  container: GameObjects.Container;
  setLabel: (label: string) => void;
};

/**
 * Chunky 3D button: hard bottom chunk + glossy face, drawn at exact size.
 * Press physically drops the face onto the chunk.
 */
export function addGameButton(
  scene: Scene,
  x: number,
  y: number,
  label: string,
  variant: ButtonVariant,
  onClick: () => void,
  w = 220,
  h = 52
): UiButton {
  const style = BUTTON_STYLES[variant];
  const chunkH = 6;
  const r = h / 2 - 6;

  const shadow = scene.add.graphics();
  shadow.fillStyle(COLORS.ink, 0.16);
  shadow.fillRoundedRect(-w / 2 + 2, -h / 2 + chunkH + 5, w, h, r);

  const chunk = scene.add.graphics();
  chunk.fillStyle(style.shade, 1);
  chunk.fillRoundedRect(-w / 2, -h / 2 + chunkH, w, h, r);

  const face = scene.add.graphics();
  face.fillStyle(style.fill, 1);
  face.fillRoundedRect(-w / 2, -h / 2, w, h - 2, r);
  face.fillStyle(0xffffff, 0.22);
  face.fillRoundedRect(-w / 2 + 8, -h / 2 + 4, w - 16, (h - 2) * 0.36, r * 0.7);

  const text = scene.add
    .text(0, -2, label, {
      fontFamily: FONTS.display,
      fontSize: `${Math.round(h * 0.42)}px`,
      fontStyle: '600',
      color: style.label,
    })
    .setOrigin(0.5);

  const top = scene.add.container(0, 0, [face, text]);
  // Hit detection lives on an invisible child rectangle — container-level
  // hitAreas resolve at a vertical offset under Phaser 4.
  const hit = scene.add
    .rectangle(0, chunkH / 2, w, h + chunkH, 0xffffff, 0)
    .setInteractive({ useHandCursor: true });
  const container = scene.add.container(x, y, [shadow, chunk, top, hit]);
  container.setSize(w, h + chunkH);

  hit.on('pointerover', () => {
    scene.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 110 });
  });
  hit.on('pointerout', () => {
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 110 });
    top.y = 0;
  });
  hit.on('pointerdown', () => {
    top.y = chunkH - 1;
  });
  hit.on('pointerup', () => {
    top.y = 0;
    sfx.play('click');
    onClick();
  });

  return {
    container,
    setLabel: (next: string) => {
      text.setText(next);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Motion helpers                                                      */
/* ------------------------------------------------------------------ */

export function pulseHint(scene: Scene, target: GameObjects.GameObject): void {
  scene.tweens.add({
    targets: target,
    scaleX: 1.05,
    scaleY: 1.05,
    duration: 750,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

export function floatBob(scene: Scene, target: GameObjects.GameObject, amp = 8): void {
  scene.tweens.add({
    targets: target,
    y: `+=${amp}`,
    duration: 1500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

/* ------------------------------------------------------------------ */
/* Scenic backdrop (menus / preloader / end screens)                   */
/* ------------------------------------------------------------------ */

export type BackdropOptions = {
  dusk?: boolean;
};

/**
 * Canvas-renderer-safe vertical gradient: fillGradientStyle is WebGL-only,
 * so paint interpolated horizontal bands instead.
 */
export function fillVerticalGradient(
  g: GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: number[]
): void {
  const bands = Phaser.Math.Clamp(Math.round(h / 10), 40, 120);
  const colors = stops.map((c) => Phaser.Display.Color.ValueToColor(c));
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const seg = Math.min(t * (colors.length - 1), colors.length - 1.0001);
    const idx = Math.floor(seg);
    const local = seg - idx;
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      colors[idx]!,
      colors[idx + 1]!,
      100,
      local * 100
    );
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    const bandY = y + (h / bands) * i;
    g.fillRect(x, bandY, w, h / bands + 1);
  }
}

export function drawSunnyBackdrop(
  scene: Scene,
  width: number,
  height: number,
  opts: BackdropOptions = {}
): GameObjects.Container {
  const root = scene.add.container(0, 0);
  const w = Math.max(width, 1500);
  const h = Math.max(height, 1100);
  const dusk = opts.dusk === true;

  // Sky ramp (banded — safe on both WebGL and Canvas renderers)
  const sky = scene.add.graphics();
  if (dusk) {
    fillVerticalGradient(sky, 0, 0, w, h, [
      COLORS.duskTop,
      COLORS.duskMid,
      COLORS.duskWarm,
    ]);
  } else {
    fillVerticalGradient(sky, 0, 0, w, h, [
      COLORS.skyDeep,
      COLORS.skyMid,
      COLORS.skyLight,
      COLORS.horizon,
    ]);
  }
  root.add(sky);

  // Sun + rays
  const sunX = width * 0.78;
  const sunY = height * 0.2;
  const sunR = Math.min(width, height) * 0.11;

  const rays = scene.add.graphics({ x: sunX, y: sunY });
  rays.fillStyle(dusk ? COLORS.duskWarm : COLORS.sunSoft, dusk ? 0.14 : 0.18);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const len = sunR * 2.6;
    const spread = 0.16;
    rays.fillTriangle(
      0,
      0,
      Math.cos(a - spread) * len,
      Math.sin(a - spread) * len,
      Math.cos(a + spread) * len,
      Math.sin(a + spread) * len
    );
  }
  root.add(rays);
  scene.tweens.add({
    targets: rays,
    angle: 360,
    duration: 90000,
    repeat: -1,
  });

  const halo = scene.add.circle(sunX, sunY, sunR * 1.5, dusk ? COLORS.duskWarm : COLORS.sunSoft, 0.28);
  const sun = scene.add.circle(sunX, sunY, sunR, dusk ? 0xffcf9e : COLORS.sunCore, 0.95);
  root.add(halo);
  root.add(sun);
  scene.tweens.add({
    targets: halo,
    scaleX: 1.12,
    scaleY: 1.12,
    alpha: 0.18,
    duration: 2400,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Drifting clouds
  const cloudDefs = [
    { key: 'cc-cloud-1', x: width * 0.16, y: height * 0.14, s: 1, d: 46000 },
    { key: 'cc-cloud-2', x: width * 0.55, y: height * 0.3, s: 0.85, d: 60000 },
    { key: 'cc-cloud-3', x: width * 0.88, y: height * 0.44, s: 0.8, d: 52000 },
    { key: 'cc-cloud-2', x: width * 0.3, y: height * 0.46, s: 0.55, d: 74000 },
  ];
  for (const c of cloudDefs) {
    if (!scene.textures.exists(c.key)) continue;
    const img = scene.add
      .image(c.x, c.y, c.key)
      .setScale(c.s)
      .setAlpha(dusk ? 0.5 : 0.92);
    root.add(img);
    scene.tweens.add({
      targets: img,
      x: c.x + 70,
      duration: c.d,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // Layered hill humps
  const hills = scene.add.graphics();
  const humps = (
    baseY: number,
    amp: number,
    count: number,
    color: number,
    alpha: number
  ) => {
    hills.fillStyle(color, alpha);
    for (let i = 0; i <= count; i++) {
      const hx = (w / count) * i;
      hills.fillEllipse(hx, baseY, (w / count) * 1.9, amp * 2);
    }
  };
  if (dusk) {
    humps(height * 1.02, height * 0.2, 4, 0x3d3d73, 0.85);
    humps(height * 1.08, height * 0.22, 3, 0x2e2e5c, 0.95);
  } else {
    humps(height * 1.0, height * 0.22, 5, COLORS.hillFar, 0.75);
    humps(height * 1.05, height * 0.24, 4, COLORS.hillMid, 0.9);
    humps(height * 1.12, height * 0.26, 3, COLORS.hillNear, 1);
  }
  root.add(hills);

  return root;
}
