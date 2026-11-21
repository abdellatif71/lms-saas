import "dotenv/config";
import path from "node:path";
import type { PrismaConfig } from "prisma";
import { env } from "prisma/config";

export default {
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
} satisfies PrismaConfig;
