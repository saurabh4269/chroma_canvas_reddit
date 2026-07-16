import type { HazardSpec, LevelDef, Platform } from '../../shared/level';
import {
  LEVEL_HEIGHT,
  LEVEL_WIDTH,
  PLATFORM_H,
  REDIS,
} from '../../shared/constants';
import { redis } from '@devvit/web/server';

export const todayUtc = (): string => new Date().toISOString().slice(0, 10);

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

export const generateLevel = (
  date: string,
  seq: number,
  communityHazards: HazardSpec[] = []
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
  for (let i = 2; i < platforms.length - 1; i++) {
    if (rand() < 0.25 + seq * 0.01) {
      const p = platforms[i]!;
      proceduralHazards.push({
        type: rand() > 0.5 ? 'spike' : 'movingBlock',
        x: p.x + p.w / 2,
        y: p.y - 20,
        meta: { range: 40 + Math.floor(rand() * 60) },
      });
    }
  }

  const validCommunity = communityHazards
    .slice(0, 5)
    .map((h) => ({
      ...h,
      x: clamp(h.x, 100, LEVEL_WIDTH - 100),
      y: clamp(h.y, 80, LEVEL_HEIGHT - 80),
    }));

  return {
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

  const level = generateLevel(newDate, newSeq, communityHazards);
  await redis.set(REDIS.levelCurrent, JSON.stringify(level));
  await redis.set(REDIS.levelDate, newDate);
  await redis.del(REDIS.levelNextHazards);

  return level;
};

export const isWithinBounds = (
  level: LevelDef,
  x: number,
  y: number
): boolean => x >= 0 && x <= level.width && y >= 0 && y <= level.height;

export const minWinTimeMs = (seq: number): number =>
  Math.max(8000, 6000 + seq * 200);
