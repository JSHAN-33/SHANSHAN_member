import { PrismaClient } from '@prisma/client'

// 避免開發模式下每次熱更新產生多個 Prisma Client 實例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
