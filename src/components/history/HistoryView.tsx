"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Download,
  Trash2,
  Clock,
  Search,
  AlertCircle,
  HardDrive,
  FileX,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import {
  formatBytes,
  formatDate,
  getCategoryIcon,
  isConversionSuccess,
} from "@/lib/app-helpers";
import {
  getLocalHistory,
  getLocalStats,
  deleteLocalConversion,
  deleteFileOnlyLocally,
  getFileLocally,
  type LocalHistoryEntry,
} from "@/lib/storage";
import { Input } from "@/components/ui/input";

export function HistoryView() {
  const { currentUser } = useApp();
  const [conversions, setConversions] = useState<LocalHistoryEntry[]>([]);
  const [stats, setStats] = useState<Awaited<
    ReturnType<typeof getLocalStats>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const accountKey = currentUser?.id ?? null;
      const [records, localStats] = await Promise.all([
        getLocalHistory(200, accountKey),
        getLocalStats(accountKey),
      ]);
      setConversions(records);
      setStats(localStats);
    } catch (err) {
      console.error("Failed to load local history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleDownload = async (record: LocalHistoryEntry) => {
    const accountKey = currentUser?.id ?? null;
    const stored = await getFileLocally(record.id, accountKey);
    if (!stored) {
      alert("File is no longer in your browser storage. Convert again to keep a copy.");
      return;
    }

    const url = URL.createObjectURL(stored.data);
    const a = document.createElement("a");
    a.href = url;
    const baseName = record.fileName.replace(/\.[^/.]+$/, "");
    a.download = `${baseName}.${record.targetExt || "bin"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteRecord = async (id: string) => {
    if (
      !confirm(
        "Delete this conversion from your browser? The file and history entry will be removed permanently from this device.",
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const accountKey = currentUser?.id ?? null;
      await deleteLocalConversion(id, accountKey);
      setConversions((prev) => prev.filter((c) => c.id !== id));
      setStats(await getLocalStats(accountKey));
    } catch (err) {
      console.error("Failed to delete conversion:", err);
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRemoveFileOnly = async (id: string) => {
    if (
      !confirm(
        "Remove only the stored file to free space? History entry will remain.",
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const accountKey = currentUser?.id ?? null;
      await deleteFileOnlyLocally(id, accountKey);
      setConversions((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, hasFile: false, data: undefined } : c,
        ),
      );
      setStats(await getLocalStats(accountKey));
    } catch (err) {
      console.error("Failed to remove file:", err);
      alert(err instanceof Error ? err.message : "Failed to remove file");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredConversions = conversions.filter(
    (c) =>
      c.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.originalExt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.targetExt.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="w-8 h-8 text-emerald-500" />
            Conversion History
          </h1>
          <p className="text-muted-foreground">
            Stored only on this device
            {stats ? (
              <>
                {" "}
                · {stats.total} entries · {stats.withFiles} files kept ·{" "}
                {formatBytes(stats.totalOutputSize)}
              </>
            ) : null}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversions..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10 mb-6">
        <CardContent className="p-4 flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-800 dark:text-emerald-300">
            <strong>Local database:</strong> Your conversion history and
            converted files stay in this browser (IndexedDB). Keep them or
            delete anytime. Clearing browser data removes them. Signup does not
            upload your files — the server may keep anonymized usage stats only.
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-24 bg-muted rounded-lg" />
            </Card>
          ))}
        </div>
      ) : filteredConversions.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No conversions yet</h3>
          <p className="text-muted-foreground">
            Convert a file and it will appear here on this device.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredConversions.map((record) => {
            const ok = isConversionSuccess(record.status);
            return (
              <Card
                key={record.id}
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        ok
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                          : "bg-red-100 dark:bg-red-900/30 text-red-600"
                      }`}
                    >
                      {getCategoryIcon(record.category || "other", "w-6 h-6")}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold truncate">
                          {record.fileName}
                        </h4>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {record.originalExt} &rarr; {record.targetExt}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(record.createdAt)}
                        </span>
                        <span>
                          {formatBytes(record.inputSize)} &rarr;{" "}
                          {formatBytes(record.outputSize)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {ok ? (
                        record.hasFile ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleDownload(record)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              disabled={deletingId === record.id}
                              onClick={() => handleRemoveFileOnly(record.id)}
                              title="Free space — keep history"
                            >
                              <FileX className="w-4 h-4 mr-1" />
                              Remove file
                            </Button>
                          </>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-700 border-amber-200"
                          >
                            <AlertCircle className="w-3 h-3 mr-1" />
                            File removed
                          </Badge>
                        )
                      ) : (
                        <Badge variant="destructive">Failed</Badge>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={deletingId === record.id}
                        onClick={() => handleDeleteRecord(record.id)}
                        title="Delete history + file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
