import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/modules/auth/validation";
import { requestPasswordReset } from "@/modules/auth/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/ip";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await checkRateLimit({ key: `forgot-password:${getClientIp(req)}`, limit: 5, windowSeconds: 3600 });
    const parsed = forgotPasswordSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    await requestPasswordReset(parsed.data.email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
