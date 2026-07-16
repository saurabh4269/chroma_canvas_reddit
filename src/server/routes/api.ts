import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  CommentActionResponse,
  CorpsesResponse,
  DeathRequest,
  DeathResponse,
  ErrorResponse,
  InitResponse,
  LeaderboardResponse,
  LevelResponse,
  StatsResponse,
  SubscribeResponse,
  WinRequest,
  WinResponse,
} from '../../shared/api';
import { subsKey } from '../../shared/constants';
import { addCorpse, getCorpseCount, getCorpses } from '../core/corpses';
import { ensureCurrentLevel, isWithinBounds, minWinTimeMs } from '../core/level';
import {
  getLeaderboard,
  recordAlltimeWin,
  recordDailyWin,
} from '../core/leaderboard';
import { applyFlair, getPlayerStats, recordDeath, recordWin } from '../core/players';
import { getDailyPostId } from '../core/post';

export const api = new Hono();

api.get('/init', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId required' }, 400);
  }

  try {
    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
    const level = await ensureCurrentLevel();
    const [corpses, corpseCount, player, dailyLb, alltimeLb, subscribed] =
      await Promise.all([
        getCorpses(),
        getCorpseCount(),
        getPlayerStats(username),
        getLeaderboard('daily'),
        getLeaderboard('alltime'),
        redis.get(subsKey(username)),
      ]);

    return c.json<InitResponse>({
      type: 'init',
      postId,
      username,
      level,
      corpses,
      corpseCount,
      player,
      dailyLeaderboard: dailyLb,
      alltimeLeaderboard: alltimeLb,
      subscribed: subscribed === '1',
      serverNow: Date.now(),
    });
  } catch (error) {
    console.error('API init error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: error instanceof Error ? error.message : 'init failed' },
      500
    );
  }
});

api.get('/level/current', async (c) => {
  const level = await ensureCurrentLevel();
  return c.json<LevelResponse>({ type: 'level', level });
});

api.get('/corpses', async (c) => {
  const corpses = await getCorpses();
  const count = await getCorpseCount();
  return c.json<CorpsesResponse>({ type: 'corpses', corpses, count });
});

api.post('/death', async (c) => {
  const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
  const body = await c.req.json<DeathRequest>();
  const level = await ensureCurrentLevel();

  if (!isWithinBounds(level, body.x, body.y)) {
    return c.json<DeathResponse>({
      type: 'death',
      accepted: false,
      corpseCount: await getCorpseCount(),
      player: await getPlayerStats(username),
    });
  }

  const { accepted, count: corpseCount } = await addCorpse(username, body.x, body.y);
  const player = await recordDeath(username);

  return c.json<DeathResponse>({
    type: 'death',
    accepted,
    corpseCount,
    player,
  });
});

api.post('/win', async (c) => {
  const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
  const body = await c.req.json<WinRequest>();
  const level = await ensureCurrentLevel();
  const floor = minWinTimeMs(level.seq);

  if (body.elapsedMs < floor || body.elapsedMs > 600_000) {
    return c.json<WinResponse>({
      type: 'win',
      accepted: false,
      rank: null,
      player: await getPlayerStats(username),
    });
  }

  const player = await recordWin(username, body.elapsedMs);
  const rank = await recordDailyWin(username, body.elapsedMs);
  await recordAlltimeWin(username);
  await applyFlair(username, player.flairTier);

  return c.json<WinResponse>({
    type: 'win',
    accepted: true,
    rank,
    player,
  });
});

api.get('/leaderboard', async (c) => {
  const scope = c.req.query('scope') === 'alltime' ? 'alltime' : 'daily';
  const entries = await getLeaderboard(scope);
  return c.json<LeaderboardResponse>({ type: 'leaderboard', scope, entries });
});

api.post('/subscribe', async (c) => {
  const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
  try {
    await reddit.subscribeToCurrentSubreddit();
    await redis.set(subsKey(username), '1');
    return c.json<SubscribeResponse>({
      type: 'subscribe',
      status: 'ok',
      message: 'Subscribed to the community!',
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return c.json<SubscribeResponse>(
      {
        type: 'subscribe',
        status: 'error',
        message: 'Could not subscribe. Try again when logged in.',
      },
      500
    );
  }
});

api.post('/comment-death', async (c) => {
  const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
  const postId = (await getDailyPostId()) ?? context.postId;
  if (!postId) {
    return c.json<CommentActionResponse>(
      { type: 'comment', status: 'error', message: 'No post to comment on' },
      400
    );
  }

  try {
    const level = await ensureCurrentLevel();
    await reddit.submitComment({
      id: postId as `t3_${string}`,
      runAs: 'USER',
      text: `💀 ${username} fell on Level #${level.seq}. My corpse is now a platform for you.`,
    });
    return c.json<CommentActionResponse>({
      type: 'comment',
      status: 'ok',
      message: 'Death comment posted!',
    });
  } catch (error) {
    console.error('Comment death error:', error);
    return c.json<CommentActionResponse>(
      {
        type: 'comment',
        status: 'error',
        message: 'Could not post comment (may need app approval for user actions).',
      },
      500
    );
  }
});

api.get('/stats/:username?', async (c) => {
  const param = c.req.param('username');
  const username =
    param && param.length > 0
      ? param
      : ((await reddit.getCurrentUsername()) ?? 'anonymous');
  const player = await getPlayerStats(username);
  return c.json<StatsResponse>({ type: 'stats', player });
});
