#!/usr/bin/env node
/**
 * Playwright e2e against demo_build/demo_server.mjs + dist/client.
 * Run from repo root after `npm run build`:
 *   node tools/e2e-playwright.mjs
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEMO = join(ROOT, 'demo_build');
const require = createRequire(join(DEMO, 'package.json'));
const { chromium } = require('playwright');

const VIEWPORT = { width: 1280, height: 720 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;
const assert = (cond, name) => {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}`);
  }
};

const startDemoServer = () =>
  new Promise((resolve, reject) => {
    const proc = spawn('node', [join(DEMO, 'demo_server.mjs')], {
      env: { ...process.env, DEMO_PORT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let buf = '';
    const onData = (chunk) => {
      buf += chunk.toString();
      const match = buf.match(/(\d+)/);
      if (match) {
        proc.stdout.off('data', onData);
        resolve({ proc, port: Number(match[1]) });
      }
    };
    proc.stdout.on('data', onData);
    proc.on('error', reject);
    setTimeout(() => reject(new Error('demo_server timeout')), 12000);
  });

const sceneTexts = async (page, key) =>
  page.evaluate((sceneKey) => {
    const scene = window.__CHROMA_GAME__?.scene?.keys?.[sceneKey];
    if (!scene) return '';
    const out = [];
    const walk = (obj) => {
      if (!obj) return;
      if (obj.type === 'Text' && obj.text) out.push(obj.text);
      if (obj.list) for (const c of obj.list) walk(c);
    };
    for (const c of scene.children?.list ?? []) walk(c);
    return out.join(' | ');
  }, key);

console.log('Chroma Canvas Playwright e2e\n');

const { proc, port } = await startDemoServer();
const base = `http://127.0.0.1:${port}`;
let browser;
try {
  const health = await fetch(`${base}/health`).then((r) => r.json());
  assert(health.ok === true, 'demo_server /health');

  const init = await fetch(`${base}/api/init`).then((r) => r.json());
  assert(init.type === 'init' && init.level?.seq === 42, '/api/init returns demo level');

  browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await browser.newPage({ viewport: VIEWPORT });
  await page.goto(`${base}/game.html?capture=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__CHROMA_GAME__, { timeout: 20000 });
  assert(true, 'Phaser boots with __CHROMA_GAME__');

  await page.waitForFunction(
    () => window.__CHROMA_GAME__?.scene?.keys?.MainMenu?.sys?.isActive?.(),
    { timeout: 15000 }
  );
  assert(true, 'MainMenu active');

  await page.evaluate(() => {
    window.__CHROMA_GAME__.scene.keys.MainMenu.registry.set('sessionTipsSeen', true);
  });
  await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height * 0.875);
  await page.waitForFunction(
    () => window.__CHROMA_GAME__?.scene?.keys?.Game?.sys?.isActive?.(),
    { timeout: 10000 }
  );
  assert(true, 'Tap starts Game');

  const early = await page.evaluate(() => {
    const s = window.__CHROMA_GAME__.scene.keys.Game;
    const ui = window.__CHROMA_GAME__.scene.keys.UIScene;
    return {
      orb: Boolean(s?.carryingOrb && s?.orb?.visible),
      ui: Boolean(ui?.sys?.isActive?.()),
      corpses: s?.corpses?.length ?? 0,
      coyote: s?.constructor?.COYOTE_MS,
    };
  });
  assert(early.orb, 'Orb carried at spawn');
  assert(early.ui, 'UIScene HUD active');
  assert(early.corpses >= 1, 'Live corpses loaded');
  assert(early.coyote === 90, 'Coyote time configured');

  await page.evaluate(() => {
    window.__CHROMA_GAME__.scene.keys.Game.setTouchInput?.(false, true, true);
  });
  await sleep(200);
  await page.keyboard.press('Space');
  await sleep(100);
  const moved = await page.evaluate(
    () => window.__CHROMA_GAME__.scene.keys.Game.player?.x ?? 0
  );
  assert(moved > 80, 'Touch/keyboard move advances player');

  await page.evaluate(() => {
    void window.__CHROMA_GAME__.scene.keys.Game.handleDeath();
  });
  await page.waitForFunction(
    () => window.__CHROMA_GAME__?.scene?.keys?.GameOver?.sys?.isActive?.(),
    { timeout: 10000 }
  );
  const death = await sceneTexts(page, 'GameOver');
  assert(/Petrified/i.test(death), 'Death GameOver title');
  assert(/Comment My Death|Spike/i.test(death), 'Death community actions');

  await page.evaluate(() => {
    const g = window.__CHROMA_GAME__;
    g.scene.stop('GameOver');
    g.scene.start('Game');
    if (typeof g.scene.run === 'function') g.scene.run('UIScene');
    else g.scene.start('UIScene');
  });
  await sleep(500);
  await page.evaluate(() => {
    void window.__CHROMA_GAME__.scene.keys.Game.handleWin();
  });
  await page.waitForFunction(
    () => window.__CHROMA_GAME__?.scene?.keys?.GameOver?.sys?.isActive?.(),
    { timeout: 10000 }
  );
  const win = await sceneTexts(page, 'GameOver');
  assert(/Orb Delivered/i.test(win), 'Win GameOver title');

  await page.evaluate(() => {
    window.__CHROMA_GAME__.scene.start('Archive');
  });
  await page.waitForFunction(
    () => window.__CHROMA_GAME__?.scene?.keys?.Archive?.sys?.isActive?.(),
    { timeout: 8000 }
  );
  await sleep(400);
  const arch = await sceneTexts(page, 'Archive');
  assert(/Archive|petrified|Level/i.test(arch), 'Archive renders history');
} catch (err) {
  console.error(err);
  failed += 1;
} finally {
  await browser?.close().catch(() => {});
  proc.kill('SIGTERM');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
