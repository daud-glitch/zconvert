"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileWarning,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SummaryRow = {
  pair: string;
  originalExt: string;
  targetExt: string;
  failures: number;
  attempts: number;
  failureRate: number;
  topError: string;
  topErrorCount: number;
};

const RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const TOP_ROWS = 10;

/**
 * "Which formats are broken" panel.
 *
 * Sorted by failure count so the worst offenders are visible without opening
 * a file, with the dominant error message inline — a count alone does not tell
 * you whether the cause is ffmpeg, a codec, or an out-of-memory kill.
 */
export function AdminFailedConversions() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<SummaryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (range: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/conversions/export?view=summary&format=json&days=${range}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as { summary?: SummaryRow[] };
      setRows(data.summary ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const download = (view: "summary" | "detail") => {
    const url = `/api/admin/conversions/export?view=${view}&format=csv&days=${days}`;
    window.location.href = url;
  };

  const totalFailures = (rows ?? []).reduce((sum, r) => sum + r.failures, 0);
  const visible = (rows ?? []).slice(0, TOP_ROWS);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-red-500" />
              Failed conversions
            </CardTitle>
            <CardDescription className="mt-1">
              Pairs that fail most, with the dominant error. Export to
              spreadsheet to triage offline.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  type="button"
                  onClick={() => setDays(r.days)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    days === r.days
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load(days)}
              disabled={loading}
              aria-label="Refresh failed conversions"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => download("summary")}
            >
              <Download className="h-4 w-4" />
              Summary CSV
            </Button>
            <Button size="sm" onClick={() => download("detail")}>
              <Download className="h-4 w-4" />
              All failures CSV
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading failures…
          </div>
        )}

        {!loading && !error && rows?.length === 0 && (
          <p className="flex items-center gap-2 py-6 text-sm text-emerald-600">
            <AlertTriangle className="h-4 w-4" />
            No failed conversions in the last {days} days.
          </p>
        )}

        {!loading && !error && visible.length > 0 && (
          <>
            <p className="mb-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {totalFailures.toLocaleString()}
              </span>{" "}
              failures across{" "}
              <span className="font-semibold text-foreground">
                {rows!.length}
              </span>{" "}
              conversion pairs
              {rows!.length > TOP_ROWS && (
                <>
                  {" "}
                  — showing the worst {TOP_ROWS}. The CSV has all{" "}
                  {rows!.length}.
                </>
              )}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Pair</th>
                    <th className="py-2 pr-3 font-medium text-right">Fails</th>
                    <th className="py-2 pr-3 font-medium text-right">Attempts</th>
                    <th className="py-2 pr-3 font-medium text-right">Rate</th>
                    <th className="py-2 font-medium">Most common error</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr
                      key={r.pair}
                      className="border-b last:border-0 align-top"
                    >
                      <td className="py-2 pr-3 font-mono font-semibold uppercase">
                        {r.originalExt} → {r.targetExt}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-semibold text-red-600">
                        {r.failures}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                        {r.attempts}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        <Badge
                          variant={r.failureRate >= 50 ? "destructive" : "secondary"}
                        >
                          {r.failureRate}%
                        </Badge>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {r.topError}
                        {r.topErrorCount < r.failures && (
                          <span className="ml-1 text-xs text-muted-foreground/70">
                            ({r.topErrorCount} of {r.failures})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}