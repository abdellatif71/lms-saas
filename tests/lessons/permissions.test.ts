import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { createModule, listModules, updateModule } from "@/modules/lessons/modules";
import { createLesson } from "@/modules/lessons/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("lesson permissions", () => {
  it("STUDENT cannot create/update/delete modules or lessons", async () => {
    const student = await prisma.user.create({ data: { email: `lesson-student-${suffix}@example.test`, passwordHash: "test", name: "Student" } });
    const org = await prisma.organization.create({ data: { name: "Student Lessons", slug: `lesson-student-${suffix}`, memberships: { create: { userId: student.id, role: "STUDENT", status: "ACTIVE", joinedAt: new Date() } } } });
    const course = await prisma.course.create({ data: { organizationId: org.id, authorId: student.id, title: "Course", slug: `lesson-student-course-${suffix}` } });
    userIds.push(student.id); orgIds.push(org.id);
    const ctx = { userId: student.id, organizationId: org.id, role: "STUDENT" as const };
    await expect(createModule(ctx, course.slug, { title: "Forbidden" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listModules(ctx, course.slug)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("TEACHER can manage content in own organization", async () => {
    const teacher = await prisma.user.create({ data: { email: `lesson-teacher-${suffix}@example.test`, passwordHash: "test", name: "Teacher" } });
    const org = await prisma.organization.create({ data: { name: "Teacher Lessons", slug: `lesson-teacher-${suffix}`, memberships: { create: { userId: teacher.id, role: "TEACHER", status: "ACTIVE", joinedAt: new Date() } } } });
    const course = await prisma.course.create({ data: { organizationId: org.id, authorId: teacher.id, title: "Course", slug: `lesson-teacher-course-${suffix}` } });
    userIds.push(teacher.id); orgIds.push(org.id);
    const ctx = { userId: teacher.id, organizationId: org.id, role: "TEACHER" as const };
    const module = await createModule(ctx, course.slug, { title: "Managed" });
    await expect(updateModule(ctx, course.slug, module.id, { title: "Updated" })).resolves.toMatchObject({ title: "Updated" });
    await expect(createLesson(ctx, course.slug, module.id, { title: "Lesson", contentType: "TEXT", bodyText: "Body", completionRule: "VIEW" })).resolves.toBeTruthy();
  });

  it("cross-org teacher cannot access another org course content", async () => {
    const alice = await prisma.user.create({ data: { email: `lesson-cross-a-${suffix}@example.test`, passwordHash: "test", name: "Alice" } });
    const bob = await prisma.user.create({ data: { email: `lesson-cross-b-${suffix}@example.test`, passwordHash: "test", name: "Bob" } });
    const orgA = await prisma.organization.create({ data: { name: "Cross A", slug: `lesson-cross-a-${suffix}`, memberships: { create: { userId: alice.id, role: "TEACHER", status: "ACTIVE", joinedAt: new Date() } } } });
    const orgB = await prisma.organization.create({ data: { name: "Cross B", slug: `lesson-cross-b-${suffix}`, memberships: { create: { userId: bob.id, role: "TEACHER", status: "ACTIVE", joinedAt: new Date() } } } });
    const courseB = await prisma.course.create({ data: { organizationId: orgB.id, authorId: bob.id, title: "Bob Course", slug: `lesson-cross-b-course-${suffix}` } });
    userIds.push(alice.id, bob.id); orgIds.push(orgA.id, orgB.id);
    await expect(createModule({ userId: alice.id, organizationId: orgA.id, role: "TEACHER" }, courseB.slug, { title: "Stolen" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
