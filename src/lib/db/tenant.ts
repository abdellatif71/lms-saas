import { prisma } from "./client";

const TENANT_SCOPED_MODELS = ["File", "Invitation", "AuditLog"] as const;
export type TenantScopedModel = (typeof TENANT_SCOPED_MODELS)[number];

export function tenantPrisma(organizationId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const runQuery = query as (operationArgs: unknown) => unknown;
          if (!model) return runQuery(args);
          const isScoped = (TENANT_SCOPED_MODELS as readonly string[]).includes(model);
          if (!isScoped) return runQuery(args);

          const anyArgs = args as Record<string, unknown>;
          if (
            operation.startsWith("find") ||
            operation === "update" ||
            operation === "delete" ||
            operation === "updateMany" ||
            operation === "deleteMany" ||
            operation === "count" ||
            operation === "aggregate" ||
            operation === "groupBy"
          ) {
            anyArgs.where = {
              ...(anyArgs.where as object | undefined),
              organizationId,
            };
          }
          if (operation === "create" || operation === "createMany") {
            const data = anyArgs.data;
            if (Array.isArray(data)) {
              anyArgs.data = data.map((d) => ({ ...(d as object), organizationId }));
            } else if (data) {
              anyArgs.data = { ...(data as object), organizationId };
            }
          }
          return runQuery(anyArgs);
        },
      },
    },
  });
}
