/**
 * Scripted smoke tests for pure game logic (no Redis/Reddit).
 * Run: node tools/smoke-test.mjs
 */

import assert from 'node:assert/strict';

const HAZARD_PATTERN =
  /^!hazard\s+(spike|movingBlock|gap|crumble)\s+(\d+)\s+(\d+)/i;

const parseHazardComment = (text) => {
  const match = text.trim().match(HAZARD_PATTERN);
  if (!match || !match[1] || !match[2] || !match[3]) return null;
  const normalized = match[1].toLowerCase();
  const typeByToken = {
    spike: 'spike',
    movingblock: 'movingBlock',
    gap: 'gap',
    crumble: 'crumble',
  };
  const type = typeByToken[normalized];
  if (!type) return null;
  return { type, x: parseInt(match[2], 10), y: parseInt(match[3], 10) };
};

const LEVEL_WIDTH = 3200;
const LEVEL_HEIGHT = 600;
const PLATFORM_H = 16;
const CORPSE_CAP = 500;

const hashDate = (date) => {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const mulberry32 = (seed) => {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const generateLevel = (date, seq, communityHazards = []) => {
  const seed = hashDate(date);
  const rand = mulberry32(seed);
  const platforms = [];
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
  const last = platforms[platforms.length - 1];
  const exitX = last.x + last.w / 2;
  const exitY = last.y - 60;
  platforms.push({ x: exitX - 60, y: exitY + 40, w: 120, h: PLATFORM_H });
  const proceduralHazards = [];
  for (let i = 2; i < platforms.length - 1; i++) {
    if (rand() < 0.25 + seq * 0.01) {
      const p = platforms[i];
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

const isWithinBounds = (level, x, y) =>
  x >= 0 && x <= level.width && y >= 0 && y <= level.height;

const minWinTimeMs = (seq) => Math.max(8000, 6000 + seq * 200);

const simulateCorpseCap = (attempts) => {
  let stored = 0;
  let accepted = 0;
  let rejected = 0;
  for (let i = 0; i < attempts; i++) {
    if (stored >= CORPSE_CAP) {
      rejected += 1;
      continue;
    }
    stored += 1;
    accepted += 1;
  }
  return { accepted, rejected };
};

let passed = 0;
let failed = 0;

const test = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}`);
    console.error(`    ${error instanceof Error ? error.message : error}`);
  }
};

console.log('Chroma Canvas smoke tests\n');

test('parseHazardComment accepts valid spike', () => {
  const h = parseHazardComment('!hazard spike 500 300');
  assert.equal(h?.type, 'spike');
  assert.equal(h?.x, 500);
  assert.equal(h?.y, 300);
});

test('parseHazardComment is case-insensitive', () => {
  const h = parseHazardComment('!HAZARD MovingBlock 1200 200');
  assert.equal(h?.type, 'movingBlock');
});

test('parseHazardComment rejects garbage', () => {
  assert.equal(parseHazardComment('hello world'), null);
  assert.equal(parseHazardComment('!hazard laser 1 2'), null);
});

test('generateLevel is deterministic per date', () => {
  const a = generateLevel('2026-07-16', 1);
  const b = generateLevel('2026-07-16', 1);
  assert.equal(a.seed, b.seed);
  assert.equal(a.platforms.length, b.platforms.length);
  assert.equal(a.exit.x, b.exit.x);
});

test('generateLevel clamps community hazards', () => {
  const level = generateLevel('2026-07-16', 1, [
    { type: 'gap', x: 99999, y: -50 },
  ]);
  const h = level.hazards.find((x) => x.type === 'gap');
  assert.ok(h);
  assert.equal(h.x, LEVEL_WIDTH - 100);
  assert.equal(h.y, 80);
});

test('generateLevel caps community hazards at 5', () => {
  const many = Array.from({ length: 10 }, (_, i) => ({
    type: 'spike',
    x: 200 + i * 50,
    y: 200,
  }));
  const level = generateLevel('2026-07-16', 1, many);
  const community = level.hazards.filter((h) =>
    many.some((m) => m.x === h.x || h.x === clamp(m.x, 100, LEVEL_WIDTH - 100))
  );
  assert.ok(community.length <= 5);
});

test('isWithinBounds accepts spawn and rejects far out', () => {
  const level = generateLevel('2026-07-16', 1);
  assert.equal(isWithinBounds(level, level.spawn.x, level.spawn.y), true);
  assert.equal(isWithinBounds(level, -1, 0), false);
  assert.equal(isWithinBounds(level, LEVEL_WIDTH + 1, 0), false);
});

test('minWinTimeMs enforces 8s floor', () => {
  assert.equal(minWinTimeMs(1), 8000);
  assert.equal(minWinTimeMs(20), 10000);
});

test('corpse cap rejects after 500', () => {
  const result = simulateCorpseCap(502);
  assert.equal(result.accepted, 500);
  assert.equal(result.rejected, 2);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
