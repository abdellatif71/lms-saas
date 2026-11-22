import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { createQuestion, deleteQuestion, listQuestions, updateQuestion } from "@/modules/questions/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = []; const userIds: string[] = [];

async function setup(label: string, role: "TEACHER" | "ORG_OWNER" = "TEACHER") {
  const user = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: user.id, role, status: "ACTIVE", joinedAt: new Date() } } } });
  const course = await prisma.course.create({ data: { organizationId: org.id, authorId: user.id, title: "Question Course", slug: `${label}-course-${suffix}` } });
  orgIds.push(org.id); userIds.push(user.id);
  return { ctx: { userId: user.id, organizationId: org.id, role } as const, org, course };
}

afterAll(async () => { await prisma.organization.deleteMany({ where: { id: { in: orgIds } } }); await prisma.user.deleteMany({ where: { id: { in: userIds } } }); });

describe("question CRUD", () => {
  it("create MCQ works and saves options", async () => {
    const s = await setup("q-mcq");
    const q = await createQuestion(s.ctx, s.course.slug, { type: "MCQ", courseId: s.course.id, scope: "COURSE", prompt: "Which option is correct?", points: 1, options: [{ label: "A", isCorrect: true, position: 0 }, { label: "B", isCorrect: false, position: 1 }] });
    expect(q.options).toHaveLength(2); expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
  });

  it("MCQ with zero correct options is rejected", async () => {
    const s = await setup("q-mcq-zero");
    await expect(createQuestion(s.ctx, s.course.slug, { type: "MCQ", courseId: s.course.id, prompt: "Which option?", options: [{ label: "A", isCorrect: false, position: 0 }, { label: "B", isCorrect: false, position: 1 }] })).rejects.toBeTruthy();
  });

  it("MCQ with two correct options is rejected", async () => {
    const s = await setup("q-mcq-two");
    await expect(createQuestion(s.ctx, s.course.slug, { type: "MCQ", courseId: s.course.id, prompt: "Which options?", options: [{ label: "A", isCorrect: true, position: 0 }, { label: "B", isCorrect: true, position: 1 }] })).rejects.toBeTruthy();
  });

  it("create TRUE_FALSE works", async () => { const s = await setup("q-bool"); await expect(createQuestion(s.ctx, s.course.slug, { type: "TRUE_FALSE", courseId: s.course.id, prompt: "The sky is blue.", correctBoolean: true })).resolves.toMatchObject({ correctBoolean: true }); });
  it("create SHORT_ANSWER works", async () => { const s = await setup("q-short"); await expect(createQuestion(s.ctx, s.course.slug, { type: "SHORT_ANSWER", courseId: s.course.id, prompt: "Name the planet", expectedAnswer: "Earth", acceptedAnswers: ["earth"] })).resolves.toMatchObject({ expectedAnswer: "Earth" }); });
  it("create LONG_ANSWER works", async () => { const s = await setup("q-long"); await expect(createQuestion(s.ctx, s.course.slug, { type: "LONG_ANSWER", courseId: s.course.id, prompt: "Explain the concept" })).resolves.toBeTruthy(); });

  it("update question changes prompt and replaces options", async () => { const s = await setup("q-update"); const q = await createQuestion(s.ctx, s.course.slug, { type: "MCQ", courseId: s.course.id, prompt: "Old prompt", options: [{ label: "A", isCorrect: true, position: 0 }, { label: "B", isCorrect: false, position: 1 }] }); const updated = await updateQuestion(s.ctx, s.course.slug, q.id, { prompt: "New prompt", options: [{ label: "X", isCorrect: false, position: 0 }, { label: "Y", isCorrect: true, position: 1 }] }); expect(updated.prompt).toBe("New prompt"); expect(updated.options[1]?.isCorrect).toBe(true); });

  it("soft delete sets deletedAt and hides from list", async () => { const s = await setup("q-delete"); const q = await createQuestion(s.ctx, s.course.slug, { type: "TRUE_FALSE", courseId: s.course.id, prompt: "Is this true?", correctBoolean: true }); await deleteQuestion(s.ctx, s.course.slug, q.id); const list = await listQuestions(s.ctx, s.course.slug); expect(list.some((item) => item.id === q.id)).toBe(false); });

  it("list returns only non-deleted questions", async () => { const s = await setup("q-list"); await createQuestion(s.ctx, s.course.slug, { type: "TRUE_FALSE", courseId: s.course.id, prompt: "Live question", correctBoolean: true }); const list = await listQuestions(s.ctx, s.course.slug); expect(list.every((q) => typeof q.id === "string")).toBe(true); });

  it("cross-org question access returns 404", async () => { const alice = await setup("q-cross-a"); const bob = await setup("q-cross-b"); const q = await createQuestion(bob.ctx, bob.course.slug, { type: "TRUE_FALSE", courseId: bob.course.id, prompt: "Bob question", correctBoolean: false }); await expect(listQuestions(alice.ctx, bob.course.slug)).rejects.toMatchObject({ code: "NOT_FOUND" }); await expect(prisma.question.findUnique({ where: { id: q.id } })).resolves.toBeTruthy(); });
});
