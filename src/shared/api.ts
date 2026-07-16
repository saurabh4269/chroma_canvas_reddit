import type { CorpseRecord, LeaderboardEntry, LevelDef, PlayerStats } from './level';

export type InitResponse = {
  type: 'init';
  postId: string;
  username: string;
  level: LevelDef;
  corpses: CorpseRecord[];
  corpseCount: number;
  player: PlayerStats;
  dailyLeaderboard: LeaderboardEntry[];
  alltimeLeaderboard: LeaderboardEntry[];
  subscribed: boolean;
  serverNow: number;
};

export type LevelResponse = {
  type: 'level';
  level: LevelDef;
};

export type CorpsesResponse = {
  type: 'corpses';
  corpses: CorpseRecord[];
  count: number;
};

export type DeathRequest = {
  x: number;
  y: number;
  clientTimeMs: number;
};

export type DeathResponse = {
  type: 'death';
  accepted: boolean;
  corpseCount: number;
  player: PlayerStats;
};

export type WinRequest = {
  elapsedMs: number;
};

export type WinResponse = {
  type: 'win';
  accepted: boolean;
  rank: number | null;
  player: PlayerStats;
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  scope: 'daily' | 'alltime';
  entries: LeaderboardEntry[];
};

export type SubscribeResponse = {
  type: 'subscribe';
  status: 'ok' | 'error';
  message: string;
};

export type CommentActionResponse = {
  type: 'comment';
  status: 'ok' | 'error';
  message: string;
};

export type StatsResponse = {
  type: 'stats';
  player: PlayerStats;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
