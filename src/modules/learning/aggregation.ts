import { prisma } from "@/lib/db/client";

export function utcDate(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function aggregateDailyBuckets(date = new Date()) {
  const bucketDate = utcDate(date);
  const nextDate = new Date(bucketDate);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const events = await prisma.learningEvent.findMany({
    where: { type: "LESSON_HEARTBEAT", createdAt: { gte: bucketDate, lt: nextDate } },
    select: { userId: true, lessonId: true, durationMs: true },
  });

  const totals = new Map<string, { userId: string; lessonId: string; totalMs: number; eventCount: number }>();
  for (const event of events) {
    const key = `${event.userId}:${event.lessonId}`;
    const existing = totals.get(key) ?? { userId: event.userId, lessonId: event.lessonId, totalMs: 0, eventCount: 0 };
    existing.totalMs += event.durationMs ?? 0;
    existing.eventCount += 1;
    totals.set(key, existing);
  }

  await prisma.$transaction(async (tx) => {
    await tx.learningTimeBucket.deleteMany({ where: { bucketDate } });
    if (totals.size > 0) {
      await tx.learningTimeBucket.createMany({
        data: [...totals.values()].map((bucket) => ({
          userId: bucket.userId,
          lessonId: bucket.lessonId,
          bucketDate,
          totalMs: bucket.totalMs,
          eventCount: bucket.eventCount,
        })),
      });
    }
  });

  return totals.size;
}
