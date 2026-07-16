import { Hono } from 'hono';
import { context, realtime, redis, reddit } from '@devvit/web/server';
import type {
  CommentActionResponse,
  CommentHazardRequest,
  CorpsesResponse,
  DeathRequest,
  DeathResponse,
  ErrorResponse,
  HistoryResponse,
  InitResponse,
  LeaderboardResponse,
  LevelResponse,
  LiveEvent,
  StatsResponse,
  SubscribeResponse,
  WinRequest,
  WinResponse,
} from '../../shared/api';
import { HAZARD_TYPES, subsKey } from '../../shared/constants';
import { addCorpse, getCorpseCount, getCorpses } from '../core/corpses';
import { getPendingHazards } from '../core/hazardComments';
import {
  ensureCurrentLevel,
  getLevelHistory,
  isWithinBounds,
  minWinTimeMs,
  nextRotationAt,
  todayUtc,
} from '../core/level';
import {
  getDailyPulse,
  recordPulseDeath,
  recordPulseWin,
} from '../core/pulse';
import {
  getLeaderboard,
  recordAlltimeWin,
  recordDailyWin,
} from '../core/leaderboard';
import { applyFlair, getPlayerStats, recordDeath, recordWin } from '../core/players';
import { getDailyPostId } from '../core/post';

export const api = new Hono();

const LIVE_CHANNEL = 'cc_live';

const getSnoovatar = async (username: string): Promise<string | null> => {
  try {
    const user = await reddit.getUserByUsername(username);
    const url = await user?.getSnoovatarUrl();
    return url ?? null;
  } catch {
    return null;
  }
};

const broadcast = async (event: LiveEvent): Promise<void> => {
  try {
    await realtime.send(LIVE_CHANNEL, event);
  } catch (e) {
    console.warn('realtime send failed:', e);
  }
};

api.get('/init', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId required' }, 400);
  }

  try {
    const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
    const level = await ensureCurrentLevel();
    const [
      corpses,
      corpseCount,
      player,
      dailyLb,
      alltimeLb,
      subscribed,
      snoovatarUrl,
      pendingHazards,
    ] = await Promise.all([
      getCorpses(),
      getCorpseCount(),
      getPlayerStats(username),
      getLeaderboard('daily'),
      getLeaderboard('alltime'),
      redis.get(subsKey(username)),
      getSnoovatar(username),
      getPendingHazards(),
    ]);
    const dailyPulse = await getDailyPulse(todayUtc());

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
      snoovatarUrl,
      pendingHazards,
      nextRotationAt: nextRotationAt(),
      dailyPulse,
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

  const snoovatarUrl = await getSnoovatar(username);
  const { accepted, count: corpseCount } = await addCorpse(
    username,
    body.x,
    body.y,
    snoovatarUrl ?? undefined
  );
  const player = await recordDeath(username);
  await recordPulseDeath(todayUtc());

  if (accepted) {
    const event: LiveEvent = {
      kind: 'death',
      u: username,
      x: body.x,
      y: body.y,
      seq: level.seq,
    };
    if (snoovatarUrl) event.s = snoovatarUrl;
    void broadcast(event);
  }

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
  await recordPulseWin(todayUtc());
  // Daily #1 wears the Orb Bearer crown on their flair
  const flairText =
    rank === 1 ? `${player.flairTier} · Orb Bearer ✦` : player.flairTier;
  await applyFlair(username, flairText);

  void broadcast({
    kind: 'win',
    u: username,
    elapsedMs: body.elapsedMs,
    seq: level.seq,
  });

  return c.json<WinResponse>({
    type: 'win',
    accepted: true,
    rank,
    player,
  });
});

/** The Archive: today (live) + the last 7 completed days. */
api.get('/history', async (c) => {
  const [level, corpses, past] = await Promise.all([
    ensureCurrentLevel(),
    getCorpses(),
    getLevelHistory(7),
  ]);
  const today: HistoryResponse['entries'][number] = {
    date: level.date,
    seq: level.seq,
    width: level.width,
    height: level.height,
    platforms: level.platforms,
    exit: level.exit,
    corpses: corpses.map((cp) => ({ x: cp.x, y: cp.y })),
    corpseCount: corpses.length,
    live: true,
  };
  return c.json<HistoryResponse>({ type: 'history', entries: [today, ...past] });
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

/** Post a prefilled !hazard comment (usually at the player's death spot). */
api.post('/comment-hazard', async (c) => {
  const username = (await reddit.getCurrentUsername()) ?? 'anonymous';
  const body = await c.req.json<CommentHazardRequest>();
  const postId = (await getDailyPostId()) ?? context.postId;
  if (!postId) {
    return c.json<CommentActionResponse>(
      { type: 'comment', status: 'error', message: 'No post to comment on' },
      400
    );
  }

  const hazardType = HAZARD_TYPES.find((t) => t === body.hazardType);
  const level = await ensureCurrentLevel();
  const x = Math.round(body.x);
  const y = Math.round(body.y);
  if (!hazardType || !isWithinBounds(level, x, y)) {
    return c.json<CommentActionResponse>(
      { type: 'comment', status: 'error', message: 'Invalid hazard' },
      400
    );
  }

  try {
    await reddit.submitComment({
      id: postId as `t3_${string}`,
      runAs: 'USER',
      text: [
        `!hazard ${hazardType} ${x} ${y}`,
        '',
        `☠ ${username} died here on Level #${level.seq} — upvote to make tomorrow's runners suffer the same fate.`,
      ].join('\n'),
    });
    return c.json<CommentActionResponse>({
      type: 'comment',
      status: 'ok',
      message: 'Hazard suggested! Upvotes decide tomorrow.',
    });
  } catch (error) {
    console.error('Comment hazard error:', error);
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
