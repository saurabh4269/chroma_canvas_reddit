import { context, reddit, redis } from '@devvit/web/server';
import { REDIS } from '../../shared/constants';
import { ensureCurrentLevel } from './level';

export const createDailyPost = async () => {
  const level = await ensureCurrentLevel();
  const corpseCount = (await redis.get(REDIS.corpsesCount)) ?? '0';

  const post = await reddit.submitCustomPost({
    title: `Chroma Canvas — Level #${level.seq} — ${level.date}`,
    postData: {
      levelSeq: level.seq,
      date: level.date,
      corpseCount: parseInt(corpseCount, 10),
    },
  });

  await redis.set(REDIS.dailyPostId, post.id ?? '');

  try {
    await reddit.submitComment({
      id: post.id,
      text: [
        '🎨 **Chroma Canvas** — Daily precision platformer',
        '',
        'Carry the Chroma Orb from spawn to exit. When you die, your Snoovatar **petrifies** into a permanent platform for everyone else.',
        '',
        '**Shape tomorrow\'s level:** comment with',
        '`!hazard spike 500 300` (types: spike, movingBlock, gap, crumble)',
        '',
        'Top 5 upvoted hazards get woven into the next level at noon UTC.',
      ].join('\n'),
    });
  } catch (e) {
    console.warn('Failed to post stickied comment:', e);
  }

  return post;
};

/**
 * The daily post id for background/scheduler use (last post the app created).
 */
export const getDailyPostId = async (): Promise<string | null> => {
  return (await redis.get(REDIS.dailyPostId)) ?? context.postId ?? null;
};

/**
 * The post a player action should target: the post they are actually viewing.
 * Falls back to the stored daily post only when context has no post (e.g.
 * scheduler-driven flows).
 */
export const getActivePostId = async (): Promise<string | null> => {
  return context.postId ?? (await redis.get(REDIS.dailyPostId)) ?? null;
};
