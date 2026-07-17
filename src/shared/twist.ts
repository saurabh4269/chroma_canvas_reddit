/**
 * Daily Twist — a deterministic per-level modifier derived from the level
 * seed, so every player (and the server) agrees on the day's rules without
 * extra state. Rotating variety is the cheapest honest retention there is.
 */
export type DailyTwist = {
  id: 'clear' | 'lowgrav' | 'tailwind' | 'twilight';
  name: string;
  emoji: string;
  desc: string;
  gravityY: number;
  moveSpeed: number;
  dusk: boolean;
};

const TWISTS: DailyTwist[] = [
  {
    id: 'clear',
    name: 'Clear Skies',
    emoji: '☀',
    desc: 'No tricks today. Just you, the orb, and the fall.',
    gravityY: 1200,
    moveSpeed: 220,
    dusk: false,
  },
  {
    id: 'lowgrav',
    name: 'Low Gravity',
    emoji: '🎈',
    desc: 'The canvas holds its breath — jumps float higher and longer.',
    // Slightly less floaty so mobile landings stay readable.
    gravityY: 880,
    moveSpeed: 220,
    dusk: false,
  },
  {
    id: 'tailwind',
    name: 'Tailwind',
    emoji: '💨',
    desc: 'A wind at your back. Faster runs, braver mistakes.',
    gravityY: 1200,
    // Milder speed boost — fair on narrow touch pads.
    moveSpeed: 252,
    dusk: false,
  },
  {
    id: 'twilight',
    name: 'Twilight',
    emoji: '🌙',
    desc: 'The canvas climbs at dusk. Same rules, darker sky.',
    gravityY: 1200,
    moveSpeed: 220,
    dusk: true,
  },
];

export const getDailyTwist = (seed: number): DailyTwist =>
  TWISTS[(seed >>> 5) % TWISTS.length]!;
