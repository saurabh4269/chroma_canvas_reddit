import type {
  ArchiveEntry,
  HazardSpec,
  LevelDef,
  Platform,
} from '../../shared/level';
import {
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
  PLATFORM_H,
  REDIS,
} from '../../shared/constants';
import { redis } from '@devvit/web/server';
import { computeBlessing, getDailyPulse } from './pulse';

export const todayUtc = (): string => new Date().toISOString().slice(0, 10);

/** Epoch ms of the next level rotation (12:00 UTC daily). */
export const nextRotationAt = (): number => {
  const now = new Date();
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0)
  );
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime();
};

export const hashDate = (date: string): number => {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export const mulberry32 = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export type GenerateOptions = {
  blessing?: 'mercy' | 'cruel';
};

export const generateLevel = (
  date: string,
  seq: number,
  communityHazards: HazardSpec[] = [],
  opts: GenerateOptions = {}
): LevelDef => {
  const seed = hashDate(date);
  const rand = mulberry32(seed);
  const platforms: Platform[] = [];

  const groundY = LEVEL_HEIGHT - 80;
  platforms.push({ x: 0, y: groundY, w: 200, h: PLATFORM_H });

  let x = 120;
  let y = groundY - 60;
  const steps = 18 + Math.floor(seq / 3);

  for (let i = 0; i < steps; i++) {
    const w = 70 + Math.floor(rand() * 50);
    const gap = 50 + Math.floor(rand() * (30 + seq * 2));
    const rise = rand() > 0.45 ? 40 + Math.floor(rand() * 50) : -20 - Math.floor(rand() * 30);
    x += gap;
    y = clamp(y - rise, 120, groundY - 40);
    platforms.push({ x, y, w, h: PLATFORM_H });
  }

  // Mercy Ledge — donated by yesterday's fallen: a wide safe haven mid-climb
  if (opts.blessing === 'mercy') {
    const midIdx = Math.floor(platforms.length / 2);
    const mid = platforms[midIdx]!;
    platforms.splice(midIdx + 1, 0, {
      x: mid.x + mid.w + 40,
      y: clamp(mid.y + 20, 120, groundY - 40),
      w: 180,
      h: PLATFORM_H,
    });
  }

  const last = platforms[platforms.length - 1]!;
  const exitX = last.x + last.w / 2;
  const exitY = last.y - 60;

  platforms.push({
    x: exitX - 60,
    y: exitY + 40,
    w: 120,
    h: PLATFORM_H,
  });

  const proceduralHazards: HazardSpec[] = [];
  // Yesterday's fate tilts today's danger
  const blessingDelta =
    opts.blessing === 'mercy' ? -0.08 : opts.blessing === 'cruel' ? 0.12 : 0;
  const hazardChance = Math.max(
    0.1,
    Math.min(0.6, 0.25 + seq * 0.015 + blessingDelta)
  );
  for (let i = 2; i < platforms.length - 1; i++) {
    if (rand() < hazardChance) {
      const p = platforms[i]!;
      const roll = rand();
      if (roll < 0.4) {
        // Spike planted on the platform surface
        proceduralHazards.push({
          type: 'spike',
          x: p.x + 16 + rand() * (p.w - 32),
          y: p.y - 9,
        });
      } else if (roll < 0.7) {
        // Patrolling block sweeping above the platform
        proceduralHazards.push({
          type: 'movingBlock',
          x: p.x + p.w / 2,
          y: p.y - 26,
          meta: { range: 40 + Math.floor(rand() * 60) },
        });
      } else if (roll < 0.88) {
        // Crumbling ledge floating in the jump path to the next platform
        const next = platforms[i + 1];
        if (next) {
          proceduralHazards.push({
            type: 'crumble',
            x: (p.x + p.w + next.x) / 2,
            y: Math.min(p.y, next.y) - 8,
          });
        }
      } else {
        // Shadow rift lurking beneath the gap after this platform
        proceduralHazards.push({
          type: 'gap',
          x: p.x + p.w + 25,
          y: Math.min(groundY - 20, p.y + 60),
        });
      }
    }
  }

  const validCommunity = communityHazards
    .slice(0, 5)
    .map((h) => ({
      ...h,
      x: clamp(h.x, 100, LEVEL_WIDTH - 100),
      y: clamp(h.y, 80, LEVEL_HEIGHT - 80),
    }));

  const level: LevelDef = {
    seq,
    date,
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
    spawn: { x: 80, y: groundY - 60 },
    exit: { x: exitX, y: exitY },
    platforms,
    hazards: [...proceduralHazards, ...validCommunity],
    seed,
  };
  if (opts.blessing) level.blessing = opts.blessing;
  return level;
};

export const levelHistoryKey = (date: string) => `cc:level:history:${date}`;

export const ensureCurrentLevel = async (): Promise<LevelDef> => {
  const date = todayUtc();
  const storedDate = await redis.get(REDIS.levelDate);
  const storedLevel = await redis.get(REDIS.levelCurrent);

  if (storedDate === date && storedLevel) {
    return JSON.parse(storedLevel) as LevelDef;
  }

  const seqStr = await redis.get(REDIS.levelSeq);
  const seq = seqStr ? parseInt(seqStr, 10) : 1;
  const nextHazardsRaw = await redis.get(REDIS.levelNextHazards);
  const communityHazards: HazardSpec[] = nextHazardsRaw
    ? (JSON.parse(nextHazardsRaw) as HazardSpec[])
    : [];

  const level = generateLevel(date, seq, communityHazards);
  await redis.set(REDIS.levelCurrent, JSON.stringify(level));
  await redis.set(REDIS.levelDate, date);
  if (!seqStr) {
    await redis.set(REDIS.levelSeq, '1');
  }

  return level;
};

export const rotateLevel = async (): Promise<LevelDef> => {
  const oldDate = (await redis.get(REDIS.levelDate)) ?? todayUtc();
  const oldLevelRaw = await redis.get(REDIS.levelCurrent);
  const corpseMembers = await redis.zRange(REDIS.corpsesCurrent, 0, -1);

  if (oldLevelRaw) {
    const archive = {
      level: JSON.parse(oldLevelRaw) as LevelDef,
      corpses: corpseMembers.map((c) => JSON.parse(c.member)),
    };
    await redis.set(levelHistoryKey(oldDate), JSON.stringify(archive));
  }

  await redis.del(REDIS.corpsesCurrent);
  await redis.set(REDIS.corpsesCount, '0');

  const newSeq = await redis.incrBy(REDIS.levelSeq, 1);
  const newDate = todayUtc();
  const nextHazardsRaw = await redis.get(REDIS.levelNextHazards);
  const communityHazards: HazardSpec[] = nextHazardsRaw
    ? (JSON.parse(nextHazardsRaw) as HazardSpec[])
    : [];

  // The closing day's collective fate shapes the new terrain
  const pulse = await getDailyPulse(oldDate);
  const blessing = computeBlessing(pulse);

  const level = generateLevel(
    newDate,
    newSeq,
    communityHazards,
    blessing ? { blessing } : {}
  );
  await redis.set(REDIS.levelCurrent, JSON.stringify(level));
  await redis.set(REDIS.levelDate, newDate);
  await redis.del(REDIS.levelNextHazards);

  return level;
};

/** Last N archived days (newest first) for The Archive gallery. */
export const getLevelHistory = async (days = 7): Promise<ArchiveEntry[]> => {
  const entries: ArchiveEntry[] = [];
  const now = new Date();
  for (let i = 1; i <= days; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    const raw = await redis.get(levelHistoryKey(date));
    if (!raw) continue;
    try {
      const archive = JSON.parse(raw) as {
        level: LevelDef;
        corpses: Array<{ x: number; y: number }>;
      };
      entries.push({
        date,
        seq: archive.level.seq,
        width: archive.level.width,
        height: archive.level.height,
        platforms: archive.level.platforms,
        exit: archive.level.exit,
        corpses: archive.corpses.map((c) => ({ x: c.x, y: c.y })),
        corpseCount: archive.corpses.length,
      });
    } catch {
      // Skip malformed archives
    }
  }
  return entries;
};

export const isWithinBounds = (
  level: LevelDef,
  x: number,
  y: number
): boolean => x >= 0 && x <= level.width && y >= 0 && y <= level.height;

export const minWinTimeMs = (seq: number): number =>
  Math.max(8000, 6000 + seq * 200);
