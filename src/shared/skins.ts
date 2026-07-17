/**
 * Cosmetic orb / trail skins. Never alter jump, speed, or hitboxes —
 * tints and particle colors only.
 */
export type SkinId = 'default' | 'solar' | 'ember' | 'frost' | 'midnight';

export type SkinUnlock =
  | { kind: 'free' }
  | { kind: 'wins'; count: number }
  | { kind: 'purchase'; sku: string; priceGold: number };

export type SkinDef = {
  id: SkinId;
  name: string;
  desc: string;
  /** Orb fill */
  orb: number;
  orbDeep: number;
  orbGlow: number;
  /** Particle trail tints */
  trail: number[];
  /** Optional soft player body tint (cosmetic only) */
  playerTint?: number;
  unlock: SkinUnlock;
};

export const SKINS: readonly SkinDef[] = [
  {
    id: 'default',
    name: 'Chroma Aqua',
    desc: 'The classic orb every climber starts with.',
    orb: 0x45e0c8,
    orbDeep: 0x1fb8a2,
    orbGlow: 0xa7f3ea,
    trail: [0x45e0c8, 0xa7f3ea],
    unlock: { kind: 'free' },
  },
  {
    id: 'solar',
    name: 'Solar Flare',
    desc: 'Warm gold trail for sunny climbs. Free for all.',
    orb: 0xffc14a,
    orbDeep: 0xe08a20,
    orbGlow: 0xffe566,
    trail: [0xffc14a, 0xffe566],
    playerTint: 0xfff0d8,
    unlock: { kind: 'free' },
  },
  {
    id: 'ember',
    name: 'Ember Trail',
    desc: 'Coral sparks that match the canvas heat.',
    orb: 0xff6f61,
    orbDeep: 0xc74a3d,
    orbGlow: 0xffa08f,
    trail: [0xff6f61, 0xffa145],
    playerTint: 0xffe0d4,
    unlock: { kind: 'purchase', sku: 'skin_ember', priceGold: 25 },
  },
  {
    id: 'frost',
    name: 'Frost Trail',
    desc: 'Cool sky-blue sparkles for twilight runs.',
    orb: 0x7ec8f0,
    orbDeep: 0x3a8ec4,
    orbGlow: 0xc9ecff,
    trail: [0x7ec8f0, 0xc9ecff],
    playerTint: 0xe8f6ff,
    unlock: { kind: 'purchase', sku: 'skin_frost', priceGold: 25 },
  },
  {
    id: 'midnight',
    name: 'Midnight Ink',
    desc: 'Deep navy orb with cream glow. Buy with Gold, or earn at 10 wins.',
    orb: 0x2b3a63,
    orbDeep: 0x1f2c4d,
    orbGlow: 0xf3e6d5,
    trail: [0x2b3a63, 0xf3e6d5],
    playerTint: 0xe8e4f0,
    unlock: { kind: 'purchase', sku: 'skin_midnight', priceGold: 50 },
  },
] as const;

/** Free progression unlocks that complement purchase SKUs. */
export const WIN_SKIN_UNLOCKS: ReadonlyArray<{ wins: number; skinId: SkinId }> = [
  { wins: 10, skinId: 'midnight' },
];

/** Paid SKUs registered in devvit.json payments.products */
export const SKIN_SKUS: Record<string, SkinId> = {
  skin_ember: 'ember',
  skin_frost: 'frost',
  skin_midnight: 'midnight',
};

export const DEFAULT_SKIN_ID: SkinId = 'default';

export const getSkin = (id: string | undefined): SkinDef =>
  SKINS.find((s) => s.id === id) ?? SKINS[0]!;

export const isSkinId = (id: string): id is SkinId =>
  SKINS.some((s) => s.id === id);
