import { PrismaClient } from '@prisma/client';

// Un solo client anche con l'hot-reload di `next dev`.
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
