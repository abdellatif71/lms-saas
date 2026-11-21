import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { updateOrgSchema } from "@/modules/organizations/validation";
import { getOrganizationBySlug, updateOrganization } from "@/modules/organizations/service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    return NextResponse.json(await getOrganizationBySlug(ctx, slug));
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    const parsed = updateOrgSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await updateOrganization(ctx, slug, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.defaultLocale !== undefined ? { defaultLocale: parsed.data.defaultLocale } : {}),
    }));
  } catch (e) {
    return jsonError(e);
  }
}
