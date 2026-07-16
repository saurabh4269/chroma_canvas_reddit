import type { LeaderboardEntry } from '../../shared/level';
import { leaderboardDailyKey, REDIS } from '../../shared/constants';
import { redis } from '@devvit/web/server';
import { todayUtc } from './level';

export const getLeaderboard = async (
  scope: 'daily' | 'alltime',
  limit = 10
): Promise<LeaderboardEntry[]> => {
  const key =
    scope === 'daily'
      ? leaderboardDailyKey(todayUtc())
      : REDIS.leaderboardAlltime;

  const members = await redis.zRange(key, 0, limit - 1, {
    by: 'rank',
    reverse: scope === 'alltime',
  });

  return members.map((m) => ({
    username: m.member,
    score: m.score,
  }));
};

export const recordDailyWin = async (
  username: string,
  elapsedMs: number
): Promise<number | null> => {
  const key = leaderboardDailyKey(todayUtc());
  const existing = await redis.zScore(key, username);
  if (existing === undefined || elapsedMs < existing) {
    await redis.zAdd(key, { member: username, score: elapsedMs });
  }
  const rank = await redis.zRank(key, username);
  return rank !== undefined ? rank + 1 : null;
};

export const recordAlltimeWin = async (username: string): Promise<void> => {
  await redis.zIncrBy(REDIS.leaderboardAlltime, username, 1);
};
