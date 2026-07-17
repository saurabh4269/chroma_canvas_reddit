export const APP_NAME = 'chroma-canvas';

export const CORPSE_CAP = 500;
/** Min distance between corpse platforms so stacked deaths stay climbable. */
export const CORPSE_MIN_SPACING = 36;
export const CORPSE_PLATFORM_W = 48;
export const CORPSE_PLATFORM_H = 12;
/** Hot Redis archive window; older days live in Blob when available. */
export const ARCHIVE_REDIS_DAYS = 7;
/** Max days The Archive will try to surface (Redis + Blob). */
export const ARCHIVE_LOOKBACK_DAYS = 30;

export const LEVEL_WIDTH = 3200;
export const LEVEL_HEIGHT = 600;
export const PLATFORM_H = 16;
export const PLAYER_W = 28;
export const PLAYER_H = 40;
export const ORB_RADIUS = 10;

export const MIN_WIN_TIME_MS = 8000;

export const HAZARD_TYPES = ['spike', 'movingBlock', 'gap', 'crumble'] as const;

export const FLAIR_TIERS = [
  { name: 'Newcomer', minWins: 0, minStreak: 0 },
  { name: 'Climber', minWins: 3, minStreak: 2 },
  { name: 'Chromatic', minWins: 10, minStreak: 5 },
  { name: 'Ascendant', minWins: 25, minStreak: 10 },
] as const;

export const REDIS = {
  levelCurrent: 'cc:level:current',
  levelDate: 'cc:level:date',
  levelSeq: 'cc:level:seq',
  levelNextHazards: 'cc:level:next-hazards',
  corpsesCurrent: 'cc:corpses:current',
  corpsesCount: 'cc:corpses:count',
  commentsPending: 'cc:comments:pending',
  commentsProcessed: 'cc:comments:processed',
  leaderboardAlltime: 'cc:leaderboard:alltime',
  dailyPostId: 'cc:daily:postId',
  installed: 'cc:installed',
} as const;

export const playerKey = (username: string) => `cc:player:${username}`;
export const dailyWinsKey = (date: string) => `cc:pulse:wins:${date}`;
export const dailyDeathsKey = (date: string) => `cc:pulse:deaths:${date}`;
export const leaderboardDailyKey = (date: string) => `cc:leaderboard:daily:${date}`;
export const levelHistoryKey = (date: string) => `cc:level:history:${date}`;
export const subsKey = (username: string) => `cc:subs:${username}`;
