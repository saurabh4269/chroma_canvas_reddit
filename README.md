# Chroma Canvas

**Daily community precision platformer** for Reddit's Devvit platform — a "Games with a Hook" hackathon submission.

Carry the fragile **Chroma Orb** from spawn to exit. When you die, your Snoovatar **petrifies into a permanent platform** at the exact spot you fell — visible to every future player of today's level. The community's top-voted `!hazard` comments shape tomorrow's level.

## How to Play

1. Open the daily post in your subreddit and tap **Play**.
2. Use **arrow keys** + **Space** (desktop) or on-screen **dpad + jump** (mobile).
3. Carry the glowing orb to the **EXIT** zone without touching spikes or moving hazards.
4. On death: your corpse becomes a platform others can jump on.
5. On win: climb the daily leaderboard and build your streak.

## Community Hook — `!hazard`

Comment on the daily post with:

```
!hazard spike 500 300
```

Valid types: `spike`, `movingBlock`, `gap`, `crumble`

The **top 5 upvoted** hazard comments (by Reddit `comment.score`) are tallied daily at **11:30 UTC** and woven into the next level at **12:00 UTC**.

## Retention Mechanics

| Mechanic | Description |
|---|---|
| Daily streak | Win on consecutive days to grow your streak |
| Flair tiers | Newcomer → Climber → Chromatic → Ascendant |
| Leaderboards | Daily (fastest time) + all-time (total wins) |
| Corpse graveyard | Every death adds permanent level geometry |
| Subscribe | Separate button — never gated behind gameplay |

## Tech Stack

- **Devvit Web** (Hono server + Vite client)
- **Phaser 4.2** with Arcade Physics
- **Redis** for all persistent state (zero `localStorage`)
- **Scheduler** cron jobs for hazard tally + level rotation
- **Triggers** for `!hazard` comment parsing

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
