import { redis } from '@devvit/web/server';
import { playerKey } from '../../shared/constants';
import {
  DEFAULT_SKIN_ID,
  SKIN_SKUS,
  SKINS,
  WIN_SKIN_UNLOCKS,
  getSkin,
  isSkinId,
  type SkinId,
} from '../../shared/skins';
import type { PlayerStats } from '../../shared/level';

const parseUnlocked = (raw: string | undefined): SkinId[] => {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as string[];
    return arr.filter(isSkinId);
  } catch {
    return [];
  }
};

/** Free skins + win-gated + purchased, always including defaults. */
export const resolveUnlockedSkins = (
  unlocked: SkinId[],
  totalWins: number
): SkinId[] => {
  const set = new Set<SkinId>(unlocked);
  for (const skin of SKINS) {
    if (skin.unlock.kind === 'free') set.add(skin.id);
    if (skin.unlock.kind === 'wins' && totalWins >= skin.unlock.count) {
      set.add(skin.id);
    }
  }
  for (const gate of WIN_SKIN_UNLOCKS) {
    if (totalWins >= gate.wins) set.add(gate.skinId);
  }
  return SKINS.map((s) => s.id).filter((id) => set.has(id));
};

export const getPlayerSkinState = async (
  username: string,
  stats?: Pick<PlayerStats, 'totalWins'>
): Promise<{ equippedSkin: SkinId; unlockedSkins: SkinId[] }> => {
  const data = await redis.hGetAll(playerKey(username));
  const wins =
    stats?.totalWins ?? parseInt(data.totalWins ?? '0', 10);
  const unlocked = resolveUnlockedSkins(
    parseUnlocked(data.unlockedSkins),
    wins
  );
  const equippedRaw = data.equippedSkin ?? DEFAULT_SKIN_ID;
  const equippedSkin = unlocked.includes(equippedRaw as SkinId)
    ? (equippedRaw as SkinId)
    : DEFAULT_SKIN_ID;
  return { equippedSkin, unlockedSkins: unlocked };
};

export const unlockSkin = async (
  username: string,
  skinId: SkinId
): Promise<SkinId[]> => {
  const data = await redis.hGetAll(playerKey(username));
  const wins = parseInt(data.totalWins ?? '0', 10);
  const current = parseUnlocked(data.unlockedSkins);
  if (!current.includes(skinId)) current.push(skinId);
  const unlocked = resolveUnlockedSkins(current, wins);
  await redis.hSet(playerKey(username), {
    unlockedSkins: JSON.stringify(unlocked),
  });
  return unlocked;
};

export const unlockSku = async (
  username: string,
  sku: string
): Promise<SkinId | null> => {
  const skinId = SKIN_SKUS[sku];
  if (!skinId) return null;
  await unlockSkin(username, skinId);
  return skinId;
};

export const equipSkin = async (
  username: string,
  skinId: string
): Promise<{ ok: boolean; equippedSkin: SkinId; unlockedSkins: SkinId[] }> => {
  const { unlockedSkins } = await getPlayerSkinState(username);
  if (!isSkinId(skinId) || !unlockedSkins.includes(skinId)) {
    return { ok: false, equippedSkin: DEFAULT_SKIN_ID, unlockedSkins };
  }
  await redis.hSet(playerKey(username), { equippedSkin: skinId });
  return { ok: true, equippedSkin: skinId, unlockedSkins };
};

/** Judge / playtest path when Payments gold checkout is unavailable. */
export const claimDemoSkins = async (username: string): Promise<SkinId[]> => {
  const paid = SKINS.filter((s) => s.unlock.kind === 'purchase').map((s) => s.id);
  const data = await redis.hGetAll(playerKey(username));
  const wins = parseInt(data.totalWins ?? '0', 10);
  const current = parseUnlocked(data.unlockedSkins);
  for (const id of paid) {
    if (!current.includes(id)) current.push(id);
  }
  const unlocked = resolveUnlockedSkins(current, wins);
  await redis.hSet(playerKey(username), {
    unlockedSkins: JSON.stringify(unlocked),
  });
  return unlocked;
};

export const catalogForClient = (
  unlocked: SkinId[],
  equipped: SkinId
) =>
  SKINS.map((s) => ({
    id: s.id,
    name: s.name,
    desc: s.desc,
    unlocked: unlocked.includes(s.id),
    equipped: s.id === equipped,
    unlock: s.unlock,
    preview: {
      orb: s.orb,
      orbDeep: s.orbDeep,
      orbGlow: s.orbGlow,
    },
  }));

export { getSkin };
