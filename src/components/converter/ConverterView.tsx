"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, Download, FileText, Image as ImageIcon, Music, Database, Archive,
  BookOpen, Subtitles, Type, FileQuestion, Presentation, RefreshCw, Trash2,
  Plus, Star, Settings, BarChart3, History, Bookmark, Layers, X, Check,
  AlertCircle, Search, Copy, File, Globe, Shield, Zap, Clock, HardDrive,
  TrendingUp, DownloadCloud, Eye, BookmarkPlus, ArrowRightLeft, List, Filter,
  Home, ArrowRight, CheckCircle2, XCircle, Server, Code, Terminal, FolderOpen,
  FileImage, FileVideo, FileAudio, Timer, RotateCcw, Keyboard, Github,
  Twitter, Sparkles, ArrowDown, Package, Info, ArrowUp, GripVertical, Share2,
  Maximize, Activity, LayoutDashboard, PieChart, AlertTriangle, ChevronDown,
  ChevronUp, Calendar, Circle, Lock, Key, FileCode2, FolderCog, ArrowUpDown,
  MonitorSmartphone, Folder, Link as LinkIcon, Edit, Megaphone, LogOut, LogIn,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type ViewType } from "@/lib/formats";
import { type FileItem, type ConversionRecord, type BookmarkRecord, type FormatsData } from "@/lib/app-types";
import {
  qualityPresets, SUPPORTED_EXTENSIONS, categoryColors, categoryTextColors,
  categoryBorderColors, categoryLightBg, formatBadgeData,
} from "@/lib/app-constants";
import { formatBytes, formatDate, getCategoryFromExt, getCategoryIcon } from "@/lib/app-helpers";
import { FileThumbnail } from "@/components/common/FileThumbnail";
import JSZip from "jszip";

