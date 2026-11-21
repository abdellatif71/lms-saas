import type { Adapter } from "@auth/core/adapters";
import { prisma } from "@/lib/db/client";
import { hashToken } from "./tokens";

export const prismaSessionAdapter: Adapter = {
  async createSession({ sessionToken, userId, expires }) {
    const record = await prisma.session.create({
      data: { userId, tokenHash: hashToken(sessionToken), expiresAt: expires },
    });
    return { sessionToken, userId: record.userId, expires: record.expiresAt };
  },

  async getSessionAndUser(sessionToken) {
    const record = await prisma.session.findFirst({
      where: {
        tokenHash: hashToken(sessionToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
    if (!record) return null;
    return {
      session: { sessionToken, userId: record.userId, expires: record.expiresAt },
      user: {
        id: record.user.id,
        email: record.user.email,
        name: record.user.name,
        emailVerified: record.user.emailVerifiedAt,
      },
    };
  },

  async updateSession(session) {
    const record = await prisma.session.updateManyAndReturn({
      where: { tokenHash: hashToken(session.sessionToken), revokedAt: null },
      data: {
        ...(session.expires ? { expiresAt: session.expires } : {}),
        ...(session.userId ? { userId: session.userId } : {}),
      },
    });
    const updated = record[0];
    if (!updated) return null;
    return { sessionToken: session.sessionToken, userId: updated.userId, expires: updated.expiresAt };
  },

  async deleteSession(sessionToken) {
    const tokenHash = hashToken(sessionToken);
    const record = await prisma.session.findUnique({ where: { tokenHash } });
    if (!record) return null;
    await prisma.session.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return { sessionToken, userId: record.userId, expires: record.expiresAt };
  },
};
