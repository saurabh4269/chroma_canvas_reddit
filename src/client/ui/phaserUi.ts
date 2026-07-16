import * as Phaser from 'phaser';
import type { Scene, GameObjects } from 'phaser';
import { COLORS, FONTS, HEX } from '../theme';

export type ButtonVariant = 'coral' | 'sun' | 'sky' | 'ink';

const BUTTON_TEX: Record<ButtonVariant, string> = {
  coral: 'cc-btn-coral',
  sun: 'cc-btn-sun',
  sky: 'cc-btn-sky',
  ink: 'cc-btn-ink',
};

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
      color: HEX.ink,
      align: 'center',
      lineSpacing: 6,
    })
    .setOrigin(0.5);
}

export function addHudChip(
  scene: Scene,
  x: number,
  y: number,
  text: string,
  color: string = HEX.ink
): GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: FONTS.body,
      fontSize: '15px',
      fontStyle: '700',
      color,
      backgroundColor: HEX.creamGlass,
      padding: { x: 10, y: 5 },
    })
    .setScrollFactor(0)
    .setDepth(100)
    .setShadow(0, 1, '#1a274422', 2, true, true);
}

export type UiButton = {
  container: GameObjects.Container;
  setLabel: (label: string) => void;
};

export function addGameButton(
  scene: Scene,
  x: number,
  y: number,
  label: string,
  variant: ButtonVariant,
  onClick: () => void
): UiButton {
  const tex = BUTTON_TEX[variant];
  const img = scene.add.image(0, 0, tex).setDisplaySize(200, 46);
  const labelColor = variant === 'sun' ? HEX.ink : HEX.white;
  const text = scene.add
    .text(0, -1, label, {
      fontFamily: FONTS.display,
      fontSize: '20px',
      color: labelColor,
    })
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [img, text]);
  container.setSize(200, 46);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-100, -23, 200, 46),
    Phaser.Geom.Rectangle.Contains
  );

  container.on('pointerover', () => {
    scene.tweens.add({
      targets: container,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 100,
    });
  });
  container.on('pointerout', () => {
    scene.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
    });
  });
  container.on('pointerdown', () => {
    scene.tweens.add({
      targets: container,
      scaleX: 0.96,
      scaleY: 0.96,
      duration: 60,
      yoyo: true,
      onComplete: () => onClick(),
    });
  });

  return {
    container,
    setLabel: (next: string) => {
      text.setText(next);
    },
  };
}

export function pulseHint(scene: Scene, target: GameObjects.GameObject): void {
  scene.tweens.add({
    targets: target,
    scaleX: 1.06,
    scaleY: 1.06,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

export function floatBob(scene: Scene, target: GameObjects.GameObject, amp = 8): void {
  scene.tweens.add({
    targets: target,
    y: `+=${amp}`,
    duration: 1400,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

export function drawSunnyBackdrop(
  scene: Scene,
  width: number,
  height: number
): GameObjects.Container {
  const root = scene.add.container(0, 0);
  const w = Math.max(width, 1400);
  const h = Math.max(height, 1000);

  const sky = scene.add.graphics();
  sky.fillGradientStyle(
    COLORS.skyDeep,
    COLORS.skyMid,
    COLORS.coral,
    COLORS.sand,
    1,
    1,
    1,
    1
  );
  sky.fillRect(0, 0, w, h);
  root.add(sky);

  const sun = scene.add.circle(
    width * 0.78,
    height * 0.18,
    Math.min(width, height) * 0.14,
    COLORS.sunSoft,
    0.55
  );
  root.add(sun);
  scene.tweens.add({
    targets: sun,
    scaleX: 1.08,
    scaleY: 1.08,
    alpha: 0.4,
    duration: 2200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  const hill = scene.add.graphics();
  hill.fillStyle(COLORS.hillMid, 0.55);
  hill.fillEllipse(width * 0.25, height * 0.92, width * 0.7, height * 0.35);
  hill.fillStyle(COLORS.hillNear, 0.45);
  hill.fillEllipse(width * 0.75, height * 0.95, width * 0.65, height * 0.3);
  root.add(hill);

  return root;
}
