import NextAuth from "next-auth";
import { prismaSessionAdapter } from "./adapter";
import { authConfig } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: prismaSessionAdapter,
});
