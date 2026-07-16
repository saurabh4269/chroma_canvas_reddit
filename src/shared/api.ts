import type {
  ArchiveEntry,
  CorpseRecord,
  DailyPulse,
  HazardSpec,
  LeaderboardEntry,
  LevelDef,
  PlayerStats,
} from './level';

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
  /** Current user's snoovatar image URL (null when unavailable). */
  snoovatarUrl: string | null;
  /** Community !hazard suggestions queued for tomorrow's level. */
  pendingHazards: HazardSpec[];
  /** Epoch ms of the next level rotation (12:00 UTC). */
  nextRotationAt: number;
  /** Today's community tug-of-war: orb deliveries vs. petrifications. */
  dailyPulse: DailyPulse;
};

export type HistoryResponse = {
  type: 'history';
  entries: ArchiveEntry[];
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

export type CommentHazardRequest = {
  hazardType: string;
  x: number;
  y: number;
};

/** Realtime messages broadcast on the `cc_live` channel. */
export type LiveEvent =
  | { kind: 'death'; u: string; x: number; y: number; seq: number; s?: string }
  | { kind: 'win'; u: string; elapsedMs: number; seq: number };

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
