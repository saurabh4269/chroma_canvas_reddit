import type { DailyPulse } from '../../shared/level';
import { dailyDeathsKey, dailyWinsKey } from '../../shared/constants';
import { redis } from '@devvit/web/server';

/**
 * The community tug-of-war: orb deliveries vs. petrifications, per day.
 * Date strings are passed explicitly to avoid a level.ts import cycle.
 */

export const getDailyPulse = async (date: string): Promise<DailyPulse> => {
  const [wins, deaths] = await Promise.all([
    redis.get(dailyWinsKey(date)),
    redis.get(dailyDeathsKey(date)),
  ]);
  return {
    wins: wins ? parseInt(wins, 10) : 0,
    deaths: deaths ? parseInt(deaths, 10) : 0,
  };
};

export const recordPulseWin = async (date: string): Promise<void> => {
  await redis.incrBy(dailyWinsKey(date), 1);
};

export const recordPulseDeath = async (date: string): Promise<void> => {
  await redis.incrBy(dailyDeathsKey(date), 1);
};

/**
 * Yesterday's collective fate decides today's terrain:
 *  - mercy: the fallen vastly outnumbered victors → grant a Mercy Ledge
 *  - cruel: victories piled up → the canvas grows crueler
 */
export const computeBlessing = (
  pulse: DailyPulse
): 'mercy' | 'cruel' | undefined => {
  if (pulse.deaths >= 10 && pulse.deaths >= pulse.wins * 8) return 'mercy';
  if (pulse.wins >= 15 && pulse.wins > pulse.deaths / 2) return 'cruel';
  return undefined;
};
