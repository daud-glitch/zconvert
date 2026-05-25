import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) {
    console.warn("[db] DATABASE_URL is not set — database features disabled.");
    return null;
  }
  try {
    return new PrismaClient({
      log: ["error"],
    });
  } catch (error) {
    console.error(
      "[db] PrismaClient failed to initialize. Run: npx prisma generate",
      error,
    );
    return null;
  }
}

/** Returns Prisma client or null when DB is unavailable (missing URL / generate). */
export function getOptionalDb(): PrismaClient | null {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = createPrismaClient();
  if (client && process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

/** Prisma client; throws if the database layer is not available. */
export function requireDb(): PrismaClient {
  const client = getOptionalDb();
  if (!client) {
    throw new Error(
      "Database is not available. Set DATABASE_URL and run npx prisma generate.",
    );
  }
  return client;
}

/** @deprecated Prefer getOptionalDb/requireDb — kept for existing imports. */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = requireDb();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
