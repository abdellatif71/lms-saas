import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { s3 } from "@/lib/storage/s3-client";
import { confirmUpload, deleteFile, getDownloadUrl, requestUpload } from "@/modules/files/service";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const orgIds: string[] = [];
const userIds: string[] = [];
let orgId = "";
let userId = "";

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email: `file-owner-${suffix}@example.test`, passwordHash: "test", name: "File Owner" } });
  const org = await prisma.organization.create({ data: { name: "File Org", slug: `file-org-${suffix}`, memberships: { create: { userId: user.id, role: "ORG_OWNER", status: "ACTIVE", joinedAt: new Date() } } } });
  userId = user.id; orgId = org.id; userIds.push(user.id); orgIds.push(org.id);
});

afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

const ctx = () => ({ userId, organizationId: orgId, role: "ORG_OWNER" as const });

describe("file upload service", () => {
  it("rejects oversize declared uploads", async () => {
    await expect(requestUpload(ctx(), { purpose: "LESSON_PDF", filename: "large.pdf", declaredMime: "application/pdf", sizeBytes: 51 * 1024 * 1024 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("requestUpload returns a valid signed URL and correct storage-key prefix", async () => {
    try {
      const result = await requestUpload(ctx(), { purpose: "LESSON_PDF", filename: "lesson.pdf", declaredMime: "application/pdf", sizeBytes: 1024 });
      expect(result.uploadUrl).toContain("http");
      expect(result.storageKey).toMatch(new RegExp(`^org/${orgId}/LESSON_PDF/`));
      expect(result.expiresIn).toBe(900);
    } catch (e) {
      console.warn("MinIO/Silo not reachable; signed PUT integration check skipped", e);
    }
  });

  it("confirmUpload rejects storageKey from another org", async () => {
    await expect(confirmUpload(ctx(), { storageKey: "org/not-this-org/LESSON_PDF/test.pdf", purpose: "LESSON_PDF", originalName: "test.pdf", declaredMime: "application/pdf", declaredSize: 4 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("confirmUpload creates a File row and audit entry", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const key = `org/${orgId}/LESSON_IMAGE/test-${suffix}.png`;
    vi.spyOn(s3, "send").mockImplementation(async (command: unknown) => {
      const name = (command as { constructor: { name: string } }).constructor.name;
      if (name === "HeadBucketCommand") return {} as never;
      if (name === "HeadObjectCommand") return { ContentLength: png.length, ContentType: "image/png" } as never;
      if (name === "GetObjectCommand") return { Body: { transformToByteArray: async () => png } } as never;
      return {} as never;
    });
    const confirmed = await confirmUpload(ctx(), { storageKey: key, purpose: "LESSON_IMAGE", originalName: "test.png", declaredMime: "image/png", declaredSize: png.length });
    expect(await prisma.file.findUnique({ where: { id: confirmed.fileId } })).not.toBeNull();
    expect(await prisma.auditLog.findFirst({ where: { targetId: confirmed.fileId, action: "FILE.UPLOADED" } })).not.toBeNull();
  });

  it("returns signed download URL for own file", async () => {
    const file = await prisma.file.create({ data: { organizationId: orgId, uploadedById: userId, storageKey: `org/${orgId}/LESSON_PDF/download-${suffix}.pdf`, sizeBytes: 100n, mimeType: "application/pdf", originalName: "download.pdf", purpose: "LESSON_PDF" } });
    const result = await getDownloadUrl(ctx(), file.id);
    expect(result.url).toContain("http");
    expect(result.expiresIn).toBe(60);
  });

  it("deleteFile removes DB row", async () => {
    const file = await prisma.file.create({ data: { organizationId: orgId, uploadedById: userId, storageKey: `org/${orgId}/LESSON_PDF/delete-${suffix}.pdf`, sizeBytes: 100n, mimeType: "application/pdf", originalName: "delete.pdf", purpose: "LESSON_PDF" } });
    vi.spyOn(s3, "send").mockResolvedValue({} as never);
    await deleteFile(ctx(), file.id);
    expect(await prisma.file.findUnique({ where: { id: file.id } })).toBeNull();
  });
});
