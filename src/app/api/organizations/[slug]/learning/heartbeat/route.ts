import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { heartbeatSchema } from "@/modules/learning/validation";
import { recordHeartbeat } from "@/modules/learning/service";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `learning-heartbeat:${ctx.organizationId}:${ctx.userId}`, limit: 120, windowSeconds: 3600 });
    const parsed = heartbeatSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await recordHeartbeat(ctx, parsed.data));
  } catch (e) { return jsonError(e); }
}
