export const captureDeathScreen = async (page, baseUrl, shots, won) => {
  await page.goto(`${baseUrl}/game.html?capture=1`, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => document.querySelector('canvas') !== null, {timeout: 30000});
  await page.waitForFunction(() => window.__CHROMA_GAME__?.scene?.keys?.MainMenu, {timeout: 30000});
  await page.waitForTimeout(1500);

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.78);
  }
  await page.waitForTimeout(2000);
  await page.waitForFunction(() => window.__CHROMA_GAME__?.scene?.keys?.Game?.sys?.isActive?.(), {
    timeout: 10000,
  }).catch(() => undefined);

  await page.evaluate((win) => {
    const game = window.__CHROMA_GAME__;
    if (!game?.scene?.keys?.GameOver) return;
    for (const key of ['Game', 'UIScene', 'MainMenu', 'Preloader']) {
      if (game.scene.isActive(key)) game.scene.stop(key);
    }
    game.scene.start('GameOver', {
      won: win,
      elapsedMs: win ? 11800 : 14200,
      x: 450,
      y: 280,
    });
    game.scene.bringToTop('GameOver');
  }, won);
  await page.waitForFunction(
    (expected) => {
      const game = window.__CHROMA_GAME__;
      const active = game?.scene?.keys?.GameOver?.sys?.isActive?.();
      const canvas = document.querySelector('canvas');
      return Boolean(active && canvas);
    },
    won,
    {timeout: 15000},
  );
  await page.waitForTimeout(1800);
  await page.screenshot({path: shots[won ? '05-win.png' : '04-death.png']});
};

export const captureRedditPublic = async (page, shots, baseUrl) => {
  const warnings = [];
  try {
    await page.goto(`${baseUrl}/static/reddit-thread-demo.html`, {waitUntil: 'networkidle'});
    await page.waitForTimeout(800);
    await page.screenshot({path: shots['06-reddit-subreddit.png']});
    await page.screenshot({path: shots['07-reddit-posts.png']});
  } catch (err) {
    warnings.push(`Could not capture reddit demo page: ${err}`);
  }

  try {
    await page.goto('https://github.com/saurabh4269/chroma_canvas_reddit', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForTimeout(4000);
    await page.screenshot({path: shots['08-devvit-app.png'], fullPage: false});
  } catch (err) {
    warnings.push(`GitHub repo capture failed: ${err}`);
  }
  return warnings;
};
