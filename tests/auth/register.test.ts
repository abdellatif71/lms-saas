import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { getEmailProvider } from "@/lib/email";
import { registerUser } from "@/modules/auth/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const emails: string[] = [];

beforeAll(() => {
  vi.spyOn(getEmailProvider(), "send").mockResolvedValue(undefined);
});

afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.verificationToken.deleteMany({ where: { user: { email: { endsWith: `-${suffix}@example.test` } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${suffix}@example.test` } } });
});

describe("registerUser", () => {
  it("creates a user and verification token and sends email", async () => {
    const email = `register-${suffix}@example.test`;
    emails.push(email);
    const result = await registerUser({ email, password: "password-123", name: "Auth Test" });
    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    expect(user?.email).toBe(email);
    expect(user?.passwordHash.startsWith("$argon2id$")).toBe(true);
    const token = await prisma.verificationToken.findFirst({ where: { userId: result.userId, type: "EMAIL_VERIFY" } });
    expect(token).not.toBeNull();
    expect(token?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(getEmailProvider().send).toHaveBeenCalledOnce();
  });
});
