import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Extract database path from DATABASE_URL
const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/dev.db';

// Create Prisma adapter with configuration object
const adapter = new PrismaBetterSqlite3({ url: dbPath });

// Initialize PrismaClient with adapter
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Re-export Prisma namespace for type usage
export { Prisma };
