import type { HAZARD_TYPES } from './constants';

export type HazardType = (typeof HAZARD_TYPES)[number];

export type HazardSpec = {
  type: HazardType;
  x: number;
  y: number;
  meta?: Record<string, number>;
};

export type Platform = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LevelDef = {
  seq: number;
  date: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  exit: { x: number; y: number };
  platforms: Platform[];
  hazards: HazardSpec[];
  seed: number;
  /**
   * Yesterday's collective fate, baked into today's terrain:
   * 'mercy' — the fallen outnumbered victors; a Mercy Ledge was granted.
   * 'cruel' — too many victories; the canvas grew crueler.
   */
  blessing?: 'mercy' | 'cruel';
};

/** A day's win/death pulse — the community tug-of-war. */
export type DailyPulse = {
  wins: number;
  deaths: number;
};

/** Archived day for The Archive gallery. */
export type ArchiveEntry = {
  date: string;
  seq: number;
  width: number;
  height: number;
  platforms: Platform[];
  exit: { x: number; y: number };
  corpses: Array<{ x: number; y: number }>;
  corpseCount: number;
  live?: boolean;
};

export type CorpseRecord = {
  u: string;
  x: number;
  y: number;
  t: number;
  /** Snoovatar URL captured at death time (optional; older corpses lack it). */
  s?: string;
};

export type PlayerStats = {
  streak: number;
  lastPlayedDate: string;
  totalWins: number;
  totalDeaths: number;
  bestTimeMs: number;
  flairTier: string;
};

export type LeaderboardEntry = {
  username: string;
  score: number;
};
