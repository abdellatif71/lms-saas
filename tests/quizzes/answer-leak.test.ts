import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { toStudentQuizDTO } from "@/modules/quizzes/dto";
import { toTeacherDTO } from "@/modules/questions/dto";

const id = "11111111-1111-4111-8111-111111111111";
const question = { id, organizationId: id, courseId: id, moduleId: null, lessonId: null, authorId: id, type: "MCQ" as const, scope: "COURSE" as const, prompt: "Which?", explanation: "Secret", points: 1, correctBoolean: null, expectedAnswer: null, acceptedAnswers: ["secret"], deletedAt: null, createdAt: new Date(), updatedAt: new Date(), options: [{ id, questionId: id, label: "A", isCorrect: true, position: 0, createdAt: new Date(), updatedAt: new Date() }] };
const quiz = { id, organizationId: id, courseId: id, authorId: id, title: "Quiz", description: null, status: "PUBLISHED", timeLimitMin: 10, passingScore: 60, maxAttempts: 1, shuffleQuestions: false, shuffleOptions: false, publishedAt: new Date(), deletedAt: null, createdAt: new Date(), updatedAt: new Date() };

describe("quiz student answer leak prevention", () => {
  it("student DTO strips isCorrect", () => { const dto = toStudentQuizDTO(quiz, [{ id, position: 0, points: 1, question }]); expect(dto.questions[0]?.question.options[0]).not.toHaveProperty("isCorrect"); });
  it("student DTO strips correctBoolean", () => { const dto = toStudentQuizDTO(quiz, [{ id, position: 0, points: 1, question }]); expect(dto.questions[0]?.question).not.toHaveProperty("correctBoolean"); });
  it("student DTO strips expectedAnswer", () => { const dto = toStudentQuizDTO(quiz, [{ id, position: 0, points: 1, question }]); expect(dto.questions[0]?.question).not.toHaveProperty("expectedAnswer"); });
  it("student DTO strips acceptedAnswers", () => { const dto = toStudentQuizDTO(quiz, [{ id, position: 0, points: 1, question }]); expect(dto.questions[0]?.question).not.toHaveProperty("acceptedAnswers"); });
  it("student DTO strips explanation", () => { const dto = toStudentQuizDTO(quiz, [{ id, position: 0, points: 1, question }]); expect(dto.questions[0]?.question).not.toHaveProperty("explanation"); });
  it("teacher DTO retains answer fields", () => { const teacher = toTeacherDTO(question); expect(teacher.options[0]?.isCorrect).toBe(true); expect(teacher.acceptedAnswers).toEqual(["secret"]); expect(teacher.explanation).toBe("Secret"); });
});
