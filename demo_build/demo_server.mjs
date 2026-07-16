#!/usr/bin/env node
/**
 * Local demo server: serves dist/client and mocks /api/* for screenshot capture.
 * No credentials or persistent state.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CLIENT_ROOT = join(__dirname, '..', 'dist', 'client');
const STATIC_ROOT = join(__dirname, 'static');
const PORT = Number(process.env.DEMO_PORT ?? 0);

const LEVEL_WIDTH = 3200;
const LEVEL_HEIGHT = 600;
const PLATFORM_H = 16;

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
  const validCommunity = communityHazards.slice(0, 5).map((h) => ({
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

const DEMO_DATE = '2026-07-17';
const DEMO_SEQ = 42;

/** Handcrafted demo path: readable jumps, corpse climb, community spike, exit. */
const buildDemoLevel = () => {
  const groundY = LEVEL_HEIGHT - 80;
  const platforms = [
    { x: 0, y: groundY, w: 260, h: PLATFORM_H },
    { x: 300, y: groundY - 40, w: 140, h: PLATFORM_H },
    { x: 500, y: groundY - 90, w: 130, h: PLATFORM_H },
    { x: 700, y: groundY - 130, w: 140, h: PLATFORM_H },
    { x: 900, y: groundY - 170, w: 150, h: PLATFORM_H },
    { x: 1120, y: groundY - 210, w: 140, h: PLATFORM_H },
    { x: 1340, y: groundY - 250, w: 160, h: PLATFORM_H },
    { x: 1580, y: groundY - 220, w: 140, h: PLATFORM_H },
    { x: 1800, y: groundY - 260, w: 150, h: PLATFORM_H },
    { x: 2040, y: groundY - 300, w: 160, h: PLATFORM_H },
    { x: 2280, y: groundY - 280, w: 180, h: PLATFORM_H },
  ];
  const last = platforms[platforms.length - 1];
  const exitX = last.x + last.w / 2;
  const exitY = last.y - 60;
  platforms.push({ x: exitX - 60, y: exitY + 40, w: 140, h: PLATFORM_H });
  return {
    seq: DEMO_SEQ,
    date: DEMO_DATE,
    width: 2800,
    height: LEVEL_HEIGHT,
    spawn: { x: 80, y: groundY - 60 },
    exit: { x: exitX, y: exitY },
    platforms,
    hazards: [
      // Visible mid-run hazard (moving) — spike waits for the death beat near the end
      { type: 'movingBlock', x: 1450, y: groundY - 270, meta: { range: 55 } },
      { type: 'spike', x: 1920, y: groundY - 280 },
    ],
    seed: hashDate(DEMO_DATE),
  };
};

const level = buildDemoLevel();

const corpses = [
  { u: 'pixel_pilot', x: 340, y: level.platforms[1].y - 8, t: Date.now() - 86400000 },
  { u: 'orb_runner', x: 560, y: level.platforms[2].y - 8, t: Date.now() - 7200000 },
  { u: 'chroma_climber', x: 760, y: level.platforms[3].y - 8, t: Date.now() - 3600000 },
  { u: 'snoo_jumper', x: 960, y: level.platforms[4].y - 8, t: Date.now() - 1800000 },
  { u: 'reddit_hero', x: 1180, y: level.platforms[5].y - 8, t: Date.now() - 900000 },
  { u: 'daily_grind', x: 1400, y: level.platforms[6].y - 8, t: Date.now() - 600000 },
  { u: 'saurabh42', x: 420, y: level.platforms[1].y - 8, t: Date.now() - 300000 },
];

const initPayload = {
  type: 'init',
  postId: 'demo-post-chroma-canvas',
  username: 'saurabh42',
  level,
  corpses,
  corpseCount: 127,
  player: {
    streak: 5,
    lastPlayedDate: DEMO_DATE,
    totalWins: 12,
    totalDeaths: 34,
    bestTimeMs: 14200,
    flairTier: 'Chromatic',
  },
  dailyLeaderboard: [
    { username: 'orb_runner', score: 11800 },
    { username: 'pixel_pilot', score: 12450 },
    { username: 'chroma_climber', score: 13100 },
    { username: 'saurabh42', score: 14200 },
    { username: 'snoo_jumper', score: 15600 },
  ],
  alltimeLeaderboard: [
    { username: 'reddit_hero', score: 48 },
    { username: 'chroma_climber', score: 31 },
    { username: 'saurabh42', score: 12 },
  ],
  subscribed: false,
  serverNow: Date.now(),
};

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json',
  '.map': 'application/json',
};

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const serveStatic = async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/game.html';
  const root = pathname.startsWith('/static/') ? STATIC_ROOT : CLIENT_ROOT;
  const relative = pathname.startsWith('/static/')
    ? pathname.slice('/static/'.length)
    : pathname.slice(1);
  const filePath = join(root, relative);
  const allowedRoot = pathname.startsWith('/static/') ? STATIC_ROOT : CLIENT_ROOT;
  if (!filePath.startsWith(allowedRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not file');
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  if (url.pathname === '/api/init') {
    json(res, 200, initPayload);
    return;
  }
  if (url.pathname === '/api/death' && req.method === 'POST') {
    json(res, 200, {
      type: 'death',
      accepted: true,
      corpseCount: initPayload.corpseCount + 1,
      player: initPayload.player,
    });
    return;
  }
  if (url.pathname === '/api/win' && req.method === 'POST') {
    json(res, 200, {
      type: 'win',
      accepted: true,
      rank: 4,
      player: initPayload.player,
    });
    return;
  }
  if (url.pathname === '/api/subscribe' && req.method === 'POST') {
    json(res, 200, { type: 'subscribe', status: 'ok', message: 'Subscribed!' });
    return;
  }
  if (url.pathname === '/api/comment-death' && req.method === 'POST') {
    json(res, 200, { type: 'comment', status: 'ok', message: 'Death comment posted' });
    return;
  }
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, corpseCount: initPayload.corpseCount });
    return;
  }
  await serveStatic(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  const addr = server.address();
  const actual = typeof addr === 'object' && addr ? addr.port : PORT;
  process.stdout.write(`${actual}\n`);
});
