import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { generateToken } from "@/lib/auth/tokens";
import { verifyEmail } from "@/modules/auth/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `verify-${suffix}@example.test`;

afterAll(async () => {
  await prisma.verificationToken.deleteMany({ where: { user: { email } } });
  await prisma.user.deleteMany({ where: { email } });
});

describe("verifyEmail", () => {
  it("marks the user verified and rejects invalid, used, and expired tokens", async () => {
    const passwordHash = await hashPassword("password-123");
    const user = await prisma.user.create({ data: { email, passwordHash, name: "Verify Test" } });

    await expect(verifyEmail("invalid-token-123456789")).rejects.toMatchObject({ code: "NOT_FOUND" });

    const valid = generateToken();
    await prisma.verificationToken.create({ data: { userId: user.id, type: "EMAIL_VERIFY", tokenHash: valid.hash, expiresAt: new Date(Date.now() + 3600000) } });
    await verifyEmail(valid.token);
    const verified = await prisma.user.findUnique({ where: { id: user.id } });
    expect(verified?.emailVerifiedAt).not.toBeNull();
    await expect(verifyEmail(valid.token)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const expired = generateToken();
    await prisma.verificationToken.create({ data: { userId: user.id, type: "EMAIL_VERIFY", tokenHash: expired.hash, expiresAt: new Date(Date.now() - 1000) } });
    await expect(verifyEmail(expired.token)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
