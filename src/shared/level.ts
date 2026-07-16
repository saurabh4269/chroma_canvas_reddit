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
};

export type CorpseRecord = {
  u: string;
  x: number;
  y: number;
  t: number;
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
