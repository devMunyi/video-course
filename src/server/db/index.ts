import "server-only"
import { PrismaPg } from "@prisma/adapter-pg"
import { env } from "@/env"
import { PrismaClient } from "@/generated/prisma/client"

const globalForPrisma = globalThis as { prisma?: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db
}
