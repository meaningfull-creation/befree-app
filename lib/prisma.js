// Next.jsの開発モードではホットリロードのたびに新しいPrismaClientが
// 作られて接続数が増え続けてしまうため、globalに保持して使い回す。

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
