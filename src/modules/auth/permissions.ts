import { MemberRole } from "@/generated/prisma/enums";
import { ForbiddenError } from "@/lib/errors";

export type AuthContext = {
  userId: string;
  organizationId: string;
  role: MemberRole;
};

const ADMIN_ROLES: MemberRole[] = [MemberRole.ORG_OWNER, MemberRole.ORG_ADMIN];
const TEACHING_ROLES: MemberRole[] = [...ADMIN_ROLES, MemberRole.TEACHER];

export function isAdmin(role: MemberRole): boolean {
  return ADMIN_ROLES.includes(role);
}
export function isTeacherOrAbove(role: MemberRole): boolean {
  return TEACHING_ROLES.includes(role);
}
export function assertAdmin(ctx: AuthContext): void {
  if (!isAdmin(ctx.role)) throw new ForbiddenError("Admin role required");
}
export function assertTeacherOrAbove(ctx: AuthContext): void {
  if (!isTeacherOrAbove(ctx.role)) throw new ForbiddenError("Teacher role or above required");
}
export function assertSameOrg(ctx: AuthContext, resourceOrgId: string): void {
  if (ctx.organizationId !== resourceOrgId) throw new ForbiddenError("Cross-organization access denied");
}
export function canManageOrg(ctx: AuthContext): boolean {
  return isAdmin(ctx.role);
}
