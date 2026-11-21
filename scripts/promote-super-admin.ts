import "dotenv/config";
import { prisma } from "../src/lib/db/client";
import { audit } from "../src/lib/audit";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: pnpm promote-super-admin <email>");
  process.exit(1);
}

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error(`User not found: ${email}`);
  await prisma.$disconnect();
  process.exit(1);
}

if (!user.isSuperAdmin) {
  await prisma.user.update({
    where: { id: user.id },
    data: { isSuperAdmin: true },
  });
  await audit({
    actorId: user.id,
    action: "USER.PROMOTED_TO_SUPER_ADMIN",
    targetType: "User",
    targetId: user.id,
  });
  console.log(`Promoted user ${email} to super admin.`);
} else {
  console.log(`User ${email} is already a super admin.`);
}

await prisma.$disconnect();
