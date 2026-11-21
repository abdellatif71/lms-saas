import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { createCourse, listCourses, setCourseStatus } from "@/modules/courses/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("course permissions", () => {
  it("STUDENT cannot list courses", async () => {
    const student = await prisma.user.create({ data: { email: `perm-student-${suffix}@example.test`, passwordHash: "test", name: "Student" } });
    const org = await prisma.organization.create({ data: { name: "Perm Student", slug: `perm-student-${suffix}`, memberships: { create: { userId: student.id, role: "STUDENT", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(student.id); orgIds.push(org.id);
    await expect(listCourses({ userId: student.id, organizationId: org.id, role: "STUDENT" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("TEACHER can list/create but cannot publish", async () => {
    const teacher = await prisma.user.create({ data: { email: `perm-teacher-${suffix}@example.test`, passwordHash: "test", name: "Teacher" } });
    const org = await prisma.organization.create({ data: { name: "Perm Teacher", slug: `perm-teacher-${suffix}`, memberships: { create: { userId: teacher.id, role: "TEACHER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(teacher.id); orgIds.push(org.id);
    const ctx = { userId: teacher.id, organizationId: org.id, role: "TEACHER" as const };
    const course = await createCourse(ctx, { title: "Teacher Managed", visibility: "ORG", enrollmentRule: "OPEN" });
    await expect(listCourses(ctx)).resolves.toHaveLength(1);
    await expect(setCourseStatus(ctx, course.slug, { status: "PUBLISHED" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ORG_ADMIN can publish", async () => {
    const admin = await prisma.user.create({ data: { email: `perm-admin-${suffix}@example.test`, passwordHash: "test", name: "Admin" } });
    const org = await prisma.organization.create({ data: { name: "Perm Admin", slug: `perm-admin-${suffix}`, memberships: { create: { userId: admin.id, role: "ORG_ADMIN", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(admin.id); orgIds.push(org.id);
    const ctx = { userId: admin.id, organizationId: org.id, role: "ORG_ADMIN" as const };
    const course = await createCourse(ctx, { title: "Admin Managed", visibility: "ORG", enrollmentRule: "OPEN" });
    await expect(setCourseStatus(ctx, course.slug, { status: "PUBLISHED" })).resolves.toMatchObject({ status: "PUBLISHED" });
  });

  it("PARENT cannot access courses", async () => {
    const parent = await prisma.user.create({ data: { email: `perm-parent-${suffix}@example.test`, passwordHash: "test", name: "Parent" } });
    const org = await prisma.organization.create({ data: { name: "Perm Parent", slug: `perm-parent-${suffix}`, memberships: { create: { userId: parent.id, role: "PARENT", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(parent.id); orgIds.push(org.id);
    await expect(listCourses({ userId: parent.id, organizationId: org.id, role: "PARENT" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
