import { getOptionalDb } from "@/lib/db";
import { anonymizeFileName, hashIp } from "@/lib/format-catalog";
import { isAdminUser } from "@/lib/auth";

export type ConversionLogStatus = "done" | "error";

export type ConversionLogInput = {
  userId?: string | null;
  fileName: string;
  originalExt: string;
  targetExt: string;
  category: string;
  inputSize: number;
  outputSize: number;
  status: ConversionLogStatus;
  duration?: number | null;
  error?: string | null;
  ipAddress?: string | null;
};

function utcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Persist aggregate conversion stats in Postgres for the admin dashboard.
 * User-facing history + file blobs live in the browser IndexedDB only.
 * Guest logs store anonymized filenames and hashed IPs (not raw PII).
 */
export async function logConversion(
  input: ConversionLogInput,
): Promise<string | null> {
  if (input.userId && await isAdminUser(input.userId)) {
    // Skip logging for admin users
    return null;
  }

  const prisma = getOptionalDb();
  if (!prisma) return null;

  const hasUser = Boolean(input.userId);
  const safeName = anonymizeFileName(
    input.fileName,
    input.originalExt,
    hasUser,
  );

  try {
    const row = await prisma.conversion.create({
      data: {
        // Keep userId for admin user activity counts; history UI does not use this.
        userId: input.userId ?? null,
        fileName: safeName.slice(0, 500),
        originalExt: input.originalExt.toLowerCase(),
        targetExt: input.targetExt.toLowerCase(),
        category: input.category,
        inputSize: Math.max(0, Math.floor(input.inputSize)),
        outputSize: Math.max(0, Math.floor(input.outputSize)),
        status: input.status,
        duration:
          typeof input.duration === "number" && Number.isFinite(input.duration)
            ? Math.max(0, Math.floor(input.duration))
            : null,
        error: input.error ? input.error.slice(0, 1000) : null,
        ipAddress: hashIp(input.ipAddress),
      },
    });

    // Roll up DailyStats for real admin charts
    try {
      const day = utcDay();
      const storageDelta = BigInt(Math.max(0, Math.floor(input.outputSize)));
      await prisma.dailyStats.upsert({
        where: { date: day },
        create: {
          date: day,
          conversions: 1,
          users: 0,
          pageViews: 0,
          storageUsed: storageDelta,
        },
        update: {
          conversions: { increment: 1 },
          storageUsed: { increment: storageDelta },
        },
      });
    } catch (statsErr) {
      console.warn("[conversion-log] DailyStats upsert failed:", statsErr);
    }

    return row.id;
  } catch (err) {
    console.error("[conversion-log] Failed to persist conversion:", err);
    return null;
  }
}
