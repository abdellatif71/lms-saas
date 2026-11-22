import { NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth/context";
import { jsonError } from "@/lib/http/errors";
import { ValidationError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { lessonCreateSchema } from "@/modules/lessons/validation";
import { createLesson, listLessons } from "@/modules/lessons/service";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string; moduleId: string }> }) {
  try {
    const { slug, courseSlug, moduleId } = await params;
    const ctx = await requireOrgContext(slug);
    const includeDeleted = new URL(req.url).searchParams.get("includeDeleted") === "true";
    return NextResponse.json(await listLessons(ctx, courseSlug, moduleId, includeDeleted));
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; courseSlug: string; moduleId: string }> }) {
  try {
    const { slug, courseSlug, moduleId } = await params;
    const ctx = await requireOrgContext(slug);
    await checkRateLimit({ key: `lessons-module:${ctx.organizationId}`, limit: 60, windowSeconds: 3600 });
    const parsed = lessonCreateSchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("Validation failed", parsed.error.flatten());
    return NextResponse.json(await createLesson(ctx, courseSlug, moduleId, parsed.data), { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
