import { z } from "zod";

const optionSchema = z.object({
  label: z.string().min(1).max(2000),
  isCorrect: z.boolean(),
  position: z.number().int().min(0),
});

export const questionCreateSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("MCQ"), scope: z.enum(["COURSE", "MODULE", "LESSON"]).default("COURSE"),
    courseId: z.string().uuid(), moduleId: z.string().uuid().optional(), lessonId: z.string().uuid().optional(),
    prompt: z.string().min(3).max(10000), explanation: z.string().max(10000).optional(), points: z.number().int().min(1).max(100).default(1),
    options: z.array(optionSchema).min(2).max(10),
  }).refine((d) => d.options.filter((o) => o.isCorrect).length === 1, { message: "MCQ must have exactly one correct option", path: ["options"] }),
  z.object({
    type: z.literal("TRUE_FALSE"), scope: z.enum(["COURSE", "MODULE", "LESSON"]).default("COURSE"),
    courseId: z.string().uuid(), moduleId: z.string().uuid().optional(), lessonId: z.string().uuid().optional(),
    prompt: z.string().min(3).max(10000), explanation: z.string().max(10000).optional(), points: z.number().int().min(1).max(100).default(1), correctBoolean: z.boolean(),
  }),
  z.object({
    type: z.literal("SHORT_ANSWER"), scope: z.enum(["COURSE", "MODULE", "LESSON"]).default("COURSE"),
    courseId: z.string().uuid(), moduleId: z.string().uuid().optional(), lessonId: z.string().uuid().optional(),
    prompt: z.string().min(3).max(10000), explanation: z.string().max(10000).optional(), points: z.number().int().min(1).max(100).default(1),
    expectedAnswer: z.string().min(1).max(2000), acceptedAnswers: z.array(z.string().min(1).max(2000)).max(20).optional(),
  }),
  z.object({
    type: z.literal("LONG_ANSWER"), scope: z.enum(["COURSE", "MODULE", "LESSON"]).default("COURSE"),
    courseId: z.string().uuid(), moduleId: z.string().uuid().optional(), lessonId: z.string().uuid().optional(),
    prompt: z.string().min(3).max(10000), explanation: z.string().max(10000).optional(), points: z.number().int().min(1).max(100).default(1), expectedAnswer: z.string().max(10000).optional(),
  }),
]);

export type QuestionCreateInput =
  | { type: "MCQ"; courseId: string; scope?: "COURSE" | "MODULE" | "LESSON"; moduleId?: string; lessonId?: string; prompt: string; explanation?: string; points?: number; options: Array<{ label: string; isCorrect: boolean; position: number }> }
  | { type: "TRUE_FALSE"; courseId: string; scope?: "COURSE" | "MODULE" | "LESSON"; moduleId?: string; lessonId?: string; prompt: string; explanation?: string; points?: number; correctBoolean: boolean }
  | { type: "SHORT_ANSWER"; courseId: string; scope?: "COURSE" | "MODULE" | "LESSON"; moduleId?: string; lessonId?: string; prompt: string; explanation?: string; points?: number; expectedAnswer: string; acceptedAnswers?: string[] }
  | { type: "LONG_ANSWER"; courseId: string; scope?: "COURSE" | "MODULE" | "LESSON"; moduleId?: string; lessonId?: string; prompt: string; explanation?: string; points?: number; expectedAnswer?: string };

export const questionUpdateSchema = z.object({
  prompt: z.string().min(3).max(10000).optional(),
  explanation: z.string().max(10000).optional(),
  points: z.number().int().min(1).max(100).optional(),
  options: z.array(optionSchema).min(2).max(10).optional(),
  correctBoolean: z.boolean().optional(),
  expectedAnswer: z.string().max(10000).optional(),
  acceptedAnswers: z.array(z.string().min(1).max(2000)).max(20).optional(),
});
