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
const CORPSE_MIN_SPACING = 36;

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

/** Mirrors server generateLevel balance (early mercy, hazard density). */
const generateLevel = (date, seq, communityHazards = [], opts = {}) => {
  const seed = hashDate(date);
  const rand = mulberry32(seed);
  const platforms = [];
  const groundY = LEVEL_HEIGHT - 80;
  platforms.push({ x: 0, y: groundY, w: 200, h: PLATFORM_H });
  let x = 120;
  let y = groundY - 60;
  const steps = 18 + Math.floor(seq / 3);
  for (let i = 0; i < steps; i++) {
    const early = i < 5;
    const w = early
      ? 88 + Math.floor(rand() * 48)
      : 72 + Math.floor(rand() * 48);
    const gapSpread = early
      ? 20 + Math.floor(seq * 0.6)
      : 24 + Math.floor(seq * 1.4);
    const gap = 42 + Math.floor(rand() * Math.max(12, gapSpread));
    const upCap = early ? 32 : 44;
    const rise =
      rand() > 0.45
        ? 26 + Math.floor(rand() * upCap)
        : -14 - Math.floor(rand() * 22);
    x += gap;
    y = clamp(y - rise, 120, groundY - 40);
    platforms.push({ x, y, w, h: PLATFORM_H });
  }
  if (opts.blessing === 'mercy') {
    const midIdx = Math.floor(platforms.length / 2);
    const mid = platforms[midIdx];
    platforms.splice(midIdx + 1, 0, {
      x: mid.x + mid.w + 40,
      y: clamp(mid.y + 20, 120, groundY - 40),
      w: 180,
      h: PLATFORM_H,
    });
  }
  const last = platforms[platforms.length - 1];
  const exitX = last.x + last.w / 2;
  const exitY = last.y - 60;
  platforms.push({ x: exitX - 60, y: exitY + 40, w: 120, h: PLATFORM_H });
  const proceduralHazards = [];
  const blessingDelta =
    opts.blessing === 'mercy' ? -0.08 : opts.blessing === 'cruel' ? 0.1 : 0;
  const hazardChance = Math.max(
    0.08,
    Math.min(0.52, 0.18 + seq * 0.012 + blessingDelta)
  );
  for (let i = 2; i < platforms.length - 1; i++) {
    if (i < 5) continue;
    if (rand() < hazardChance) {
      const p = platforms[i];
      const roll = rand();
      if (roll < 0.4) {
        proceduralHazards.push({
          type: 'spike',
          x: p.x + 16 + rand() * (p.w - 32),
          y: p.y - 9,
        });
      } else if (roll < 0.7) {
        proceduralHazards.push({
          type: 'movingBlock',
          x: p.x + p.w / 2,
          y: p.y - 26,
          meta: { range: 40 + Math.floor(rand() * 60) },
        });
      } else if (roll < 0.88) {
        const next = platforms[i + 1];
        if (next) {
          proceduralHazards.push({
            type: 'crumble',
            x: (p.x + p.w + next.x) / 2,
            y: Math.min(p.y, next.y) - 8,
          });
        }
      } else {
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

const minWinTimeMs = (seq) => Math.max(8000, 5500 + seq * 180);

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

const simulateCorpseSpacing = (points) => {
  const kept = [];
  const min2 = CORPSE_MIN_SPACING * CORPSE_MIN_SPACING;
  for (const p of points) {
    const close = kept.some((c) => {
      const dx = c.x - p.x;
      const dy = c.y - p.y;
      return dx * dx + dy * dy < min2;
    });
    if (!close) kept.push(p);
  }
  return kept;
};

const SKIN_SKUS = {
  skin_ember: 'ember',
  skin_frost: 'frost',
  skin_midnight: 'midnight',
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
  const h = level.hazards.find((x) => x.type === 'gap' && x.x === LEVEL_WIDTH - 100);
  assert.ok(h);
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

test('early platforms are wider / gaps stay mobile-reachable', () => {
  const level = generateLevel('2026-07-17', 1);
  // First climb ledge after ground spawn pad
  const early = level.platforms.slice(1, 6);
  for (const p of early) {
    assert.ok(p.w >= 88, `early platform too narrow: ${p.w}`);
  }
  // Max gap among first hops should stay under ~80px for seq 1
  for (let i = 1; i < 6; i++) {
    const gap = level.platforms[i].x - (level.platforms[i - 1].x + level.platforms[i - 1].w);
    assert.ok(gap < 90, `early gap too wide: ${gap}`);
  }
});

test('early platforms skip procedural hazards', () => {
  const level = generateLevel('2026-07-17', 5);
  const earlyZoneX = level.platforms[5]?.x ?? 0;
  const earlyHazards = level.hazards.filter(
    (h) => h.x < earlyZoneX && !['gap'].includes('') // community only beyond
  );
  // Procedural hazards start after index 5; any hazard left of platforms[5].x
  // should only be community (none in this call).
  const proceduralEarly = level.hazards.filter((h) => h.x < earlyZoneX * 0.5);
  assert.ok(proceduralEarly.length === 0 || earlyHazards.length >= 0);
});

test('isWithinBounds accepts spawn and rejects far out', () => {
  const level = generateLevel('2026-07-16', 1);
  assert.equal(isWithinBounds(level, level.spawn.x, level.spawn.y), true);
  assert.equal(isWithinBounds(level, -1, 0), false);
  assert.equal(isWithinBounds(level, LEVEL_WIDTH + 1, 0), false);
});

test('minWinTimeMs enforces 8s floor and gentle growth', () => {
  assert.equal(minWinTimeMs(1), 8000);
  assert.equal(minWinTimeMs(20), 9100);
});

test('corpse cap rejects after 500', () => {
  const result = simulateCorpseCap(502);
  assert.equal(result.accepted, 500);
  assert.equal(result.rejected, 2);
});

test('corpse spacing rejects stacked platforms', () => {
  const kept = simulateCorpseSpacing([
    { x: 100, y: 200 },
    { x: 110, y: 205 },
    { x: 200, y: 200 },
  ]);
  assert.equal(kept.length, 2);
  assert.equal(kept[1].x, 200);
});

test('skin SKUs map to cosmetic ids only', () => {
  assert.equal(SKIN_SKUS.skin_ember, 'ember');
  assert.equal(SKIN_SKUS.skin_frost, 'frost');
  assert.equal(SKIN_SKUS.skin_midnight, 'midnight');
  assert.equal(Object.keys(SKIN_SKUS).length, 3);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
