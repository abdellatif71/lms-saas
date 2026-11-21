import { z } from "zod";
import { MemberRole } from "@/generated/prisma/enums";

const invitableRoles = [
  MemberRole.ORG_ADMIN,
  MemberRole.TEACHER,
  MemberRole.STUDENT,
  MemberRole.PARENT,
] as const;

export const createOrgSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/).optional(),
  description: z.string().max(2000).optional(),
  defaultLocale: z.enum(["ar", "fr", "en"]).optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  defaultLocale: z.enum(["ar", "fr", "en"]).optional(),
});

export const inviteSchema = z.object({
  email: z.string().email().max(254),
  role: z.enum(invitableRoles),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(10).max(200),
});

export const changeRoleSchema = z.object({
  role: z.enum(invitableRoles),
});
