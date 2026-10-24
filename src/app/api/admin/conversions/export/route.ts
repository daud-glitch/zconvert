import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { nonAdminConversionWhere } from "@/lib/analytics-filters";
import { humanizeConversionError } from "@/lib/upload-limits";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DAYS = 365;
const DEFAULT_DAYS = 30;
/** Rows pulled for the "most common error" tally; keeps the scan bounded. */
const ERROR_SCAN_LIMIT = 5000;
const DETAIL_LIMIT = 10000;

function parseDays(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DAYS;
  return Math.min(Math.round(n), MAX_DAYS);
}

/**
 * RFC 4180 escaping.
 *
 * Error strings routinely contain commas, quotes and newlines — an unescaped
 * error would shift every following column, which is exactly the kind of
 * corruption that makes an export untrustworthy.
 */
function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Shape returned by `db.conversion.groupBy({ by, _count: { _all: true } })`.
 * Prisma puts the tally in `_count._all` — reading a flat `count` produced
 * `undefined` and the admin table rendered "NaN failures".
 */
type PairGroupRow = {
  originalExt: string;
  targetExt: string;
  _count: { _all: number };
};

function groupCount(row: PairGroupRow): number {
  const n = row._count?._all;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  const params = request.nextUrl.searchParams;
  const view = params.get("view") === "detail" ? "detail" : "summary";
  const format = params.get("format") === "json" ? "json" : "csv";
  const days = parseDays(params.get("days"));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const stamp = new Date().toISOString().slice(0, 10);

  try {
    const baseWhere = {
      ...nonAdminConversionWhere,
      createdAt: { gte: since },
    };

    const [attempts, failures, errorRows] = await Promise.all([
      db.conversion.groupBy({
        by: ["originalExt", "targetExt"],
        where: baseWhere,
        _count: { _all: true },
      }),
      db.conversion.groupBy({
        by: ["originalExt", "targetExt"],
        where: { ...baseWhere, status: "error" },
        _count: { _all: true },
      }),
      db.conversion.findMany({
        where: { ...baseWhere, status: "error" },
        select: { originalExt: true, targetExt: true, error: true },
        orderBy: { createdAt: "desc" },
        take: ERROR_SCAN_LIMIT,
      }),
    ]);

    const attemptsByPair = new Map<string, number>();
    for (const r of attempts as unknown as PairGroupRow[]) {
      attemptsByPair.set(`${r.originalExt}>${r.targetExt}`, groupCount(r));
    }

    // Tally the most frequent message per pair so the operator sees the cause,
    // not just a count.
    const topError = new Map<string, Map<string, number>>();
    for (const r of errorRows) {
      const key = `${r.originalExt}>${r.targetExt}`;
      const message = humanizeConversionError(r.error || "Unknown error");
      let bucket = topError.get(key);
      if (!bucket) {
        bucket = new Map();
        topError.set(key, bucket);
      }
      bucket.set(message, (bucket.get(message) ?? 0) + 1);
    }

    if (view === "detail") {
      const rows = await db.conversion.findMany({
        where: { ...baseWhere, status: "error" },
        orderBy: { createdAt: "desc" },
        take: DETAIL_LIMIT,
        select: {
          createdAt: true,
          originalExt: true,
          targetExt: true,
          fileName: true,
          category: true,
          inputSize: true,
          duration: true,
          error: true,
        },
      });

      const payload = {
        days,
        generatedAt: new Date().toISOString(),
        total: rows.length,
        truncated: failures.length > rows.length,
        rows: rows.map((r) => ({
          createdAt: r.createdAt.toISOString(),
          pair: `${r.originalExt}->${r.targetExt}`,
          originalExt: r.originalExt,
          targetExt: r.targetExt,
          fileName: r.fileName,
          category: r.category,
          inputSize: r.inputSize,
          durationMs: r.duration,
          error: humanizeConversionError(r.error || "Unknown error"),
        })),
      };

      if (format === "json") {
        return NextResponse.json(payload, {
          headers: { "Cache-Control": "no-store" },
        });
      }

      const csv = toCsv([
        [
          "timestamp_utc",
          "pair",
          "original_ext",
          "target_ext",
          "file_name",
          "category",
          "input_bytes",
          "duration_ms",
          "error",
        ],
        ...payload.rows.map((r) => [
          r.createdAt,
          r.pair,
          r.originalExt,
          r.targetExt,
          r.fileName,
          r.category,
          r.inputSize,
          r.durationMs,
          r.error,
        ]),
      ]);

      return csvResponse(
        csv,
        `convertek-failed-conversions-detail-${days}d-${stamp}.csv`,
      );
    }

    // Summary view — the "which formats are broken" answer.
    const summary = (failures as unknown as PairGroupRow[])
      .map((r) => {
        const key = `${r.originalExt}>${r.targetExt}`;
        const count = groupCount(r);
        // A failure row always counts as at least one attempt, so a pair whose
        // attempt rows aged out of the range still reports a real rate.
        const total = Math.max(attemptsByPair.get(key) ?? 0, count);
        const bucket = topError.get(key);
        const top = bucket
          ? [...bucket.entries()].sort((a, b) => b[1] - a[1])[0]
          : undefined;
        return {
          pair: `${r.originalExt}-to-${r.targetExt}`,
          originalExt: r.originalExt,
          targetExt: r.targetExt,
          failures: count,
          attempts: total,
          failureRate: total > 0 ? Math.round((count / total) * 100) : 100,
          topError: top?.[0] ?? "Unknown error",
          topErrorCount: top?.[1] ?? 0,
        };
      })
      .sort((a, b) => b.failures - a.failures || b.failureRate - a.failureRate);

    if (format === "json") {
      return NextResponse.json(
        { days, generatedAt: new Date().toISOString(), total: summary.length, summary },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const csv = toCsv([
      [
        "pair",
        "original_ext",
        "target_ext",
        "failures",
        "attempts",
        "failure_rate_pct",
        "top_error",
        "top_error_count",
      ],
      ...summary.map((r) => [
        r.pair,
        r.originalExt,
        r.targetExt,
        r.failures,
        r.attempts,
        r.failureRate,
        r.topError,
        r.topErrorCount,
      ]),
    ]);

    return csvResponse(
      csv,
      `convertek-failed-conversions-summary-${days}d-${stamp}.csv`,
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Export failed" },
      { status: 500 },
    );
  }
}