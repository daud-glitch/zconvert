"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Download, Trash2, Search, Filter, BarChart3, HardDrive, Zap, History, RefreshCw, ArrowRightLeft, RotateCcw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type ViewType, categoryMeta } from "@/lib/formats";
import { type ConversionRecord } from "@/lib/app-types";
import { formatBytes, formatDate, getCategoryFromExt } from "@/lib/app-helpers";
import { categoryColors } from "@/lib/app-constants";
import { Breadcrumb } from "@/components/common/Breadcrumb";

export function HistoryView({ navigate }: { navigate: (view: ViewType) => void }) {
  const [conversions, setConversions] = useState<ConversionRecord[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    totalConvertedSize: number;
    popularConversion: string;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadHistory = useCallback(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });
    if (filterCategory !== "all") params.set("category", filterCategory);
    if (filterStatus !== "all") params.set("status", filterStatus);
    fetch(`/api/conversions?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setConversions(data.data || []);
        setStats(data.stats || null);
        setTotalPages(data.pagination?.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filterCategory, filterStatus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    loadHistory();
  }, [loadHistory]);

  const copyFilename = async (id: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(fileName);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // fallback: ignore clipboard errors
    }
  };

  const deleteConversion = async (id: string) => {
    await fetch(`/api/conversions/${id}`, { method: "DELETE" });
    loadHistory();
  };

  const clearHistory = async () => {
    for (const c of conversions) {
      await fetch(`/api/conversions/${c.id}`, { method: "DELETE" });
    }
    loadHistory();
  };

  const exportHistoryCSV = () => {
    const headers = [
      "File",
      "From",
      "To",
      "Category",
      "Size",
      "Output Size",
      "Status",
      "Duration",
      "Date",
    ];
    const rows = conversions.map((c) => [
      c.fileName,
      c.originalExt,
      c.targetExt,
      c.category,
      c.inputSize,
      c.outputSize,
      c.status,
      c.duration || 0,
      c.createdAt,
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transmute-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Home", view: "converter" },
          { label: "Conversion History" },
        ]}
        navigate={navigate}
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Conversion History
          </h1>
          <p className="text-muted-foreground mt-1">
            {stats?.total || 0} total conversions
          </p>
        </div>
        {conversions.length > 0 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportHistoryCSV}>
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={clearHistory}>
              <Trash2 className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Total Conversions",
              value: stats.total,
              color: "bg-foreground text-background",
              icon: <BarChart3 className="w-5 h-5" />,
            },
            {
              label: "Total Converted Size",
              value: formatBytes(stats.totalConvertedSize),
              color: "bg-emerald-500 text-white",
              icon: <HardDrive className="w-5 h-5" />,
            },
            {
              label: "Popular Conversion",
              value: stats.popularConversion,
              color: "bg-violet-500 text-white",
              icon: <Zap className="w-5 h-5" />,
            },
          ].map((s) => (
            <Card
              key={s.label}
              className="stat-card border border-border shadow-sm"
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{s.value}</div>
                    <div className="text-sm text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative max-w-xs flex-1 min-w-45">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename..."
            className="pl-10 h-9"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
          />
        </div>
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select
          value={filterCategory}
          onValueChange={(v) => {
            setFilterCategory(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryMeta).map(([key, meta]) => (
              <SelectItem key={key} value={key}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterStatus}
          onValueChange={(v) => {
            setFilterStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Loading history...
              </p>
            </div>
          ) : conversions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">No conversions yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Start converting files to see your conversion history here. Head
                to the converter to get started.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("converter")}
              >
                <ArrowRightLeft className="w-4 h-4 mr-1" />
                Go to Converter
              </Button>
            </div>
          ) : (
            <Table className="table-stripe">
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Conversion</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Category
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversions
                  .filter(
                    (c) =>
                      !historySearch ||
                      c.fileName
                        .toLowerCase()
                        .includes(historySearch.toLowerCase()),
                  )
                  .map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm truncate max-w-50">
                        {c.fileName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="font-mono uppercase">
                            {c.originalExt}
                          </span>
                          <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                          <span className="font-mono uppercase">
                            {c.targetExt}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              categoryColors[c.category] || "bg-gray-500"
                            }`}
                          />
                          <span className="text-xs capitalize">
                            {c.category}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {formatBytes(c.inputSize)}
                        {c.outputSize > 0 &&
                          ` \u2192 ${formatBytes(c.outputSize)}`}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            c.status === "completed"
                              ? "default"
                              : c.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                          className={
                            c.status === "completed"
                              ? "bg-emerald-500 hover:bg-emerald-600"
                              : ""
                          }
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteConversion(c.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 relative"
                          onClick={() => copyFilename(c.id, c.fileName)}
                          title="Copy filename"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          {copiedId === c.id && (
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                              Copied!
                            </span>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {c.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              navigate("converter");
                            }}
                            title={`Re-convert ${c.fileName}`}
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
