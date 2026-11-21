import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { auth } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { GET } from "@/app/api/admin/audit/route";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let superId = "";
let normalId = "";
const orgIds: string[] = [];

afterAll(async () => {
  vi.restoreAllMocks();
  await prisma.auditLog.deleteMany({ where: { actorId: { in: [superId, normalId].filter(Boolean) } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: [superId, normalId].filter(Boolean) } } });
});

describe("audit viewer and API", () => {
  it("requires super admin status", async () => {
    const superUser = await prisma.user.create({ data: { email: `viewer-super-${suffix}@example.test`, passwordHash: "test", name: "Super", isSuperAdmin: true } });
    const normalUser = await prisma.user.create({ data: { email: `viewer-normal-${suffix}@example.test`, passwordHash: "test", name: "Normal" } });
    superId = superUser.id;
    normalId = normalUser.id;

    vi.mocked(auth).mockResolvedValue({ user: { id: superUser.id } } as never);
    await expect(requireSuperAdmin()).resolves.toMatchObject({ userId: superUser.id });

    vi.mocked(auth).mockResolvedValue({ user: { id: normalUser.id } } as never);
    await expect(requireSuperAdmin()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns filtered and paginated audit data only for super admins", async () => {
    const superUser = await prisma.user.findUniqueOrThrow({ where: { id: superId } });
    const org = await prisma.organization.create({ data: { name: "Viewer Org", slug: `viewer-${suffix}` } });
    orgIds.push(org.id);

    for (let i = 0; i < 3; i++) {
      await prisma.auditLog.create({ data: { actorId: superUser.id, organizationId: org.id, action: i === 1 ? "TEST.FILTER" : "TEST.OTHER", targetType: "Test", targetId: `${i}-${suffix}` } });
    }

    vi.mocked(auth).mockResolvedValue({ user: { id: superUser.id } } as never);
    const filtered = await GET(new Request(`http://localhost/api/admin/audit?organizationId=${org.id}&action=TEST.FILTER&limit=1`));
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.items).toHaveLength(1);

    const page1 = await GET(new Request(`http://localhost/api/admin/audit?organizationId=${org.id}&limit=1`));
    const page1Body = await page1.json();
    expect(page1Body.items).toHaveLength(1);
    expect(page1Body.nextCursor).not.toBeNull();

    vi.mocked(auth).mockResolvedValue({ user: { id: normalId } } as never);
    const forbidden = await GET(new Request("http://localhost/api/admin/audit"));
    expect(forbidden.status).toBe(403);
  });
});
