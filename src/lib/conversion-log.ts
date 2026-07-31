import { getOptionalDb } from "@/lib/db";

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

/** Persist a conversion row when DB is available. Never throws to callers. */
export async function logConversion(
  input: ConversionLogInput,
): Promise<string | null> {
  const prisma = getOptionalDb();
  if (!prisma) return null;

  try {
    const row = await prisma.conversion.create({
      data: {
        userId: input.userId ?? null,
        fileName: input.fileName.slice(0, 500),
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
        ipAddress: input.ipAddress ?? null,
      },
    });
    return row.id;
  } catch (err) {
    console.error("[conversion-log] Failed to persist conversion:", err);
    return null;
  }
}
