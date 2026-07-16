# Chroma Canvas — Constraints Summary

> Compiled from `01`–`35` scraped Devvit docs (2026-07-16) + official `devvit-template-phaser` source inspection. This is the single source of truth for "what we are and aren't allowed to do." Read this before writing any server/client code.

## 0. IMPORTANT — Hackathon timing reality check

The bundled brief (`reddit_games_with_a_hook_hackathon.md`) states the Devpost submission window was **June 17 – July 15, 2026, 6:00pm PT**, and today is **July 16, 2026** — judging has already begun. This build cannot be entered as a *new* Devpost submission for this specific hackathon round. We are proceeding anyway because:

1. The deliverable (a genuinely good, ship-ready Devvit Web + Phaser community game) has standalone value independent of the contest deadline — it can be published to Reddit, entered into a future round, or used as a portfolio/demo piece.
2. All engineering decisions below still target the stated judging rubric (Delightful UX, Polish, Reddit-y, Hook-y, Phaser Innovation) since that rubric is a good proxy for "is this actually good."

This is flagged again in the final report. It does not change any technical decision in this document.

## 1. Architecture — Devvit Web (confirmed from live template + docs, NOT the old Blocks/`devvit.yaml` API)

- Devvit Web app = **three parts**: `src/client` (webview: HTML/CSS/JS/Phaser, bundled by Vite), `src/server` (Node.js server, Hono router, bundled to **CommonJS**), and `devvit.json` (manifest — replaces legacy `devvit.yaml`; a project has one or the other, never both).
- Client talks to server **only** via `fetch('/api/...')`. All client-callable endpoints **must** be prefixed `/api/`.
- Menu actions, forms, triggers, and scheduler callbacks are server-to-server; their endpoints **must** be prefixed `/internal/`.
- `@devvit/web/client` exposes `context` (postId, subredditName, username, postData) and helpers (`navigateTo`, `requestExpandedMode`) to the webview.
- `@devvit/web/server` exposes `context`, `redis`, `reddit`, `scheduler`, `cache`, `createServer`, `getServerPort`.
- The official Phaser template (`reddit/devvit-template-phaser`) currently ships **Phaser 4.2.0**, Vite 8, TypeScript 6, `@devvit/start` for the Vite plugin, and a **two-entrypoint post** pattern: a lightweight `splash.html` (default entrypoint, `inline: true`) that shows a "Play" button, and a `game.html` entrypoint (loaded on demand via `requestExpandedMode`) that boots the actual Phaser game. We adopt this pattern — it keeps the first paint of the Reddit feed card tiny and fast (judging criterion: "clear and engaging on first interaction").

## 2. Hard platform limits (numbers that will break the app if ignored)

| Limit | Value | Source |
|---|---|---|
| Server request max execution time | **30s** | devvit_web_overview |
| Server max request payload | **4MB** | devvit_web_overview |
| Server max response payload | **10MB** | devvit_web_overview |
| Redis install size | **5MB** per installation (per-subreddit) | redis.md |
| Redis command throughput | 40,000 cmd/s per installation | redis.md |
| Redis pipelining | **not supported** — batch with `mGet`/`mSet`/hash writes instead | redis.md |
| Redis transactions | 20 concurrent per installation; **5s** exec timeout | redis.md |
| Redis `zRange` BYSCORE/BYLEX | capped at 1000 results/call | redis.md |
| Post data (`postData`) | **2KB** max, JSON only, sent to client (no secrets) | post-data.md |
| Blob storage (optional/beta) | 50GB total, 30MB/request, 100 req/s, 900-byte key length | blob-storage.md |
| Scheduler recurring jobs | **10 live cron jobs per installation** | scheduler.md |
| Scheduler `runJob()` | 60 creations/min, 60 deliveries/min | scheduler.md |
| Cache helper TTL | designed for ~1s–1day; single-flight per key, **not personalized data** | cache-helper.md |
| Server bundle format | **CommonJS only** — no ESM server output | devvit_web_configuration.md |
| Client external requests | **none** — CSP locks the webview to only the app's own webview domain | devvit_web_overview.md |
| `devvit.json` `name` | 3–16 chars, `^[a-z][a-z0-9-]*$` | devvit_web_configuration.md |

## 3. What the client webview CANNOT do

