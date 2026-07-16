import type { HazardSpec } from '../../shared/level';
import { REDIS } from '../../shared/constants';
import { redis, reddit } from '@devvit/web/server';

export type PendingHazard = {
  commentId: string;
  authorId: string;
  hazard: HazardSpec;
  submittedAt: number;
};

const HAZARD_PATTERN =
  /^!hazard\s+(spike|movingBlock|gap|crumble)\s+(\d+)\s+(\d+)/i;

export const parseHazardComment = (text: string): HazardSpec | null => {
  const match = text.trim().match(HAZARD_PATTERN);
  if (!match || !match[1] || !match[2] || !match[3]) return null;
  const normalized = match[1].toLowerCase();
  const typeByToken: Record<string, HazardSpec['type']> = {
    spike: 'spike',
    movingblock: 'movingBlock',
    gap: 'gap',
    crumble: 'crumble',
  };
  const type = typeByToken[normalized];
  if (!type) return null;
  return {
    type,
    x: parseInt(match[2], 10),
    y: parseInt(match[3], 10),
  };
};

export const isCommentProcessed = async (commentId: string): Promise<boolean> => {
  const score = await redis.zScore(REDIS.commentsProcessed, commentId);
  return score !== undefined;
};

export const queueHazardComment = async (
  commentId: string,
  authorId: string,
  hazard: HazardSpec
): Promise<void> => {
  if (await isCommentProcessed(commentId)) return;

  const pending: PendingHazard = {
    commentId,
    authorId,
    hazard,
    submittedAt: Date.now(),
  };
  await redis.zAdd(REDIS.commentsPending, {
    member: JSON.stringify(pending),
    score: pending.submittedAt,
  });
};

export const removeHazardComment = async (commentId: string): Promise<void> => {
  const pending = await redis.zRange(REDIS.commentsPending, 0, -1);
  const toRemove = pending
    .filter((m) => (JSON.parse(m.member) as PendingHazard).commentId === commentId)
    .map((m) => m.member);
  if (toRemove.length > 0) {
    await redis.zRem(REDIS.commentsPending, toRemove);
  }
  await redis.zRem(REDIS.commentsProcessed, [commentId]);
};

export const tallyHazards = async (): Promise<HazardSpec[]> => {
  const pending = await redis.zRange(REDIS.commentsPending, 0, -1);
  if (pending.length === 0) {
    await redis.del(REDIS.levelNextHazards);
    return [];
  }

  type Scored = PendingHazard & { score: number };
  const scored: Scored[] = [];

  for (const entry of pending) {
    const p = JSON.parse(entry.member) as PendingHazard;
    try {
      const comment = await reddit.getCommentById(p.commentId as `t1_${string}`);
      scored.push({ ...p, score: comment?.score ?? 0 });
    } catch {
      scored.push({ ...p, score: 0 });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.submittedAt - b.submittedAt;
  });

  const winners = scored.slice(0, 5);
  const hazards = winners.map((w) => w.hazard);

  await redis.set(REDIS.levelNextHazards, JSON.stringify(hazards));

  const now = Date.now();
  for (const entry of pending) {
    const p = JSON.parse(entry.member) as PendingHazard;
    await redis.zAdd(REDIS.commentsProcessed, { member: p.commentId, score: now });
  }
  await redis.zRem(
    REDIS.commentsPending,
    pending.map((e) => e.member)
  );

  return hazards;
};
