"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Download, RefreshCw, Plus, Settings,
  History, Bookmark, Layers, Check, AlertCircle,
  File as FileIcon, Globe, Shield, Clock, HardDrive,
  DownloadCloud, Eye, BookmarkPlus, ArrowRightLeft,
  RotateCcw, Sparkles,
  GripVertical, Maximize, Upload, Trash2,
  Timer, X, Zap, FileStack, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { type FileItem, type ConversionRecord, type BookmarkRecord, type FormatsData } from "@/lib/app-types";
import { readJsonResponse } from "@/lib/http-json";
import { readApiError } from "@/lib/api-errors";
import {
  qualityPresets,
  SUPPORTED_EXTENSIONS,
  categoryColors,
  DOWNLOAD_BRAND_PREFIX,
  bulkZipDownloadFilename,
} from "@/lib/app-constants";
import {
  formatBytes,
  formatDate,
  getCategoryFromExt,
  getConvertApiPath,
  isConversionSuccess,
} from "@/lib/app-helpers";
import { FileThumbnail } from "@/components/common/FileThumbnail";
import { ConverterHero } from "@/components/converter/ConverterHero";
import { saveFileLocally } from "@/lib/storage";
import {
  audioUnavailableMessage,
  videoUnavailableMessage,
  formatMaxUploadLabel,
  getClientMaxUploadBytes,
  normalizePayloadError,
  payloadTooLargeMessage,
} from "@/lib/upload-limits";

const MAX_UPLOAD_BYTES = getClientMaxUploadBytes();
const MEDIA_CONVERSION_ENABLED =
  process.env.NEXT_PUBLIC_MEDIA_ENABLED !== "0" &&
  process.env.NEXT_PUBLIC_AUDIO_ENABLED !== "0";
const VIDEO_CONVERSION_ENABLED =
  process.env.NEXT_PUBLIC_VIDEO_ENABLED !== "0" &&
  process.env.NEXT_PUBLIC_MEDIA_ENABLED !== "0";
const AUDIO_CONVERSION_ENABLED =
  MEDIA_CONVERSION_ENABLED ||
  Boolean(process.env.NEXT_PUBLIC_CONVERT_API_URL?.trim());

function getMergeSourceBlob(item: FileItem): Blob | null {
  if (item.outputPackage === "zip" || item.targetFormat !== "pdf") return null;
  if (item.status === "done" && item.result) return item.result;
  if (item.ext === "pdf") return item.file;
  return null;
}

function mergeOutputFileName(item: FileItem): string {
  const baseName = item.name.replace(/\.[^/.]+$/, "");
  if (item.ext === "pdf" && item.targetFormat === "pdf") {
    return item.name.toLowerCase().endsWith(".pdf") ? item.name : `${baseName}.pdf`;
  }
  return `${baseName}.${item.targetFormat}`;
}