- **Cannot call any external domain.** CSP locks outbound fetch to the app's own webview origin only. All third-party/API calls must be proxied through our own `/api/` server routes (which *can* fetch externally if `permissions.http.domains` allowlists them — max 10 domains, unused here).
- **Cannot use `localStorage` reliably.** The webview iframe URL changes on every app version publish, so `localStorage` is wiped on every update. **We do not use `localStorage` anywhere** — see rule below.
- **Cannot use `fs` or native Node packages** (that's a server constraint, but relevant if any shared code is accidentally bundled client-side).
- **Cannot stream or use WebSockets.** No long-lived connections; realtime updates use Devvit's `realtime`/pub-sub primitive (short push messages) or client polling, not raw sockets.
- **Cannot read Reddit private user data** (subscriptions, vote history, saved posts, follows) — not exposed to Devvit apps at all, client or server.
- **Cannot upvote/downvote or follow/friend** on behalf of a user, even with user-action permissions — Reddit explicitly blocks this at the platform level to prevent abuse. (This matters for our "top 5 upvoted `!hazard` comments" mechanic — see §6.)

## 4. What MUST be server-side

- Redis access (`@devvit/web/server`'s `redis`) — never exposed to client.
- Reddit API calls (posting, reading comments/scores, flair, subscriptions) — server only.
- Scheduler job registration/handling — server only (`/internal/scheduler/...` endpoints declared in `devvit.json`).
- Trigger handling (`onCommentSubmit`, `onAppInstall`, etc.) — server only (`/internal/triggers/...`).
- Level generation / daily rotation logic, corpse authority (source of truth for exact death coordinates), and win/leaderboard validation — server only, so a modified client can't fake a win or inject fake corpses. The client only ever *renders* state fetched from `/api/level/current`, `/api/corpses`, etc., and *reports* gameplay events (`died-at x,y`, `won`) that the server validates before writing to Redis.
- Any secrets (none currently required — no third-party API keys) would go in `Devvit.addSettings` with `isSecret: true`, never in client bundle.

## 5. Redis vs. Blob vs. Post Data — decision rules

| Data | Store | Why |
|---|---|---|
| Current level definition (platforms/hazards/spawn/exit JSON, <~10KB) | **Redis** string (`level:current`) | Small, hot-read every page load, needs low latency |
| Corpse list for current level (array of `{x,y,username,diedAt}`, capped) | **Redis** — a capped list via sorted set (`corpses:current`, score = death timestamp) | Frequently read/appended, needs atomic increment of `corpses:count`, needs cheap trimming via `zRemRangeByRank` once over cap |
| Per-user stats (streak, totalDeaths, totalWins, lastPlayedDate) | **Redis hash** (`player:<username>`) | Small structured record per user, hash is the recommended pattern per `05_redis.md` "Key design" guidance (never scatter one key per user with no collection key) |
| Leaderboards (daily, all-time) | **Redis sorted set** (`leaderboard:daily:<date>`, `leaderboard:alltime`) | Sorted sets are the documented pattern for rankings |
| Pending/processed `!hazard` comments for vote-tallying | **Redis sorted set** (score = comment ups at tally time) + hash for dedup | FIFO/priority-queue-like behavior per §"Data structures" guidance (no native queue/list type) |
| Historical level archive (`level:history:<date>`) | **Redis string, TTL'd or capped** — only keep last ~30 days, older entries pruned by the daily cron before writing the new one | Avoids unbounded growth against the 5MB Redis quota |
| Large corpse art / replay GIFs / screenshots (future stretch) | **Blob storage** (`@devvit/blob`, beta — requires modmail request) | Bulky, infrequently accessed; NOT used in v1 since it needs manual beta approval — flagged as a stretch goal only |
| One-time per-post metadata surfaced without a server round trip (e.g., which entrypoint variant, today's level number for the splash screen) | **Post data** (`postData`, 2KB cap) | Avoids an extra `/api` call before first paint; still just a cache of what's in Redis, Redis remains the source of truth |
| Anything the client needs to remember between sessions | **Never `localStorage`** — always Redis, keyed by `username` (from `context`) | localStorage is wiped on every app version bump; Redis is the only durable store |

**Corpse archive strategy (>500 corpses):** once `corpses:count` for the current level exceeds a configurable cap (default 500), the daily-rotation cron (a) snapshots the full corpse list into `level:history:<date>` (compressed, since it's write-once/read-rarely — good `redisCompressed` candidate) before generating tomorrow's level, and (b) resets `corpses:current` / `corpses:count` to empty for the new level. Within a single live level, if corpse count exceeds the cap *before* rotation, we stop adding new corpse platforms (new deaths still count for stats/streaks but render as a temporary particle-death only, not a new permanent platform) to protect the 5MB Redis budget and Arcade Physics static-body performance.

## 6. `!hazard` comment mechanic — the vote-count workaround

Devvit apps **cannot read a user's vote history and cannot cast votes**, but a comment's **aggregate score is public data** exposed via `reddit.getCommentById()` / listing comments on a post (`Comment.score`). So "top 5 upvoted `!hazard` comments" is implemented as:

1. `onCommentSubmit` trigger fires on every new comment on the daily level post → server parses for a `!hazard <type> <x> <y>` pattern (whitelisted hazard types only) → if it matches, stores `{commentId, authorId, hazardSpec}` in `comments:pending` (Redis sorted set, score = submission time) rather than acting immediately (comment scores at submit-time are always 0/1, meaningless).
2. A **daily scheduler cron** (running ~30 minutes before the next-level rotation cron) re-fetches each pending comment via `reddit.getCommentById()` to read its **current** `score`, sorts, takes the top 5 by score (ties broken by earliest submission), and writes the winning hazard specs onto tomorrow's level definition before it's persisted to `level:current`.
3. Processed comments move from `comments:pending` to `comments:processed` (Redis, capped/TTL'd) so they're never re-tallied.
4. We treat this as "community voting via native Reddit upvotes on native Reddit comments" — genuinely Reddit-y, and fully compliant since we only *read* public score data, never simulate votes.

## 7. `localStorage` volatility warning + our alternative

- **Confirmed root cause:** Devvit Web serves the client webview from a **versioned iframe URL** that changes on every `devvit publish`. Browsers scope `localStorage` to origin+path, so a new version's iframe gets a fresh, empty `localStorage` — any player progress "saved" there vanishes silently on the next app update, with no error and no way to detect it client-side.
- **Rule for this project: zero `localStorage`/`sessionStorage` usage for any persistent game state.** The only exception is Devvit Journeys' own internal `sessionStorage` use for `journeyId` continuity within a single tab session (owned by the Devvit Journeys SDK, not us, and it's explicitly session-scoped by design — losing it just starts a new analytics session, no gameplay impact).
- **Alternative:** every piece of state that must survive a page reload or app update — streak count, today's win/death flag, leaderboard position, corpse list, level definition — lives in **Redis**, addressed by `username` (from server-side `context`, never trusted from client input) or by level/date keys. The client is stateless: on load it always calls `/api/init` to rehydrate everything it needs to render.

## 8. Lighthouse / performance awareness

Devvit doesn't publish a hard numeric Lighthouse gate in the scraped docs, but the **judging criteria explicitly reward "Delightful UX"/"Polish"** and the **Community Games guide explicitly says "make the first screen eye-catching" and "reduce time to fun."** Concretely, this means:
- Keep the **default/splash entrypoint tiny** (no Phaser bundle loaded until the player taps "Play" — this is exactly why the template's two-entrypoint `splash.html` / `game.html` split exists, and we keep it).
- Defer the full Phaser + level-JSON fetch to the `game` entrypoint only, behind `requestExpandedMode`.
- Compress/atlas sprites; avoid shipping unused Phaser physics engines (Arcade only, no Matter.js) to keep the client JS bundle small.
- No synchronous blocking work in `create()` — use the `Preloader` scene's progress bar for perceived performance.

## 9. Devvit-specific gotchas (grab-bag, all confirmed from docs)

1. **Triggers can fire more than once for the same event.** `onCommentSubmit`/`onAppInstall` handlers must be idempotent (e.g., check `comments:processed` before acting on a comment ID again).
2. **Never build a comment trigger that itself creates a comment** without a guard — risk of infinite trigger loops (explicit Devvit Rules warning).
3. **Respect content deletion.** If a user deletes their account/comment/post, Devvit fires delete triggers — we must remove any corpse/stat data tied to that content (Devvit Rules "Enable and respect user deletions"). Concretely: `onCommentDelete` removes the matching pending/processed hazard-comment record; account deletion (if/when a trigger exists) should be handled by treating corpses as anonymized (`username` fields nulled) rather than fully deleted, to preserve level physics integrity while respecting user data rights.
4. **User actions (posting/subscribing "as user") require an explicit, separate, un-gated button** — cannot merge with gameplay actions like "Play Again," and functionality must never be gated behind performing a user action. This shapes our win-screen UI (§ retention plan): "Play Again," "Comment My Death," "Subscribe" are three separate buttons, none blocking the others.
5. **Apps cannot vote or follow**, confirmed above — shapes the `!hazard` design (§6).
6. **`runAs: 'USER'` only works for the app owner during unapproved/playtest builds**; it silently falls back to the app account for everyone else until the app is published and approved. This means our "Comment My Death" feature will post as the *app account* during local playtesting and only as the real user once the app is reviewed/approved by Reddit — expected, not a bug, and called out in the README/testing notes.
7. **Devvit Journeys requires an app allowlist** and pre-approved event maps; since this is a fresh unapproved app, journeys events are wired into the code (so the integration is visible and ready to be turned on) but will be silently dropped/no-op until the app is approved — this is expected and documented, not a blocker.
8. **Server bundle must be CommonJS** — our `vite.config.ts`/`tsconfig.server.json` inherited from the template already produce `.cjs`; do not "helpfully" switch to ESM output.
9. **`devvit new` requires a Reddit-issued app code obtained via an interactive browser login flow** — CLI scaffolding via `npx devvit new <name>` cannot run unattended in this sandboxed environment. We work around this by cloning the public `reddit/devvit-template-phaser` GitHub template directly (identical file structure) and customizing it in place. `devvit login`, `devvit playtest`, `devvit upload`, and `devvit publish` all still require an authenticated session and are documented as user-action blockers in the final report.
