import { z } from "zod";

export const heartbeatSchema = z.object({
  lessonId: z.string().uuid(),
  type: z.enum(["LESSON_STARTED", "LESSON_HEARTBEAT", "LESSON_PAUSED"]),
  durationMs: z.number().int().min(0).max(300_000).optional(),
  clientTimestamp: z.string().datetime().optional(),
});

export const completeLessonSchema = z.object({
  lessonId: z.string().uuid(),
});