export function ConverterView({ navigate }: { navigate: (view: ViewType) => void }) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [formatsData, setFormatsData] = useState<FormatsData | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [targetFormatsMap, setTargetFormatsMap] = useState<
    Record<string, string[]>
  >({});
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: "success" | "error" }[]
  >([]);
  const [recentConversions, setRecentConversions] = useState<
    ConversionRecord[]
  >([]);
  const [activityLog, setActivityLog] = useState<
    {
      action: string;
      timestamp: string;
      detail?: string;
    }[]
  >([]);
  const [conversionStatsSummary, setConversionStatsSummary] = useState<{
    topPair: string;
    topPairCount: number;
    avgReduction: string;
    todayCount: number;
    totalCount: number;
    totalInputSize: number;
    totalOutputSize: number;
    successRate: number;
    uniqueFormats: number;
  } | null>(null);
  const [sessionConverted, setSessionConverted] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showResize, setShowResize] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [checkFrom, setCheckFrom] = useState("");
  const [checkTo, setCheckTo] = useState("");
  const [formatCheckResult, setFormatCheckResult] = useState<boolean | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500,
    );
  };

  // Check if a file extension is supported
  const isExtensionSupported = (ext: string): boolean => {
    return ext in targetFormatsMap && targetFormatsMap[ext].length > 0;
  };

  useEffect(() => {
    fetch("/api/formats")
      .then((r) => r.json())
      .then((data) => {
        setFormatsData(data);
        const map: Record<string, string[]> = {};
        for (const group of Object.values(data.grouped) as any[]) {
          for (const fmt of group.formats) {
            map[fmt.ext] = fmt.targetFormats;
          }
        }
        setTargetFormatsMap(map);
      })
      .catch(() => {});

    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then((data) => setBookmarks(data.data || []))
      .catch(() => {});

    fetch("/api/conversions?limit=5")
      .then((r) => r.json())
      .then((d) => setRecentConversions(d.data || []))
      .catch(() => {});

    // Fetch conversion stats summary
    fetch("/api/conversions?limit=200")
      .then((r) => r.json())
      .then((d) => {
        const records: ConversionRecord[] = d.data || [];
        if (records.length === 0) {
          setConversionStatsSummary({
            topPair: "N/A",
            topPairCount: 0,
            avgReduction: "0%",
            todayCount: 0,
            totalCount: 0,
            totalInputSize: 0,
            totalOutputSize: 0,
            successRate: 0,
            uniqueFormats: 0,
          });
          return;
        }

        // Most popular conversion pair
        const pairMap: Record<string, number> = {};
        records.forEach((r) => {
          const pair = `${r.originalExt.toUpperCase()} → ${r.targetExt.toUpperCase()}`;
          pairMap[pair] = (pairMap[pair] || 0) + 1;
        });
        const sortedPairs = Object.entries(pairMap).sort((a, b) => b[1] - a[1]);
        const topPair = sortedPairs[0]?.[0] || "N/A";
        const topPairCount = sortedPairs[0]?.[1] || 0;

        // Average size reduction (completed only)
        const completed = records.filter((r) => r.status === "completed");
        const reductions: number[] = [];
        completed.forEach((r) => {
          if (r.inputSize > 0 && r.outputSize > 0) {
            reductions.push(((r.inputSize - r.outputSize) / r.inputSize) * 100);
          }
        });
        const avgReduction =
          reductions.length > 0
            ? `${Math.round(reductions.reduce((a, b) => a + b, 0) / reductions.length)}%`
            : "0%";

        // Conversions today
        const today = new Date().toDateString();
        const todayCount = records.filter(
          (r) => new Date(r.createdAt).toDateString() === today,
        ).length;

        // Totals
        const totalCount = records.length;
        const totalInputSize = records.reduce((s, r) => s + (r.inputSize || 0), 0);
        const totalOutputSize = records.reduce((s, r) => s + (r.outputSize || 0), 0);
        const successRate = totalCount > 0 ? Math.round((completed.length / totalCount) * 100) : 0;

        // Unique formats
        const fmtSet = new Set<string>();
        records.forEach((r) => { fmtSet.add(r.originalExt); fmtSet.add(r.targetExt); });
        const uniqueFormats = fmtSet.size;

        setConversionStatsSummary({
          topPair, topPairCount, avgReduction, todayCount,
          totalCount, totalInputSize, totalOutputSize, successRate, uniqueFormats,
        });
      })
      .catch(() => {});
  }, []);

  const fetchRemoteFile = async (url: string) => {
    try {
      showToast("Fetching remote file...");
      const response = await fetch(
        `/api/fetch-url?url=${encodeURIComponent(url)}`,
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const blob = await response.blob();
      const fileName = url.split("/").pop()?.split("?")[0] || "remote-file";
      const file = new (window as any).File([blob], fileName, {
        type: blob.type,
      });
      addFiles([file]);
      showToast("Remote file added!");
      setUrlInput("");
    } catch {
      showToast("Failed to fetch remote file", "error");
    }
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    setFiles((prev) => {
      const spaceLeft = 20 - prev.length;
      if (spaceLeft <= 0) {
        showToast("Maximum queue limit reached (20 files).", "error");
        return prev;
      }

      if (fileArray.length > spaceLeft) {
        showToast(
          `Maximum 20 files allowed. Only ${spaceLeft} file(s) will be added.`,
          "error",
        );
      }

      const supported: FileItem[] = [];
      const unsupported: string[] = [];

      fileArray.forEach((file) => {
        if (supported.length >= spaceLeft) return;

        const name = file.name;
        const dotIdx = name.lastIndexOf(".");
        const ext = dotIdx >= 0 ? name.slice(dotIdx + 1).toLowerCase() : "";
        const targets = targetFormatsMap[ext] || [];

        // Check if file is already in queue
        const isDuplicate =
          prev.some((p) => p.name === name && p.size === file.size) ||
          supported.some((p) => p.name === name && p.size === file.size);
        if (isDuplicate) return;

        if (ext && targets.length > 0) {
          supported.push({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            file,
            name,
            size: file.size,
            ext,
            status: "pending" as const,
            targetFormat: targets[0] || "",
            quality: 85,
            resizeWidth: null,
            resizeHeight: null,
            startTime: undefined,
            endTime: undefined,
            outputSize: undefined,
          });
        } else {
          unsupported.push(ext ? `.${ext}` : name);
        }
      });

      if (unsupported.length > 0) {
        showToast(
          `Unsupported format${unsupported.length > 1 ? "s" : ""}: ${unsupported.slice(0, 5).join(", ")}${unsupported.length > 5 ? ` +${unsupported.length - 5} more` : ""}`,
          "error",
        );
      }

      return [...prev, ...supported];
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const applyPresetToAll = (quality: number) => {
    setFiles((prev) =>
      prev.map((f) =>
        getCategoryFromExt(f.ext) === "image" && f.status === "pending"
          ? { ...f, quality }
          : f,
      ),
    );
    showToast(`Applied ${quality}% quality to all image files`);
  };

  const resizeAll = (w: number | null, h: number | null) => {
    setFiles((prev) =>
      prev.map((f) =>
        getCategoryFromExt(f.ext) === "image" && f.status === "pending"
          ? { ...f, resizeWidth: w, resizeHeight: h }
          : f,
      ),
    );
    showToast(
      `Applied resize ${w ? w + "px" : "auto"}×${h ? h + "px" : "auto"} to all`,
    );
  };

  const updateFile = (id: string, updates: Partial<FileItem>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  };

  const duplicateFile = (item: FileItem) => {
    const newItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      status: "pending" as const,
      startTime: undefined,
      endTime: undefined,
      result: undefined,
      outputSize: undefined,
    };
    const itemIndex = files.findIndex((f) => f.id === item.id);
    const newFiles = [...files];
    newFiles.splice(itemIndex + 1, 0, newItem);
    setFiles(newFiles);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const convertFile = async (item: FileItem, isRetry = false) => {
    if (!item.targetFormat) {
      showToast(`Please select a target format for ${item.name}`, "error");
      return;
    }

    updateFile(item.id, {
      status: "converting",
      startTime: Date.now(),
      endTime: undefined,
      result: undefined,
      outputSize: undefined,
    });

    try {
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("targetFormat", item.targetFormat);
      formData.append("quality", String(item.quality));
      if (item.resizeWidth) formData.append("width", String(item.resizeWidth));
      if (item.resizeHeight)
        formData.append("height", String(item.resizeHeight));

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Conversion failed (${response.status})`,
        );
      }

      const blob = await response.blob();
      updateFile(item.id, {
        status: "done",
        result: blob,
        endTime: Date.now(),
        outputSize: blob.size,
      });
      setSessionConverted((c) => c + 1);
      setActivityLog((prev) =>
        [
          {
            action: "Convert",
            timestamp: new Date().toISOString(),
            detail: `${item.name} → ${item.targetFormat}`,
          },
          ...prev,
        ].slice(0, 50),
      );
      showToast(`${item.name} converted successfully!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Conversion failed";
      updateFile(item.id, {
        status: "error",
        error: message,
        endTime: Date.now(),
      });
      showToast(message, "error");
    }
  };

  const convertAll = async () => {
    const pendingFiles = files.filter(
      (f) => f.status === "pending" && f.targetFormat,
    );
    if (pendingFiles.length === 0) return;
    setBatchProgress({ current: 0, total: pendingFiles.length });
    for (let i = 0; i < pendingFiles.length; i++) {
      await convertFile(pendingFiles[i]);
      setBatchProgress((prev) =>
        prev ? { ...prev, current: prev.current + 1 } : null,
      );
    }
    setBatchProgress(null);
  };

  const checkFormatCompatibility = () => {
    if (!checkFrom.trim() || !checkTo.trim() || !formatsData) return;
    const targets = targetFormatsMap[checkFrom.trim()];
    setFormatCheckResult(targets ? targets.includes(checkTo.trim()) : false);
  };

  const downloadFile = (item: FileItem) => {
    if (!item.result) return;
    const baseName = item.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(item.result);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${baseName}.${item.targetFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    files.filter((f) => f.status === "done").forEach(downloadFile);
  };

  const saveBookmark = async (item: FileItem) => {
    if (!item.targetFormat) return;
    try {
      await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${item.ext.toUpperCase()} \u2192 ${item.targetFormat.toUpperCase()}`,
          inputExt: item.ext,
          outputExt: item.targetFormat,
          category: formatsData?.grouped
            ? Object.entries(formatsData.grouped).find(([, g]) =>
                g.formats.some((f) => f.ext === item.targetFormat),
              )?.[0] || "other"
            : "other",
        }),
      });
      const res = await fetch("/api/bookmarks");
      const data = await res.json();
      setBookmarks(data.data || []);
      showToast("Bookmark saved!");
    } catch {
      showToast("Failed to save bookmark", "error");
    }
  };

  const applyBookmark = (bookmark: BookmarkRecord) => {
    if (files.length > 0) {
      const firstPending = files.find(
        (f) => f.ext === bookmark.inputExt && f.status === "pending",
      );
      if (firstPending) {
        updateFile(firstPending.id, {
          targetFormat: bookmark.outputExt,
        });
        showToast(`Applied: ${bookmark.name}`);
      } else {
        showToast(
          `No ${bookmark.inputExt.toUpperCase()} file in queue`,
          "error",
        );
      }
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  const catCount = formatsData ? Object.keys(formatsData.grouped).length : 0;

  return (
    <div className="space-y-8">
      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div className="toast-stack fixed top-20 right-4 z-50 space-y-2">
          {toasts.slice(0, 5).map((t) => (
            <div
              key={t.id}
              className={`toast-stack-item flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
                t.type === "success" ? "bg-emerald-600" : "bg-red-600"
              }`}
            >
              {t.type === "success" ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* ─── Hero Section ─── */}
      <section className="text-center py-8 sm:py-12">
        <div className="hero-gradient relative">
          <div className="relative z-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight text-shadow-brand">
              Convert Any File,{" "}
              <span className="gradient-text">Any Format</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2 leading-relaxed">
              Transform images, documents, data files, audio, and more.
              Drop a file, pick your target format, and get results instantly.
            </p>
            <p className="text-xs text-muted-foreground mb-6 flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              Fast server-side conversion &bull; Free forever &bull; Files
              auto-deleted after 30 mins &bull; 100% Private, no 3rd-party
              sharing
            </p>
            {/* Category Icon Row — 7 categories */}
            <div className="flex items-center justify-center gap-3 sm:gap-5 mb-8 flex-wrap">
              {[
                { cat: "image", label: "Image" },
                { cat: "audio", label: "Audio" },
                { cat: "document", label: "Document" },
                { cat: "data", label: "Data" },
                { cat: "archive", label: "Archive" },
                { cat: "ebook", label: "Ebook" },
                { cat: "subtitle", label: "Subtitle" },
              ].map(({ cat, label }) => (
                <div key={cat} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-9 h-9 ${categoryColors[cat]} rounded-full flex items-center justify-center text-white`}
                  >
                    {getCategoryIcon(cat, "w-4 h-4")}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
            {/* Stat Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {[
                {
                  label: `${formatsData ? formatsData.totalFormats : "40"}+ Formats`,
                  color: "bg-emerald-500",
                },
                {
                  label: `${formatsData ? formatsData.totalConversions : "200"}+ Conversions`,
                  color: "bg-violet-500",
                },
                {
                  label: `${catCount || "10"} Categories`,
                  color: "bg-amber-500",
                },
                {
                  label: "100% Free",
                  color: "bg-sky-500",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`${stat.color} text-white rounded-lg px-4 py-2 text-sm font-bold`}
                >
                  {stat.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Separator />

            {/* ─── Conversion Activity Stats ─── */}
      {conversionStatsSummary && (
        <Card className="card-accent-emerald">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Conversion Activity</h3>
                  <p className="text-xs text-muted-foreground">All-time stats from your history</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 rounded-full border border-emerald-200 dark:border-emerald-800">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Live</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                <div className="w-9 h-9 bg-sky-100 dark:bg-sky-900/40 rounded-lg flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground leading-tight">Total Conversions</div>
                  <div className="text-lg font-bold tabular-nums">{conversionStatsSummary.totalCount.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                <div className="w-9 h-9 bg-violet-100 dark:bg-violet-900/40 rounded-lg flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground leading-tight">Size Processed</div>
                  <div className="text-lg font-bold tabular-nums">{formatBytes(conversionStatsSummary.totalInputSize)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                <div className="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center shrink-0">
                  <ArrowDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground leading-tight">Space Saved</div>
                  <div className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {conversionStatsSummary.totalInputSize > conversionStatsSummary.totalOutputSize
                      ? formatBytes(conversionStatsSummary.totalInputSize - conversionStatsSummary.totalOutputSize)
                      : "0 B"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                <div className="w-9 h-9 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground leading-tight">Most Popular Pair</div>
                  <div className="text-sm font-bold font-mono truncate">{conversionStatsSummary.topPair}</div>
                  {conversionStatsSummary.topPairCount > 0 && (
                    <div className="text-[10px] text-muted-foreground">{conversionStatsSummary.topPairCount}x used</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                <div className="w-9 h-9 bg-pink-100 dark:bg-pink-900/40 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground leading-tight">Avg. Reduction</div>
                  <div className="text-lg font-bold tabular-nums text-pink-600 dark:text-pink-400">{conversionStatsSummary.avgReduction}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground leading-tight">Converted Today</div>
                  <div className="text-lg font-bold tabular-nums">{conversionStatsSummary.todayCount}</div>
                  <div className="text-[10px] text-muted-foreground">{conversionStatsSummary.successRate}% success rate</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
            {/* ─── Upload Zone ─── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div
            className={`upload-zone-enhanced border-l-4 border-l-emerald-500 p-8 sm:p-12 text-center cursor-pointer relative ${
              dragOver ? "drag-active" : ""
            } ${!dragOver ? "dot-pattern" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={SUPPORTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="relative z-10">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-5 hover-scale">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                Drop files here or click to upload
              </h3>
              <p className="text-sm text-muted-foreground mb-1">
                Only supported file formats are shown in the file picker
              </p>
              <p className="text-xs text-muted-foreground mb-5 flex items-center justify-center gap-1.5">
                <FolderOpen className="w-3 h-3" /> Browse supported files
                &middot; Max 50MB per file
              </p>
              {/* Vibrant Category-Colored Format Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
                {formatBadgeData.map((fmt) => (
                  <Badge
                    key={fmt.label}
                    className={`${
                      categoryColors[fmt.category] || "bg-gray-500"
                    } text-white border-0 text-xs font-semibold px-2.5 py-0.5`}
                  >
                    {fmt.label}
                  </Badge>
                ))}
                <Badge className="bg-gray-500 text-white border-0 text-xs font-semibold px-2.5 py-0.5">
                  +{formatsData ? formatsData.totalFormats - 9 : "40"} more
                </Badge>
              </div>
              {/* Category Quick Filter Buttons */}
              <div
                className="flex items-center justify-center gap-2 mt-6"
                onClick={(e) => e.stopPropagation()}
              >
                {[
                  { cat: "image", label: "Image" },
                  { cat: "audio", label: "Audio" },
                  { cat: "document", label: "Document" },
                  { cat: "data", label: "Data" },
                  { cat: "subtitle", label: "Subtitle" },
                ].map(({ cat, label }) => (
                  <button
                    key={cat}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                      categoryBorderColors[cat] || "border-gray-500"
                    } ${categoryLightBg[cat] || "bg-gray-50"} ${
                      categoryTextColors[cat] || "text-gray-600"
                    }`}
                  >
                    {getCategoryIcon(cat, "w-3 h-3")}
                    {label}
                  </button>
                ))}
              </div>

              {/* URL Fetch Input within Upload Zone */}
              <div
                className="mt-8 max-w-md mx-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 mb-2 justify-center">
                  <Globe className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Or fetch from URL</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/image.png"
                    className="flex-1 h-10 text-sm bg-background/80 backdrop-blur-sm focus-visible:ring-amber-500"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && urlInput.trim()) {
                        fetchRemoteFile(urlInput.trim());
                      }
                    }}
                  />
                  <Button
                    variant="default"
                    className="h-10 px-6 bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                    onClick={() => {
                      if (urlInput.trim()) fetchRemoteFile(urlInput.trim());
                    }}
                    disabled={!urlInput.trim()}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Fetch
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Bookmarks Quick Apply ─── */}
      {bookmarks.length > 0 && (
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-500" />
              Quick Presets
              <Badge variant="secondary" className="ml-auto text-xs">
                {bookmarks.length} saved
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {bookmarks.slice(0, 8).map((bm) => (
                <Button
                  key={bm.id}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => applyBookmark(bm)}
                >
                  <ArrowRightLeft className="w-3 h-3 mr-1" />
                  {bm.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── File Queue ─── */}
      {batchProgress && batchProgress.total > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-sky-700 dark:text-sky-300 font-medium">
                Converting batch...
              </span>
              <span className="text-sky-600 dark:text-sky-400 font-mono">
                {batchProgress.current} / {batchProgress.total}
              </span>
            </div>
            <div className="h-2 bg-sky-100 dark:bg-sky-900/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full"
                style={{
                  width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="progress-dashed w-16" />
        </div>
      )}

      {/* ─── Conversion Quality Presets ─── */}
      {files.some(
        (f) => getCategoryFromExt(f.ext) === "image" && f.status === "pending",
      ) && (
        <Card className="card-accent-violet">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">Quality Presets</h3>
              <Badge variant="secondary" className="ml-auto text-xs">
                One-click apply
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {qualityPresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPresetToAll(preset.quality)}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-left transition-colors"
                >
                  <div
                    className={`w-7 h-7 ${preset.color} rounded-md flex items-center justify-center text-white shrink-0`}
                  >
                    {preset.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {preset.label}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {preset.quality}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Image Resize Options ─── */}
      {files.some(
        (f) => getCategoryFromExt(f.ext) === "image" && f.status === "pending",
      ) && (
        <Card className="card-accent-sky">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white">
                <Maximize className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm">Image Resize Options</h3>
              <Switch
                checked={showResize}
                onCheckedChange={setShowResize}
                className="ml-auto"
              />
            </div>
            {showResize && (
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">W</Label>
                  <Input
                    type="number"
                    placeholder="Auto"
                    className="w-24 h-8 text-xs"
                    onChange={(e) =>
                      resizeAll(
                        e.target.value ? parseInt(e.target.value) : null,
                        null,
                      )
                    }
                  />
                </div>
                <span className="text-muted-foreground text-xs self-center">
                  ×
                </span>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">H</Label>
                  <Input
                    type="number"
                    placeholder="Auto"
                    className="w-24 h-8 text-xs"
                    onChange={(e) =>
                      resizeAll(
                        null,
                        e.target.value ? parseInt(e.target.value) : null,
                      )
                    }
                  />
                </div>
                <div className="flex gap-1.5">
                  {[
                    { label: "50%", w: 0.5 },
                    { label: "75%", w: 0.75 },
                    { label: "150%", w: 1.5 },
                  ].map((preset) => (
                    <Badge
                      key={preset.label}
                      variant="outline"
                      className="text-[10px] cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/30"
                      onClick={() => {
                        resizeAll(Math.round(1920 * preset.w), null);
                      }}
                    >
                      {preset.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Conversion Queue
                <Badge variant="secondary" className="text-xs">
                  {files.length}
                </Badge>
                <span className="text-xs text-muted-foreground font-normal">
                  {formatBytes(files.reduce((sum, f) => sum + f.size, 0))} total
                </span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={convertAll}
                  disabled={pendingCount === 0}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Convert All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAll}
                  disabled={doneCount === 0}
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const doneFiles = files.filter(
                      (f) => f.status === "done" && f.result,
                    );
                    if (doneFiles.length === 0) return;
                    showToast(`Creating ZIP with ${doneFiles.length} files...`);
                    try {
                      const zip = new JSZip();
                      for (const f of doneFiles) {
                        const baseName = f.name.replace(/\.[^/.]+$/, "");
                        const arrayBuffer = await f.result!.arrayBuffer();
                        zip.file(`${baseName}.${f.targetFormat}`, arrayBuffer);
                      }
                      const blob = await zip.generateAsync({ type: "blob" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `transmute-${Date.now()}.zip`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showToast(
                        `ZIP downloaded with ${doneFiles.length} files!`,
                      );
                    } catch {
                      showToast("Failed to create ZIP", "error");
                    }
                  }}
                  disabled={doneCount === 0}
                >
                  <DownloadCloud className="w-3.5 h-3.5 mr-1" />
                  Download ZIP
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFiles((prev) =>
                      prev.filter(
                        (f) =>
                          f.status === "pending" || f.status === "converting",
                      ),
                    )
                  }
                  disabled={doneCount + errorCount === 0}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Clear Done
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-[50vh] overflow-y-auto pr-2 overflow-x-hidden">
              <div className="space-y-2">
                {files.map((item) => {
                  const cat = getCategoryFromExt(item.ext);
                  const itemIndex = files.findIndex((f) => f.id === item.id);
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDragIndex(itemIndex)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragIndex === null) return;
                        const dropIndex = itemIndex;
                        if (dragIndex === dropIndex) return;
                        const newFiles = [...files];
                        const [moved] = newFiles.splice(dragIndex, 1);
                        newFiles.splice(dropIndex, 0, moved);
                        setFiles(newFiles);
                        setDragIndex(null);
                      }}
                      className={`p-3 rounded-lg border flex flex-col cursor-grab active:cursor-grabbing ${
                        item.status === "done"
                          ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50"
                          : item.status === "error"
                            ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/50"
                            : item.status === "converting"
                              ? "border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/50"
                              : "border-border"
                      } ${dragIndex === itemIndex ? "opacity-50 ring-2 ring-emerald-500 ring-offset-1" : ""}`}
                    >
                      <Collapsible>
                        <div className="flex items-center gap-3">
                          {/* Grip Handle */}
                          <div className="text-muted-foreground/40 mr-1 cursor-grab">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* File Thumbnail */}
                          <FileThumbnail item={item} />

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {item.name}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                              <span>{formatBytes(item.size)}</span>
                              <span className="uppercase font-mono">
                                .{item.ext}
                              </span>
                              {item.status === "done" && (
                                <>
                                  <ArrowRightLeft className="w-3 h-3" />
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {item.outputSize
                                      ? formatBytes(item.outputSize)
                                      : "done"}
                                  </span>
                                  {item.outputSize && item.size > 0 && (
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] px-1.5 py-0 ${
                                        item.outputSize < item.size
                                          ? "border-emerald-400 text-emerald-600 dark:text-emerald-400"
                                          : "border-red-400 text-red-600 dark:text-red-400"
                                      }`}
                                    >
                                      {item.outputSize < item.size
                                        ? `↓${Math.round((1 - item.outputSize / item.size) * 100)}%`
                                        : `↑${Math.round((item.outputSize / item.size - 1) * 100)}%`}
                                    </Badge>
                                  )}
                                  {item.startTime && item.endTime && (
                                    <span className="flex items-center gap-0.5">
                                      <Timer className="w-3 h-3" />
                                      {(
                                        (item.endTime - item.startTime) /
                                        1000
                                      ).toFixed(1)}
                                      s
                                    </span>
                                  )}
                                </>
                              )}
                              {item.status === "error" && (
                                <span className="text-red-600 dark:text-red-400 font-medium">
                                  Failed: {item.error?.slice(0, 40)}
                                </span>
                              )}
                              {item.status === "converting" && (
                                <span className="text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3 animate-spin" />
                                  Converting...
                                </span>
                              )}
                            </div>
                            {item.status === "done" &&
                              item.outputSize &&
                              item.size > 0 && (
                                <div className="mt-2">
                                  <div className="size-comparison-bar">
                                    <div
                                      className="size-comparison-bar-input"
                                      style={{ width: "50%" }}
                                    />
                                    <div
                                      className="size-comparison-bar-output"
                                      style={{
                                        width: `${Math.max(2, (item.outputSize / item.size) * 50)}%`,
                                      }}
                                    />
                                  </div>
                                  <div className="flex justify-between mt-1">
                                    <span className="text-[9px] text-muted-foreground">
                                      Original: {formatBytes(item.size)}
                                    </span>
                                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                                      Output: {formatBytes(item.outputSize)}
                                    </span>
                                  </div>
                                </div>
                              )}
                          </div>

                          {/* Format Selector */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono text-muted-foreground uppercase">
                              {item.ext}
                            </span>
                            <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
                            <Select
                              value={item.targetFormat}
                              onValueChange={(val) => {
                                if (
                                  item.status === "done" ||
                                  item.status === "error"
                                ) {
                                  updateFile(item.id, {
                                    targetFormat: val,
                                    status: "pending",
                                    result: undefined,
                                    outputSize: undefined,
                                    endTime: undefined,
                                  });
                                } else {
                                  updateFile(item.id, { targetFormat: val });
                                }
                              }}
                              disabled={item.status === "converting"}
                            >
                              <SelectTrigger className="w-24 h-8 text-xs">
                                <SelectValue placeholder="Format" />
                              </SelectTrigger>
                              <SelectContent>
                                {(targetFormatsMap[item.ext] || []).map(
                                  (fmt) => (
                                    <SelectItem
                                      key={fmt}
                                      value={fmt}
                                      className="text-xs uppercase"
                                    >
                                      {fmt}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {item.status === "pending" && (
                              <>
                                {getCategoryFromExt(item.ext) === "image" && (
                                  <CollapsibleTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-slate-100"
                                      title="Image Settings"
                                    >
                                      <Settings className="w-4 h-4 text-slate-500" />
                                    </Button>
                                  </CollapsibleTrigger>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => duplicateFile(item)}
                                  title="Add another format"
                                >
                                  <Plus className="w-4 h-4 text-sky-600" />
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600"
                                  onClick={() => convertFile(item)}
                                  title="Convert"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 mr-1" />{" "}
                                  Convert
                                </Button>
                              </>
                            )}
                            {item.status === "converting" && (
                              <div className="w-8 h-8 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-sky-600" />
                              </div>
                            )}
                            {item.status === "done" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => downloadFile(item)}
                                  title="Download"
                                >
                                  <Download className="w-4 h-4 text-emerald-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    if (item.result) {
                                      const url = URL.createObjectURL(
                                        item.result,
                                      );
                                      const baseName = item.name.replace(
                                        /\.[^/.]+$/,
                                        "",
                                      );
                                      setPreviewUrl(url);
                                      setPreviewName(
                                        `${baseName}.${item.targetFormat}`,
                                      );
                                    }
                                  }}
                                  title="Preview"
                                >
                                  <Eye className="w-4 h-4 text-sky-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => saveBookmark(item)}
                                  title="Save as bookmark"
                                >
                                  <BookmarkPlus className="w-4 h-4 text-amber-500" />
                                </Button>
                              </>
                            )}
                            {item.status === "error" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => convertFile(item, true)}
                                title="Retry conversion"
                              >
                                <RotateCcw className="w-4 h-4 text-amber-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeFile(item.id)}
                              title="Remove"
                            >
                              <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>

                        {/* Collapsible Content - Independent from flex row */}
                        {item.status === "pending" &&
                          getCategoryFromExt(item.ext) === "image" && (
                            <CollapsibleContent className="mt-3 pt-3 border-t border-border/50">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
                                {/* Quality */}
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                      Quality
                                    </span>
                                    <span className="text-[10px] font-mono text-emerald-600 font-semibold">
                                      {item.quality}%
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    value={item.quality}
                                    onChange={(e) =>
                                      updateFile(item.id, {
                                        quality: parseInt(e.target.value),
                                      })
                                    }
                                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                  />
                                </div>

                                {/* Resize */}
                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
                                    Resize (px)
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                                        W
                                      </span>
                                      <Input
                                        type="number"
                                        placeholder="Auto"
                                        className="h-7 text-xs pl-6 pr-2 bg-muted/50 border-transparent focus:bg-background focus-visible:ring-1 focus-visible:ring-sky-500 transition-colors"
                                        value={item.resizeWidth || ""}
                                        onChange={(e) =>
                                          updateFile(item.id, {
                                            resizeWidth: e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          })
                                        }
                                      />
                                    </div>
                                    <span className="text-muted-foreground text-[10px]">
                                      ×
                                    </span>
                                    <div className="relative flex-1">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                                        H
                                      </span>
                                      <Input
                                        type="number"
                                        placeholder="Auto"
                                        className="h-7 text-xs pl-6 pr-2 bg-muted/50 border-transparent focus:bg-background focus-visible:ring-1 focus-visible:ring-sky-500 transition-colors"
                                        value={item.resizeHeight || ""}
                                        onChange={(e) =>
                                          updateFile(item.id, {
                                            resizeHeight: e.target.value
                                              ? parseInt(e.target.value)
                                              : null,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CollapsibleContent>
                          )}
                      </Collapsible>
                      {/* Progress Bar */}
                      {item.status !== "pending" && (
                        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.status === "converting"
                                ? "bg-sky-500 w-full animate-pulse"
                                : item.status === "done"
                                  ? "bg-emerald-500 w-full"
                                  : "bg-red-500 w-full"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Recent Conversions ─── */}
      {recentConversions.filter((c) => c.status === "completed").length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="w-4 h-4 text-sky-500" />
                Recent Conversions
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {recentConversions
                .filter((c) => c.status === "completed")
                .slice(0, 6)
                .map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        categoryColors[c.category] || "bg-gray-500"
                      }`}
                    />
                    <span className="text-sm font-medium truncate flex-1 min-w-0">
                      {c.fileName}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                      <span className="font-mono uppercase">
                        {c.originalExt}
                      </span>
                      <ArrowRightLeft className="w-3 h-3" />
                      <span className="font-mono uppercase">{c.targetExt}</span>
                    </div>
                    <Badge
                      variant={
                        c.status === "completed" ? "default" : "destructive"
                      }
                      className={
                        c.status === "completed"
                          ? "bg-emerald-500 hover:bg-emerald-600 text-xs shrink-0"
                          : "text-xs shrink-0"
                      }
                    >
                      {c.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                      {formatDate(c.createdAt)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Feature Cards ─── */}
      <section>
        <h2 className="section-header mb-6">Why Cloud Converter?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {[
            {
              icon: <Shield className="w-4 h-4" />,
              title: "100% Private",
              desc: "Files never leave this server. Zero third-party uploads.",
              color: "bg-emerald-500",
            },
            {
              icon: <Zap className="w-4 h-4" />,
              title: "Lightning Fast",
              desc: "Server-side processing powered by high-speed engines.",
              color: "bg-amber-500",
            },
            {
              icon: <HardDrive className="w-4 h-4" />,
              title: "No Limits",
              desc: "No file size caps, no watermarks, no rate limits.",
              color: "bg-violet-500",
            },
            {
              icon: <Layers className="w-4 h-4" />,
              title: "Batch Convert",
              desc: "Process multiple files at once and download together.",
              color: "bg-sky-500",
            },
            {
              icon: <ArrowRightLeft className="w-4 h-4" />,
              title: "132+ Formats",
              desc: "Images, documents, data, subtitles, audio, and archives.",
              color: "bg-teal-500",
            },
          ].map((feature) => (
            <Card
              key={feature.title}
              className="card-elevated hover:bg-muted/20 transition-colors border-border/60"
            >
              <CardContent className="p-3.5 flex flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 ${feature.color} rounded-md flex items-center justify-center text-white shrink-0 shadow-sm`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-sm leading-none tracking-tight">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Image Preview Dialog ─── */}
      <Dialog
        open={previewUrl !== null}
        onOpenChange={(open) => {
          if (!open) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            setPreviewName("");
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-500" />
              Preview: {previewName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4 min-h-50">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={previewName}
                className="max-w-full max-h-[60vh] object-contain rounded-md"
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                setPreviewName("");
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
