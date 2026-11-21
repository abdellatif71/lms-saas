import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "@/lib/auth/tokens";

describe("auth tokens", () => {
  it("generates a 64-character token and matching SHA-256 hash", () => {
    const result = generateToken();
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(result.token)).toBe(result.hash);
  });
});
