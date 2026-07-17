# Chroma Canvas

**Daily community precision platformer** on Reddit’s Devvit platform — built for the “Games with a Hook” hackathon.

Carry the fragile **Chroma Orb** from spawn to the exit. When you die, your **Snoovatar petrifies into a permanent platform** at that exact spot so future players can climb on your failure. Top-voted `!hazard` comments reshape **tomorrow’s** level. Every day the canvas remembers what the community did.

## Play now

| | |
|---|---|
| **Live post (judges / players)** | https://www.reddit.com/r/chroma_canvas_dev/comments/1uxn8t1/ |
| **Community** | https://www.reddit.com/r/chroma_canvas_dev/ |
| **App page** | https://developers.reddit.com/apps/chroma-canvas |
| **Source** | https://github.com/saurabh4269/chroma_canvas_reddit |

Open the post → tap **Play**. Desktop: arrow keys + Space. Mobile: on-screen dpad + jump.

## App overview (for Reddit review & mods)

**Who it’s for:** Subreddit members who want a shared daily skill challenge, and mods who want an automated community game post.

**What it does:**

1. Posts a **daily interactive level** (scheduler at 12:00 UTC; mods can also create/rotate manually).
2. Players carry an orb to the goal. Deaths leave **persistent corpse platforms** (capped, live-synced via Realtime).
3. Comments like `!hazard spike 500 300` are tallied (11:30 UTC); the top upvoted ones become tomorrow’s hazards.
4. Tracks streaks, flair tiers, daily podium, and **Orb Bearer ✦** for daily #1.
5. Optional **cosmetic orb skins** via Reddit Payments (Gold) — visuals only, never pay-to-win. Free skins + an in-app **Unlock all** path exist for playtest/judges.
6. **Archive** browses recent days (Redis hot window; completed days soft-archived to Blob when available).

**Critical notes:**

- Not NSFW. No gambling. No external app upsells.
- No `localStorage`; state lives in Redis (and Blob for older archives).
- Payments products are durable cosmetics only. See [`TERMS.md`](./TERMS.md). Privacy: [Reddit Privacy Policy](https://www.reddit.com/policies/privacy-policy).
- Public directory installability requires Reddit’s publish approval; the playtest community above is ready regardless.

## How to play

1. Open today’s Chroma Canvas post and tap **Play**.
2. Move with **← →** and jump with **Space** (or on-screen controls). Coyote time + jump buffer are on.
3. Keep the orb; reach the **GOAL**. Avoid spikes, moving blocks, crumbling ledges, and gaps.
4. On death: you become a platform others can use — and it can appear **live** in other runners’ sessions.
5. On win: climb the daily podium and grow your streak. Daily #1 gets **Orb Bearer ✦** flair.
6. Optional: **Skins** on the main menu (cosmetics only). **Archive** to browse past canvases.

## Community hook — `!hazard`

Comment on the daily post:

```text
!hazard spike 500 300
```

Types: `spike`, `movingBlock`, `gap`, `crumble`

Or die and tap **Drop a Spike Here** — the game posts a `!hazard` at your death coords.

Top-upvoted hazards are woven into the next level at **12:00 UTC**. The menu shows queued hazards and a rotation countdown.

## Daily depth

| Mechanic | What players feel |
|---|---|
| Daily Twist | Clear Skies, Low Gravity, Tailwind, or Twilight |
| The Canvas Remembers | Many deaths → Mercy Ledge tomorrow; too many wins → crueler terrain |
| Streaks & flair | Newcomer → Climber → Chromatic → Ascendant (+ Orb Bearer ✦) |
| Podium | “Today on the Canvas” leaderboard |
| Archive | Heatmap gallery of recent community canvases |
| Cosmetics | Orb/trail skins — no gameplay advantage |

## For moderators

After install on a subreddit you moderate:

1. Use menu **Create daily Chroma post** (or wait for the 12:00 UTC scheduler).
2. **Force rotate level** — demo/testing only; rotates immediately and posts.
3. Keep the community public if you want visitors/judges to open the post without joining first.
4. Players need the usual Reddit account; expanded Play uses a normal tap (trusted gesture).

Scheduler (UTC):

- `11:30` — tally `!hazard` comments  
- `12:00` — rotate level + create the daily post  

## Tech stack

- **Devvit Web** — Hono server, Vite client, tRPC-style `/api` routes  
- **Phaser 4.2** — Arcade Physics; procedural 2× art; WebAudio SFX  
- **Snoovatars** — live player + petrified corpses  
- **Realtime** — live death/win channel (`cc_live`)  
- **Redis** — levels, corpses, players, leaderboards, hazard queue  
- **Blob** — soft-fail archive of completed day snapshots  
- **Payments** — optional cosmetic SKUs (`skin_ember`, `skin_frost`, `skin_midnight`)  
- **Journeys** — session telemetry  

```text
src/
├── client/    # Phaser scenes + splash
├── server/    # /api/* and /internal/*
└── shared/    # types, twist, skins, constants
demo_build/    # Remotion hackathon demo film (<60s)
```

## Develop locally

```bash
npm install
npm run login          # Devvit CLI → browser OAuth
npm run type-check
npm run lint
npm run build
npm run smoke          # server logic smoke tests
npm run e2e            # Playwright flow against local build
npm run dev            # playtest install + watch
npm run deploy         # upload a new private version
```

Demo film:

```bash
cd demo_build
npm install
npm run assets && npm run check && npm run render
# → demo_build/demo.mp4
```

## Support & contact

Issues with the app: message **u/saurabh42** on Reddit or open a GitHub issue on the repo above.

## License

BSD-3-Clause
