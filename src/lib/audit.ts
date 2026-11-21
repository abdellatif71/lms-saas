import { prisma } from "@/lib/db/client";
import { logger } from "@/lib/logger";

export interface AuditEvent {
  actorId?: string | null;
  organizationId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export async function audit(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: event.actorId ?? null,
        organizationId: event.organizationId ?? null,
        action: event.action,
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
        metadata: (event.metadata ?? {}) as object,
        ip: event.ip ?? null,
        userAgent: event.userAgent ?? null,
      },
    });
  } catch (e) {
    logger.error({ err: e, event }, "Failed to write audit log");
  }
}
