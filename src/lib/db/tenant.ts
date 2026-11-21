import { prisma } from "./client";

export function tenantPrisma(_orgId: string) {
  // TODO(T1.1): implement $extends to auto-inject organizationId filters.
  return prisma;
}
