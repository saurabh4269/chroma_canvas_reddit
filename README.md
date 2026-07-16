# Chroma Canvas

**Daily community precision platformer** for Reddit's Devvit platform — a "Games with a Hook" hackathon submission.

Carry the fragile **Chroma Orb** from spawn to exit. When you die, your **Snoovatar petrifies into a permanent platform** at the exact spot you fell — visible to every future player of today's level, **in real time**. The community's top-voted `!hazard` comments shape tomorrow's level.

## How to Play

1. Open the daily post in your subreddit and tap **Play**.
2. Use **arrow keys** + **Space** (desktop) or on-screen **dpad + jump** (mobile). Jumps have coyote time and input buffering — deaths are your fault, not the controls'.
3. Carry the glowing orb to the **GOAL** portal without touching spikes, patrol blocks, crumbling ledges, or shadow rifts.
4. On death: your snoovatar petrifies into a platform others can jump on — and it appears **live** in every current runner's world.
5. On win: claim your spot on the daily podium and build your streak. Daily #1 wears the **Orb Bearer ✦** flair.

## Community Hook — `!hazard`

Comment on the daily post with:

```
!hazard spike 500 300
```

Valid types: `spike`, `movingBlock`, `gap`, `crumble`

Or just die and press **"Drop a Spike Here"** — the game posts the `!hazard` comment for you at your exact death spot.

The **top 5 upvoted** hazard comments (by Reddit `comment.score`) are tallied daily at **11:30 UTC** and woven into the next level at **12:00 UTC**. The main menu shows how many community hazards are queued and counts down to the next rotation.

## Retention Mechanics

| Mechanic | Description |
|---|---|
| Daily Twist | Seed-derived daily modifier: Clear Skies, Low Gravity, Tailwind, or Twilight (dusk sky, stars, a moon) |
| The Canvas Remembers | Daily tug-of-war (deliveries vs. petrifications). If the fallen vastly outnumber victors, tomorrow spawns a **Mercy Ledge**; too many victories and the canvas **grows cruel** with denser hazards |
| Daily streak | Win on consecutive days to grow your streak |
| Flair tiers | Newcomer → Climber → Chromatic → Ascendant (+ daily Orb Bearer ✦) |
| Leaderboards | "Today on the Canvas" card: podium + live pulse + tomorrow's prophecy |
| Anticipation | Live countdown to tomorrow's level + queued hazard preview |
| The Archive | In-game gallery of the last 7 levels — every platform and every petrified climber rendered as a heatmap of how the community moved |
| Corpse graveyard | Every death adds permanent level geometry, broadcast live |
| Subscribe | Separate button — never gated behind gameplay |

## Tech Stack

- **Devvit Web** (Hono server + Vite client)
- **Phaser 4.2** with Arcade Physics — fully procedural art (every sprite is generated at runtime, drawn at 2x for crispness) + WebAudio-synthesized SFX (zero binary assets)
- **Snoovatars** via `getSnoovatarUrl()` — you climb as yourself; fallen players stand petrified in the level
- **Realtime** — deaths and wins broadcast on a live channel; other runners' corpses land in your world mid-run
- **Redis** for all persistent state (zero `localStorage`)
- **Scheduler** cron jobs for hazard tally + level rotation + automated daily posts
- **Triggers** for `!hazard` comment parsing (with delete cleanup)
- **Journeys** telemetry for the full session lifecycle

## Project Structure

```
src/
├── client/          # Phaser game + splash entrypoint
├── server/          # /api/* and /internal/* routes
└── shared/          # Types, constants, level schema
docs/                # Scraped Devvit docs + architecture plans
```

## Commands

```bash
npm install
npm run dev          # Playtest on Reddit (requires login)
npm run build        # Build client + server bundles
npm run type-check   # TypeScript check
npm run lint         # ESLint
npm run deploy       # Upload to Reddit
npm run launch       # Publish for review
npm run login        # Authenticate Devvit CLI
```

## Auth & Deploy (User Action Required)

Devvit CLI requires an **interactive browser login**. Run these locally:

```bash
cd /path/to/chroma-canvas
npm install
npm run login          # Opens browser — connect Reddit developer account
npm run dev            # Playtest in a mod subreddit (<200 subscribers)
npm run deploy         # Upload new version
npm run launch         # Submit for Reddit review
```

During unapproved playtest builds, user actions (`Comment My Death`, `Subscribe`) post as the **app account** — they switch to the real user after Reddit approves the app.

## Moderator Tools

- **Create daily Chroma post** — manual post creation
- **Force rotate level** — rotate level + post immediately (demo/testing)

## Hackathon Note

The Devpost submission window for "Games with a Hook" (June 17 – July 15, 2026 PT) has closed. This build remains publishable to Reddit and portfolio-ready.

## Documentation

See `docs/00_constraints_summary.md` and `docs/00_architecture_plan.md` for full design rationale.

## License

BSD-3-Clause
