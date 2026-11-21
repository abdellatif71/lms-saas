import { prisma } from "@/lib/db/client";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { assertOrgAdmin, assertOrgOwner, assertSameOrg, type AuthContext } from "@/modules/auth/permissions";
import { MemberRole, MemberStatus } from "@/generated/prisma/enums";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { getEmailProvider } from "@/lib/email";
import { logger } from "@/lib/logger";

const INVITE_TTL_HOURS = 72;

export async function inviteMember(ctx: AuthContext, input: { email: string; role: MemberRole }) {
  assertOrgAdmin(ctx);
  assertSameOrg(ctx, ctx.organizationId);
  if (input.role === MemberRole.ORG_OWNER) {
    throw new ForbiddenError("Cannot invite an ORG_OWNER; only ORG_ADMIN or below");
  }
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const existing = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: ctx.organizationId } },
    });
    if (existing && existing.status === MemberStatus.ACTIVE) {
      throw new ConflictError("User is already a member of this organization");
    }
  }

  await prisma.invitation.updateMany({
    where: {
      organizationId: ctx.organizationId,
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { expiresAt: new Date(0) },
  });

  const { token, hash } = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3600_000);
  const invitation = await prisma.invitation.create({
    data: {
      organizationId: ctx.organizationId,
      email,
      role: input.role,
      tokenHash: hash,
      invitedById: ctx.userId,
      expiresAt,
    },
  });

  await getEmailProvider().send({
    to: email,
    subject: "You have been invited",
    text: `Accept your invitation: token=${token}\n\nThis expires in ${INVITE_TTL_HOURS} hours.`,
  });
  logger.info({ invitationId: invitation.id }, "Invitation sent");
  return { invitationId: invitation.id };
}

export async function listMembers(ctx: AuthContext) {
  assertOrgAdmin(ctx);
  return prisma.membership.findMany({
    where: { organizationId: ctx.organizationId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function acceptInvitation(rawToken: string, userId: string) {
  const hash = hashToken(rawToken);
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hash },
  });
  if (!invitation) throw new NotFoundError("Invalid invitation");
  if (invitation.acceptedAt) throw new ConflictError("Invitation already accepted");
  if (invitation.expiresAt < new Date()) throw new ConflictError("Invitation expired");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new ForbiddenError("Invitation belongs to a different email address");
  }
  const org = await prisma.organization.findUnique({ where: { id: invitation.organizationId } });
  if (!org || org.status !== "ACTIVE") throw new ConflictError("Organization is not active");

  const existing = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: invitation.organizationId } },
  });

  return prisma.$transaction(async (tx) => {
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    if (existing) {
      return tx.membership.update({
        where: { id: existing.id },
        data: { status: MemberStatus.ACTIVE, role: invitation.role },
      });
    }
    return tx.membership.create({
      data: {
        userId,
        organizationId: invitation.organizationId,
        role: invitation.role,
        status: MemberStatus.ACTIVE,
        invitedById: invitation.invitedById,
        joinedAt: new Date(),
      },
    });
  });
}

export async function changeMemberRole(ctx: AuthContext, membershipId: string, newRole: MemberRole) {
  assertOrgOwner(ctx);
  if (newRole === MemberRole.ORG_OWNER) throw new ForbiddenError("Owner role transfer is not supported yet");
  const target = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: ctx.organizationId },
  });
  if (!target) throw new NotFoundError("Member not found");
  assertSameOrg(ctx, target.organizationId);
  if (target.role === MemberRole.ORG_OWNER) throw new ForbiddenError("Cannot change the owner's role");
  return prisma.membership.update({ where: { id: membershipId }, data: { role: newRole } });
}

export async function suspendMember(ctx: AuthContext, membershipId: string) {
  assertOrgAdmin(ctx);
  const target = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: ctx.organizationId },
  });
  if (!target) throw new NotFoundError("Member not found");
  assertSameOrg(ctx, target.organizationId);
  if (target.userId === ctx.userId) throw new ForbiddenError("Cannot suspend yourself");
  if (target.role === MemberRole.ORG_OWNER) throw new ForbiddenError("Cannot suspend the owner");
  if (ctx.role !== MemberRole.ORG_OWNER && target.role === MemberRole.ORG_ADMIN) {
    throw new ForbiddenError("Only owner can suspend admins");
  }
  return prisma.membership.update({ where: { id: membershipId }, data: { status: MemberStatus.SUSPENDED } });
}

export async function removeMember(ctx: AuthContext, membershipId: string) {
  assertOrgOwner(ctx);
  const target = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: ctx.organizationId },
  });
  if (!target) throw new NotFoundError("Member not found");
  assertSameOrg(ctx, target.organizationId);
  if (target.userId === ctx.userId) throw new ForbiddenError("Cannot remove yourself");
  if (target.role === MemberRole.ORG_OWNER) throw new ForbiddenError("Cannot remove the owner");
  return prisma.membership.delete({ where: { id: membershipId } });
}
