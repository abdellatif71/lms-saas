import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { getEmailProvider } from "@/lib/email";
import { registerUser } from "@/modules/auth/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.verificationToken.deleteMany({ where: { user: { email: { endsWith: `-${suffix}@example.test` } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${suffix}@example.test` } } });
});

describe("registerUser", () => {
  it("creates a usable verified user without an email verification token", async () => {
    const email = `register-${suffix}@example.test`;
    const sendSpy = vi.spyOn(getEmailProvider(), "send");
    const result = await registerUser({ email, password: "password-123", name: "Auth Test" });
    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    expect(user?.email).toBe(email);
    expect(user?.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(user?.emailVerifiedAt).not.toBeNull();
    const token = await prisma.verificationToken.findFirst({ where: { userId: result.userId, type: "EMAIL_VERIFY" } });
    expect(token).toBeNull();
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
