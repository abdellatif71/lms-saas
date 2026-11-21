import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { enrollStudent, unenrollStudent } from "@/modules/enrollment/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

async function setup(label: string) {
  const student = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: student.id, role: "STUDENT", status: "ACTIVE", joinedAt: new Date() } } } });
  const course = await prisma.course.create({ data: { organizationId: org.id, authorId: student.id, title: `${label} Course`, slug: `${label}-course-${suffix}`, status: "PUBLISHED", enrollmentRule: "OPEN" } });
  const ctx = { userId: student.id, organizationId: org.id, role: "STUDENT" as const };
  orgIds.push(org.id); userIds.push(student.id);
  return { ctx, org, course };
}

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("student unenrollment", () => {
  it("STUDENT leaves course with no progress and status becomes DROPPED", async () => {
    const { ctx, course } = await setup("unenroll-clean");
    await enrollStudent(ctx, course.slug);
    await unenrollStudent(ctx, course.slug);
    const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { courseId_studentUserId: { courseId: course.id, studentUserId: ctx.userId } } });
    expect(enrollment.status).toBe("DROPPED");
  });

  it("STUDENT cannot leave if LessonProgress exists", async () => {
    const { ctx, course, org } = await setup("unenroll-progress");
    await enrollStudent(ctx, course.slug);
    const module = await prisma.module.create({ data: { courseId: course.id, title: "Module", position: 0 } });
    const lesson = await prisma.lesson.create({ data: { moduleId: module.id, title: "Lesson", position: 0, contentType: "TEXT", bodyText: "Body" } });
    await prisma.lessonProgress.create({ data: { lessonId: lesson.id, studentUserId: ctx.userId, organizationId: org.id, state: "IN_PROGRESS" } });
    await expect(unenrollStudent(ctx, course.slug)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("unenroll non-enrolled returns 404", async () => {
    const { ctx, course } = await setup("unenroll-none");
    await expect(unenrollStudent(ctx, course.slug)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
