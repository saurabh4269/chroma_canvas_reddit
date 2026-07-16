import type { PlayerStats } from '../../shared/level';
import { FLAIR_TIERS, playerKey } from '../../shared/constants';
import { context, reddit, redis } from '@devvit/web/server';
import { todayUtc } from './level';

const defaultStats = (): PlayerStats => ({
  streak: 0,
  lastPlayedDate: '',
  totalWins: 0,
  totalDeaths: 0,
  bestTimeMs: 0,
  flairTier: 'Newcomer',
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
  return {
    streak: parseInt(data.streak ?? '0', 10),
    lastPlayedDate: data.lastPlayedDate ?? '',
    totalWins: parseInt(data.totalWins ?? '0', 10),
    totalDeaths: parseInt(data.totalDeaths ?? '0', 10),
    bestTimeMs: parseInt(data.bestTimeMs ?? '0', 10),
    flairTier: data.flairTier ?? 'Newcomer',
  };
};

export const recordDeath = async (username: string): Promise<PlayerStats> => {
  const stats = await getPlayerStats(username);
  stats.totalDeaths += 1;
  await redis.hSet(playerKey(username), {
    totalDeaths: String(stats.totalDeaths),
    lastPlayedDate: todayUtc(),
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

  if (stats.lastPlayedDate === yesterdayStr) {
    stats.streak += 1;
  } else if (stats.lastPlayedDate !== today) {
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
