import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { redis } from '@devvit/web/server';
import { tallyHazards } from '../core/hazardComments';
import { rotateLevel } from '../core/level';
import { createDailyPost } from '../core/post';
import { REDIS } from '../../shared/constants';

export const scheduler = new Hono();

scheduler.post('/tally-hazards', async (c) => {
  await c.req.json<TaskRequest>();
  try {
    const winners = await tallyHazards();
    console.log(`Tallied ${winners.length} community hazards`);
    return c.json<TaskResponse>({ status: 'ok' });
  } catch (error) {
    console.error('tally-hazards failed:', error);
    return c.json<TaskResponse>({ status: 'error' }, 500);
  }
});

scheduler.post('/rotate-level', async (c) => {
  await c.req.json<TaskRequest>();
  try {
    const level = await rotateLevel();
    await createDailyPost();
    console.log(`Rotated to level #${level.seq} for ${level.date}`);
    return c.json<TaskResponse>({ status: 'ok' });
  } catch (error) {
    console.error('rotate-level failed:', error);
    return c.json<TaskResponse>({ status: 'error' }, 500);
  }
});

export const ensureInstalled = async (): Promise<void> => {
  const flag = await redis.get(REDIS.installed);
  if (flag === '1') return;
  await createDailyPost();
  await redis.set(REDIS.installed, '1');
};
