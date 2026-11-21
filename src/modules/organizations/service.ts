import { prisma } from "@/lib/db/client";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { assertOrgOwner, assertSameOrg, type AuthContext } from "@/modules/auth/permissions";
import { randomBytes } from "node:crypto";
import { audit } from "@/lib/audit";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;

export interface CreateOrgInput {
  name: string;
  slug?: string;
  description?: string;
  defaultLocale?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-/g, "")
    .replace(/-$/g, "")
    .slice(0, 60);
}

function ensureValidSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) throw new ConflictError("Invalid slug format");
}

export async function createOrganization(ownerId: string, input: CreateOrgInput): Promise<{ id: string; slug: string }> {
  const baseSlug = input.slug ?? generateSlug(input.name);
  ensureValidSlug(baseSlug);

  const existing = await prisma.organization.findUnique({ where: { slug: baseSlug } });
  let finalSlug = baseSlug;
  if (existing) {
    finalSlug = `${baseSlug}-${randomBytes(3).toString("hex")}`;
    ensureValidSlug(finalSlug);
  }

  const org = await prisma.organization.create({
    data: {
      name: input.name.trim(),
      slug: finalSlug,
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      defaultLocale: input.defaultLocale ?? "en",
      memberships: {
        create: { userId: ownerId, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() },
      },
    },
  });
  await audit({ actorId: ownerId, organizationId: org.id, action: "ORG.CREATED", targetType: "Organization", targetId: org.id, metadata: { slug: org.slug } });
  return { id: org.id, slug: org.slug };
}

export async function listUserOrganizations(userId: string) {
  return prisma.membership.findMany({
    where: { userId, status: "ACTIVE", organization: { status: "ACTIVE" } },
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrganizationBySlug(ctx: AuthContext, slug: string) {
  const org = await prisma.organization.findFirst({
    where: {
      slug,
      id: ctx.organizationId,
      memberships: { some: { userId: ctx.userId, status: "ACTIVE" } },
    },
  });
  if (!org) throw new NotFoundError("Organization not found");
  assertSameOrg(ctx, org.id);
  return org;
}

export async function updateOrganization(ctx: AuthContext, slug: string, input: Partial<CreateOrgInput>) {
  assertOrgOwner(ctx);
  const org = await getOrganizationBySlug(ctx, slug);
  assertSameOrg(ctx, org.id);
  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
      ...(input.defaultLocale !== undefined ? { defaultLocale: input.defaultLocale } : {}),
    },
  });
  await audit({ actorId: ctx.userId, organizationId: org.id, action: "ORG.UPDATED", targetType: "Organization", targetId: org.id, metadata: { changedFields: Object.keys(input) } });
  return updated;
}
