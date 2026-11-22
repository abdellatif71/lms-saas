import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { assertTeacherOrAbove, type AuthContext } from "@/modules/auth/permissions";
import type { z } from "zod";
import type { QuestionCreateInput, questionUpdateSchema } from "./validation";
import { toTeacherDTO } from "./dto";

async function getCourse(ctx: AuthContext, courseSlug: string) {
  const course = await prisma.course.findFirst({ where: { slug: courseSlug, organizationId: ctx.organizationId, deletedAt: null } });
  if (!course) throw new NotFoundError("Course not found");
  return course;
}

async function getOwnedQuestion(ctx: AuthContext, questionId: string) {
  const question = await prisma.question.findFirst({ where: { id: questionId, organizationId: ctx.organizationId, deletedAt: null }, include: { options: { orderBy: { position: "asc" } } } });
  if (!question) throw new NotFoundError("Question not found");
  return question;
}

export async function createQuestion(ctx: AuthContext, courseSlug: string, input: QuestionCreateInput) {
  assertTeacherOrAbove(ctx);
  const course = await getCourse(ctx, courseSlug);
  if (input.courseId !== course.id) throw new NotFoundError("Course not found");

  if (input.type === "MCQ") {
    const correctCount = input.options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) throw new ValidationError("MCQ must have exactly one correct option", { options: ["Exactly one required"] });
  }
  if (input.moduleId) {
    const moduleRecord = await prisma.module.findFirst({ where: { id: input.moduleId, courseId: course.id } });
    if (!moduleRecord) throw new NotFoundError("Module not found");
  }
  if (input.lessonId) {
    const lesson = await prisma.lesson.findFirst({ where: { id: input.lessonId, deletedAt: null, module: { courseId: course.id, ...(input.moduleId ? { id: input.moduleId } : {}) } } });
    if (!lesson) throw new NotFoundError("Lesson not found");
  }

  const question = await prisma.$transaction(async (tx) => {
    const created = await tx.question.create({
      data: {
        organizationId: ctx.organizationId,
        courseId: course.id,
        moduleId: input.moduleId ?? null,
        lessonId: input.lessonId ?? null,
        authorId: ctx.userId,
        type: input.type,
        scope: input.scope ?? "COURSE",
        prompt: input.prompt,
        explanation: input.explanation ?? null,
        points: input.points ?? 1,
        ...(input.type === "TRUE_FALSE" ? { correctBoolean: input.correctBoolean } : {}),
        ...(input.type === "SHORT_ANSWER" || input.type === "LONG_ANSWER" ? { expectedAnswer: input.expectedAnswer ?? null } : {}),
        ...(input.type === "SHORT_ANSWER" && input.acceptedAnswers ? { acceptedAnswers: input.acceptedAnswers } : {}),
      },
    });
    if (input.type === "MCQ") {
      await tx.questionOption.createMany({ data: input.options.map((option) => ({ questionId: created.id, label: option.label, isCorrect: option.isCorrect, position: option.position })) });
    }
    return tx.question.findUniqueOrThrow({ where: { id: created.id }, include: { options: { orderBy: { position: "asc" } } } });
  });

  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "QUESTION.CREATED", targetType: "Question", targetId: question.id, metadata: { courseId: course.id, type: input.type } });
  return toTeacherDTO(question);
}

export async function listQuestions(ctx: AuthContext, courseSlug: string) {
  assertTeacherOrAbove(ctx);
  const course = await getCourse(ctx, courseSlug);
  const questions = await prisma.question.findMany({ where: { organizationId: ctx.organizationId, courseId: course.id, deletedAt: null }, include: { options: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "desc" } });
  return questions.map(toTeacherDTO);
}

export async function getQuestion(ctx: AuthContext, courseSlug: string, questionId: string) {
  assertTeacherOrAbove(ctx);
  await getCourse(ctx, courseSlug);
  return toTeacherDTO(await getOwnedQuestion(ctx, questionId));
}

export async function updateQuestion(ctx: AuthContext, courseSlug: string, questionId: string, input: z.infer<typeof questionUpdateSchema>) {
  assertTeacherOrAbove(ctx);
  await getCourse(ctx, courseSlug);
  const existing = await getOwnedQuestion(ctx, questionId);
  if (input.options && existing.type === "MCQ") {
    const correctCount = input.options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) throw new ValidationError("MCQ must have exactly one correct option", { options: ["Exactly one required"] });
  }

  const question = await prisma.$transaction(async (tx) => {
    if (input.options && existing.type === "MCQ") {
      await tx.questionOption.deleteMany({ where: { questionId: existing.id } });
      await tx.questionOption.createMany({ data: input.options.map((option) => ({ questionId: existing.id, label: option.label, isCorrect: option.isCorrect, position: option.position })) });
    }
    return tx.question.update({
      where: { id: existing.id },
      data: {
        ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
        ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
        ...(input.points !== undefined ? { points: input.points } : {}),
        ...(input.correctBoolean !== undefined ? { correctBoolean: input.correctBoolean } : {}),
        ...(input.expectedAnswer !== undefined ? { expectedAnswer: input.expectedAnswer } : {}),
        ...(input.acceptedAnswers !== undefined ? { acceptedAnswers: input.acceptedAnswers } : {}),
      },
      include: { options: { orderBy: { position: "asc" } } },
    });
  });

  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "QUESTION.UPDATED", targetType: "Question", targetId: question.id });
  return toTeacherDTO(question);
}

export async function deleteQuestion(ctx: AuthContext, courseSlug: string, questionId: string) {
  assertTeacherOrAbove(ctx);
  await getCourse(ctx, courseSlug);
  const existing = await getOwnedQuestion(ctx, questionId);
  // Forward-compatible hook: no quiz models exist yet, so all T4.1 deletions are soft deletes.
  const deleted = await prisma.question.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "QUESTION.SOFT_DELETED", targetType: "Question", targetId: deleted.id });
  return deleted;
}
