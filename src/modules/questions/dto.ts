import type { Question, QuestionOption } from "@/generated/prisma/client";

export function toTeacherDTO(question: Question & { options: QuestionOption[] }) {
  return {
    id: question.id, type: question.type, scope: question.scope, prompt: question.prompt,
    explanation: question.explanation, points: question.points,
    correctBoolean: question.correctBoolean, expectedAnswer: question.expectedAnswer,
    acceptedAnswers: question.acceptedAnswers,
    options: question.options.map((option) => ({ id: option.id, label: option.label, isCorrect: option.isCorrect, position: option.position })),
    createdAt: question.createdAt, updatedAt: question.updatedAt,
  };
}

// CRITICAL: every future student-facing question API must use toStudentDTO.
// It deliberately excludes all answer-revealing fields and MCQ isCorrect flags.
export function toStudentDTO(question: Question & { options: QuestionOption[] }) {
  return {
    id: question.id,
    type: question.type,
    scope: question.scope,
    prompt: question.prompt,
    points: question.points,
    options: question.options.map((option) => ({ id: option.id, label: option.label, position: option.position })),
  };
}
