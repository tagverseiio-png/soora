import { PrismaClient } from '@prisma/client';

// Ensure a single Prisma client instance across the app
// In dev, reuse the instance via globalThis to avoid exhausting connections
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.prisma || new PrismaClient({
  log: ['warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  try {
    await prisma.$disconnect();
  } catch (e) {
    // ignore
  }
});
