"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  RefreshCw,
  Users,
  HardDrive,
  TrendingUp,
  Zap,
  LayoutGrid,
  History,
  Bookmark,
  ArrowRightLeft,
  PieChart,
  Activity,
  FileCode2,
  Clock,
  ChevronRight,
  MonitorSmartphone,
  Server,
  Database,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type AdminStats, type FormatStatusData } from "@/lib/app-types";
import {
  formatBytes,
  formatDate,
  getCategoryIcon,
  isConversionSuccess,
} from "@/lib/app-helpers";
import { categoryColors, categoryBorderColors } from "@/lib/app-constants";
import { useApp } from "@/lib/app-context";
import { AdminFailedConversions } from "@/components/admin/AdminFailedConversions";

export function AdminOverview() {
  const { setCurrentView: navigate } = useApp();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [formatStatus, setFormatStatus] = useState<FormatStatusData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, formatRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/format-status"),
        ]);

        let statsData = {};
        if (statsRes.ok) {
          statsData = await statsRes.json().catch(() => ({}));
        } else {
          console.error(`Stats API returned ${statsRes.status}`);
        }

        let formatData = {};
        if (formatRes.ok) {
          formatData = await formatRes.json().catch(() => ({}));
        } else {
          console.error(`Format Status API returned ${formatRes.status}`);
        }

        const statsPayload = statsData as AdminStats & { error?: string };
        const formatPayload = formatData as FormatStatusData & { error?: string };
        setStats(statsPayload.error ? null : statsPayload);
        setFormatStatus(formatPayload.error ? null : formatPayload);
      } catch (err) {
        console.error("Failed to load admin dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const totalConversions = stats?.totalConversions || 0;
  const totalUsers = stats?.totalUsers || 0;
  const storageSaved = stats?.storageSaved || 0;
  const completedCount =
    (stats?.conversionsByStatus?.done || 0) +
    (stats?.conversionsByStatus?.completed || 0);
  const successRate =
    totalConversions > 0
      ? Math.round((completedCount / totalConversions) * 100)
      : 0;

  const statCards = [
    {
      label: "Total Conversions",
      value: totalConversions.toLocaleString(),
      icon: <RefreshCw className="w-5 h-5" />,
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Users",
      value: totalUsers.toLocaleString(),
      icon: <Users className="w-5 h-5" />,
      color: "bg-sky-500",
      bgColor: "bg-sky-50 dark:bg-sky-950",
      textColor: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Storage Saved",
      value: formatBytes(storageSaved),
      icon: <HardDrive className="w-5 h-5" />,
      color: "bg-violet-500",
      bgColor: "bg-violet-50 dark:bg-violet-950",
      textColor: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      icon: <TrendingUp className="w-5 h-5" />,
      color: "bg-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950",
      textColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  // Static class mapping for system status to avoid dynamic Tailwind class generation issues
  const statusStyles: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    red: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="card-elevated">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-white`}
                >
                  {s.icon}
                </div>
                <div
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.bgColor} ${s.textColor}`}
                >
                  DB
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {s.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: <LayoutGrid className="w-4 h-4" />,
                label: "View Formats",
                color: "bg-emerald-500",
                action: () => navigate("formats"),
              },
              {
                icon: <History className="w-4 h-4" />,
                label: "View History",
                color: "bg-violet-500",
                action: () => navigate("history"),
              },
              {
                icon: <Bookmark className="w-4 h-4" />,
                label: "Bookmarks",
                color: "bg-amber-500",
                action: () => navigate("bookmarks"),
              },
              {
                icon: <ArrowRightLeft className="w-4 h-4" />,
                label: "Converter",
                color: "bg-sky-500",
                action: () => navigate("converter"),
              },
            ].map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 w-full"
                onClick={action.action}
              >
                <div
                  className={`w-9 h-9 ${action.color} rounded-lg flex items-center justify-center text-white`}
                >
                  {action.icon}
                </div>
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-500" />
              Conversions by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {(stats?.conversionsByCategory || []).length > 0 ? (
                stats!.conversionsByCategory.map((item) => {
                  const maxCount = Math.max(
                    ...(stats?.conversionsByCategory || []).map((c) => c.count),
                    1,
                  );
                  const pct = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2.5 h-2.5 rounded-sm ${categoryColors[item.category] || "bg-gray-500"}`}
                          />
                          <span className="capitalize">{item.category}</span>
                        </div>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${categoryColors[item.category] || "bg-gray-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No conversion data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" />
              Conversion Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {[
                {
                  key: "done",
                  label: "Completed",
                  color: "bg-emerald-500",
                  textColor: "text-emerald-600",
                  bgColor: "bg-emerald-50 dark:bg-emerald-950",
                },
                {
                  key: "error",
                  label: "Failed",
                  color: "bg-red-500",
                  textColor: "text-red-600",
                  bgColor: "bg-red-50 dark:bg-red-950",
                },
                {
                  key: "pending",
                  label: "Pending",
                  color: "bg-amber-500",
                  textColor: "text-amber-600",
                  bgColor: "bg-amber-50 dark:bg-amber-950",
                },
              ].map((s) => {
                const count =
                  s.key === "done"
                    ? (stats?.conversionsByStatus?.done || 0) +
                      (stats?.conversionsByStatus?.completed || 0)
                    : s.key === "error"
                      ? (stats?.conversionsByStatus?.error || 0) +
                        (stats?.conversionsByStatus?.failed || 0)
                      : stats?.conversionsByStatus?.[s.key] || 0;
                const total = totalConversions || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={s.key} className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bgColor}`}
                    >
                      <div className={`w-3 h-3 rounded-full ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{s.label}</span>
                        <span className={`text-sm font-bold ${s.textColor}`}>
                          {count}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Format Library Status */}
      {formatStatus && (
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileCode2 className="w-4 h-4 text-violet-500" />
                  Format Library
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {formatStatus.totalFormats} formats &middot;{" "}
                  {formatStatus.totalPairs?.toLocaleString() || "0"} conversion
                  pairs
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                >
                  {formatStatus.functionalCategories} Functional
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                >
                  {formatStatus.partialCategories} Partial
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(formatStatus.categories || []).map((cat) => (
                <div
                  key={cat.category}
                  className={`p-3 rounded-xl border ${categoryBorderColors[cat.category]} bg-card`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-7 h-7 ${categoryColors[cat.category]} rounded-lg flex items-center justify-center text-white`}
                    >
                      {getCategoryIcon(cat.category, "w-3.5 h-3.5")}
                    </div>
                    <span className="text-xs font-semibold capitalize">
                      {cat.label}
                    </span>
                  </div>
                  <div className="text-lg font-bold">{cat.formatCount}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {cat.pairCount?.toLocaleString() || "0"} pairs
                  </div>
                  <Badge
                    variant="outline"
                    className={`mt-2 text-[9px] px-1.5 py-0 ${
                      cat.status === "functional"
                        ? "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
                        : "border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
                    }`}
                  >
                    {cat.status === "functional" ? "✓ Functional" : "◐ Partial"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed conversions — which formats are actually broken */}
      <AdminFailedConversions />

      {/* Activity Feed */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Recent Activity
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => navigate("history")}
            >
              View All <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {(stats?.recentConversions || []).length > 0 ? (
              (stats?.recentConversions || []).map((c) => {
                const ok = isConversionSuccess(c.status);
                return (
                  <div
                    key={c.id}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${categoryColors[c.category] || "bg-gray-500"}`}
                    >
                      {getCategoryIcon(c.category, "w-3.5 h-3.5")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {c.fileName}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">
                        {c.originalExt} → {c.targetExt}
                      </div>
                      {!ok ? (
                        <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 leading-snug">
                          {c.error || "Conversion failed"}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-0.5 pt-0.5">
                      <Badge
                        variant={ok ? "default" : "destructive"}
                        className={
                          ok
                            ? "bg-emerald-500 text-[9px] px-1.5 py-0 h-5 min-w-5 justify-center"
                            : "text-[9px] px-1.5 py-0 h-5 min-w-5 justify-center"
                        }
                      >
                        {ok ? "✓" : "✗"}
                      </Badge>
                      <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <History className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No activity recorded yet
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4 text-emerald-500" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: <Server className="w-3.5 h-3.5" />,
                label: "API Server",
                value: stats?.system?.apiOnline !== false ? "Online" : "Down",
                status:
                  stats?.system?.apiOnline !== false ? "emerald" : "red",
              },
              {
                icon: <Database className="w-3.5 h-3.5" />,
                label: "Database",
                value: stats?.system?.databaseConnected
                  ? "Connected"
                  : "Unavailable",
                status: stats?.system?.databaseConnected ? "emerald" : "red",
              },
              {
                icon: <Shield className="w-3.5 h-3.5" />,
                label: "Security",
                value: "Active",
                status: "emerald",
              },
              {
                icon: <Clock className="w-3.5 h-3.5" />,
                label: "Process uptime",
                value: stats?.system?.processUptimeSec
                  ? `${Math.floor(stats.system.processUptimeSec / 3600)}h ${Math.floor((stats.system.processUptimeSec % 3600) / 60)}m`
                  : "—",
                status: "emerald",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusStyles[item.status] || ""}`}
                >
                  {item.icon}
                </div>
                <div>
                  <div className="text-xs font-semibold">{item.value}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {item.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}