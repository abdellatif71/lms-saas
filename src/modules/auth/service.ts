import { prisma } from "@/lib/db/client";
import { getEmailProvider } from "@/lib/email";
import { hashPassword } from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const EMAIL_VERIFY_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 1;

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ userId: string }> {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError("Email already registered");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name: input.name.trim() },
  });

  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 3600_000);
  await prisma.verificationToken.create({
    data: { userId: user.id, type: "EMAIL_VERIFY", tokenHash: hash, expiresAt },
  });

  await getEmailProvider().send({
    to: email,
    subject: "Verify your email",
    text: `Your verification token: ${token}\n\nThis token expires in ${EMAIL_VERIFY_TTL_HOURS} hours.`,
  });

  logger.info({ userId: user.id }, "User registered, verification email queued");
  return { userId: user.id };
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const hash = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: hash } });
  if (!record || record.type !== "EMAIL_VERIFY") throw new NotFoundError("Invalid token");
  if (record.usedAt) throw new ValidationError("Token already used");
  if (record.expiresAt < new Date()) throw new ValidationError("Token expired");

  await prisma.$transaction([
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || user.status !== "ACTIVE") return;

  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_HOURS * 3600_000);
  await prisma.verificationToken.create({
    data: { userId: user.id, type: "PASSWORD_RESET", tokenHash: hash, expiresAt },
  });

  await getEmailProvider().send({
    to: user.email,
    subject: "Reset your password",
    text: `Your reset token: ${token}\n\nThis token expires in ${PASSWORD_RESET_TTL_HOURS} hour(s).`,
  });
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const hash = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({ where: { tokenHash: hash } });
  if (!record || record.type !== "PASSWORD_RESET") throw new NotFoundError("Invalid token");
  if (record.usedAt) throw new ValidationError("Token already used");
  if (record.expiresAt < new Date()) throw new ValidationError("Token expired");

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.verificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
