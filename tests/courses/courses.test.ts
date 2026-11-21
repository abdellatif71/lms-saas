import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { getEmailProvider } from "@/lib/email";
import { createCourse, softDeleteCourse, setCourseStatus, updateCourse } from "@/modules/courses/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

beforeAll(() => vi.spyOn(getEmailProvider(), "send").mockResolvedValue(undefined));
afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("course CRUD", () => {
  it("creates a course for a teacher", async () => {
    const teacher = await prisma.user.create({ data: { email: `course-teacher-${suffix}@example.test`, passwordHash: "test", name: "Teacher" } });
    const org = await prisma.organization.create({ data: { name: "Course Org", slug: `course-org-${suffix}`, memberships: { create: { userId: teacher.id, role: "TEACHER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(teacher.id); orgIds.push(org.id);
    const ctx = { userId: teacher.id, organizationId: org.id, role: "TEACHER" as const };
    const course = await createCourse(ctx, { title: "Teacher Course", visibility: "ORG", enrollmentRule: "OPEN" });
    expect(course.status).toBe("DRAFT");
  });

  it("student cannot create course", async () => {
    const student = await prisma.user.create({ data: { email: `course-student-${suffix}@example.test`, passwordHash: "test", name: "Student" } });
    const org = await prisma.organization.create({ data: { name: "Student Course", slug: `student-course-${suffix}`, memberships: { create: { userId: student.id, role: "STUDENT", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(student.id); orgIds.push(org.id);
    await expect(createCourse({ userId: student.id, organizationId: org.id, role: "STUDENT" }, { title: "Forbidden", visibility: "ORG", enrollmentRule: "OPEN" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("generates a suffixed slug when collision occurs", async () => {
    const owner = await prisma.user.create({ data: { email: `course-collision-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    const org = await prisma.organization.create({ data: { name: "Collision", slug: `collision-${suffix}`, memberships: { create: { userId: owner.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(owner.id); orgIds.push(org.id);
    const ctx = { userId: owner.id, organizationId: org.id, role: "ORG_OWNER" as const };
    const first = await createCourse(ctx, { title: "Unique", slug: `unique-${suffix}`, visibility: "ORG", enrollmentRule: "OPEN" });
    const second = await createCourse(ctx, { title: "Unique 2", slug: `unique-${suffix}`, visibility: "ORG", enrollmentRule: "OPEN" });
    expect(first.slug).toBe(`unique-${suffix}`);
    expect(second.slug).not.toBe(first.slug);
  });

  it("updates a course", async () => {
    const owner = await prisma.user.create({ data: { email: `course-update-${suffix}@example.test`, passwordHash: "test", name: "Owner" } });
    const org = await prisma.organization.create({ data: { name: "Update Course", slug: `update-course-${suffix}`, memberships: { create: { userId: owner.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(owner.id); orgIds.push(org.id);
    const ctx = { userId: owner.id, organizationId: org.id, role: "ORG_OWNER" as const };
    const course = await createCourse(ctx, { title: "Before", visibility: "ORG", enrollmentRule: "OPEN" });
    const updated = await updateCourse(ctx, course.slug, { title: "After", visibility: "PUBLIC", enrollmentRule: "INVITE_ONLY" });
    expect(updated.title).toBe("After");
  });

  it("soft-deletes a course and archives it", async () => {
    const admin = await prisma.user.create({ data: { email: `course-delete-${suffix}@example.test`, passwordHash: "test", name: "Admin" } });
    const org = await prisma.organization.create({ data: { name: "Delete Course", slug: `delete-course-${suffix}`, memberships: { create: { userId: admin.id, role: "ORG_ADMIN", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(admin.id); orgIds.push(org.id);
    const ctx = { userId: admin.id, organizationId: org.id, role: "ORG_ADMIN" as const };
    const course = await createCourse(ctx, { title: "Delete Me", visibility: "ORG", enrollmentRule: "OPEN" });
    const deleted = await softDeleteCourse(ctx, course.slug);
    expect(deleted.deletedAt).not.toBeNull();
    expect(deleted.status).toBe("ARCHIVED");
  });

  it("publishes DRAFT and rejects PUBLISHED to DRAFT", async () => {
    const admin = await prisma.user.create({ data: { email: `course-transition-${suffix}@example.test`, passwordHash: "test", name: "Admin" } });
    const org = await prisma.organization.create({ data: { name: "Transition", slug: `transition-${suffix}`, memberships: { create: { userId: admin.id, role: "ORG_ADMIN", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(admin.id); orgIds.push(org.id);
    const ctx = { userId: admin.id, organizationId: org.id, role: "ORG_ADMIN" as const };
    const course = await createCourse(ctx, { title: "Publish Me", visibility: "ORG", enrollmentRule: "OPEN" });
    const published = await setCourseStatus(ctx, course.slug, { status: "PUBLISHED" });
    expect(published.status).toBe("PUBLISHED");
    await expect(setCourseStatus(ctx, course.slug, { status: "DRAFT" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("cross-org course access returns 404", async () => {
    const alice = await prisma.user.create({ data: { email: `course-alice-${suffix}@example.test`, passwordHash: "test", name: "Alice" } });
    const bob = await prisma.user.create({ data: { email: `course-bob-${suffix}@example.test`, passwordHash: "test", name: "Bob" } });
    const orgA = await prisma.organization.create({ data: { name: "Course A", slug: `course-a-${suffix}`, memberships: { create: { userId: alice.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    const orgB = await prisma.organization.create({ data: { name: "Course B", slug: `course-b-${suffix}`, memberships: { create: { userId: bob.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(alice.id, bob.id); orgIds.push(orgA.id, orgB.id);
    const ctxB = { userId: bob.id, organizationId: orgB.id, role: "ORG_OWNER" as const };
    const courseB = await createCourse(ctxB, { title: "Bob Course", visibility: "ORG", enrollmentRule: "OPEN" });
    const ctxA = { userId: alice.id, organizationId: orgA.id, role: "ORG_OWNER" as const };
    const { getCourseBySlug } = await import("@/modules/courses/service");
    await expect(getCourseBySlug(ctxA, courseB.slug)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
