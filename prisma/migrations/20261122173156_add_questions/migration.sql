-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER');

-- CreateEnum
CREATE TYPE "QuestionScope" AS ENUM ('COURSE', 'MODULE', 'LESSON');

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "moduleId" UUID,
    "lessonId" UUID,
    "authorId" UUID NOT NULL,
    "type" "QuestionType" NOT NULL,
    "scope" "QuestionScope" NOT NULL DEFAULT 'COURSE',
    "prompt" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "correctBoolean" BOOLEAN,
    "expectedAnswer" TEXT,
    "acceptedAnswers" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Question_organizationId_courseId_idx" ON "Question"("organizationId", "courseId");

-- CreateIndex
CREATE INDEX "Question_courseId_deletedAt_idx" ON "Question"("courseId", "deletedAt");

-- CreateIndex
CREATE INDEX "Question_lessonId_idx" ON "Question"("lessonId");

-- CreateIndex
CREATE INDEX "Question_moduleId_idx" ON "Question"("moduleId");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_position_idx" ON "QuestionOption"("questionId", "position");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