export function ConverterView() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [formatsData, setFormatsData] = useState<FormatsData | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [targetFormatsMap, setTargetFormatsMap] = useState<
    Record<string, string[]>
  >({});
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: "success" | "error" }[]
  >([]);
  const [recentConversions, setRecentConversions] = useState<
    ConversionRecord[]
  >([]);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlFetching, setUrlFetching] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3500,
    );
  };


  useEffect(() => {
    fetch("/api/formats")
      .then((r) => readJsonResponse<FormatsData & { error?: string }>(r))
      .then((data) => {
        if (!data || data.error || !data.grouped) {
          console.error("Failed to fetch formats:", data?.error || "Unknown error");
          return;
        }
        setFormatsData(data);
        const map: Record<string, string[]> = {};
        for (const group of Object.values(data.grouped) as Array<{
          formats: Array<{ ext: string; targetFormats: string[] }>;
        }>) {
          for (const fmt of group.formats) {
            map[fmt.ext] = fmt.targetFormats;
          }
        }
        setTargetFormatsMap(map);
      })
      .catch((err) => {
        console.error("Error fetching formats:", err);
      });

    fetch("/api/bookmarks")
      .then((r) => readJsonResponse<{ data?: BookmarkRecord[] }>(r))
      .then((data) => setBookmarks(data.data || []))
      .catch(() => {});

    fetch("/api/conversions?limit=5")
      .then(async (r) => {
        if (!r.ok) return { data: [] as ConversionRecord[] };
        return readJsonResponse<{ data?: ConversionRecord[] }>(r);
      })
      .then((d) => setRecentConversions(d.data || []))
      .catch(() => {});
  }, []);

  const fetchRemoteFile = async (url: string) => {
    if (urlFetching) return;
    setUrlFetching(true);
    try {
      showToast("Fetching remote file...");
      const response = await fetch(
        `/api/fetch-url?url=${encodeURIComponent(url)}`,
      );
      
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        let errorMsg = `Failed to fetch remote file (${response.status})`;
        try {
          const data = JSON.parse(text) as { error?: string };
          errorMsg = data.error || errorMsg;
        } catch {
          if (text.trim()) errorMsg = text.trim().slice(0, 120);
        }
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      const fileName = url.split("/").pop()?.split("?")[0] || "remote-file";
      // Use window.File to avoid shadowing issues with lucide-react icon
      const file = new window.File([blob], fileName, { type: blob.type });
      addFiles([file]);
      showToast("Remote file added!");
      setUrlInput("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch remote file";
      showToast(message, "error");
    } finally {
      setUrlFetching(false);
    }
  };

  const urlReady =
    urlInput.trim().length > 0 && urlInput.includes("://");

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    setFiles((prev) => {
      // Drop finished/failed items when a new upload starts; keep in-flight work.
      const activePrev = prev.filter(
        (f) => f.status === "pending" || f.status === "converting",
      );
      const spaceLeft = 20 - activePrev.length;
      if (spaceLeft <= 0) {
        showToast("Maximum queue limit reached (20 files).", "error");
        return activePrev;
      }

      if (fileArray.length > spaceLeft) {
        showToast(
          `Maximum 20 files allowed. Only ${spaceLeft} file(s) will be added.`,
          "error",
        );
      }

      const supported: FileItem[] = [];
      const unsupported: string[] = [];
      const tooLarge: string[] = [];

      fileArray.forEach((file) => {
        if (supported.length >= spaceLeft) return;

        const name = file.name;

        if (file.size > MAX_UPLOAD_BYTES) {
          tooLarge.push(name);
          return;
        }
        const dotIdx = name.lastIndexOf(".");
        const ext = dotIdx >= 0 ? name.slice(dotIdx + 1).toLowerCase() : "";
        const targets = targetFormatsMap[ext] || [];

        // Check if file is already in queue
        const isDuplicate =
          activePrev.some((p) => p.name === name && p.size === file.size) ||
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
            targetFormat:
              ext === "pdf" && targets.includes("pdf")
                ? "pdf"
                : targets.find((t) => t !== ext) || targets[0] || "",
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

      if (tooLarge.length > 0) {
        showToast(
          tooLarge.length === 1
            ? `${tooLarge[0]}: ${payloadTooLargeMessage(fileArray.find((f) => f.name === tooLarge[0])?.size ?? MAX_UPLOAD_BYTES + 1)}`
            : `${tooLarge.length} files exceed the ${formatMaxUploadLabel()} limit.`,
          "error",
        );
      }

      if (unsupported.length > 0) {
        showToast(
          `Unsupported format${unsupported.length > 1 ? "s" : ""}: ${unsupported.slice(0, 5).join(", ")}${unsupported.length > 5 ? ` +${unsupported.length - 5} more` : ""}`,
          "error",
        );
      }

      return [...activePrev, ...supported];
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

  const convertFile = async (item: FileItem) => {
    if (!item.targetFormat) {
      showToast(`Please select a target format for ${item.name}`, "error");
      return;
    }

    if (item.ext === item.targetFormat) {
      if (item.ext === "pdf") {
        updateFile(item.id, {
          status: "done",
          result: item.file,
          endTime: Date.now(),
          outputSize: item.file.size,
          outputPackage: undefined,
          pageCount: undefined,
        });
        showToast(`${item.name} ready to merge as PDF`);
        return;
      }
      showToast(`File is already in .${item.ext.toUpperCase()} format`, "error");
      return;
    }

    if (item.file.size > MAX_UPLOAD_BYTES) {
      const msg = payloadTooLargeMessage(item.file.size);
      updateFile(item.id, { status: "error", error: msg, endTime: Date.now() });
      showToast(msg, "error");
      return;
    }

    if (
      !AUDIO_CONVERSION_ENABLED &&
      (getCategoryFromExt(item.ext) === "audio" ||
        getCategoryFromExt(item.targetFormat) === "audio")
    ) {
      const msg = audioUnavailableMessage();
      updateFile(item.id, { status: "error", error: msg, endTime: Date.now() });
      showToast(msg, "error");
      return;
    }

    if (
      !VIDEO_CONVERSION_ENABLED &&
      (getCategoryFromExt(item.ext) === "video" ||
        getCategoryFromExt(item.targetFormat) === "video")
    ) {
      const msg = videoUnavailableMessage();
      updateFile(item.id, { status: "error", error: msg, endTime: Date.now() });
      showToast(msg, "error");
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

      const response = await fetch(getConvertApiPath(item.ext), {
        method: "POST",
        body: formData,
        cache: "no-store",
        priority: "high",
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(response, `Conversion failed (${response.status})`),
        );
      }

      const blob = await response.blob();
      if (blob.size === 0) throw new Error("Received empty file from server");

      const conversionId = response.headers.get("X-Conversion-Id") || item.id;
      const outputPackage =
        response.headers.get("X-Output-Package") === "zip" ? "zip" : undefined;
      const pageCountHeader = response.headers.get("X-Page-Count");
      const pageCount = pageCountHeader
        ? parseInt(pageCountHeader, 10)
        : undefined;

      // Save to local IndexedDB
      await saveFileLocally(conversionId, item.name, blob, blob.type);

      updateFile(item.id, {
        status: "done",
        result: blob,
        endTime: Date.now(),
        outputSize: blob.size,
        outputPackage,
        pageCount: Number.isFinite(pageCount) ? pageCount : undefined,
      });
      if (outputPackage === "zip" && pageCount) {
        showToast(
          `${item.name}: ${pageCount} pages saved as ZIP (${item.targetFormat.toUpperCase()})`,
        );
      } else {
        showToast(`${item.name} converted successfully!`);
      }
    } catch (err) {
      const message = normalizePayloadError(
        err instanceof Error ? err.message : "Conversion failed",
      );
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

  const downloadFile = (item: FileItem) => {
    if (!item.result) return;
    const baseName = item.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(item.result);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      item.outputPackage === "zip"
        ? `${baseName}-pages.zip`
        : `${baseName}.${item.targetFormat}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pdfRasterTargets = new Set([
    "png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "tif", "ico", "avif",
  ]);

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
      const data = await readJsonResponse<{ data?: BookmarkRecord[] }>(res);
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
  const mergeableCount = files.filter((f) => getMergeSourceBlob(f) !== null).length;
  const errorCount = files.filter((f) => f.status === "error").length;

  const allTargetFormats = (() => {
    const all = new Set<string>();
    files.filter((f) => f.status === "pending").forEach((f) => {
      (targetFormatsMap[f.ext] || []).forEach((t) => all.add(t));
    });
    return [...all].sort();
  })();

  const groupedTargetFormats = (formatList: string[]) => {
    const groups: Record<string, string[]> = {};
    for (const fmt of formatList) {
      const cat = getCategoryFromExt(fmt) || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(fmt);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  const applyUniversalFormat = (format: string) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.status !== "pending") return f;
        const targets = targetFormatsMap[f.ext] || [];
        if (targets.includes(format)) {
          return { ...f, targetFormat: format };
        }
        return f;
      }),
    );
    const applicableCount = files.filter(
      (f) => f.status === "pending" && (targetFormatsMap[f.ext] || []).includes(format),
    ).length;
    showToast(`Applied .${format.toUpperCase()} to ${applicableCount} file(s)`);
  };

  return (
    <div className="space-y-8">
      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div className="toast-stack fixed top-20 right-4 z-50 space-y-2">
          {toasts.slice(0, 5).map((t) => (
            <div
              key={t.id}
              className={`toast-stack-item flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-foreground text-sm border border-border bg-background ${
                t.type === "success" 
                  ? "border-l-4 border-l-emerald-500" 
                  : "border-l-4 border-l-destructive"
              }`}
            >
              <div className={`p-1 rounded-full ${
                t.type === "success" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" : "bg-red-100 text-red-600 dark:bg-red-900/30"
              }`}>
                {t.type === "success" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
              </div>
              <span className="font-medium">{t.message}</span>
            </div>
          ))}
        </div>
      )}

      <ConverterHero
        totalFormats={formatsData?.totalFormats}
        totalConversionPairs={formatsData?.totalConversions}
        categoryCount={
          formatsData
            ? Object.values(formatsData.categoryCounts).filter((n) => n > 0)
                .length
            : undefined
        }
        onUploadClick={() => fileInputRef.current?.click()}
      />

      {/* ─── Upload Zone ─── */}
      <Card className="card-elevated overflow-hidden border-border/60 shadow-md -mt-2 sm:-mt-4">
        <CardContent className="p-0">
          <div
            className={`upload-zone-enhanced p-8 sm:p-12 text-center cursor-pointer relative border-2 border-dashed rounded-t-2xl ${
              dragOver
                ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/25"
                : "border-border/80"
            }`}
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
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg ${
                  dragOver
                    ? "bg-emerald-500 shadow-emerald-500/40"
                    : "bg-emerald-500 shadow-emerald-500/30"
                }`}
              >
                <Upload className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-1.5">
                {dragOver ? "Drop files to upload" : "Drop files here or click to browse"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Images, video, documents, data, audio, archives, subtitles, fonts & more
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-2">
                Up to 20 files · {formatMaxUploadLabel()} each · Ctrl+U to browse
              </p>
            </div>
          </div>

          {/* ── URL import (~40% prominence vs upload) ── */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-x-0 top-0 flex items-center justify-center -translate-y-1/2 z-10">
              <span className="rounded-full border border-emerald-500/25 bg-background px-3.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-800/90 shadow-sm dark:text-emerald-300/90">
                or paste a link
              </span>
            </div>
            <div className="rounded-b-2xl border-t border-emerald-500/10 bg-emerald-500/[0.04] px-5 py-5 dark:bg-emerald-500/[0.06]">
              <div
                className={`mx-auto flex max-w-2xl items-center gap-2.5 rounded-xl border bg-background px-3 py-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500/25 ${
                  urlReady ? "border-emerald-400/50" : "border-border/80"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    urlReady
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                  aria-hidden
                >
                  <Globe className="h-4 w-4" />
                </div>
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com/file.png"
                  aria-label="File URL to import"
                  className="h-9 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && urlReady) {
                      fetchRemoteFile(urlInput.trim());
                    }
                  }}
                  disabled={urlFetching}
                />
                <Button
                  type="button"
                  size="sm"
                  className={`h-9 shrink-0 rounded-lg px-3.5 text-xs font-semibold ${
                    urlReady
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                      : "bg-muted text-muted-foreground"
                  }`}
                  onClick={() => {
                    if (urlReady) fetchRemoteFile(urlInput.trim());
                  }}
                  disabled={!urlReady || urlFetching}
                >
                  {urlFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <DownloadCloud className="mr-1 h-3.5 w-3.5" />
                      Fetch
                    </>
                  )}
                </Button>
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

      {/* ─── PDF Tools ─── */}
      {files.some((f) => f.ext === "pdf" && f.status === "pending") && (
        <Card className="card-accent-rose">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white">
                <FileIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">PDF Tools</h3>
                <p className="text-xs text-muted-foreground">
                  Each page becomes a separate image in a ZIP. Converting to PNG, JPG, or WebP does the same for multi-page PDFs.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {files
                .filter((f) => f.ext === "pdf" && f.status === "pending")
                .map((pdfFile) => (
                  <div key={pdfFile.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                    <span className="text-xs font-medium truncate max-w-40">{pdfFile.name}</span>
                    {["png", "jpg", "webp"].map((fmt) => (
                      <Button
                        key={fmt}
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] px-2 uppercase"
                        onClick={async () => {
                          showToast(`Splitting ${pdfFile.name} to ${fmt.toUpperCase()} images...`);
                          try {
                            const fd = new FormData();
                            fd.append("file", pdfFile.file);
                            fd.append("targetFormat", fmt);
                            const resp = await fetch("/api/pdf-split", { method: "POST", body: fd });
                            if (!resp.ok) {
                              const err = await resp.json().catch(() => ({ error: "Split failed" }));
                              throw new Error(err.error || "Split failed");
                            }
                            const pageCount = resp.headers.get("X-Page-Count") || "?";
                            const blob = await resp.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${pdfFile.name.replace(/\.pdf$/i, "")}-pages.zip`;
                            a.click();
                            URL.revokeObjectURL(url);
                            showToast(`Split into ${pageCount} ${fmt.toUpperCase()} images!`);
                          } catch (err) {
                            const msg = err instanceof Error ? err.message : "Split failed";
                            showToast(msg, "error");
                          }
                        }}
                      >
                        → {fmt}
                      </Button>
                    ))}
                  </div>
                ))}
            </div>
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
              <div className="flex items-center gap-2 flex-wrap">
                {pendingCount > 1 && (
                  <div className="flex items-center gap-1.5">
                    <FileStack className="w-3.5 h-3.5 text-violet-500" />
                    <Select onValueChange={applyUniversalFormat}>
                      <SelectTrigger className="w-28 h-8 text-xs border-violet-300 dark:border-violet-700">
                        <SelectValue placeholder="All → ..." />
                      </SelectTrigger>
                      <SelectContent>
                        {groupedTargetFormats(allTargetFormats).map(([cat, fmts]) => (
                          <SelectGroup key={cat}>
                            <SelectLabel className="text-[10px] uppercase tracking-wider font-bold">{cat}</SelectLabel>
                            {fmts.map((fmt) => (
                              <SelectItem key={fmt} value={fmt} className="text-xs uppercase">{fmt}</SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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
                      const { default: JSZip } = await import("jszip");
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
                      a.download = bulkZipDownloadFilename(
                        doneFiles.map((f) => f.name),
                      );
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
                {mergeableCount >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    onClick={async () => {
                      const filesToMerge = files.filter(
                        (f) => getMergeSourceBlob(f) !== null,
                      );
                      if (filesToMerge.length < 2) {
                        showToast("Need at least 2 PDF files to merge", "error");
                        return;
                      }
                      showToast(`Merging ${filesToMerge.length} files into PDF...`);
                      try {
                        const formData = new FormData();
                        for (const f of filesToMerge) {
                          const source = getMergeSourceBlob(f)!;
                          const fileName = mergeOutputFileName(f);
                          const file = new File([source], fileName, {
                            type: source.type || "application/pdf",
                          });
                          formData.append("files", file);
                        }
                        const response = await fetch("/api/merge-pdf", {
                          method: "POST",
                          body: formData,
                        });
                        if (!response.ok) {
                          const err = await response.json().catch(() => ({ error: "Merge failed" }));
                          throw new Error(err.error || "Merge failed");
                        }
                        const blob = await response.blob();
                        if (blob.size === 0) {
                          throw new Error("Received empty merged PDF");
                        }
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${DOWNLOAD_BRAND_PREFIX}-${filesToMerge[0].name.replace(/\.[^/.]+$/, "").replace(/[^\w.-]+/g, "_")}-merged.pdf`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast(`Merged ${filesToMerge.length} files into PDF!`);
                      } catch (err) {
                        const msg = err instanceof Error ? err.message : "Merge failed";
                        showToast(msg, "error");
                      }
                    }}
                  >
                    <FileStack className="w-3.5 h-3.5 mr-1" />
                    Merge to PDF
                  </Button>
                )}
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  aria-label="Clear all files"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-[50vh] overflow-y-auto pr-2 overflow-x-hidden">
              <div className="space-y-2">
                {files.map((item) => {
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
                                    outputPackage: undefined,
                                    pageCount: undefined,
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
                                {groupedTargetFormats(
                                  (targetFormatsMap[item.ext] || []).filter(
                                    (f) => item.ext === "pdf" || f !== item.ext,
                                  ),
                                ).map(
                                  ([cat, fmts]) => (
                                    <SelectGroup key={cat}>
                                      <SelectLabel className="text-[10px] uppercase tracking-wider font-bold">{cat}</SelectLabel>
                                      {fmts.map((fmt) => (
                                        <SelectItem
                                          key={fmt}
                                          value={fmt}
                                          className="text-xs uppercase"
                                        >
                                          {fmt}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                            {item.ext === "pdf" &&
                              pdfRasterTargets.has(item.targetFormat) &&
                              item.status === "pending" && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] whitespace-nowrap border-rose-300 text-rose-700 dark:text-rose-300"
                                >
                                  Multi-page → ZIP
                                </Badge>
                              )}
                            {item.status === "done" && item.outputPackage === "zip" && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] whitespace-nowrap"
                              >
                                {item.pageCount ?? "?"} pages ZIP
                              </Badge>
                            )}
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
                                      aria-label="Image Settings"
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
                                  aria-label="Add another format"
                                >
                                  <Plus className="w-4 h-4 text-sky-600" />
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-8 text-xs bg-emerald-500 hover:bg-emerald-600"
                                  onClick={() => convertFile(item)}
                                  title="Convert"
                                  aria-label="Convert file"
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
                                {item.outputPackage !== "zip" && (
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
                                )}
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
                                onClick={() => convertFile(item)}
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

      {/* ─── Conversion Quality Presets (below queue) ─── */}
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

      {/* ─── Image Resize Options (below queue) ─── */}
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

      {/* ─── Recent Conversions ─── */}
      {recentConversions.filter((c) => isConversionSuccess(c.status)).length > 0 && (
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
                .filter((c) => isConversionSuccess(c.status))
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
                        isConversionSuccess(c.status) ? "default" : "destructive"
                      }
                      className={
                        isConversionSuccess(c.status)
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
