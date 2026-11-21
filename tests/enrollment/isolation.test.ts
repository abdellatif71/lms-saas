import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { enrollStudent, getEnrolledCourseContent, listAvailableCourses, listMyEnrollments } from "@/modules/enrollment/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

async function setupOrg(label: string) {
  const student = await prisma.user.create({ data: { email: `${label}-${suffix}@example.test`, passwordHash: "test", name: label } });
  const org = await prisma.organization.create({ data: { name: label, slug: `${label}-${suffix}`, memberships: { create: { userId: student.id, role: "STUDENT", status: "ACTIVE", joinedAt: new Date() } } } });
  const ctx = { userId: student.id, organizationId: org.id, role: "STUDENT" as const };
  orgIds.push(org.id); userIds.push(student.id);
  return { ctx, org, student };
}

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("enrollment isolation", () => {
  it("listMyEnrollments returns only own enrollments in own org", async () => {
    const a = await setupOrg("isolation-list-a");
    const b = await setupOrg("isolation-list-b");
    const courseA = await prisma.course.create({ data: { organizationId: a.org.id, authorId: a.student.id, title: "A", slug: `isolation-a-${suffix}`, status: "PUBLISHED", enrollmentRule: "OPEN" } });
    const courseB = await prisma.course.create({ data: { organizationId: b.org.id, authorId: b.student.id, title: "B", slug: `isolation-b-${suffix}`, status: "PUBLISHED", enrollmentRule: "OPEN" } });
    await enrollStudent(a.ctx, courseA.slug);
    await enrollStudent(b.ctx, courseB.slug);
    const mine = await listMyEnrollments(a.ctx);
    expect(mine.map((entry) => entry.courseId)).toEqual([courseA.id]);
  });

  it("listAvailableCourses returns only published+open courses in own org", async () => {
    const a = await setupOrg("isolation-available-a");
    await prisma.course.create({ data: { organizationId: a.org.id, authorId: a.student.id, title: "Open", slug: `isolation-open-${suffix}`, status: "PUBLISHED", enrollmentRule: "OPEN" } });
    await prisma.course.create({ data: { organizationId: a.org.id, authorId: a.student.id, title: "Draft", slug: `isolation-draft-${suffix}`, status: "DRAFT", enrollmentRule: "OPEN" } });
    const b = await setupOrg("isolation-available-b");
    await prisma.course.create({ data: { organizationId: b.org.id, authorId: b.student.id, title: "Other", slug: `isolation-other-${suffix}`, status: "PUBLISHED", enrollmentRule: "OPEN" } });
    const available = await listAvailableCourses(a.ctx);
    expect(available).toHaveLength(1);
    expect(available[0]?.organizationId).toBe(a.org.id);
  });

  it("getEnrolledCourseContent returns 404 for cross-org course", async () => {
    const a = await setupOrg("isolation-content-a");
    const b = await setupOrg("isolation-content-b");
    const courseB = await prisma.course.create({ data: { organizationId: b.org.id, authorId: b.student.id, title: "B Content", slug: `isolation-content-b-${suffix}`, status: "PUBLISHED", enrollmentRule: "OPEN" } });
    await expect(getEnrolledCourseContent(a.ctx, courseB.slug)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("getEnrolledCourseContent returns 404 if not enrolled", async () => {
    const a = await setupOrg("isolation-not-enrolled-a");
    const course = await prisma.course.create({ data: { organizationId: a.org.id, authorId: a.student.id, title: "No Enrollment", slug: `isolation-not-enrolled-${suffix}`, status: "PUBLISHED", enrollmentRule: "OPEN" } });
    await expect(getEnrolledCourseContent(a.ctx, course.slug)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
