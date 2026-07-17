import {
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { redis } from '@devvit/web/server';
import { levelHistoryKey } from '../../shared/constants';
import type { LevelDef } from '../../shared/level';
import { getDailyTwist } from '../../shared/twist';

/**
 * Durable archive snapshot written on day rotation.
 * Kept compact: full LevelDef + corpse positions only (no snoovatar URLs).
 */
export type BlobLevelArchive = {
  v: 1;
  date: string;
  level: LevelDef;
  corpses: Array<{ x: number; y: number }>;
  twistId: string;
  archivedAt: number;
};

const blobKey = (date: string) => `archive/levels/${date}.json`;

/** Soft-fail Blob write — Redis remains the hot path. */
export const writeBlobArchive = async (
  date: string,
  level: LevelDef,
  corpses: Array<{ x: number; y: number }>
): Promise<boolean> => {
  try {
    const { newS3Client } = await import('@devvit/blob');
    const body: BlobLevelArchive = {
      v: 1,
      date,
      level,
      corpses: corpses.map((c) => ({ x: c.x, y: c.y })),
      twistId: getDailyTwist(level.seed).id,
      archivedAt: Date.now(),
    };
    const json = JSON.stringify(body);
    // Stay well under the 30MB request limit; typical archive is <100KB.
    if (json.length > 2_000_000) {
      console.warn('Blob archive too large, skipping write', date, json.length);
      return false;
    }
    const client = await newS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: '',
        Key: blobKey(date),
        Body: json,
        ContentType: 'application/json',
      })
    );
    return true;
  } catch (e) {
    console.warn('Blob archive write failed (soft):', e);
    return false;
  }
};

export const readBlobArchive = async (
  date: string
): Promise<BlobLevelArchive | null> => {
  try {
    const { newS3Client } = await import('@devvit/blob');
    const client = await newS3Client();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: '',
        Key: blobKey(date),
      })
    );
    const text = (await response.Body?.transformToString?.()) ?? '';
    if (!text) return null;
    const parsed = JSON.parse(text) as BlobLevelArchive;
    if (!parsed?.level || !parsed.date) return null;
    return parsed;
  } catch {
    return null;
  }
};

/** Drop Redis history keys older than `keepDays` once Blob (or age) owns them. */
export const pruneRedisArchivesOlderThan = async (
  keepDays: number
): Promise<void> => {
  const now = new Date();
  for (let i = keepDays + 1; i <= keepDays + 60; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    try {
      await redis.del(levelHistoryKey(date));
    } catch {
      // ignore
    }
  }
};
