import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { createQuiz, listQuizzes, softDeleteQuiz, updateQuiz } from "@/modules/quizzes/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = []; const userIds: string[] = [];
async function setup(label: string, role: "TEACHER" | "ORG_OWNER" = "TEACHER") { const user = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } }); const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: user.id, role, status: "ACTIVE", joinedAt: new Date() } } } }); const course = await prisma.course.create({ data: { organizationId: org.id, authorId: user.id, title: "Quiz Course", slug: `${label}-course-${suffix}` } }); orgIds.push(org.id); userIds.push(user.id); return { ctx: { userId: user.id, organizationId: org.id, role } as const, org, course }; }
afterAll(async () => { await prisma.organization.deleteMany({ where: { id: { in: orgIds } } }); await prisma.user.deleteMany({ where: { id: { in: userIds } } }); });

describe("quiz CRUD", () => {
  it("create quiz starts DRAFT", async () => { const s = await setup("quiz-create"); const quiz = await createQuiz(s.ctx, s.course.slug, { title: "Math Quiz", passingScore: 60, maxAttempts: 1, shuffleQuestions: false, shuffleOptions: false }); expect(quiz.status).toBe("DRAFT"); });
  it("update quiz settings", async () => { const s = await setup("quiz-update"); const quiz = await createQuiz(s.ctx, s.course.slug, { title: "Old title", passingScore: 60, maxAttempts: 1, shuffleQuestions: false, shuffleOptions: false }); const updated = await updateQuiz(s.ctx, quiz.id, { title: "New title", passingScore: 80 }); expect(updated.title).toBe("New title"); expect(updated.passingScore).toBe(80); });
  it("soft delete archives and hides from list", async () => { const s = await setup("quiz-delete"); const quiz = await createQuiz(s.ctx, s.course.slug, { title: "Delete quiz", passingScore: 60, maxAttempts: 1, shuffleQuestions: false, shuffleOptions: false }); await softDeleteQuiz({ ...s.ctx, role: "ORG_OWNER" }, quiz.id); const list = await listQuizzes(s.ctx, s.course.slug); expect(list.some((item) => item.id === quiz.id)).toBe(false); });
  it("cross-org quiz access returns 404", async () => { const a = await setup("quiz-cross-a"); const b = await setup("quiz-cross-b"); const quiz = await createQuiz(b.ctx, b.course.slug, { title: "Bob quiz", passingScore: 60, maxAttempts: 1, shuffleQuestions: false, shuffleOptions: false }); await expect(listQuizzes(a.ctx, b.course.slug)).rejects.toMatchObject({ code: "NOT_FOUND" }); await expect(prisma.quiz.findUnique({ where: { id: quiz.id } })).resolves.toBeTruthy(); });
});
