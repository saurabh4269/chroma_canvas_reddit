import type { PlayerStats } from '../../shared/level';
import { FLAIR_TIERS, playerKey } from '../../shared/constants';
import { DEFAULT_SKIN_ID } from '../../shared/skins';
import { context, reddit, redis } from '@devvit/web/server';
import { todayUtc } from './level';
import { getPlayerSkinState } from './skins';

const defaultStats = (): PlayerStats => ({
  streak: 0,
  lastPlayedDate: '',
  totalWins: 0,
  totalDeaths: 0,
  bestTimeMs: 0,
  flairTier: 'Newcomer',
  equippedSkin: DEFAULT_SKIN_ID,
  unlockedSkins: [DEFAULT_SKIN_ID, 'solar'],
});

export const computeFlairTier = (wins: number, streak: number): string => {
  let tier: string = FLAIR_TIERS[0].name;
  for (const t of FLAIR_TIERS) {
    if (wins >= t.minWins || streak >= t.minStreak) {
      tier = t.name;
    }
  }
  return tier;
};

export const getPlayerStats = async (username: string): Promise<PlayerStats> => {
  const data = await redis.hGetAll(playerKey(username));
  if (!data || Object.keys(data).length === 0) {
    return defaultStats();
  }
  const totalWins = parseInt(data.totalWins ?? '0', 10);
  const skins = await getPlayerSkinState(username, { totalWins });
  return {
    streak: parseInt(data.streak ?? '0', 10),
    lastPlayedDate: data.lastPlayedDate ?? '',
    totalWins,
    totalDeaths: parseInt(data.totalDeaths ?? '0', 10),
    bestTimeMs: parseInt(data.bestTimeMs ?? '0', 10),
    flairTier: data.flairTier ?? 'Newcomer',
    equippedSkin: skins.equippedSkin,
    unlockedSkins: skins.unlockedSkins,
  };
};

export const recordDeath = async (username: string): Promise<PlayerStats> => {
  const stats = await getPlayerStats(username);
  stats.totalDeaths += 1;
  // Do not touch lastPlayedDate — that field tracks last *win* day for streaks.
  await redis.hSet(playerKey(username), {
    totalDeaths: String(stats.totalDeaths),
  });
  return stats;
};

export const recordWin = async (
  username: string,
  elapsedMs: number
): Promise<PlayerStats> => {
  const stats = await getPlayerStats(username);
  const today = todayUtc();
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // lastPlayedDate = last win day. Same-day re-wins keep streak; deaths must not reset it.
  if (stats.lastPlayedDate === today) {
    // already counted today's win toward streak
  } else if (stats.lastPlayedDate === yesterdayStr) {
    stats.streak += 1;
  } else {
    stats.streak = 1;
  }

  stats.totalWins += 1;
  stats.lastPlayedDate = today;
  if (stats.bestTimeMs === 0 || elapsedMs < stats.bestTimeMs) {
    stats.bestTimeMs = elapsedMs;
  }
  stats.flairTier = computeFlairTier(stats.totalWins, stats.streak);

  await redis.hSet(playerKey(username), {
    streak: String(stats.streak),
    lastPlayedDate: stats.lastPlayedDate,
    totalWins: String(stats.totalWins),
    totalDeaths: String(stats.totalDeaths),
    bestTimeMs: String(stats.bestTimeMs),
    flairTier: stats.flairTier,
  });

  return stats;
};

export const applyFlair = async (
  username: string,
  tier: string
): Promise<void> => {
  const subredditName = context.subredditName;
  if (!subredditName) return;
  try {
    await reddit.setUserFlair({
      subredditName,
      username,
      text: tier,
    });
  } catch (e) {
    console.warn('setUserFlair failed (may need mod perms):', e);
  }
};
