import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { confirmUpload, deleteFile, getDownloadUrl } from "@/modules/files/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("file cross-org isolation", () => {
  it("user A cannot get download URL for org B file", async () => {
    const a = await prisma.user.create({ data: { email: `iso-file-a-${suffix}@example.test`, passwordHash: "test", name: "A" } });
    const b = await prisma.user.create({ data: { email: `iso-file-b-${suffix}@example.test`, passwordHash: "test", name: "B" } });
    const orgA = await prisma.organization.create({ data: { name: "File A", slug: `file-a-${suffix}`, memberships: { create: { userId: a.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    const orgB = await prisma.organization.create({ data: { name: "File B", slug: `file-b-${suffix}`, memberships: { create: { userId: b.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(a.id, b.id); orgIds.push(orgA.id, orgB.id);
    const fileB = await prisma.file.create({ data: { organizationId: orgB.id, uploadedById: b.id, storageKey: `org/${orgB.id}/LESSON_PDF/b-${suffix}.pdf`, sizeBytes: 100n, mimeType: "application/pdf", originalName: "b.pdf", purpose: "LESSON_PDF" } });
    await expect(getDownloadUrl({ userId: a.id, organizationId: orgA.id, role: "ORG_OWNER" }, fileB.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("user A cannot confirm upload with org B storage key", async () => {
    const a = await prisma.user.create({ data: { email: `iso-key-a-${suffix}@example.test`, passwordHash: "test", name: "A" } });
    const orgA = await prisma.organization.create({ data: { name: "Key A", slug: `key-a-${suffix}`, memberships: { create: { userId: a.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(a.id); orgIds.push(orgA.id);
    await expect(confirmUpload({ userId: a.id, organizationId: orgA.id, role: "ORG_OWNER" }, { storageKey: `org/other-org/LESSON_PDF/key-${suffix}.pdf`, purpose: "LESSON_PDF", originalName: "key.pdf", declaredMime: "application/pdf", declaredSize: 100 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("user A cannot delete org B file", async () => {
    const a = await prisma.user.create({ data: { email: `iso-delete-a-${suffix}@example.test`, passwordHash: "test", name: "A" } });
    const b = await prisma.user.create({ data: { email: `iso-delete-b-${suffix}@example.test`, passwordHash: "test", name: "B" } });
    const orgA = await prisma.organization.create({ data: { name: "Delete A", slug: `delete-a-${suffix}`, memberships: { create: { userId: a.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    const orgB = await prisma.organization.create({ data: { name: "Delete B", slug: `delete-b-${suffix}`, memberships: { create: { userId: b.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
    userIds.push(a.id, b.id); orgIds.push(orgA.id, orgB.id);
    const fileB = await prisma.file.create({ data: { organizationId: orgB.id, uploadedById: b.id, storageKey: `org/${orgB.id}/LESSON_PDF/delete-b-${suffix}.pdf`, sizeBytes: 100n, mimeType: "application/pdf", originalName: "b.pdf", purpose: "LESSON_PDF" } });
    await expect(deleteFile({ userId: a.id, organizationId: orgA.id, role: "ORG_OWNER" }, fileB.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
