import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { enrollStudent } from "@/modules/enrollment/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

async function setupStudent(label: string) {
  const student = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: student.id, role: "STUDENT", status: "ACTIVE", joinedAt: new Date() } } } });
  userIds.push(student.id); orgIds.push(org.id);
  return { ctx: { userId: student.id, organizationId: org.id, role: "STUDENT" as const }, org };
}

async function createCourse(orgId: string, authorId: string, title: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED", enrollmentRule: "OPEN" | "INVITE_ONLY") {
  return prisma.course.create({ data: { organizationId: orgId, authorId, title, slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${suffix}`, status, enrollmentRule } });
}

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("student enrollment", () => {
  it("STUDENT enrolls in PUBLISHED + OPEN course as ACTIVE", async () => {
    const { ctx, org } = await setupStudent("enroll-active");
    const course = await createCourse(org.id, ctx.userId, "Active Course", "PUBLISHED", "OPEN");
    const result = await enrollStudent(ctx, course.slug);
    const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { id: result.enrollmentId } });
    expect(enrollment.status).toBe("ACTIVE");
  });

  it("STUDENT cannot enroll in DRAFT course", async () => {
    const { ctx, org } = await setupStudent("enroll-draft");
    const course = await createCourse(org.id, ctx.userId, "Draft Course", "DRAFT", "OPEN");
    await expect(enrollStudent(ctx, course.slug)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("STUDENT cannot enroll in ARCHIVED course", async () => {
    const { ctx, org } = await setupStudent("enroll-archived");
    const course = await createCourse(org.id, ctx.userId, "Archived Course", "ARCHIVED", "OPEN");
    await expect(enrollStudent(ctx, course.slug)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("STUDENT cannot enroll in INVITE_ONLY course", async () => {
    const { ctx, org } = await setupStudent("enroll-invite");
    const course = await createCourse(org.id, ctx.userId, "Invite Course", "PUBLISHED", "INVITE_ONLY");
    await expect(enrollStudent(ctx, course.slug)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("double enroll returns 409 Conflict", async () => {
    const { ctx, org } = await setupStudent("enroll-double");
    const course = await createCourse(org.id, ctx.userId, "Double Course", "PUBLISHED", "OPEN");
    await enrollStudent(ctx, course.slug);
    await expect(enrollStudent(ctx, course.slug)).rejects.toMatchObject({ code: "CONFLICT", message: "Already enrolled" });
  });

  it("TEACHER cannot enroll", async () => {
    const { ctx, org } = await setupStudent("enroll-teacher-base");
    const course = await createCourse(org.id, ctx.userId, "Teacher Course", "PUBLISHED", "OPEN");
    await expect(enrollStudent({ ...ctx, role: "TEACHER" }, course.slug)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("cross-org STUDENT cannot enroll in course from org B", async () => {
    const { ctx: ctxA, org: orgA } = await setupStudent("enroll-cross-a");
    const teacher = await prisma.user.create({ data: { email: `enroll-cross-b-${suffix}@example.test`, passwordHash: "test", name: "Teacher B" } });
    const orgB = await prisma.organization.create({ data: { name: "Org B", slug: `enroll-cross-b-org-${suffix}`, memberships: { create: { userId: teacher.id, role: "TEACHER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(teacher.id); orgIds.push(orgB.id);
    const courseB = await createCourse(orgB.id, teacher.id, "Org B Course", "PUBLISHED", "OPEN");
    await expect(enrollStudent(ctxA, courseB.slug)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
