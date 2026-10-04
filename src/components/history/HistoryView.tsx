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
  Lock,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { brandedDownloadFilename } from "@/lib/download-brand";
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
  const { currentUser, openAuth } = useApp();
  const [conversions, setConversions] = useState<LocalHistoryEntry[]>([]);
  const [stats, setStats] = useState<Awaited<
    ReturnType<typeof getLocalStats>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!currentUser?.id) {
      setConversions([]);
      setStats(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const accountKey = currentUser.id;
      const [records, localStats] = await Promise.all([
        getLocalHistory(200, accountKey),
        getLocalStats(accountKey),
      ]);
      setConversions(records);
      setStats(localStats);
    } catch (err) {
      console.error("Failed to load local history:", err);
      setConversions([]);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleDownload = async (record: LocalHistoryEntry) => {
    if (!currentUser?.id) return;
    const stored = await getFileLocally(record.id, currentUser.id);
    if (!stored) {
      alert("File is no longer in your browser storage. Convert again to keep a copy.");
      return;
    }

    const url = URL.createObjectURL(stored.data);
    const a = document.createElement("a");
    a.href = url;
    const baseName = record.fileName.replace(/\.[^/.]+$/, "");
    a.download = brandedDownloadFilename(
      baseName,
      record.targetExt || "bin",
    );
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!currentUser?.id) return;
    if (
      !confirm(
        "Delete this conversion from your browser? The file and history entry will be removed permanently from this device.",
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const accountKey = currentUser.id;
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
    if (!currentUser?.id) return;
    if (
      !confirm(
        "Remove only the stored file to free space? History entry will remain.",
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const accountKey = currentUser.id;
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
            {currentUser
              ? (
                <>
                  Stored on this device for your account
                  {stats ? (
                    <>
                      {" "}
                      · {stats.total} entries · {stats.withFiles} files kept ·{" "}
                      {formatBytes(stats.totalOutputSize)}
                    </>
                  ) : null}
                </>
              )
              : "Sign in to save and view conversion history"}
          </p>
        </div>
        {currentUser ? (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversions..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      {currentUser ? (
        <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10 mb-6">
          <CardContent className="p-4 flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              <strong>Account history:</strong> Conversions and files are kept
              in this browser for your signed-in account only. Other accounts on
              this device cannot see them. Clearing browser data removes them.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!currentUser ? (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-border flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Lock className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold">Account Required</h3>
          <p className="text-muted-foreground max-w-sm">
            Sign in to save history and download previous conversions. Guest
            converts still work with live status in the converter — nothing is
            stored without an account.
          </p>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-emerald-500/20"
            onClick={() => openAuth("login")}
          >
            Sign in / Sign up
          </Button>
        </div>
      ) : isLoading ? (
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
            Convert a file while signed in and it will appear here on this device.
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
                        {ok ? (
                          <Badge className="bg-emerald-500 text-[10px]">
                            Done
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            Error
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(record.createdAt)}
                        </span>
                        <span>
                          {formatBytes(record.inputSize)} →{" "}
                          {formatBytes(record.outputSize)}
                        </span>
                        {record.hasFile ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            File in browser
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            File removed
                          </span>
                        )}
                      </div>
                      {!ok ? (
                        <div className="mt-1.5 space-y-0.5">
                          <p className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>{record.error || "Conversion failed"}</span>
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {ok && record.hasFile ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDownload(record)}
                          title="Download from browser storage"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      ) : null}
                      {ok && record.hasFile ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deletingId === record.id}
                          onClick={() => void handleRemoveFileOnly(record.id)}
                          title="Free space — keep history"
                        >
                          <FileX className="w-4 h-4" />
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        disabled={deletingId === record.id}
                        onClick={() => void handleDeleteRecord(record.id)}
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
