-- CreateEnum
CREATE TYPE "LessonContentType" AS ENUM ('TEXT', 'VIDEO', 'PDF', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "LessonCompletionRule" AS ENUM ('VIEW', 'MANUAL', 'TIME_BASED');

-- DropIndex
DROP INDEX "Course_authorId_idx";

-- DropIndex
DROP INDEX "Course_organizationId_categoryId_idx";

-- DropIndex
DROP INDEX "Course_organizationId_slug_key";

-- DropIndex
DROP INDEX "Course_organizationId_status_idx";

-- CreateTable
CREATE TABLE "Module" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "contentType" "LessonContentType" NOT NULL,
    "bodyText" TEXT,
    "externalUrl" TEXT,
    "fileId" UUID,
    "estimatedMinutes" INTEGER,
    "completionRule" "LessonCompletionRule" NOT NULL DEFAULT 'VIEW',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Module_courseId_position_idx" ON "Module"("courseId", "position");

-- CreateIndex
CREATE INDEX "Lesson_moduleId_position_idx" ON "Lesson"("moduleId", "position");

-- CreateIndex
CREATE INDEX "Lesson_moduleId_deletedAt_idx" ON "Lesson"("moduleId", "deletedAt");

-- CreateIndex
CREATE INDEX "Lesson_fileId_idx" ON "Lesson"("fileId");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;
