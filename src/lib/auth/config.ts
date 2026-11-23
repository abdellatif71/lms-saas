import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { verifyPassword } from "./password";
import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/en/login",
    error: "/en/login",
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || user.status !== "ACTIVE") return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        await audit({ actorId: user.id, action: "USER.LOGIN", targetType: "User", targetId: user.id });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isSuperAdmin: true },
        });
        const membership = await prisma.membership.findFirst({
          where: { userId: user.id, status: "ACTIVE" },
          select: { role: true },
        });
        token.isSuperAdmin = dbUser?.isSuperAdmin ?? false;
        token.role = membership?.role ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
        session.user.role = (token.role as string | null) ?? null;
      }
      return session;
    },
  },
};
