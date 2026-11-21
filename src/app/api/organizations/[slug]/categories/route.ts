import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { categorySchema } from "@/modules/courses/validation";
import { createCategory, listCategories } from "@/modules/courses/categories";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    return NextResponse.json(await listCategories(ctx));
  } catch (e) { return jsonError(e); }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `catalog-category:${ctx.organizationId}`, limit: 30, windowSeconds: 3600 });
    const parsed = categorySchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await createCategory(ctx, parsed.data), { status: 201 });
  } catch (e) { return jsonError(e); }
}
