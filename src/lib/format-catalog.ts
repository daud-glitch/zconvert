import { createHash } from "crypto";
import { getOptionalDb } from "@/lib/db";
import {
  getFormatByExt,
  isConversionPairListed,
  type FormatInfo,
} from "@/lib/formats";
import { parseStoredJsonArray } from "@/lib/http-json";

export type ResolvedFormat = {
  ext: string;
  name: string;
  category: string;
  targetFormats: string[];
  source: "database" | "static";
};

/**
 * Resolve a format from DB (enabled) when available, else static catalog.
 * Keeps convert validation aligned with what /api/formats shows.
 */
export async function resolveFormatByExt(
  ext: string,
): Promise<ResolvedFormat | null> {
  const normalized = ext.toLowerCase().replace(/^\./, "");
  if (!normalized) return null;

  const staticFmt = getFormatByExt(normalized);

  const prisma = getOptionalDb();
  if (prisma) {
    try {
      const row = await prisma.format.findFirst({
        where: { ext: normalized },
        include: { category: true },
      });
      if (row) {
        if (!row.enabled || !row.category.enabled) return null;
        return {
          ext: row.ext,
          name: row.name,
          category: row.category.name,
          targetFormats: parseStoredJsonArray(row.targetFormats),
          source: "database",
        };
      }
    } catch (err) {
      console.warn("[format-catalog] DB lookup failed, using static:", err);
    }
  }

  if (!staticFmt) return null;
  return {
    ext: staticFmt.ext,
    name: staticFmt.name,
    category: staticFmt.category,
    targetFormats: staticFmt.targetFormats,
    source: "static",
  };
}

export async function isConversionPairAllowed(
  sourceExt: string,
  targetExt: string,
): Promise<boolean> {
  const src = await resolveFormatByExt(sourceExt);
  const tgt = targetExt.toLowerCase().replace(/^\./, "");
  if (!src || !tgt || src.ext === tgt) return false;
  if (src.targetFormats.includes(tgt)) return true;
  // Static fallback only when catalog is static-sourced
  if (src.source === "static") {
    return isConversionPairListed(sourceExt, tgt);
  }
  return false;
}

export function toFormatInfoLike(resolved: ResolvedFormat): Pick<
  FormatInfo,
  "ext" | "name" | "category" | "targetFormats"
> {
  return {
    ext: resolved.ext,
    name: resolved.name,
    category: resolved.category as FormatInfo["category"],
    targetFormats: resolved.targetFormats,
  };
}

/** One-way hash for ops logs (not reversible identity). */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/** Safe filename for anonymous conversion logs. */
export function anonymizeFileName(
  fileName: string,
  originalExt: string,
  hasUser: boolean,
): string {
  if (hasUser) {
    // Keep basename only, strip path tricks
    const base = fileName.replace(/^.*[\\/]/, "").slice(0, 200);
    return base || `file.${originalExt}`;
  }
  return `upload.${originalExt.toLowerCase() || "bin"}`;
}
