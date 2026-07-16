import { Hono } from 'hono';
import type {
  OnAppInstallRequest,
  OnCommentDeleteRequest,
  OnCommentSubmitRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import {
  isCommentProcessed,
  parseHazardComment,
  queueHazardComment,
  removeHazardComment,
} from '../core/hazardComments';
import { ensureCurrentLevel } from '../core/level';
import { ensureInstalled } from './scheduler';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const input = await c.req.json<OnAppInstallRequest>();
    await ensureCurrentLevel();
    await ensureInstalled();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Chroma Canvas installed in r/${context.subredditName} (${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error('on-app-install error:', error);
    return c.json<TriggerResponse>(
      { status: 'error', message: 'Install setup failed' },
      400
    );
  }
});

triggers.post('/on-comment-submit', async (c) => {
  try {
    const input = await c.req.json<OnCommentSubmitRequest>();
    const comment = input.comment;
    if (!comment?.id || !comment.body) {
      return c.json<TriggerResponse>({ status: 'success', message: 'ignored' });
    }

    if (await isCommentProcessed(comment.id)) {
      return c.json<TriggerResponse>({ status: 'success', message: 'already processed' });
    }

    const hazard = parseHazardComment(comment.body);
    if (!hazard) {
      return c.json<TriggerResponse>({ status: 'success', message: 'no hazard' });
    }

    const authorId = comment.author ?? 'unknown';
    await queueHazardComment(comment.id, authorId, hazard);

    return c.json<TriggerResponse>({
      status: 'success',
      message: `Queued hazard ${hazard.type} from ${comment.id}`,
    });
  } catch (error) {
    console.error('on-comment-submit error:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'trigger failed' }, 400);
  }
});

triggers.post('/on-comment-delete', async (c) => {
  try {
    const input = await c.req.json<OnCommentDeleteRequest>();
    const commentId = input.commentId;
    if (commentId) {
      await removeHazardComment(commentId);
    }
    return c.json<TriggerResponse>({ status: 'success', message: 'cleaned up' });
  } catch (error) {
    console.error('on-comment-delete error:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'delete trigger failed' }, 400);
  }
});
