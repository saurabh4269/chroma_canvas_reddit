#!/usr/bin/env node
/**
 * Continuous Phaser gameplay capture via headed Chromium + Playwright recordVideo.
 * Uses capture=1 (Phaser CANVAS) so pixels render without WebGL GPU.
 * Produces screenshots/gameplay.mp4 plus refreshed stills. No credentials.
 */

import {spawn} from 'node:child_process';
import {mkdir, rm, stat, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {captureRedditPublic} from './capture_helpers.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const SCREENSHOTS = join(ROOT, 'screenshots');
const VIDEO_TMP = join(ROOT, '.capture-video');
const VIEWPORT = {width: 1920, height: 1080};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    await sleep(250);
  }
  throw new Error(`timed out waiting for ${url}`);
};

const startDemoServer = () =>
  new Promise((resolve, reject) => {
    const proc = spawn('node', [join(ROOT, 'demo_server.mjs')], {
      env: {...process.env, DEMO_PORT: '0'},
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let buf = '';
    proc.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      const match = buf.match(/(\d+)/);
      if (match) resolve({proc, port: Number(match[1])});
    });
    proc.on('error', reject);
    proc.stderr.on('data', (d) => process.stderr.write(d));
  });

const stopProcess = (proc) => {
  if (proc && !proc.killed) proc.kill('SIGTERM');
};

const waitGameActive = async (page, timeout = 15000) => {
  await page.waitForFunction(
    () => window.__CHROMA_GAME__?.scene?.keys?.Game?.sys?.isActive?.(),
    {timeout},
  );
};

const clickPlay = async (page) => {
  // MainMenu listens for any pointerdown
  await page.mouse.click(VIEWPORT.width / 2, VIEWPORT.height * 0.78);
};

const holdKey = async (page, key, ms) => {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
};

const getState = async (page) =>
  page.evaluate(() => {
    const game = window.__CHROMA_GAME__;
    const scene = game?.scene?.keys?.Game;
    const active = Object.entries(game?.scene?.keys ?? {})
      .filter(([, s]) => s?.sys?.isActive?.())
      .map(([k]) => k);
    const player = scene?.player;
    return {
      active,
      dead: Boolean(scene?.dead),
      x: player?.x ?? null,
      y: player?.y ?? null,
      carryingOrb: scene?.carryingOrb ?? null,
      exit: scene?.level?.exit ?? null,
    };
  });

/** Fill the tall viewport so the 600px world is not a thin letterboxed strip. */
const fillCamera = async (page) => {
  await page.evaluate(() => {
    const scene = window.__CHROMA_GAME__?.scene?.keys?.Game;
    if (!scene?.cameras?.main || !scene.level) return;
    const zoom = Math.max(1.15, scene.scale.height / scene.level.height);
    scene.cameras.main.setZoom(zoom);
    scene.cameras.main.setBackgroundColor(0x5eb6e8);
  });
};

/**
 * In-page platformer bot: follows the level platforms for ~22s, pauses on corpses,
 * then walks into the first spike for a natural death beat.
 */
