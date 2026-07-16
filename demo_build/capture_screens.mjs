#!/usr/bin/env node
/**
 * Capture 1920x1080 screenshots using npm playwright.
 */

import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {join, extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {captureDeathScreen, captureRedditPublic} from './capture_helpers.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const SCREENSHOTS = join(ROOT, 'screenshots');
const VIEWPORT = {width: 1920, height: 1080};

const waitForJson = async (url, timeout = 30000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      const payload = await res.json();
      if (payload.ok || payload.type === 'init') return payload;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`timed out waiting for ${url}`);
};

const startDemoServer = () =>
  new Promise((resolve, reject) => {
    const proc = spawn('node', [join(ROOT, 'demo_server.mjs')], {
      env: {...process.env, DEMO_PORT: '0'},
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let port = '';
    proc.stdout.on('data', (chunk) => {
      port += chunk.toString();
      const match = port.match(/(\d+)/);
      if (match) resolve({proc, port: Number(match[1])});
    });
    proc.on('error', reject);
    proc.stderr.on('data', (d) => process.stderr.write(d));
  });

const stopProcess = (proc) => {
  if (proc && !proc.killed) proc.kill('SIGTERM');
};

const captureLocal = async (page, baseUrl, shots) => {
  await page.setViewportSize(VIEWPORT);

  await page.goto(`${baseUrl}/static/splash-demo.html`, {waitUntil: 'networkidle'});
  await page.waitForTimeout(800);
  await page.screenshot({path: shots['01-splash.png']});

  await page.goto(`${baseUrl}/game.html?capture=1`, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.querySelector('canvas') !== null, {timeout: 30000});
  await page.waitForTimeout(2500);
  await page.screenshot({path: shots['02-main-menu.png']});

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.78);
  }
  await page.waitForFunction(() => window.__CHROMA_GAME__?.scene?.keys?.Game?.sys?.isActive?.(), {
    timeout: 15000,
  });
  await page.waitForTimeout(2000);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(100);
  }
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(600);
  await page.screenshot({path: shots['03-gameplay.png']});

  await captureDeathScreen(page, baseUrl, shots, true);
  await captureDeathScreen(page, baseUrl, shots, false);
};

const captureReddit = async (page, shots, baseUrl) => captureRedditPublic(page, shots, baseUrl);

const main = async () => {
  await mkdir(SCREENSHOTS, {recursive: true});
  const shots = Object.fromEntries(
    [
      '01-splash.png',
      '02-main-menu.png',
      '03-gameplay.png',
      '04-death.png',
      '05-win.png',
      '06-reddit-subreddit.png',
      '07-reddit-posts.png',
      '08-devvit-app.png',
    ].map((name) => [name, join(SCREENSHOTS, name)]),
  );

  const {proc, port} = await startDemoServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  let warnings = [];

  try {
    await waitForJson(`${baseUrl}/health`);
    const browser = await chromium.launch({
      headless: true,
      args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle'],
    });
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await captureLocal(page, baseUrl, shots);

    const redditContext = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2,
    });
    const redditPage = await redditContext.newPage();
    warnings = await captureReddit(redditPage, shots, baseUrl);
    await redditContext.close();
    await browser.close();
  } finally {
    stopProcess(proc);
  }

  console.log('Captured screenshots:');
  for (const name of Object.keys(shots).sort()) {
    try {
      const info = await stat(shots[name]);
      console.log(`  ${name}: ${info.size.toLocaleString()} bytes`);
    } catch {
      console.log(`  ${name}: missing`);
    }
  }
  if (warnings.length) {
    console.log('\nWarnings:');
    for (const w of warnings) console.log(`  - ${w}`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
