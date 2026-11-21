import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { categoryUpdateSchema } from "@/modules/courses/validation";
import { deleteCategory, updateCategory } from "@/modules/courses/categories";

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `catalog-category:${ctx.organizationId}`, limit: 30, windowSeconds: 3600 });
    const parsed = categoryUpdateSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await updateCategory(ctx, id, parsed.data));
  } catch (e) { return jsonError(e); }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `catalog-category:${ctx.organizationId}`, limit: 30, windowSeconds: 3600 });
    await deleteCategory(ctx, id);
    return NextResponse.json({ ok: true });
  } catch (e) { return jsonError(e); }
}
