import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/http/errors";
import { ValidationError, UnauthorizedError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { createOrgSchema } from "@/modules/organizations/validation";
import { createOrganization, listUserOrganizations } from "@/modules/organizations/service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();
    return NextResponse.json(await listUserOrganizations(session.user.id));
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new UnauthorizedError();
    await checkRateLimit({ key: `org-create:${session.user.id}`, limit: 5, windowSeconds: 3600 });
    const parsed = createOrgSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    const result = await createOrganization(session.user.id, {
      name: parsed.data.name,
      ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.defaultLocale !== undefined ? { defaultLocale: parsed.data.defaultLocale } : {}),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