const scriptedRun = async (page) => {
  await page.evaluate(async () => {
    const scene = window.__CHROMA_GAME__?.scene?.keys?.Game;
    if (!scene) return;

    const platforms = [...scene.level.platforms].sort((a, b) => a.x - b.x);
    const start = performance.now();
    const RUN_MS = 28000;
    let pauseUntil = 0;
    let lingerCount = 0;
    let lastSafe = platforms[0];

    const currentPlatform = (px) => {
      for (const p of platforms) {
        if (px >= p.x - 8 && px <= p.x + p.w + 8) return p;
      }
      return null;
    };

    const nextPlatform = (px) => {
      for (const p of platforms) {
        if (p.x > px + 12) return p;
      }
      return null;
    };

    await new Promise((resolve) => {
      const step = () => {
        if (scene.dead || performance.now() - start > RUN_MS) {
          scene.setTouchInput(false, false, false);
          resolve();
          return;
        }

        const body = scene.player?.body;
        if (!body) {
          requestAnimationFrame(step);
          return;
        }

        const now = performance.now();
        const px = scene.player.x;
        const py = scene.player.y;
        const onGround = body.blocked.down || body.touching.down;
        const cur = currentPlatform(px);
        const nxt = nextPlatform(px);
        if (cur) lastSafe = cur;

        // Demo recovery: never waste the climb on an early pit fall
        if (!scene.dead && py > scene.level.height - 40 && lastSafe) {
          const rx = lastSafe.x + lastSafe.w * 0.35;
          const ry = lastSafe.y - 28;
          scene.player.setPosition(rx, ry);
          body.reset(rx, ry);
          body.setVelocity(0, 0);
        }

        // Linger briefly on early corpse platforms so labels read on camera
        if (
          onGround &&
          lingerCount < 4 &&
          cur &&
          now > pauseUntil &&
          (Math.abs(px - 340) < 36 ||
            Math.abs(px - 560) < 36 ||
            Math.abs(px - 760) < 36 ||
            Math.abs(px - 960) < 36)
        ) {
          lingerCount += 1;
          pauseUntil = now + 650;
          scene.setTouchInput(false, false, false);
          requestAnimationFrame(step);
          return;
        }

        if (now < pauseUntil) {
          scene.setTouchInput(false, false, false);
          requestAnimationFrame(step);
          return;
        }

        // After a full climb past corpses, walk into the community spike (~1920)
        if (performance.now() - start > 21000 || px > 1880) {
          scene.setTouchInput(false, true, false);
          requestAnimationFrame(step);
          return;
        }

        let jump = false;
        if (onGround && cur && nxt) {
          const distToEdge = cur.x + cur.w - px;
          const needUp = nxt.y < cur.y - 8;
          // Jump earlier — low-grav / gaps are unforgiving if we wait at the lip
          if (distToEdge < 72 || needUp) jump = true;
        } else if (onGround && !nxt) {
          jump = true;
        }

        scene.setTouchInput(false, true, jump);
        requestAnimationFrame(step);
      };
      step();
    });
  });

  // Wait for async death → GameOver transition
  await page
    .waitForFunction(
      () => window.__CHROMA_GAME__?.scene?.keys?.GameOver?.sys?.isActive?.(),
      {timeout: 6000},
    )
    .catch(async () => {
      await page.evaluate(() => {
        const game = window.__CHROMA_GAME__;
        const scene = game?.scene?.keys?.Game;
        if (!scene?.player) return;
        const spikes = scene.level.hazards.filter((h) => h.type === 'spike');
        const spike = spikes[spikes.length - 1] ?? spikes[0];
        if (spike) {
          scene.player.setPosition(spike.x, spike.y - 8);
          scene.player.body?.reset(spike.x, spike.y - 8);
        }
      });
      await sleep(1500);
    });
  await sleep(400);
  return getState(page);
};

const winRun = async (page, baseUrl) => {
  await page.goto(`${baseUrl}/game.html?capture=1`, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.querySelector('canvas'), {timeout: 30000});
  await page.waitForFunction(() => window.__CHROMA_GAME__?.scene?.keys?.MainMenu, {
    timeout: 30000,
  });
  await sleep(700);
  await clickPlay(page);
  await waitGameActive(page);
  await fillCamera(page);
  await sleep(400);

  // Place on the exit platform, show EXIT, walk into the zone
  await page.evaluate(() => {
    const scene = window.__CHROMA_GAME__?.scene?.keys?.Game;
    if (!scene?.player || !scene.level) return;
    const exit = scene.level.exit;
    const platforms = scene.level.platforms;
    const pad = platforms[platforms.length - 1];
    const x = pad ? pad.x + pad.w * 0.35 : exit.x - 70;
    const y = pad ? pad.y - 24 : exit.y;
    scene.player.setPosition(x, y);
    scene.player.body.reset(x, y);
    scene.cameras.main.centerOn(exit.x, exit.y);
    scene.carryingOrb = true;
    scene.orb?.setVisible(true);
    scene.orb?.setPosition(x, y - 28);
  });
  await sleep(500);
  await holdKey(page, 'ArrowRight', 1400);
  await sleep(800);

  let state = await getState(page);
  if (!state.active.includes('GameOver')) {
    // Guarantee a real GameOver win scene for the demo beat
    await page.evaluate(() => {
      const game = window.__CHROMA_GAME__;
      const scene = game?.scene?.keys?.Game;
      const elapsedMs = scene ? Date.now() - scene.startTime : 11800;
      for (const key of ['Game', 'UIScene', 'MainMenu']) {
        if (game.scene.isActive(key)) game.scene.stop(key);
      }
      game.scene.start('GameOver', {
        won: true,
        elapsedMs,
        x: scene?.player?.x ?? 0,
        y: scene?.player?.y ?? 0,
      });
    });
    await sleep(400);
    state = await getState(page);
  }
  return state;
};

const convertToMp4 = async (webmPath, mp4Path) => {
  await new Promise((resolve, reject) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-y',
        '-i',
        webmPath,
        '-vf',
        'scale=1920:1080:flags=lanczos,fps=30',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '17',
        '-pix_fmt',
        'yuv420p',
        '-an',
        mp4Path,
      ],
      {stdio: 'inherit'},
    );
    ff.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
  });
};

