import type { Question, QuestionOption } from "@/generated/prisma/client";
import { toStudentDTO, toTeacherDTO } from "@/modules/questions/dto";

export type QuizQuestionRecord = {
  id: string;
  position: number;
  points: number;
  question: Question & { options: QuestionOption[] };
};

export function toTeacherQuizDTO<T extends object>(quiz: T, questions: QuizQuestionRecord[]) {
  return {
    ...quiz,
    questions: questions
      .sort((a, b) => a.position - b.position)
      .map((item) => ({ id: item.id, position: item.position, points: item.points, question: toTeacherDTO(item.question) })),
  };
}

export type StudentQuizFields = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  timeLimitMin: number | null;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  publishedAt: Date | null;
};

// CRITICAL: every student-facing quiz endpoint MUST use toStudentQuizDTO.
// This serializer delegates to toStudentDTO and never exposes answer fields.
export function toStudentQuizDTO(quiz: StudentQuizFields, questions: QuizQuestionRecord[]) {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    status: quiz.status,
    timeLimitMin: quiz.timeLimitMin,
    passingScore: quiz.passingScore,
    maxAttempts: quiz.maxAttempts,
    shuffleQuestions: quiz.shuffleQuestions,
    shuffleOptions: quiz.shuffleOptions,
    publishedAt: quiz.publishedAt,
    questions: questions
      .sort((a, b) => a.position - b.position)
      .map((item) => ({ id: item.id, position: item.position, points: item.points, question: toStudentDTO(item.question) })),
  };
}
