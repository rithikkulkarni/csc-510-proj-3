/**
 * Prisma client singleton
 *
 * Exports a shared PrismaClient instance that is safe to use in a
 * Next.js environment with hot reloading. Prevents multiple database
 * connections from being created during development.
 */
import { PrismaClient } from "@prisma/client";

/**
 * Store Prisma on the global object in development so the client
 * persists across module reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

/**
 * Cache the Prisma client globally in non-production environments.
 */
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
