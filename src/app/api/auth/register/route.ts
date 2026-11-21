import { NextResponse } from "next/server";
import { registerSchema } from "@/modules/auth/validation";
import { registerUser } from "@/modules/auth/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/http/ip";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    await checkRateLimit({ key: `register:${getClientIp(req)}`, limit: 5, windowSeconds: 3600 });
    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    const result = await registerUser(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
