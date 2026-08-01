"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Activity,
  Timer,
  ArrowDown,
  ArrowUp,
  TrendingUp,
  Calendar,
  Database,
  LayoutGrid,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type AdminStats, type FormatsData } from "@/lib/app-types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatBytes } from "@/lib/app-helpers";
import { categoryColors } from "@/lib/app-constants";

export function AdminAnalytics() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [formatsData, setFormatsData] = useState<FormatsData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()).catch(() => null),
      fetch("/api/formats").then((r) => r.json()).catch(() => null),
    ])
      .then(([statsData, fmtData]) => {
        if (statsData && !statsData.error) setStats(statsData as AdminStats);
        setFormatsData(fmtData && !fmtData.error ? fmtData : null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-12 h-12 bg-violet-500 rounded-xl flex items-center justify-center text-white">
          <BarChart3 className="w-6 h-6" />
        </div>
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  const popularPairs = (stats?.popularPairs || []).slice(0, 10).map((p) => [
    p.pair,
    p.count,
  ] as [string, number]);

  const errorCount = stats?.conversionsByStatus?.error || 0;
  const categoryStats = (stats?.conversionsByCategory || [])
    .map((c) => [
      c.category,
      {
        count: c.count,
        inputSize: c.size,
        outputSize: c.outputSize || 0,
        errors: 0,
      },
    ] as const)
    .sort((a, b) => b[1].count - a[1].count);

  const avgDuration = stats?.avgDurationMs || 0;
  const totalInput = (stats?.conversionsByCategory || []).reduce(
    (a, c) => a + (c.size || 0),
    0,
  );
  const totalOutput = stats?.storageUsed || 0;
  const analyzed = stats?.totalConversions || 0;

  const dailyData = (stats?.dailyStats || []).slice(-14).map((d) => {
    const label = new Date(d.date + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    return [label, d.conversions] as [string, number];
  });

  const barColors = [
    "bg-emerald-500",
    "bg-violet-500",
    "bg-amber-500",
    "bg-sky-500",
    "bg-rose-500",
    "bg-teal-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-slate-500",
  ];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total (DB)",
            value: analyzed,
            icon: <Activity className="w-4 h-4" />,
            color: "bg-violet-500",
          },
          {
            label: "Avg Time",
            value: avgDuration ? `${avgDuration}ms` : "—",
            icon: <Timer className="w-4 h-4" />,
            color: "bg-sky-500",
          },
          {
            label: "Input Size",
            value: formatBytes(totalInput),
            icon: <ArrowDown className="w-4 h-4" />,
            color: "bg-amber-500",
          },
          {
            label: "Output Size",
            value: formatBytes(totalOutput),
            icon: <ArrowUp className="w-4 h-4" />,
            color: "bg-emerald-500",
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

      {errorCount > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {errorCount} failed conversions recorded in the database.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Format Pairs */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Top Format Pairs
            </CardTitle>
            <CardDescription className="text-xs">
              Most converted format combinations
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {popularPairs.length > 0 ? (
              <div className="space-y-2.5">
                {popularPairs.map(([pair, count], i) => {
                  const maxCount = popularPairs[0][1];
                  const pct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={pair} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono font-medium truncate max-w-45">
                            {pair}
                          </span>
                          <span className="text-xs font-semibold">{count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColors[i] || "bg-gray-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Conversion Chart */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500" />
              Daily Conversions
            </CardTitle>
            <CardDescription className="text-xs">
              Recent conversion volume
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dailyData.map(([day, count]) => ({ name: day, conversions: count }))} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    height={30}
                    style={{ fontSize: "10px" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={20}
                    style={{ fontSize: "10px" }}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.7 }}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      fontSize: "11px",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar
                    dataKey="conversions"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Table */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-rose-500" />
            Category Analytics
          </CardTitle>
          <CardDescription className="text-xs">
            Detailed breakdown by format category
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {categoryStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Conversions</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">
                    Input Size
                  </TableHead>
                  <TableHead className="text-center hidden sm:table-cell">
                    Output Size
                  </TableHead>
                  <TableHead className="text-center hidden md:table-cell">
                    Errors
                  </TableHead>
                  <TableHead className="text-center">Savings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryStats.map(([cat, data]) => {
                  const savings =
                    data.inputSize > 0
                      ? Math.round(
                          ((data.inputSize - data.outputSize) /
                            data.inputSize) *
                            100,
                        )
                      : 0;
                  return (
                    <TableRow key={cat}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-sm ${categoryColors[cat] || "bg-gray-500"}`}
                          />
                          <span className="text-sm font-medium capitalize">
                            {cat}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm font-semibold">
                        {data.count}
                      </TableCell>
                      <TableCell className="text-center text-sm hidden sm:table-cell">
                        {formatBytes(data.inputSize)}
                      </TableCell>
                      <TableCell className="text-center text-sm hidden sm:table-cell">
                        {formatBytes(data.outputSize)}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {data.errors > 0 ? (
                          <Badge
                            variant="destructive"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {data.errors}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            0
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${savings > 0 ? "border-emerald-300 text-emerald-600" : savings < 0 ? "border-red-300 text-red-600" : ""}`}
                        >
                          {savings > 0
                            ? `-${savings}%`
                            : savings < 0
                              ? `+${Math.abs(savings)}%`
                              : "0%"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No data yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Matrix */}
      {formatsData && (
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-emerald-500" />
              Supported Conversion Matrix
            </CardTitle>
            <CardDescription className="text-xs">
              Interactive grid of format-to-format paths
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <div className="min-w-150">
                <div className="flex items-center gap-1 mb-1 pl-20">
                  {[
                    "PNG",
                    "JPG",
                    "WebP",
                    "AVIF",
                    "PDF",
                    "CSV",
                    "JSON",
                    "SRT",
                    "VTT",
                  ].map((fmt) => (
                    <div
                      key={fmt}
                      className="w-12 text-center text-[9px] font-mono font-bold text-muted-foreground uppercase truncate"
                    >
                      {fmt}
                    </div>
                  ))}
                </div>
                {[
                  { ext: "PNG", cat: "image" },
                  { ext: "JPG", cat: "image" },
                  { ext: "WebP", cat: "image" },
                  { ext: "PDF", cat: "document" },
                  { ext: "JSON", cat: "data" },
                  { ext: "CSV", cat: "data" },
                  { ext: "SRT", cat: "subtitle" },
                  { ext: "MD", cat: "document" },
                  { ext: "HTML", cat: "document" },
                ].map((row) => {
                  const targets = [
                    "png",
                    "jpg",
                    "webp",
                    "avif",
                    "pdf",
                    "csv",
                    "json",
                    "srt",
                    "vtt",
                  ];
                  const rowTargets =
                    Object.values(formatsData.grouped)
                      .flatMap((g) => g.formats)
                      .find((f) => f.ext === row.ext.toLowerCase())
                      ?.targetFormats || [];
                  return (
                    <div
                      key={row.ext}
                      className="flex items-center gap-1 mb-0.5"
                    >
                      <div className="w-18 text-right text-[9px] font-mono font-bold text-muted-foreground uppercase pr-1">
                        {row.ext}
                      </div>
                      {targets.map((t) => {
                        const supported = rowTargets.includes(t);
                        return (
                          <div key={t} className="w-12 flex justify-center">
                            <div
                              className={`w-5 h-5 rounded text-[8px] flex items-center justify-center ${supported ? `${categoryColors[row.cat]} text-white` : "bg-muted text-muted-foreground/30"}`}
                            >
                              {supported ? "✓" : "·"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
