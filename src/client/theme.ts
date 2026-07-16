/**
 * Sunny ink-outline cartoon direction.
 * One language everywhere: chunky rounded shapes, consistent dark-navy
 * outlines, warm daylight palette, cream cards, coral CTAs, aqua orb.
 */
export const COLORS = {
  // Sky (dawn-to-noon vertical ramp)
  skyDeep: 0x38a2e8,
  skyMid: 0x7ec8f0,
  skyLight: 0xc9ecff,
  horizon: 0xfff0d2,
  sand: 0xffe8c8,

  // Light
  sun: 0xffc14a,
  sunSoft: 0xffe566,
  sunCore: 0xfff6c8,

  // Brand
  coral: 0xff6f61,
  coralLight: 0xff8f7d,
  coralDeep: 0xe85d4c,
  coralShadow: 0xc74a3d,

  // Ink / text
  ink: 0x1f2c4d,
  inkOutline: 0x2b3a63,
  inkSoft: 0x4a5a80,
  cream: 0xfff8f0,
  creamDark: 0xf3e6d5,

  // Terrain
  dirt: 0xe0a273,
  dirtDark: 0xc08355,
  dirtDeep: 0xa06a42,
  grass: 0x7ed491,
  grassLight: 0xa5e8b2,
  grassDeep: 0x4fb265,

  // Corpse stones
  corpse: 0xc2a284,
  corpseLight: 0xd8bda2,
  corpseDeep: 0x94765a,

  // Orb
  orb: 0x45e0c8,
  orbDeep: 0x1fb8a2,
  orbGlow: 0xa7f3ea,

  // Player
  player: 0xff7a59,
  playerShade: 0xe85d4c,
  playerBelly: 0xffd9b8,

  // Hazards
  hazard: 0xf25c4a,
  hazardDeep: 0xc93f30,
  moving: 0xffa145,
  movingDeep: 0xe0812a,
  crumble: 0xcfa079,
  gap: 0x22315a,
  gapGlow: 0x4a5f9e,

  // Parallax hills
  hillFar: 0x8fc9ee,
  hillMid: 0x7fd0a0,
  hillMidDeep: 0x5fbb85,
  hillNear: 0x63c47a,
  hillNearDeep: 0x47a962,

  // Clouds
  cloud: 0xffffff,
  cloudShade: 0xd9edfb,

  // Celebration
  confetti1: 0xff6f61,
  confetti2: 0xffc14a,
  confetti3: 0x45e0c8,
  confetti4: 0x7ec8f0,

  // Dusk (death screen tone)
  duskTop: 0x51518f,
  duskMid: 0xb0699e,
  duskWarm: 0xff9a76,
} as const;

export const HEX = {
  skyDeep: '#38A2E8',
  skyMid: '#7EC8F0',
  skyLight: '#C9ECFF',
  sand: '#FFE8C8',
  sun: '#FFC14A',
  sunSoft: '#FFE566',
  coral: '#FF6F61',
  coralDeep: '#E85D4C',
  coralShadow: '#C74A3D',
  ink: '#1F2C4D',
  inkSoft: '#4A5A80',
  cream: '#FFF8F0',
  creamGlass: '#FFF8F0EE',
  orb: '#45E0C8',
  orbDeep: '#1FB8A2',
  white: '#FFFFFF',
  grassDeep: '#4FB265',
} as const;

export const FONTS = {
  display: 'Fredoka, "Trebuchet MS", sans-serif',
  body: 'Nunito, "Segoe UI", sans-serif',
} as const;

/** Standard outline width for world sprites (drawn at 2x, shown at 1x). */
export const OUTLINE = 3;
