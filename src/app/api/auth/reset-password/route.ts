import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/modules/auth/validation";
import { resetPassword } from "@/modules/auth/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/ip";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await checkRateLimit({ key: `reset-password:${getClientIp(req)}`, limit: 10, windowSeconds: 3600 });
    const parsed = resetPasswordSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    await resetPassword(parsed.data.token, parsed.data.newPassword);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
