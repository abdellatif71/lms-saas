-- CreateEnum
CREATE TYPE "LearningEventType" AS ENUM ('LESSON_STARTED', 'LESSON_HEARTBEAT', 'LESSON_COMPLETED', 'LESSON_PAUSED');

-- CreateTable
CREATE TABLE "LearningTimeBucket" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "bucketDate" DATE NOT NULL,
    "totalMs" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningTimeBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningEvent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lessonId" UUID NOT NULL,
    "type" "LearningEventType" NOT NULL,
    "durationMs" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningTimeBucket_userId_bucketDate_idx" ON "LearningTimeBucket"("userId", "bucketDate");

-- CreateIndex
CREATE INDEX "LearningTimeBucket_lessonId_bucketDate_idx" ON "LearningTimeBucket"("lessonId", "bucketDate");

-- CreateIndex
CREATE UNIQUE INDEX "LearningTimeBucket_userId_lessonId_bucketDate_key" ON "LearningTimeBucket"("userId", "lessonId", "bucketDate");

-- CreateIndex
CREATE INDEX "LearningEvent_userId_lessonId_createdAt_idx" ON "LearningEvent"("userId", "lessonId", "createdAt");

-- CreateIndex
CREATE INDEX "LearningEvent_lessonId_type_createdAt_idx" ON "LearningEvent"("lessonId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "LearningTimeBucket" ADD CONSTRAINT "LearningTimeBucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningTimeBucket" ADD CONSTRAINT "LearningTimeBucket_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningEvent" ADD CONSTRAINT "LearningEvent_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
