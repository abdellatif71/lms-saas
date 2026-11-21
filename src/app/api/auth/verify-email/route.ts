import { NextResponse } from "next/server";
import { verifyEmailSchema } from "@/modules/auth/validation";
import { verifyEmail } from "@/modules/auth/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/ip";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await checkRateLimit({ key: `verify-email:${getClientIp(req)}`, limit: 10, windowSeconds: 3600 });
    const parsed = verifyEmailSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    await verifyEmail(parsed.data.token);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
