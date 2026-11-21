import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/http/errors";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { acceptInviteSchema } from "@/modules/organizations/validation";
import { acceptInvitation } from "@/modules/organizations/membership";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();
    await checkRateLimit({ key: `invite-accept:${session.user.id}`, limit: 10, windowSeconds: 3600 });
    const parsed = acceptInviteSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await acceptInvitation(parsed.data.token, session.user.id));
  } catch (e) {
    return jsonError(e);
  }
}
