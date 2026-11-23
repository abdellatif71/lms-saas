import { prisma } from "@/lib/db/client";
import { audit } from "@/lib/audit";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { assertOrgAdmin, assertTeacherOrAbove, type AuthContext } from "@/modules/auth/permissions";
import { MemberRole } from "@/generated/prisma/enums";
import type { z } from "zod";
import type { quizCreateSchema, quizUpdateSchema, quizStatusSchema, quizAssembleSchema } from "./validation";
import { toStudentQuizDTO, toTeacherQuizDTO } from "./dto";

async function getCourse(ctx: AuthContext, courseSlug: string) {
  const course = await prisma.course.findFirst({ where: { slug: courseSlug, organizationId: ctx.organizationId, deletedAt: null } });
  if (!course) throw new NotFoundError("Course not found");
  return course;
}

async function getOwnedQuiz(ctx: AuthContext, quizId: string) {
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, organizationId: ctx.organizationId, deletedAt: null }, include: { questions: { include: { question: { include: { options: { orderBy: { position: "asc" } } } } }, orderBy: { position: "asc" } } } });
  if (!quiz) throw new NotFoundError("Quiz not found");
  return quiz;
}

export async function createQuiz(ctx: AuthContext, courseSlug: string, input: z.infer<typeof quizCreateSchema>) {
  assertTeacherOrAbove(ctx);
  const course = await getCourse(ctx, courseSlug);
  const quiz = await prisma.quiz.create({ data: { organizationId: ctx.organizationId, courseId: course.id, authorId: ctx.userId, title: input.title, ...(input.description !== undefined ? { description: input.description } : {}), ...(input.timeLimitMin !== undefined ? { timeLimitMin: input.timeLimitMin } : {}), passingScore: input.passingScore, maxAttempts: input.maxAttempts, shuffleQuestions: input.shuffleQuestions, shuffleOptions: input.shuffleOptions }, include: { questions: { include: { question: { include: { options: true } } } } } });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "QUIZ.CREATED", targetType: "Quiz", targetId: quiz.id, metadata: { courseId: course.id } });
  return toTeacherQuizDTO(quiz, quiz.questions as never);
}

export async function listQuizzes(ctx: AuthContext, courseSlug: string) {
  assertTeacherOrAbove(ctx);
  const course = await getCourse(ctx, courseSlug);
  const quizzes = await prisma.quiz.findMany({ where: { organizationId: ctx.organizationId, courseId: course.id, deletedAt: null }, include: { _count: { select: { questions: true } } }, orderBy: { createdAt: "desc" } });
  return quizzes.map((quiz) => ({ ...quiz, questionCount: quiz._count.questions }));
}

export async function getQuizTeacher(ctx: AuthContext, quizId: string) {
  assertTeacherOrAbove(ctx);
  const quiz = await getOwnedQuiz(ctx, quizId);
  return toTeacherQuizDTO(quiz, quiz.questions as never);
}

export async function updateQuiz(ctx: AuthContext, quizId: string, input: z.infer<typeof quizUpdateSchema>) {
  assertTeacherOrAbove(ctx);
  const existing = await getOwnedQuiz(ctx, quizId);
  const quiz = await prisma.quiz.update({
    where: { id: existing.id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.timeLimitMin !== undefined ? { timeLimitMin: input.timeLimitMin } : {}),
      ...(input.passingScore !== undefined ? { passingScore: input.passingScore } : {}),
      ...(input.maxAttempts !== undefined ? { maxAttempts: input.maxAttempts } : {}),
      ...(input.shuffleQuestions !== undefined ? { shuffleQuestions: input.shuffleQuestions } : {}),
      ...(input.shuffleOptions !== undefined ? { shuffleOptions: input.shuffleOptions } : {}),
    },
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "QUIZ.UPDATED", targetType: "Quiz", targetId: quiz.id });
  return getQuizTeacher(ctx, quiz.id);
}

export async function assembleQuestions(ctx: AuthContext, quizId: string, input: z.infer<typeof quizAssembleSchema>) {
  assertTeacherOrAbove(ctx);
  const quiz = await getOwnedQuiz(ctx, quizId);
  const uniqueIds = new Set(input.questions.map((item) => item.questionId));
  if (uniqueIds.size !== input.questions.length) throw new ConflictError("Duplicate questionId in quiz assembly", { questions: ["Duplicate questionId"] });
  const questions = await prisma.question.findMany({ where: { id: { in: [...uniqueIds] }, organizationId: ctx.organizationId, courseId: quiz.courseId, deletedAt: null } });
  if (questions.length !== uniqueIds.size) throw new NotFoundError("Question not found in this course or organization");

  await prisma.$transaction(async (tx) => {
    await tx.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
    await tx.quizQuestion.createMany({ data: input.questions.map((item) => ({ quizId: quiz.id, questionId: item.questionId, position: item.position, points: item.points })) });
  });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "QUIZ.ASSEMBLED", targetType: "Quiz", targetId: quiz.id, metadata: { questionCount: input.questions.length } });
  return getQuizTeacher(ctx, quiz.id);
}

export async function setQuizStatus(ctx: AuthContext, quizId: string, input: z.infer<typeof quizStatusSchema>) {
  assertOrgAdmin(ctx);
  const quiz = await getOwnedQuiz(ctx, quizId);
  const allowed = (quiz.status === "DRAFT" && (input.status === "PUBLISHED" || input.status === "DRAFT")) || (quiz.status === "PUBLISHED" && (input.status === "DRAFT" || input.status === "ARCHIVED" || input.status === "PUBLISHED")) || (quiz.status === "ARCHIVED" && (input.status === "PUBLISHED" || input.status === "ARCHIVED"));
  if (!allowed) throw new ConflictError("Invalid quiz status transition");
  if (input.status === "PUBLISHED" && quiz.questions.length === 0) throw new ConflictError("Quiz must have at least one question before publishing");
  const updated = await prisma.quiz.update({ where: { id: quiz.id }, data: { status: input.status, ...(input.status === "PUBLISHED" ? { publishedAt: new Date() } : {}) } });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "QUIZ.STATUS_CHANGED", targetType: "Quiz", targetId: quiz.id, metadata: { status: input.status } });
  return updated;
}

export async function softDeleteQuiz(ctx: AuthContext, quizId: string) {
  assertOrgAdmin(ctx);
  const quiz = await getOwnedQuiz(ctx, quizId);
  const updated = await prisma.quiz.update({ where: { id: quiz.id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  await audit({ actorId: ctx.userId, organizationId: ctx.organizationId, action: "QUIZ.SOFT_DELETED", targetType: "Quiz", targetId: quiz.id });
  return updated;
}

export async function getQuizStudent(ctx: AuthContext, quizId: string) {
  if (ctx.role !== MemberRole.STUDENT) throw new ForbiddenError("Only students can access the student quiz endpoint");
  const quiz = await prisma.quiz.findFirst({ where: { id: quizId, organizationId: ctx.organizationId, status: "PUBLISHED", deletedAt: null }, include: { course: true, questions: { include: { question: { include: { options: { orderBy: { position: "asc" } } } } }, orderBy: { position: "asc" } } } });
  if (!quiz) throw new NotFoundError("Quiz not found");
  const enrollment = await prisma.enrollment.findFirst({ where: { courseId: quiz.courseId, studentUserId: ctx.userId, organizationId: ctx.organizationId, status: "ACTIVE" } });
  if (!enrollment) throw new ForbiddenError("Student is not enrolled in this course");
  return toStudentQuizDTO(quiz, quiz.questions as never);
}
