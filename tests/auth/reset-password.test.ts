import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { getEmailProvider } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/tokens";
import { requestPasswordReset, resetPassword } from "@/modules/auth/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `reset-${suffix}@example.test`;

beforeAll(() => vi.spyOn(getEmailProvider(), "send").mockResolvedValue(undefined));
afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.verificationToken.deleteMany({ where: { user: { email } } });
  await prisma.session.deleteMany({ where: { user: { email } } });
  await prisma.user.deleteMany({ where: { email } });
});

describe("password reset", () => {
  it("creates a reset token only for a known active user", async () => {
    const user = await prisma.user.create({ data: { email, passwordHash: await hashPassword("old-password"), name: "Reset Test" } });
    await requestPasswordReset(email);
    await requestPasswordReset(`missing-${suffix}@example.test`);
    const token = await prisma.verificationToken.findFirst({ where: { userId: user.id, type: "PASSWORD_RESET" } });
    expect(token).not.toBeNull();
  });

  it("updates the password, revokes sessions, and rejects expired or used tokens", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.session.create({ data: { userId: user.id, tokenHash: `session-${suffix}`, expiresAt: new Date(Date.now() + 3600000) } });
    const reset = generateToken();
    await prisma.verificationToken.create({ data: { userId: user.id, type: "PASSWORD_RESET", tokenHash: reset.hash, expiresAt: new Date(Date.now() + 3600000) } });
    await resetPassword(reset.token, "new-password-123");

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword("new-password-123", updated.passwordHash)).toBe(true);
    const sessions = await prisma.session.findMany({ where: { userId: user.id } });
    expect(sessions.every((session) => session.revokedAt !== null)).toBe(true);
    await expect(resetPassword(reset.token, "another-password")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const expired = generateToken();
    await prisma.verificationToken.create({ data: { userId: user.id, type: "PASSWORD_RESET", tokenHash: expired.hash, expiresAt: new Date(Date.now() - 1000) } });
    await expect(resetPassword(expired.token, "another-password")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
