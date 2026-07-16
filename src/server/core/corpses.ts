import type { CorpseRecord } from '../../shared/level';
import { CORPSE_CAP, REDIS } from '../../shared/constants';
import { redis } from '@devvit/web/server';

export const getCorpses = async (): Promise<CorpseRecord[]> => {
  const members = await redis.zRange(REDIS.corpsesCurrent, 0, -1);
  return members.map((m) => JSON.parse(m.member) as CorpseRecord);
};

export const getCorpseCount = async (): Promise<number> => {
  const count = await redis.get(REDIS.corpsesCount);
  return count ? parseInt(count, 10) : 0;
};

export const addCorpse = async (
  username: string,
  x: number,
  y: number,
  snoovatarUrl?: string
): Promise<{ accepted: boolean; count: number }> => {
  const card = await redis.zCard(REDIS.corpsesCurrent);
  if (card >= CORPSE_CAP) {
    return { accepted: false, count: await getCorpseCount() };
  }

  const now = Date.now();
  const record: CorpseRecord = { u: username, x, y, t: now };
  if (snoovatarUrl) record.s = snoovatarUrl;
  await redis.zAdd(REDIS.corpsesCurrent, { member: JSON.stringify(record), score: now });

  const count = await redis.incrBy(REDIS.corpsesCount, 1);

  const newCard = await redis.zCard(REDIS.corpsesCurrent);
  if (newCard > CORPSE_CAP) {
    await redis.zRemRangeByRank(REDIS.corpsesCurrent, 0, newCard - CORPSE_CAP - 1);
  }

  return { accepted: true, count };
};

export const removeCorpsesByUser = async (username: string): Promise<void> => {
  const members = await redis.zRange(REDIS.corpsesCurrent, 0, -1);
  const toRemove = members
    .filter((m) => (JSON.parse(m.member) as CorpseRecord).u === username)
    .map((m) => m.member);
  if (toRemove.length > 0) {
    await redis.zRem(REDIS.corpsesCurrent, toRemove);
  }
};
