import { z } from "zod";

export const quizCreateSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(5000).optional(),
  timeLimitMin: z.number().int().min(1).max(600).optional(),
  passingScore: z.number().int().min(0).max(100).default(60),
  maxAttempts: z.number().int().min(1).max(10).default(1),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
});

export const quizUpdateSchema = quizCreateSchema.partial();

export const quizStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
});

export const quizAssembleSchema = z.object({
  questions: z.array(z.object({
    questionId: z.string().uuid(),
    points: z.number().int().min(1).max(100),
    position: z.number().int().min(0),
  })).min(1),
});
