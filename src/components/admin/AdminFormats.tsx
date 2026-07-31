"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  File as FileIcon,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import {  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type FormatStatusData } from "@/lib/app-types";
import { categoryColors, categoryBorderColors } from "@/lib/app-constants";
import { getCategoryIcon } from "@/lib/app-helpers";

export function AdminFormats() {
  const [formatStatus, setFormatStatus] = useState<FormatStatusData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/format-status")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setFormatStatus(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center text-white">
          <Layers className="w-6 h-6" />
        </div>
        <p className="text-sm text-muted-foreground">
          Loading format library...
        </p>
      </div>
    );
  }

  if (!formatStatus) return null;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Format Library</h2>
          <p className="text-sm text-muted-foreground">
            Browse all supported conversion formats
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
          >
            {formatStatus.functionalCategories} Functional
          </Badge>
          <Badge
            variant="secondary"
            className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
          >
            {formatStatus.partialCategories} Partial
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Formats",
            value: formatStatus.totalFormats || 0,
            icon: <FileIcon className="w-4 h-4" />,
            color: "bg-emerald-500",
          },
          {
            label: "Conversion Pairs",
            value: formatStatus.totalPairs?.toLocaleString() || "0",
            icon: <ArrowRightLeft className="w-4 h-4" />,
            color: "bg-violet-500",
          },
          {
            label: "Functional",
            value: formatStatus.functionalCategories || 0,
            icon: <CheckCircle2 className="w-4 h-4" />,
            color: "bg-sky-500",
          },
          {
            label: "Partial",
            value: formatStatus.partialCategories || 0,
            icon: <AlertCircle className="w-4 h-4" />,
            color: "bg-amber-500",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card"
          >
            <div
              className={`w-9 h-9 ${s.color} rounded-lg flex items-center justify-center text-white`}
            >
              {s.icon}
            </div>
            <div>
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(formatStatus.categories || []).map((cat) => (
          <Card
            key={cat.category}
            className={`card-elevated border ${categoryBorderColors[cat.category]}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 ${categoryColors[cat.category]} rounded-xl flex items-center justify-center text-white`}
                  >
                    {getCategoryIcon(cat.category, "w-5 h-5")}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold capitalize">
                      {cat.category}
                    </h3>
                    <p className="text-xs text-muted-foreground">{cat.label}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-2 py-0.5 font-semibold ${
                    cat.status === "functional"
                      ? "border-emerald-300 text-emerald-600 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950"
                      : "border-amber-300 text-amber-600 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950"
                  }`}
                >
                  {cat.status === "functional" ? "✓ Functional" : "◐ Partial"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xl font-bold">{cat.formatCount}</div>
                  <div className="text-[10px] text-muted-foreground">
                    Formats
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xl font-bold">
                    {cat.pairCount?.toLocaleString() || "0"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Conv. Pairs
                  </div>
                </div>
              </div>
              {cat.status === "partial" && (
                <div className="mt-3 flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>
                    {cat.note ||
                      "Some conversions may be limited by host tools or fidelity."}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Functional Status Legend */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            Status Legend
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Functional
                </div>
                <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                  Real conversion using native libraries (sharp, pdf-lib, xlsx,
                  etc.)
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Partial
                </div>
                <div className="text-xs text-amber-600/70 dark:text-amber-400/70">
                  Works for common paths; fidelity limits or host tools
                  (ffmpeg, LibreOffice, RAR) may apply. See category notes.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
