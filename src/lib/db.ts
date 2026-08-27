import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function withConnectionLimit(databaseUrl: string): string {
  try {
    const u = new URL(databaseUrl);
    // Keep Heroku Postgres within free-tier connection room (web + worker).
    // Static page workers each get their own Prisma client — use 1 during builds.
    const isBuild =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.npm_lifecycle_event === "heroku-postbuild" ||
      process.env.npm_lifecycle_event === "build";
    const defaultLimit = isBuild
      ? "1"
      : process.env.DYNO?.startsWith("worker")
        ? "2"
        : "3";
    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set(
        "connection_limit",
        process.env.PRISMA_CONNECTION_LIMIT || defaultLimit,
      );
    }
    if (!u.searchParams.has("pool_timeout")) {
      u.searchParams.set("pool_timeout", "20");
    }
    return u.toString();
  } catch {
    return databaseUrl;
  }
}

function createPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) {
    console.warn("[db] DATABASE_URL is not set — database features disabled.");
    return null;
  }
  try {
    return new PrismaClient({
      datasources: {
        db: { url: withConnectionLimit(process.env.DATABASE_URL) },
      },
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
  // Always cache — creating a client per request exhausts Postgres connections.
  if (client) globalForPrisma.prisma = client;
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
