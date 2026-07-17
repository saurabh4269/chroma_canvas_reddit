import type { CorpseRecord } from '../../shared/level';
import {
  CORPSE_CAP,
  CORPSE_MIN_SPACING,
  REDIS,
} from '../../shared/constants';
import { redis } from '@devvit/web/server';

export const getCorpses = async (): Promise<CorpseRecord[]> => {
  const members = await redis.zRange(REDIS.corpsesCurrent, 0, -1);
  return members.map((m) => JSON.parse(m.member) as CorpseRecord);
};

export const getCorpseCount = async (): Promise<number> => {
  const count = await redis.get(REDIS.corpsesCount);
  return count ? parseInt(count, 10) : 0;
};

const tooClose = (
  x: number,
  y: number,
  existing: CorpseRecord[]
): boolean => {
  const min2 = CORPSE_MIN_SPACING * CORPSE_MIN_SPACING;
  for (const c of existing) {
    const dx = c.x - x;
    const dy = c.y - y;
    if (dx * dx + dy * dy < min2) return true;
  }
  return false;
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

  const existing = await getCorpses();
  // Count the death for stats, but skip stacking platforms on top of each other.
  if (tooClose(x, y, existing)) {
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