const main = async () => {
  await mkdir(SCREENSHOTS, {recursive: true});
  await rm(VIDEO_TMP, {recursive: true, force: true});
  await mkdir(VIDEO_TMP, {recursive: true});

  const shots = Object.fromEntries(
    [
      '01-splash.png',
      '02-main-menu.png',
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
  let webmPath = '';

  try {
    await waitForJson(`${baseUrl}/health`);

    const browser = await chromium.launch({
      headless: false,
      args: [
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--use-gl=angle',
        '--enable-accelerated-2d-canvas',
        '--disable-gpu-sandbox',
        '--autoplay-policy=no-user-gesture-required',
        `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      ],
    });

    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      recordVideo: {
        dir: VIDEO_TMP,
        size: VIEWPORT,
      },
    });
    const page = await context.newPage();

    await page.goto(`${baseUrl}/game.html?capture=1`, {waitUntil: 'networkidle'});
    await page.waitForFunction(() => document.querySelector('canvas'), {timeout: 30000});
    await page.waitForFunction(() => window.__CHROMA_GAME__?.scene?.keys?.MainMenu, {
      timeout: 30000,
    });
    await sleep(2000);
    await page.screenshot({path: shots['02-main-menu.png']});

    await clickPlay(page);
    await waitGameActive(page);
    await fillCamera(page);
    await sleep(700);

    await holdKey(page, 'ArrowRight', 450);
    await page.keyboard.press('Space');
    await sleep(350);
    await page.screenshot({path: join(SCREENSHOTS, '03-gameplay.png')});

    const deathState = await scriptedRun(page);
    console.log('death beat:', deathState);
    await page.waitForFunction(
      () => window.__CHROMA_GAME__?.scene?.keys?.GameOver?.sys?.isActive?.(),
      {timeout: 8000},
    ).catch(() => undefined);
    await sleep(3200);
    await page.screenshot({path: shots['04-death.png']});

    const winState = await winRun(page, baseUrl);
    console.log('win beat:', winState);
    await sleep(2800);
    await page.screenshot({path: shots['05-win.png']});

    const video = page.video();
    await page.close();
    webmPath = video ? await video.path() : '';
    await context.close();

    const stillCtx = await browser.newContext({viewport: VIEWPORT, deviceScaleFactor: 1});
    const stillPage = await stillCtx.newPage();
    await stillPage.goto(`${baseUrl}/static/splash-demo.html`, {waitUntil: 'networkidle'});
    await sleep(700);
    await stillPage.screenshot({path: shots['01-splash.png']});
    warnings = await captureRedditPublic(stillPage, shots, baseUrl);
    await stillCtx.close();
    await browser.close();
  } finally {
    stopProcess(proc);
  }

  if (!webmPath) throw new Error('No video path from Playwright');
  const mp4Path = join(SCREENSHOTS, 'gameplay.mp4');
  await convertToMp4(webmPath, mp4Path);
  await rm(VIDEO_TMP, {recursive: true, force: true});

  // Write a tiny sidecar for Remotion trim hints
  const probe = await new Promise((resolve) => {
    const ff = spawn(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4Path],
      {stdio: ['ignore', 'pipe', 'pipe']},
    );
    let out = '';
    ff.stdout.on('data', (d) => (out += d));
    ff.on('exit', () => resolve(Number(out.trim()) || 0));
  });
  await writeFile(
    join(SCREENSHOTS, 'gameplay.meta.json'),
    JSON.stringify({durationSeconds: probe, width: 1920, height: 1080, method: 'playwright-recordVideo+headed-canvas'}, null, 2),
  );

  console.log('\nCaptured assets:');
  for (const name of [
    '01-splash.png',
    '02-main-menu.png',
    '03-gameplay.png',
    '04-death.png',
    '05-win.png',
    '06-reddit-subreddit.png',
    '07-reddit-posts.png',
    '08-devvit-app.png',
    'gameplay.mp4',
    'gameplay.meta.json',
  ]) {
    try {
      const info = await stat(join(SCREENSHOTS, name));
      console.log(`  ${name}: ${info.size.toLocaleString()} bytes`);
    } catch {
      console.log(`  ${name}: missing`);
    }
  }
  console.log(`\nGameplay duration: ${probe.toFixed(2)}s`);
  if (warnings.length) {
    console.log('\nWarnings:');
    for (const w of warnings) console.log(`  - ${w}`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
