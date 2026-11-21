import Redis from "ioredis";
import { env } from "@/lib/env";
import { RateLimitError } from "@/lib/errors";

let client: Redis | null = null;

function getClient(): Redis {
  if (!client) client = new Redis(env.REDIS_URL);
  return client;
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

export async function checkRateLimit(opts: RateLimitOptions): Promise<void> {
  const redis = getClient();
  const redisKey = `ratelimit:${opts.key}`;
  const current = await redis.incr(redisKey);
  if (current === 1) await redis.expire(redisKey, opts.windowSeconds);
  if (current > opts.limit) {
    throw new RateLimitError(
      `Too many requests. Try again in ${opts.windowSeconds} seconds.`,
    );
  }
}

export async function deleteRateLimitKey(key: string): Promise<void> {
  await getClient().del(`ratelimit:${key}`);
}
