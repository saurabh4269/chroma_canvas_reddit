import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createDailyPost } from '../core/post';
import { rotateLevel } from '../core/level';

export const menu = new Hono();

const postCommentUrl = (postId: string | undefined) => {
  const id = (postId ?? '').replace(/^t3_/, '');
  const sub = context.subredditName ?? 'chroma_canvas_dev';
  return `https://www.reddit.com/r/${sub}/comments/${id}`;
};

menu.post('/post-create', async (c) => {
  try {
    const post = await createDailyPost();
    return c.json<UiResponse>(
      {
        navigateTo: postCommentUrl(post.id),
      },
      200
    );
  } catch (error) {
    console.error('post-create error:', error);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});

menu.post('/force-rotate', async (c) => {
  try {
    const level = await rotateLevel();
    const post = await createDailyPost();
    return c.json<UiResponse>(
      {
        showToast: `Rotated to Level #${level.seq}`,
        navigateTo: postCommentUrl(post.id),
      },
      200
    );
  } catch (error) {
    console.error('force-rotate error:', error);
    return c.json<UiResponse>({ showToast: 'Rotation failed' }, 400);
  }
});
