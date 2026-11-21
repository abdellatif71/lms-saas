import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { prisma } from "@/lib/db/client";
import { jsonError } from "@/lib/http/errors";

export async function GET(req: Request) {
  try {
    await requireSuperAdmin();
    const url = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50));
    const cursor = url.searchParams.get("cursor") || undefined;
    const organizationId = url.searchParams.get("organizationId") || undefined;
    const actorId = url.searchParams.get("actorId") || undefined;
    const action = url.searchParams.get("action") || undefined;
    const since = url.searchParams.get("since") ? new Date(url.searchParams.get("since")!) : undefined;
    const until = url.searchParams.get("until") ? new Date(url.searchParams.get("until")!) : undefined;

    let cursorFilter: { createdAt: { lt: Date } } | undefined;
    if (cursor) {
      const cursorRecord = await prisma.auditLog.findUnique({ where: { id: cursor }, select: { createdAt: true } });
      if (cursorRecord) cursorFilter = { createdAt: { lt: cursorRecord.createdAt } };
    }

    const items = await prisma.auditLog.findMany({
      take: limit + 1,
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...(actorId ? { actorId } : {}),
        ...(action ? { action: { contains: action } } : {}),
        ...(since || until ? { createdAt: { ...(since ? { gte: since } : {}), ...(until ? { lte: until } : {}) } } : {}),
        ...(cursorFilter ? cursorFilter : {}),
      },
      include: { actor: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const hasNext = items.length > limit;
    const page = hasNext ? items.slice(0, limit) : items;
    const nextCursor = hasNext ? page[page.length - 1]?.id : null;
    return NextResponse.json({ items: page, nextCursor });
  } catch (e) {
    return jsonError(e);
  }
}
