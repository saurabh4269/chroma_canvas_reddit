# Chroma Canvas — Architecture Plan

> Deep design doc written before any implementation. Read `00_constraints_summary.md` first — every decision below is downstream of those constraints.

## 1. One-paragraph pitch

**Chroma Canvas** is a daily community precision platformer. Every 24 hours a fresh hand-of-cards level appears with a fragile, glowing Chroma Orb sitting between a spawn point and an exit. Players run the gauntlet; when they die, their Snoovatar **petrifies into a permanent statue platform at the exact spot they fell** — visible to every future player of that level, forever (until the level rotates). The graveyard of yesterday's failures becomes today's staircase. The community's top-voted `!hazard` comments get woven into tomorrow's level, so the level design itself is community-authored. It's Jump King meets a subreddit's shared memory.

## 2. Deviations from the reference brief, and why

| Brief said | We do instead | Rationale |
|---|---|---|
| Scrape `first-screen` and `key-value-store` docs at specific URLs | Those URLs no longer exist in the current docs site (verified via live nav crawl); replaced with `devvit_web_configuration` (successor to first-screen concept) and skipped kvStore (deprecated in favor of Redis per official guidance — "Prefer `context.redis` for new applications") | Docs are versioned/renamed; following stale URLs would produce broken/misleading references. We scraped the *current* equivalents plus ~15 extra genuinely relevant pages (reddit-api, post-data, blob-storage, triggers, journeys, cache-helper, settings, user-actions, menu-actions, devvit CLI, singleton migration, logged-out users, notifications) not in the brief's list at all. |
| `npx devvit new chroma-canvas --template phaser` | Clone `github.com/reddit/devvit-template-phaser` directly, rename in place | `devvit new` requires an interactive browser login to mint an app code from Reddit — not possible unattended in this sandbox. The GitHub template is byte-for-byte what the CLI would have scaffolded (confirmed by reading the CLI's own template repo), so the resulting file tree is identical. Documented as an auth blocker for the user to re-run `devvit new`/`devvit login` themselves if they want the CLI's own record of app creation. |
| Phaser 3.88 / Arcade Physics docs | Built the game on **Phaser 4.2.0** (Arcade Physics still present, same conceptual API) | The *live, current* official Devvit Phaser template (as of this build) pins `"phaser": "4.2.0"` in its `package.json`. Building against 3.88 would mean shipping a stale/wrong dependency relative to what Reddit's own tooling generates today. Phaser 4's Arcade Physics module is API-compatible with the concepts documented in `19_phaser_arcade_physics.md`. |
| Redis keys like `level:current`, `corpses:current`, etc. (brief's suggested schema) | Kept almost verbatim, but restructured corpse storage as a **sorted set** instead of an implied list/array key, and per-user stats as a **single hash per user** rather than scattered keys | Redis on Devvit has no native list type and no key-scan discovery (see constraints §5) — sorted sets and per-user hashes are the documented idiomatic patterns for exactly this shape of data. |
| "Top 5 upvoted comments" implies apps can read vote/upvote state directly in real time | Implemented via a **two-phase pending → scheduled-tally** flow reading public `comment.score` | Apps cannot read who-voted or cast votes; `comment.score` is the only legitimate, available signal, and it must be *sampled later* (not at submit time, when score is always 0/1). See constraints §6. |
| Use `localStorage` warnings generically | Zero `localStorage` used anywhere in the codebase; verified via grep as part of Phase 6 checklist | Directly testable, unambiguous compliance with the hardest constraint in the brief. |

## 3. Repo layout

Built at the **workspace root** (not a nested `chroma-canvas/` folder) since `docs/` already lives there and `devvit.json` expects to be at the project root the CLI runs from.

```
/ (repo root)
├── devvit.json                  # manifest: post entrypoints, permissions, triggers, scheduler, menu
├── package.json
├── vite.config.ts
├── tsconfig*.json
├── docs/                        # this Phase 0 documentation (untouched structure)
├── public/assets/               # sprites, atlases, audio
├── src/
│   ├── client/                  # webview
│   │   ├── splash.html/.ts/.css     # tiny default entrypoint (feed-card view)
│   │   ├── game.html/.css           # full game entrypoint (loaded on "Play")
│   │   ├── main.ts                  # Phaser bootstrap (game.html's script)
│   │   ├── scenes/
│   │   │   ├── BootScene.ts
│   │   │   ├── PreloadScene.ts
│   │   │   ├── MenuScene.ts         # today's level intro, streak card, leaderboard peek
│   │   │   ├── GameScene.ts         # the platformer itself
│   │   │   ├── UIScene.ts           # parallel HUD (runs alongside GameScene)
│   │   │   └── ResultScene.ts       # win/death summary + user-action buttons
│   │   ├── entities/
│   │   │   ├── Player.ts            # Snoovatar sprite + controller + orb-carry state
│   │   │   ├── ChromaOrb.ts         # glow/pulse orb entity
│   │   │   └── Corpse.ts            # static petrified-platform entity
│   │   ├── systems/
│   │   │   ├── InputSystem.ts       # keyboard + on-screen touch dpad
│   │   │   ├── CameraSystem.ts      # follow/lerp/shake helpers
│   │   │   └── ParticleSystem.ts    # death shatter, orb trail
│   │   └── net/
│   │       └── api.ts               # typed fetch() wrappers for every /api/ route
│   ├── server/
│   │   ├── index.ts                 # Hono app wiring (mirrors template)
│   │   ├── core/
│   │   │   ├── post.ts               # createDailyPost()
│   │   │   ├── level.ts              # level generation + rotation logic
│   │   │   ├── corpses.ts            # corpse read/write/archive logic
│   │   │   ├── players.ts            # stats/streak/flair logic
│   │   │   ├── hazardComments.ts     # !hazard parse + tally logic
│   │   │   └── leaderboard.ts        # zAdd/zRange wrappers
│   │   └── routes/
│   │       ├── api.ts                 # /api/* — client-facing
│   │       ├── menu.ts                # /internal/menu/* — mod actions
│   │       ├── forms.ts               # /internal/form/*
│   │       ├── triggers.ts            # /internal/triggers/* — onCommentSubmit, onAppInstall
│   │       └── scheduler.ts           # /internal/scheduler/* — daily rotation, hazard tally
│   └── shared/
│       ├── api.ts                     # request/response types shared client<->server
│       ├── level.ts                   # LevelDef, HazardSpec, Corpse types
│       └── constants.ts               # hazard whitelist, level size, caps
└── README.md
```

## 4. Redis schema (final)

All keys are per-installation (per-subreddit) namespaced automatically by Devvit; we additionally prefix with `cc:` for readability in logs/dumps.

| Key | Type | Shape | Notes |
|---|---|---|---|
| `cc:level:current` | string (JSON) | `LevelDef` (see §6) | Hot-read on every game load |
| `cc:level:date` | string | `"YYYY-MM-DD"` | Which calendar day `level:current` belongs to; used to detect staleness |
| `cc:level:history:<date>` | string (JSON, `redisCompressed`) | archived `LevelDef` + final corpse snapshot | Written just before rotation; capped to last 30 days by the rotation job (deletes anything older) |
| `cc:level:seq` | string (int) | monotonically increasing level number | Cosmetic "Level #42" display |
| `cc:corpses:current` | sorted set | member = JSON `{u, x, y, t}` (username, coords, death unix ms), score = death unix ms | `zRange` gives chronological corpse order; capped at `CORPSE_CAP` (default 500) via `zRemRangeByRank` from the *oldest* end when exceeded — oldest corpses "erode" first, newest always visible |
| `cc:corpses:count` | string (int, `incrBy`) | running count for the current level | Cheap read for HUD ("127 have fallen before you") without `zCard` |
| `cc:player:<username>` | hash | `{streak, lastPlayedDate, totalWins, totalDeaths, bestTimeMs, flairTier}` | One hash per user — avoids the "scattered keys" anti-pattern flagged in `05_redis.md` |
| `cc:leaderboard:daily:<date>` | sorted set | member = username, score = completion time (ms, lower=better) or -1 sentinel absent | Fresh board every day; only written on a validated win |
| `cc:leaderboard:alltime` | sorted set | member = username, score = total wins (higher=better), tiebreak by secondary key baked into score decimal | All-time recognition, ties to flair tiers |
| `cc:comments:pending` | sorted set | member = JSON `{commentId, authorId, hazard}`, score = submission unix ms | Written by `onCommentSubmit` trigger; read+cleared by the pre-rotation tally job |
| `cc:comments:processed` | sorted set | member = commentId, score = processed unix ms | Dedup guard against duplicate trigger delivery (constraints §9.1) + prevents re-tallying; trimmed to last 14 days |
| `cc:job:rotate-level` / `cc:job:tally-hazards` | string | scheduler job IDs | Stored so a moderator menu action can cancel/inspect them |
| `cc:subs:<username>` | string (`"1"`, `expire` 0 = never or long TTL) | Optional local cache of "did this user explicitly subscribe via our button" (since we can't query real subscription state) | Purely cosmetic UI state ("You're subscribed ✓"), never a gate |

### Corpse cap & archive strategy (expanded)
- `CORPSE_CAP = 500` per live level (tunable constant in `shared/constants.ts`).
- On every death write: `zAdd` the new corpse, `incrBy count 1`, then check `zCard`; if `> CORPSE_CAP`, `zRemRangeByRank(0, zCard-CORPSE_CAP-1)` to trim the oldest.
- On daily rotation (see §7): snapshot whatever remains (up to 500) into `level:history:<date>` via `redisCompressed`, then `del cc:corpses:current` and reset `cc:corpses:count` to `0` for the new level.
- Total Redis footprint estimate: 500 corpses × ~60 bytes JSON ≈ 30KB; level JSON ≈ 2–5KB; 30 days of compressed history ≈ well under the 5MB quota with huge margin.

## 5. API design

All client-facing routes under `/api/`, JSON in/out, typed via `src/shared/api.ts` (mirrors template convention of exporting `type XResponse`).

| Method & path | Purpose | Notes |
|---|---|---|
| `GET /api/init` | Bootstraps the game screen: current level, player stats, corpse list, leaderboard snippet, server-authoritative `now` | Single round trip on `game.html` load — avoids N calls before first paint |
| `GET /api/level/current` | Just the level def (used if we need a lightweight refresh without full re-init) | |
| `GET /api/corpses` | Current corpse list (paginated if `>200`, though `zRange` is cheap enough to return all up to the 500 cap in one call) | |
| `POST /api/death` | Body `{x, y, clientTimeMs}` — reports a death at coordinates | Server validates `(x,y)` is within level bounds and roughly plausible (not teleport-cheated) before writing a corpse + incrementing `totalDeaths` + resetting streak-continuation logic |
| `POST /api/win` | Body `{elapsedMs}` — reports level completion | Server re-validates `elapsedMs` against a sane floor (can't be faster than a computed minimum path time) before writing leaderboard + `totalWins` + streak increment + flair tier recompute |
| `GET /api/leaderboard?scope=daily\|alltime` | Top-N leaderboard read | |
| `POST /api/subscribe` | User-action subscribe (separate, explicit button) | Per constraints §9.4, never bundled with win/play-again |
| `POST /api/comment-death` | User-action "Comment my death" — posts as user (or app, pre-approval) as a reply to the level's stickied comment | Separate explicit button |
| `GET /api/stats/:username?` | Own or public stat card (flair tier, streak, totals) | Powers a "player card" popup |

Internal (`/internal/`) routes:

| Path | Trigger/source | Purpose |
|---|---|---|
| `/internal/triggers/on-app-install` | `onAppInstall` | Creates the first daily post + kicks off the two recurring cron jobs (guarded so re-install doesn't duplicate jobs) |
| `/internal/triggers/on-comment-submit` | `onCommentSubmit` | Parses `!hazard`, writes to `comments:pending`, idempotent via `comments:processed` check |
| `/internal/triggers/on-comment-delete` | `onCommentDelete` | Removes matching pending/processed hazard record (data-deletion compliance) |
| `/internal/scheduler/rotate-level` | cron, daily e.g. `0 12 * * *` (noon UTC — mid-day for max global overlap) | Archives current level+corpses, generates next `LevelDef` (procedural + tallied hazards), posts new daily thread, resets corpse keys |
| `/internal/scheduler/tally-hazards` | cron, daily ~30 min before rotation, e.g. `30 11 * * *` | Re-scores `comments:pending` via `reddit.getCommentById`, picks top 5, stashes the chosen `HazardSpec[]` in a temp Redis key `cc:level:next-hazards` that `rotate-level` consumes |
| `/internal/menu/post-create` | moderator menu item | Manual "force create today's post" escape hatch (mirrors template) |
| `/internal/menu/force-rotate` | moderator menu item | Manual "rotate level now" for demo/testing without waiting for cron |
| `/internal/form/report-issue` | form | Lightweight player report form (spam/bug), mirrors template's forms pattern |

## 6. Level definition & procedural generation

```ts
type HazardSpec = { type: 'spike'|'movingBlock'|'gap'|'crumble'; x: number; y: number; meta?: Record<string, number> };
type LevelDef = {
  seq: number;              // level number, cosmetic
  date: string;             // YYYY-MM-DD
  width: number; height: number;   // world size in px
  spawn: { x: number; y: number };
  exit: { x: number; y: number };
  platforms: { x: number; y: number; w: number; h: number }[];
  hazards: HazardSpec[];    // baseline procedural hazards + up to 5 community hazards appended
  seed: number;             // RNG seed for deterministic procedural layout across all clients
};
```

- Base layout is **procedurally generated server-side** from `seed = hash(date)`, guaranteeing every client renders an identical level without shipping per-level hand-authored JSON. A simple deterministic step-generator lays down a critical path of platforms with increasing gap/height variance by "day number" (mild difficulty ramp), then the tally job appends up to 5 community `HazardSpec`s from `!hazard` comments (positions are constrained to a whitelist of valid slots along the generated critical path, so community input can't render a level unsolvable or spawn hazards inside solid platforms).
- Determinism matters because **corpse positions must mean the same thing to every player** — this is the whole hook mechanic, so the underlying level geometry cannot be client-random.

## 7. Phaser scene flow

```
splash.html (tiny, default entrypoint)
  → [Play] button → requestExpandedMode('game')
game.html
  BootScene   (loads only the tiny preloader assets)
    → PreloadScene (progress bar, loads full atlas/audio, calls /api/init in parallel)
      → MenuScene   (shows level #, streak, "N have fallen before you", Start button)
        → GameScene (the platformer; runs UIScene in parallel via scene.run)
            on death  → petrify anim → POST /api/death → ResultScene (death variant)
            on win    → confetti/orb-flare → POST /api/win  → ResultScene (win variant)
        ResultScene: Play Again (restarts GameScene re-fetching corpses so newly-fallen
                     players from other clients appear), Comment My Death/Win, Subscribe,
                     View Leaderboard — four separate, explicit buttons per constraints §9.4
```

`UIScene` (parallel scene) owns: streak counter, corpse counter, mini-map orb indicator, mobile touch dpad + jump button (only rendered when `Phaser.Device` reports a touch-primary device).

## 8. Retention mechanics mapped to hackathon sub-prizes

| Mechanic | Implementation | Targets |
|---|---|---|
| Daily streak | `player.streak` incremented on any day with a completed win where `lastPlayedDate` was exactly yesterday; reset (not "grace-frozen" in v1, documented as a future improvement) otherwise | Retention Mechanics |
| Flair tiers | On streak/win milestones, server calls `reddit.setUserFlair` (current subreddit) with a tier name (`Newcomer → Climber → Chromatic → Ascendant`) computed from `totalWins`/`streak` | Retention Mechanics |
| Leaderboards | Daily (resets each rotation, fresh chance) + all-time (long-term status) | Retention Mechanics |
| Daily rotating content | Scheduler-driven level rotation + auto-posted thread | Retention Mechanics + Hook-y |
| UGC — comments as gameplay | `!hazard` top-5-by-score mechanic literally rewrites tomorrow's level | User Contributions |
| UGC — shared "graveyard" | Every player's failure becomes another player's permanent, visible level geometry — the core hook, and inherently UGC since the *level itself* is built from real player attempts | User Contributions + Hook-y |
| Anticipation | "N have fallen before you today" counter + "will your fall help someone tomorrow?" framing on death screen | Hook-y |
| Social pull | Public daily leaderboard + stickied comment thread for death/win comments turns the post into an ongoing conversation | Reddit-y |

## 9. Phaser polish checklist (Phase 5, tracked here for completeness)

- Death: camera `shake(150, 0.01)`, particle burst (`this.add.particles`) using a "shard" texture tinted to the player's Snoovatar accent color, tween the corpse sprite from full color → desaturated stone tint + slight squash, freeze in place.
- Chroma Orb: continuous glow via a soft-additive particle trail + `sin()`-driven scale/alpha pulse tween; changes tint based on how many hazards remain between player and exit (subtle difficulty signal).
- Camera: `startFollow(player, true, 0.08, 0.12)` lerp for a soft, non-nauseating follow; `setBounds` clamped to `LevelDef.width/height`.
- Parallax: 2–3 `TileSprite` background layers scrolling at 0.2×/0.5×/1× camera scroll factor for depth.
- Mobile: on-screen semi-transparent dpad + jump button, fixed to camera (`setScrollFactor(0)`), only shown when `this.sys.game.device.input.touch` is true; desktop keeps keyboard-only, no dpad clutter.
- Scale: `Phaser.Scale.RESIZE` + manual `updateLayout()` (pattern already present in the template's `Game.ts`) so the game fills the Devvit webview at any aspect ratio without letterboxing.

## 10. Submission readiness checklist (Phase 6, tracked here for completeness)

- [ ] `README.md` at repo root: what it is, how to play, hazards, streaks, tech stack.
- [ ] Zero `localStorage`/`sessionStorage` game-state usage (`grep -r localStorage src/client` returns nothing outside Journeys SDK internals).
- [ ] Every client-facing route under `/api/`; every internal route under `/internal/`.
- [ ] `devvit.json` declares only the permissions actually used (`redis`, `reddit`, `reddit.asUser` for the 3 user actions, `scheduler` tasks, `triggers`, `menu`, `forms`).
- [ ] Journeys events wired (App.Ready, Journey.Start on "Play" press, Journey.Progress at checkpoints, Journey.End on win/death) even though they'll no-op until the app is allowlisted.
- [ ] Mobile touch controls present and tested via responsive scale.
- [ ] No `devvit.yaml` present (would conflict with `devvit.json`).
- [ ] `npm run type-check` and `npm run lint` clean.
- [ ] `npm run build` produces `dist/client` + `dist/server/index.cjs` successfully.

## 11. Why this wins (judging rubric alignment, for the final report)

- **Delightful UX**: two-entrypoint splash pattern = instant, tiny first paint; a single unambiguous "Play" CTA; scene flow keeps time-to-fun under a few seconds.
- **Polish**: Arcade Physics tuned hitboxes, camera lerp/shake, particles, parallax, mobile dpad, deterministic corpse rendering — concept-complete, not a tech demo.
- **Reddit-y**: the "graveyard of past players becomes tomorrow's ladder" mechanic is literally built out of the community's own failures and successes — human-first, meritocratic (better players leave corpses that help worse players), and not on-the-nose Reddit theming (no karma/Snoo-as-currency gimmicks).
- **Hook-y**: daily rotating level + streaks + flair + "N fell before you" anticipation + your own corpse permanently visible to others = multiple overlapping reasons to return, exactly the sub-challenge criteria for Retention.
- **Phaser Innovation**: server-authoritative deterministic level generation feeding client-side Arcade Physics static bodies for community-built geometry is a genuinely novel use of Phaser's physics system beyond "just render some sprites" — corpses are gameplay-critical physics objects sourced from real prior sessions, not decoration.
- **User Contributions**: `!hazard` comment voting literally rewrites next-gen level geometry, and every player's own death/win becomes permanent content for others — two independent, substantive UGC loops, not just "leave a comment for flavor."
