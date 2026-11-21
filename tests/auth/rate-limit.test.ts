import { afterAll, describe, expect, it } from "vitest";
import Redis from "ioredis";
import { env } from "@/lib/env";
import { checkRateLimit, deleteRateLimitKey } from "@/lib/rate-limit";

const redis = new Redis(env.REDIS_URL);
const key = `test-auth-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

afterAll(async () => {
  await deleteRateLimitKey(key);
  await redis.quit();
});

describe("auth rate limiting", () => {
  it("allows requests below the limit and throws above it", async () => {
    await checkRateLimit({ key, limit: 2, windowSeconds: 60 });
    await checkRateLimit({ key, limit: 2, windowSeconds: 60 });
    await expect(checkRateLimit({ key, limit: 2, windowSeconds: 60 })).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});
