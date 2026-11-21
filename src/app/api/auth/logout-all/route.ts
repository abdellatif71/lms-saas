import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/ip";
import { jsonError } from "@/lib/http/errors";
import { UnauthorizedError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await checkRateLimit({ key: `logout-all:${getClientIp(req)}`, limit: 10, windowSeconds: 3600 });
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();
    await prisma.session.updateMany({
      where: { userId: session.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
