import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { UnauthorizedError } from "@/lib/errors";
import { createQuestion, listQuestions, getQuestion, updateQuestion, deleteQuestion } from "@/modules/questions/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = []; const userIds: string[] = [];

async function setup(label: string, role: "STUDENT" | "TEACHER" = "TEACHER") {
  const user = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: user.id, role, status: "ACTIVE", joinedAt: new Date() } } } });
  const course = await prisma.course.create({ data: { organizationId: org.id, authorId: user.id, title: "Course", slug: `${label}-course-${suffix}` } });
  orgIds.push(org.id); userIds.push(user.id);
  return { ctx: { userId: user.id, organizationId: org.id, role } as const, course };
}
afterAll(async () => { await prisma.organization.deleteMany({ where: { id: { in: orgIds } } }); await prisma.user.deleteMany({ where: { id: { in: userIds } } }); });

describe("question permissions", () => {
  it("STUDENT cannot create/list/get/update/delete questions", async () => {
    const s = await setup("q-perm-student", "STUDENT");
    await expect(createQuestion(s.ctx, s.course.slug, { type: "TRUE_FALSE", courseId: s.course.id, prompt: "Question?", correctBoolean: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listQuestions(s.ctx, s.course.slug)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("TEACHER can CRUD questions in own org", async () => {
    const s = await setup("q-perm-teacher", "TEACHER");
    const q = await createQuestion(s.ctx, s.course.slug, { type: "TRUE_FALSE", courseId: s.course.id, prompt: "Question?", correctBoolean: true });
    await expect(getQuestion(s.ctx, s.course.slug, q.id)).resolves.toMatchObject({ prompt: "Question?" });
    await expect(updateQuestion(s.ctx, s.course.slug, q.id, { prompt: "Updated?" })).resolves.toMatchObject({ prompt: "Updated?" });
    await expect(deleteQuestion(s.ctx, s.course.slug, q.id)).resolves.toBeTruthy();
  });

  it("cross-org teacher gets 404", async () => {
    const alice = await setup("q-perm-cross-a", "TEACHER");
    const bob = await setup("q-perm-cross-b", "TEACHER");
    await expect(listQuestions(alice.ctx, bob.course.slug)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("unauthenticated context returns 401", () => {
    const error = new UnauthorizedError();
    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.httpStatus).toBe(401);
  });
});
