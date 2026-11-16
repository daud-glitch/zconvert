"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Download, RefreshCw, Plus, Settings,
  History, Layers, Check,
  File as FileIcon, FileText, Globe, Shield, Clock,
  DownloadCloud, Eye, BookmarkPlus, ArrowRightLeft, ChevronDown,
  RotateCcw, Sparkles,
  GripVertical, Maximize, Upload, Trash2,
  Timer, X, Zap, FileStack, Loader2, Film, MessageCircle, Music2,
  Mic, Radio, Crop, Database, Archive, Subtitles,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { type FileItem, type ConversionRecord } from "@/lib/app-types";
import { readApiError } from "@/lib/api-errors";
import { useFormats } from "@/hooks/use-formats";
import {
  qualityPresets,
  videoQuickPresets,
  audioQuickPresets,
  imageQuickActions,
  documentQuickPresets,
  dataQuickPresets,
  archiveQuickPresets,
  subtitleQuickPresets,
  type CategoryQuickPreset,
  SUPPORTED_EXTENSIONS,
  DOWNLOAD_BRAND_PREFIX,
  bulkZipDownloadFilename,
  brandedDownloadFilename,
} from "@/lib/app-constants";
import {
  formatBytes,
  formatDate,
  getCategoryFromExt,
  getConvertApiPath,
  isConversionSuccess,
} from "@/lib/app-helpers";
import { FileThumbnail } from "@/components/common/FileThumbnail";
import { ConverterFormatFields } from "@/components/converter/ConverterFormatFields";
import { toast } from "@/hooks/use-toast";
import { useResultPreview } from "@/components/converter/useResultPreview";
import {
  AUDIO_CONVERSION_ENABLED,
  VIDEO_CONVERSION_ENABLED,
  acceptForPreferredFrom,
  canPreviewResult,
  formatSizeChangeLabel,
  hasUnfinishedWork,
  getMergeSourceBlob,
  mergeOutputFileName,
  normalizeExtParam,
  resolveDefaultTargetFormat,
  syncPreferredPairUrl,
  targetsForExt,
  uniqueZipEntryName,
} from "@/lib/converter-helpers";
import {
  primeStorage,
  saveLocalConversion,
  getLocalHistory,
} from "@/lib/storage";
import { useApp } from "@/lib/app-context";
import {
  uploadAndConvert,
  stageFileUpload,
  INLINE_UPLOAD_MAX_BYTES,
  isAbortError,
} from "@/lib/client-upload";
import {
  audioUnavailableMessage,
  videoUnavailableMessage,
  formatNonVideoMaxUploadLabel,
  formatVideoMaxUploadLabel,
  getMaxNonVideoBatchFiles,
  getMaxUploadBytesForCategory,
  getVideoMaxUploadBytes,
  humanizeConversionError,
  payloadTooLargeMessage,
} from "@/lib/upload-limits";
import { formats, isConversionPairListed } from "@/lib/formats";

const MAX_NONVIDEO_BATCH = getMaxNonVideoBatchFiles();
const MAX_VIDEO_BYTES = getVideoMaxUploadBytes();

export type ConverterViewProps = {
  /** Preselect a conversion pair (SEO pair pages / deep links). */
  initialFrom?: string;
  initialTo?: string;
  /**
   * Compact tool embed: hide marketing hero + popular pairs, and do not
   * rewrite the URL with ?from=&to= (keeps /x-to-y canonical clean).
   */
  embedded?: boolean;
};

export function ConverterView({
  initialFrom,
  initialTo,
  embedded = false,
}: ConverterViewProps = {}) {
  const { currentUser, openAuth } = useApp();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<FileItem[]>([]);
  const { data: formatsData } = useFormats();
  const [dragOver, setDragOver] = useState(false);
  const lockedFrom = normalizeExtParam(initialFrom ?? null);
  const lockedTo = normalizeExtParam(initialTo ?? null);
  const [preferredFrom, setPreferredFrom] = useState<string | null>(
    lockedFrom && lockedTo ? lockedFrom : null,
  );
  const [preferredTo, setPreferredTo] = useState<string | null>(
    lockedFrom && lockedTo ? lockedTo : null,
  );
  // Messages go to the app's mounted <Toaster /> (layout.tsx) so they are visible.
  const showToast = (message: string, type: "success" | "error" = "success") => {
    toast({
      description: message,
      variant: type === "error" ? "destructive" : "default",
    });
  };
  const [recentConversions, setRecentConversions] = useState<
    ConversionRecord[]
  >([]);

  const {
    previewUrl,
    previewName,
    openPreview,
    closePreview,
    handleOpenChange,
  } = useResultPreview();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urlFetching, setUrlFetching] = useState(false);
  const [showResize, setShowResize] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCardRef = useRef<HTMLDivElement>(null);
  const queueLandedRef = useRef(false);
  const filesRef = useRef<FileItem[]>([]);
  const autoUploadChainRef = useRef(Promise.resolve());
  /** In-flight staging promises keyed by file item id */
  const uploadJobsRef = useRef(
    new Map<string, Promise<string | null>>(),
  );
  /** Per-file AbortControllers for upload/convert (cancelled on remove/clear) */
  const abortControllersRef = useRef(new Map<string, AbortController>());
  /** Bumped to cancel an in-flight Convert All loop */
  const batchRunRef = useRef(0);
  /** Ordered ids for the active Convert All batch (for live progress totals) */
  const batchIdsRef = useRef<string[] | null>(null);

  // When files just landed in an otherwise-empty queue, gently point the user at it.
  // This is the “uploaded files are now in the Conversion Queue” moment for task 1.
  useEffect(() => {
    const pending = files.filter((f) => f.status === "pending").length;
    const anyFiles = files.length > 0;
    if (pending > 0 && !queueLandedRef.current && anyFiles) {
      queueLandedRef.current = true;
      const card = uploadCardRef.current;
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    if (files.length === 0) {
      queueLandedRef.current = false;
    }
  }, [files]);

  const isQueued = (id: string) =>
    filesRef.current.some((f) => f.id === id);

  /** Create or reuse a non-aborted controller for this queue item. */
  const ensureAbortController = (id: string) => {
    const existing = abortControllersRef.current.get(id);
    if (existing && !existing.signal.aborted) return existing;
    const controller = new AbortController();
    abortControllersRef.current.set(id, controller);
    return controller;
  };

  // Keep this ref in sync with files so convertAll / upload checks skip stale ids.
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const cancelFileWork = (id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      try {
        controller.abort();
      } catch {
        /* ignore */
      }
      abortControllersRef.current.delete(id);
    }
    uploadJobsRef.current.delete(id);
  };

  const cancelAllFileWork = () => {
    for (const controller of abortControllersRef.current.values()) {
      try {
        controller.abort();
      } catch {
        /* ignore */
      }
    }
    abortControllersRef.current.clear();
    uploadJobsRef.current.clear();
  };

  /**
   * The one queue reset action. Everything that means "drop the whole queue" goes
   * through here — Clear-all button, Logo/Converter nav, and account switch — so
   * no path can forget to stop in-flight work or leave stale batch/preview state.
   * Chosen format pair and recent-conversions are deliberately NOT reset here:
   * a preset survives clearing files, and recent rows are account-scoped.
   */
  const resetQueue = useCallback(() => {
    cancelAllFileWork();
    // Bump so any in-flight Convert All loop sees a dead run id and stops.
    batchRunRef.current += 1;
    batchIdsRef.current = null;
    autoUploadChainRef.current = Promise.resolve();
    filesRef.current = [];
    setFiles([]);
    setBatchProgress(null);
    closePreview();
  }, [closePreview]);

  /** Rows a partial reset keeps: anything not finished or failed. */
  const isActiveItem = (f: FileItem) =>
    f.status === "pending" || f.status === "converting";

  /** Recompute batch bar from files still in the queue. */
  const syncBatchProgress = () => {
    const ids = batchIdsRef.current;
    if (!ids || ids.length === 0) {
      setBatchProgress(null);
      return;
    }
    const alive = ids.filter((id) => isQueued(id));
    if (alive.length === 0) {
      batchIdsRef.current = null;
      setBatchProgress(null);
      return;
    }
    const finished = alive.filter((id) => {
      const f = filesRef.current.find((x) => x.id === id);
      return f?.status === "done" || f?.status === "error";
    }).length;
    const convertingCount = alive.filter((id) => {
      const f = filesRef.current.find((x) => x.id === id);
      return f?.status === "converting";
    }).length;
    // finished + in-flight — works for parallel batches (up to 5 at once)
    const current = Math.min(
      alive.length,
      Math.max(
        finished < alive.length ? 1 : finished,
        finished + convertingCount,
      ),
    );
    setBatchProgress({ current, total: alive.length });
  };

  const targetFormatsMap = useMemo(() => {
    const enabledFormats = Object.values(formatsData?.grouped ?? {}).flatMap(
      (group) => group.formats,
    );
    const enabledExtensions = new Set(enabledFormats.map((format) => format.ext));
    return Object.fromEntries(
      enabledFormats.map((format) => [
        format.ext,
        format.targetFormats.filter((target) => enabledExtensions.has(target)),
      ]),
    );
  }, [formatsData]);

  const pickerFormats = useMemo(() => {
    const catalog = formatsData
      ? Object.values(formatsData.grouped).flatMap((group) => group.formats)
      : formats;
    const sources = catalog
      .filter((format) => format.targetFormats.length > 0)
      .map((format) => format.ext)
      .sort();
    const outputs = preferredFrom
      ? (formatsData ? targetFormatsMap[preferredFrom] ?? [] : targetsForExt(preferredFrom, {}))
      : catalog.flatMap((format) => format.targetFormats);
    return { sources, outputs: [...new Set(outputs)].sort() };
  }, [formatsData, preferredFrom, targetFormatsMap]);

  function changePreferredFormats(from: string | null, to: string | null) {
    const availableTargets = from ? (
      formatsData ? targetFormatsMap[from] ?? [] : targetsForExt(from, {})
    ) : null;
    const nextTo = to && availableTargets && !availableTargets.includes(to) ? null : to;
    setPreferredFrom(from);
    setPreferredTo(nextTo);
    if (!embedded) syncPreferredPairUrl(from, nextTo);
  }

  useEffect(() => {
    if (lockedFrom && lockedTo && isConversionPairListed(lockedFrom, lockedTo)) {
      setPreferredFrom(lockedFrom);
      setPreferredTo(lockedTo);
      return;
    }
    if (embedded) return;

    const from = normalizeExtParam(searchParams.get("from"));
    const to = normalizeExtParam(searchParams.get("to"));
    if (from && to && isConversionPairListed(from, to)) {
      setPreferredFrom(from);
      setPreferredTo(to);
    } else {
      setPreferredFrom(from || null);
      setPreferredTo(from ? null : to || null);
    }
  }, [searchParams, embedded, lockedFrom, lockedTo]);

  // Only scroll for an inbound deep link. Changing the picker keeps focus in place.
  const [landedWithSource] = useState(() => Boolean(searchParams.get("from")));
  useEffect(() => {
    if (embedded || !landedWithSource) return;
    const id = window.setTimeout(() => {
      uploadCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(id);
  }, [embedded, landedWithSource]);

  const fileAccept = preferredFrom
    ? acceptForPreferredFrom(preferredFrom)
    : SUPPORTED_EXTENSIONS;

  // Isolate queue / recent when switching accounts on same browser
  useEffect(() => {
    let cancelled = false;
    const accountKey = currentUser?.id ?? null;

    // Open IndexedDB once so the schema migration that drops the removed
    // queue store runs even for signed-out visitors. A stale dev chunk can hand
    // us an older storage module, so never let that take down the mount effect.
    if (typeof primeStorage === "function") {
      void primeStorage().catch(() => undefined);
    }
    resetQueue();
    setRecentConversions([]);

    // Recent list only for signed-in accounts (bookmarks live in Bookmarks section only).
    // Guests still convert in the queue with live status, but nothing is persisted.
    if (currentUser && accountKey) {
      void getLocalHistory(5, accountKey)
        .then((rows) => {
          if (cancelled) return;
          setRecentConversions(
            rows.map((r) => ({
              id: r.id,
              fileName: r.fileName,
              originalExt: r.originalExt,
              targetExt: r.targetExt,
              category: r.category,
              inputSize: r.inputSize,
              outputSize: r.outputSize,
              status: r.status,
              duration: r.duration,
              error: r.error,
              createdAt: r.createdAt,
            })),
          );
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, resetQueue]);

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

  const isVideoItem = (ext: string, target?: string) =>
    getCategoryFromExt(ext) === "video" ||
    (target ? getCategoryFromExt(target) === "video" : false);

  /** Stage large files on the server. Small files stay local — uploaded only at Convert. */
  const stageFileItem = (item: FileItem): Promise<string | null> => {
    const existing = uploadJobsRef.current.get(item.id);
    if (existing) return existing;

    const job = (async (): Promise<string | null> => {
      if (!isQueued(item.id)) return null;

      // Fast path: PDFs/docs under ~4MB — no intermediate chunk API (was causing stuck 95%).
      if (item.file.size > 0 && item.file.size <= INLINE_UPLOAD_MAX_BYTES) {
        updateFile(item.id, {
          uploading: false,
          uploadReady: true,
          uploadId: undefined,
          uploadError: undefined,
          progress: undefined,
          progressPhase: undefined,
        });
        return null;
      }

      const controller = ensureAbortController(item.id);
      updateFile(item.id, {
        uploading: true,
        uploadReady: false,
        uploadError: undefined,
        progress: 3,
        progressPhase: "uploading",
      });
      try {
        const uploadId = await stageFileUpload({
          file: item.file,
          fileName: item.name,
          signal: controller.signal,
          onProgress: (p) => {
            if (!isQueued(item.id) || controller.signal.aborted) return;
            updateFile(item.id, {
              progress: Math.max(3, Math.min(99, p.percent)),
              progressPhase: "uploading",
              uploading: true,
            });
          },
        });
        if (!isQueued(item.id) || controller.signal.aborted) return null;
        updateFile(item.id, {
          uploadId,
          uploading: false,
          uploadReady: true,
          uploadError: undefined,
          progress: undefined,
          progressPhase: undefined,
        });
        return uploadId;
      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted || !isQueued(item.id)) {
          return null;
        }
        const message =
          err instanceof Error ? err.message : "Upload failed";
        if (isQueued(item.id)) {
          updateFile(item.id, {
            uploading: false,
            uploadReady: false,
            uploadId: undefined,
            uploadError: message,
            progress: undefined,
            progressPhase: undefined,
          });
          showToast(`${item.name}: upload failed — ${message}`, "error");
        }
        return null;
      } finally {
        uploadJobsRef.current.delete(item.id);
      }
    })();

    uploadJobsRef.current.set(item.id, job);
    return job;
  };

  /** Queue-friendly auto upload: starts staging when files are added. */
  const enqueueAutoUpload = (items: FileItem[]) => {
    if (items.length === 0) return;

    autoUploadChainRef.current = autoUploadChainRef.current
      .then(async () => {
        // Upload sequentially — one file at a time is more reliable on flaky mobile / Heroku
        const BATCH = 1;
        for (let i = 0; i < items.length; i += BATCH) {
          const slice = items.slice(i, i + BATCH);
          await Promise.all(
            slice.map((item) => {
              if (!filesRef.current.some((f) => f.id === item.id)) {
                return Promise.resolve(null);
              }
              const live = filesRef.current.find((f) => f.id === item.id);
              if (!live || live.status !== "pending" || live.uploadReady) {
                return Promise.resolve(null);
              }
              return stageFileItem(live);
            }),
          );
        }
      })
      .catch(() => {
        // Keep chain alive after a failed batch leg
      });
  };

  /**
   * The one partial-removal path. Every place that drops a subset of the queue —
   * remove-one, Clear Done, and the finished-row sweep when new files land — goes
   * through here, so none of them can forget to stop in-flight work or leave the
   * refs and batch bar pointing at rows that are gone.
   */
  const dropQueueItems = (keep: (f: FileItem) => boolean) => {
    const dropped = filesRef.current.filter((f) => !keep(f));
    if (dropped.length === 0) return;
    for (const f of dropped) cancelFileWork(f.id);
    // Refs first: in-flight convert/upload loops must skip these ids immediately.
    filesRef.current = filesRef.current.filter(keep);
    if (batchIdsRef.current) {
      const gone = new Set(dropped.map((f) => f.id));
      batchIdsRef.current = batchIdsRef.current.filter((id) => !gone.has(id));
    }
    setFiles((prev) => prev.filter(keep));
    syncBatchProgress();
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    let added: FileItem[] = [];

    // Finished/failed rows leave when a new upload starts; in-flight work stays.
    dropQueueItems(isActiveItem);

    setFiles((prev) => {
      const activePrev = prev;
      const activeVideos = activePrev.filter((f) => isVideoItem(f.ext)).length;
      const nonVideoSpace = Math.max(
        0,
        MAX_NONVIDEO_BATCH -
          activePrev.filter((f) => !isVideoItem(f.ext)).length,
      );
      // Multiple videos may sit in queue; conversion still runs one at a time
      const MAX_VIDEOS_IN_QUEUE = 5;
      const videoSpace = Math.max(0, MAX_VIDEOS_IN_QUEUE - activeVideos);

      if (nonVideoSpace <= 0 && videoSpace <= 0) {
        showToast(
          `Queue full (${MAX_NONVIDEO_BATCH} non-video files max, ${MAX_VIDEOS_IN_QUEUE} videos max).`,
          "error",
        );
        return activePrev;
      }

      const supported: FileItem[] = [];
      const unsupported: string[] = [];
      const tooLarge: string[] = [];
      let skippedExtraVideos = 0;
      let videosAdded = 0;
      let otherAdded = 0;

      const emptyFiles: string[] = [];
      fileArray.forEach((file) => {
        const name = file.name;
        const dotIdx = name.lastIndexOf(".");
        const ext = dotIdx >= 0 ? name.slice(dotIdx + 1).toLowerCase() : "";
        const targets = targetsForExt(ext, targetFormatsMap);
        const isVid = isVideoItem(ext);
        const maxBytes = getMaxUploadBytesForCategory(
          isVid ? "video" : getCategoryFromExt(ext) || "other",
        );

        if (!file.size || file.size <= 0) {
          emptyFiles.push(name);
          return;
        }

        if (file.size > maxBytes) {
          tooLarge.push(name);
          return;
        }

        if (isVid) {
          if (videosAdded + activeVideos >= 5) {
            skippedExtraVideos += 1;
            return;
          }
        } else if (otherAdded >= nonVideoSpace) {
          return;
        }

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
            targetFormat: resolveDefaultTargetFormat(
              ext,
              targets,
              preferredFrom,
              preferredTo,
            ),
            quality: 85,
            resizeWidth: null,
            resizeHeight: null,
            startTime: undefined,
            endTime: undefined,
            outputSize: undefined,
            // Small files: ready immediately; body POSTed only on Convert (avoids stuck staging).
            uploading: file.size > INLINE_UPLOAD_MAX_BYTES,
            uploadReady: file.size <= INLINE_UPLOAD_MAX_BYTES,
            uploadError: undefined,
          });
          if (isVid) videosAdded += 1;
          else otherAdded += 1;
        } else {
          unsupported.push(ext ? `.${ext}` : name);
        }
      });

      if (emptyFiles.length > 0) {
        showToast(
          emptyFiles.length === 1
            ? `${emptyFiles[0]} is empty (0 bytes) and cannot be converted.`
            : `${emptyFiles.length} empty files were skipped.`,
          "error",
        );
      }

      if (skippedExtraVideos > 0) {
        showToast(
          "Video queue full (max 5). Convert or remove a video first.",
          "error",
        );
      }

      if (tooLarge.length > 0) {
        showToast(
          tooLarge.length === 1
            ? (() => {
                const f = fileArray.find((x) => x.name === tooLarge[0]);
                const isV =
                  f &&
                  isVideoItem(
                    f.name.slice(f.name.lastIndexOf(".") + 1).toLowerCase(),
                  );
                return `${tooLarge[0]}: ${payloadTooLargeMessage(
                  f?.size ?? (isV ? MAX_VIDEO_BYTES : getMaxUploadBytesForCategory("image")) + 1,
                  { kind: isV ? "video" : "file" },
                )}`;
              })()
            : `${tooLarge.length} files exceed size limits (${formatNonVideoMaxUploadLabel()} each · video ${formatVideoMaxUploadLabel()}).`,
          "error",
        );
      }

      if (unsupported.length > 0) {
        showToast(
          `Unsupported format${unsupported.length > 1 ? "s" : ""}: ${unsupported.slice(0, 5).join(", ")}${unsupported.length > 5 ? ` +${unsupported.length - 5} more` : ""}`,
          "error",
        );
      }

      added = supported;
      return [...activePrev, ...supported];
    });

    // Stage large files only; small ones are already uploadReady from addFiles.
    if (added.length > 0) {
      const toUpload = added.filter((f) => f.size > INLINE_UPLOAD_MAX_BYTES);
      if (toUpload.length > 0) {
        setTimeout(() => enqueueAutoUpload(toUpload), 0);
      }
    }
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

  const resolvePresetTarget = (
    item: FileItem,
    preset: CategoryQuickPreset,
  ): string | null => {
    const targets = targetsForExt(item.ext, targetFormatsMap);
    if (preset.toggleTargets) {
      const [a, b] = preset.toggleTargets;
      if (item.ext === a && targets.includes(b)) return b;
      if (item.ext === b && targets.includes(a)) return a;
      if (targets.includes(b)) return b;
      if (targets.includes(a)) return a;
      return null;
    }
    if (preset.targetFormat) {
      return targets.includes(preset.targetFormat) ? preset.targetFormat : null;
    }
    return item.targetFormat || null;
  };

  const applyCategoryQuickPreset = (
    category: string,
    presets: CategoryQuickPreset[],
    presetId: string,
    noun: string,
  ) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    const pending = files.filter(
      (f) => f.status === "pending" && getCategoryFromExt(f.ext) === category,
    );
    const applicable = pending.filter((f) => {
      if (preset.targetFormat || preset.toggleTargets) {
        return resolvePresetTarget(f, preset) !== null;
      }
      return true;
    });
    if (applicable.length === 0) {
      showToast(`No pending ${noun} can use “${preset.label}”`, "error");
      return;
    }
    const ids = new Set(applicable.map((f) => f.id));
    setFiles((prev) =>
      prev.map((f) => {
        if (!ids.has(f.id)) return f;
        const nextTarget = resolvePresetTarget(f, preset);
        return {
          ...f,
          quality: preset.quality ?? f.quality,
          targetFormat: nextTarget || f.targetFormat,
          resizeWidth:
            preset.resizeWidth !== undefined
              ? preset.resizeWidth
              : f.resizeWidth,
          resizeHeight:
            preset.resizeHeight !== undefined
              ? preset.resizeHeight
              : f.resizeHeight,
        };
      }),
    );
    showToast(
      `Applied “${preset.label}” to ${applicable.length} ${noun}${applicable.length > 1 ? "s" : ""}`,
    );
  };

  const applyVideoQuickPreset = (presetId: string) => {
    applyCategoryQuickPreset("video", videoQuickPresets, presetId, "video");
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
    if (!isQueued(id)) return;
    setFiles((prev) => {
      if (!prev.some((f) => f.id === id)) return prev;
      return prev.map((f) => (f.id === id ? { ...f, ...updates } : f));
    });
  };

  const duplicateFile = (item: FileItem) => {
    const small =
      item.file.size > 0 && item.file.size <= INLINE_UPLOAD_MAX_BYTES;
    const newItem: FileItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      status: "pending" as const,
      startTime: undefined,
      endTime: undefined,
      result: undefined,
      outputSize: undefined,
      // Fresh staging session (server consume is one-shot per uploadId)
      uploadId: undefined,
      uploading: !small,
      uploadReady: small,
      uploadError: undefined,
      progress: undefined,
      progressPhase: undefined,
    };
    const itemIndex = files.findIndex((f) => f.id === item.id);
    const newFiles = [...files];
    newFiles.splice(itemIndex + 1, 0, newItem);
    setFiles(newFiles);
    if (!small) {
      setTimeout(() => enqueueAutoUpload([newItem]), 0);
    }
  };

  const removeFile = (id: string) => {
    dropQueueItems((f) => f.id !== id);
  };

  // ─── Leave-page guard ─────────────────────────────────────────────────────
  // The queue is in-memory only, so a reload or tab close destroys unfinished
  // work. Browsers only show their confirmation when a beforeunload listener
  // cancels the event, and they show their own dialog text (cannot be styled).
  const unfinishedRef = useRef(false);
  useEffect(() => {
    unfinishedRef.current = hasUnfinishedWork(files);
  }, [files]);
  useEffect(() => {
    const warnOnLeave = (e: BeforeUnloadEvent) => {
      if (!unfinishedRef.current) return;
      e.preventDefault();
      // Legacy browsers need an explicit returnValue to show the prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warnOnLeave);
    return () => window.removeEventListener("beforeunload", warnOnLeave);
  }, []);

  // Logo / Converter nav fires this from HomeClient. Empty queue brings the hero back.
  // Latest handler kept in a ref so the listener subscribes once, not per render.
  const resetQueueRef = useRef<() => void>(() => {});
  useEffect(() => {
    resetQueueRef.current = () => {
      resetQueue();
      // "Start over" is the only reset that also drops the chosen format pair.
      changePreferredFormats(null, null);
    };
  });
  useEffect(() => {
    const handleResetQueue = () => resetQueueRef.current();
    window.addEventListener("convertek:reset-queue", handleResetQueue);
    return () =>
      window.removeEventListener("convertek:reset-queue", handleResetQueue);
  }, []);

  const convertFile = async (raw: FileItem): Promise<boolean> => {
    // Latest queue row only — never continue work for deleted items
    if (!isQueued(raw.id)) return false;
    const item = filesRef.current.find((f) => f.id === raw.id);
    if (!item) return false;

    if (!item.targetFormat) {
      showToast(`Please select a target format for ${item.name}`, "error");
      return false;
    }

    // Block convert until auto-staging finishes (pending only; error retry re-uploads)
    if (
      item.status === "pending" &&
      (item.uploading || (!item.uploadReady && !item.uploadError))
    ) {
      showToast(
        "Wait until this file finishes uploading before converting.",
        "error",
      );
      return false;
    }

    // Video: never run two heavy jobs at once (memory / dyno timeouts)
    if (isVideoItem(item.ext, item.targetFormat)) {
      const otherVideoBusy = filesRef.current.some(
        (f) =>
          f.id !== item.id &&
          f.status === "converting" &&
          isVideoItem(f.ext, f.targetFormat),
      );
      if (otherVideoBusy) {
        showToast(
          "Another video is converting. Wait for it to finish (one video at a time).",
          "error",
        );
        return false;
      }
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
        return true;
      }
      showToast(`File is already in .${item.ext.toUpperCase()} format`, "error");
      return false;
    }

    if (
      item.file.size >
      getMaxUploadBytesForCategory(
        isVideoItem(item.ext, item.targetFormat) ? "video" : getCategoryFromExt(item.ext),
      )
    ) {
      const kind = isVideoItem(item.ext, item.targetFormat) ? "video" : "file";
      const msg = payloadTooLargeMessage(item.file.size, { kind });
      updateFile(item.id, { status: "error", error: msg, endTime: Date.now() });
      showToast(msg, "error");
      return true;
    }

    if (
      !AUDIO_CONVERSION_ENABLED &&
      (getCategoryFromExt(item.ext) === "audio" ||
        getCategoryFromExt(item.targetFormat) === "audio")
    ) {
      const msg = audioUnavailableMessage();
      updateFile(item.id, { status: "error", error: msg, endTime: Date.now() });
      showToast(msg, "error");
      return true;
    }

    if (
      !VIDEO_CONVERSION_ENABLED &&
      (getCategoryFromExt(item.ext) === "video" ||
        getCategoryFromExt(item.targetFormat) === "video")
    ) {
      const msg = videoUnavailableMessage();
      updateFile(item.id, { status: "error", error: msg, endTime: Date.now() });
      showToast(msg, "error");
      return true;
    }

    const controller = ensureAbortController(item.id);

    // Wait for auto-upload if still in progress, then convert with staged uploadId
    let stagedUploadId = item.uploadId;
    const inflight = uploadJobsRef.current.get(item.id);
    if (!stagedUploadId && inflight) {
      updateFile(item.id, {
        status: "converting",
        progressPhase: "uploading",
        progress: item.progress ?? 0,
        startTime: Date.now(),
        error: undefined,
      });
      syncBatchProgress();
      stagedUploadId = (await inflight) ?? undefined;
      if (!isQueued(item.id) || controller.signal.aborted) return false;
    }

    if (!isQueued(item.id) || controller.signal.aborted) return false;

    updateFile(item.id, {
      status: "converting",
      startTime: Date.now(),
      endTime: undefined,
      result: undefined,
      outputSize: undefined,
      progress: stagedUploadId ? 90 : 0,
      progressPhase: stagedUploadId ? "converting" : "uploading",
      error: undefined,
      queueMessage: undefined,
      // Staging is consumed by convert; clear local flag immediately
      uploading: false,
      uploadId: undefined,
      uploadReady: false,
    });
    syncBatchProgress();

    try {
      const response = await uploadAndConvert({
        file: item.file,
        fileName: item.name,
        sourceExt: item.ext,
        targetFormat: item.targetFormat,
        quality: item.quality,
        resizeWidth: item.resizeWidth,
        resizeHeight: item.resizeHeight,
        convertUrl: getConvertApiPath(item.ext),
        uploadId: stagedUploadId,
        signal: controller.signal,
        onProgress: (p) => {
          if (!isQueued(item.id) || controller.signal.aborted) return;
          updateFile(item.id, {
            progress: p.percent,
            progressPhase: p.phase,
            queueMessage: p.queueMessage,
          });
        },
      });

      if (!isQueued(item.id) || controller.signal.aborted) return false;

      if (!response.ok) {
        throw new Error(
          await readApiError(response, `Conversion failed (${response.status})`),
        );
      }

      const blob = await response.blob();
      if (!isQueued(item.id) || controller.signal.aborted) return false;
      if (blob.size === 0) throw new Error("Received empty file from server");

      const conversionId = response.headers.get("X-Conversion-Id") || item.id;
      const outputPackage =
        response.headers.get("X-Output-Package") === "zip" ? "zip" : undefined;
      const pageCountHeader = response.headers.get("X-Page-Count");
      const pageCount = pageCountHeader
        ? parseInt(pageCountHeader, 10)
        : undefined;
      const endTime = Date.now();
      const startTime = item.startTime || endTime;
      const outputExt = outputPackage === "zip" ? "zip" : item.targetFormat;

      // Durable history only when signed in (account-scoped IndexedDB)
      if (currentUser?.id) {
        // Local history is a convenience: closed/blocked IndexedDB or a quota
        // failure must not turn a finished conversion into a failed one.
        try {
          await saveLocalConversion({
            id: conversionId,
            fileName: item.name,
            originalExt: item.ext,
            targetExt: outputExt,
            category: getCategoryFromExt(item.ext) || "other",
            inputSize: item.size,
            outputSize: blob.size,
            status: "done",
            duration: endTime - startTime,
            error: null,
            mimeType: blob.type || "application/octet-stream",
            data: blob,
            accountKey: currentUser.id,
          });
        } catch (storageErr) {
          console.warn("Could not save conversion to local history:", storageErr);
        }
      }

      if (!isQueued(item.id) || controller.signal.aborted) return false;

      updateFile(item.id, {
        status: "done",
        result: blob,
        endTime,
        outputSize: blob.size,
        outputPackage,
        pageCount: Number.isFinite(pageCount) ? pageCount : undefined,
        progress: undefined,
        progressPhase: undefined,
      });
      syncBatchProgress();

      if (currentUser?.id) {
        setRecentConversions((prev) => [
          {
            id: conversionId,
            fileName: item.name,
            originalExt: item.ext,
            targetExt: outputExt,
            category: getCategoryFromExt(item.ext) || "other",
            inputSize: item.size,
            outputSize: blob.size,
            status: "done",
            duration: endTime - startTime,
            error: null,
            createdAt: new Date().toISOString(),
          },
          ...prev.filter((c) => c.id !== conversionId),
        ].slice(0, 5));
      }

      if (outputPackage === "zip" && pageCount) {
        showToast(
          `${item.name}: ${pageCount} pages saved as ZIP (${item.targetFormat.toUpperCase()})`,
        );
      } else {
        showToast(`${item.name} converted successfully!`);
      }
      return true;
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted || !isQueued(item.id)) {
        return false;
      }
      const message = humanizeConversionError(
        err instanceof Error ? err.message : "Conversion failed",
      );
      const endTime = Date.now();
      const startTime = item.startTime || endTime;
      const needsRestage =
        item.file.size > INLINE_UPLOAD_MAX_BYTES &&
        /session expired|session not found|re-add the file|re-upload/i.test(
          message,
        );
      if (needsRestage) {
        updateFile(item.id, {
          status: "pending",
          error: undefined,
          endTime,
          progress: 3,
          progressPhase: "uploading",
          uploadId: undefined,
          uploadReady: false,
          uploading: true,
          uploadError: message,
        });
        abortControllersRef.current.delete(item.id);
        setTimeout(() => {
          const live = filesRef.current.find((f) => f.id === item.id);
          if (live) void stageFileItem(live);
        }, 0);
        showToast(
          `${item.name}: upload expired — re-uploading automatically…`,
          "error",
        );
        return true;
      }
      updateFile(item.id, {
        status: "error",
        error: message,
        endTime,
        progress: undefined,
        progressPhase: undefined,
        uploadId: undefined,
        uploadReady: false,
      });
      if (currentUser?.id) {
        void saveLocalConversion({
          id: item.id,
          fileName: item.name,
          originalExt: item.ext,
          targetExt: item.targetFormat,
          category: getCategoryFromExt(item.ext) || "other",
          inputSize: item.size,
          outputSize: 0,
          status: "error",
          duration: endTime - startTime,
          error: message,
          accountKey: currentUser.id,
        }).catch(() => undefined);
      }
      showToast(message, "error");
      return true;
    }
  };

  const convertAll = async () => {
    const stillUploading = filesRef.current.some(
      (f) =>
        f.status === "pending" &&
        (Boolean(f.uploading) || (!f.uploadReady && !f.uploadError)),
    );
    if (stillUploading) {
      showToast("Wait until all uploads finish before converting.", "error");
      return;
    }

    // Small files first; non-video parallel (≤5), videos one-by-one after
    const pending = filesRef.current.filter(
      (f) =>
        f.status === "pending" &&
        f.targetFormat &&
        (f.uploadReady || Boolean(f.uploadError)),
    );
    if (pending.length === 0) return;

    const bySizeAsc = (a: FileItem, b: FileItem) => a.size - b.size;
    const nonVideos = pending
      .filter((f) => !isVideoItem(f.ext, f.targetFormat))
      .sort(bySizeAsc);
    const videos = pending
      .filter((f) => isVideoItem(f.ext, f.targetFormat))
      .sort(bySizeAsc);
    const ordered = [...nonVideos, ...videos];
    if (videos.length > 1) {
      showToast(
        `${videos.length} videos will convert one at a time after smaller files (keeps the server stable).`,
      );
    }

    const runId = ++batchRunRef.current;
    batchIdsRef.current = ordered.map((o) => o.id);
    syncBatchProgress();

    /** Parallel worker pool — min(limit, items), each worker pulls next index. */
    const runPool = async (
      items: FileItem[],
      limit: number,
    ): Promise<void> => {
      if (items.length === 0) return;
      let next = 0;
      const workers = Array.from(
        { length: Math.min(Math.max(1, limit), items.length) },
        async () => {
          while (true) {
            if (batchRunRef.current !== runId) return;
            const i = next;
            next += 1;
            if (i >= items.length) return;
            const item = items[i];
            if (!isQueued(item.id)) continue;
            syncBatchProgress();
            await convertFile(item);
            if (batchRunRef.current !== runId) return;
            syncBatchProgress();
          }
        },
      );
      await Promise.all(workers);
    };

    // Match server CONVERT_MAX_CONCURRENT default (5 light jobs)
    await runPool(nonVideos, 5);

    // Videos: still serial (heavy ffmpeg + server video slot = 1)
    for (let i = 0; i < videos.length; i++) {
      if (batchRunRef.current !== runId) break;
      if (!isQueued(videos[i].id)) continue;
      syncBatchProgress();
      await convertFile(videos[i]);
      if (batchRunRef.current !== runId) break;
      syncBatchProgress();
    }

    if (batchRunRef.current === runId) {
      batchIdsRef.current = null;
      setBatchProgress(null);
    }
  };

  const downloadFile = (item: FileItem) => {
    if (!item.result) return;
    const baseName = item.name.replace(/\.[^/.]+$/, "");
    const url = URL.createObjectURL(item.result);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      item.outputPackage === "zip"
        ? brandedDownloadFilename(`${baseName}-pages`, "zip")
        : brandedDownloadFilename(baseName, item.targetFormat || "bin");
    a.click();
    URL.revokeObjectURL(url);
  };

  const pdfRasterTargets = new Set([
    "png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "tif", "ico", "avif",
  ]);

  const downloadAll = async () => {
    if (!canBulkExport) return;
    const done = files.filter((f) => f.status === "done" && f.result);
    for (let i = 0; i < done.length; i++) {
      downloadFile(done[i]);
      // Stagger so browsers / WebView allow multiple downloads
      if (i < done.length - 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  };

  const saveBookmark = async (item: FileItem) => {
    if (!item.targetFormat) return;
    if (!currentUser) {
      openAuth("login");
      showToast("Sign in or sign up to save bookmarks", "error");
      return;
    }
    try {
      const res = await fetch("/api/bookmarks", {
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
      if (res.status === 401) {
        openAuth("login");
        showToast("Sign in or sign up to save bookmarks", "error");
        return;
      }
      if (!res.ok) {
        showToast("Failed to save bookmark", "error");
        return;
      }
      showToast("Bookmark saved — open Bookmarks to manage");
    } catch {
      showToast("Failed to save bookmark", "error");
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const doneCount = files.filter((f) => f.status === "done").length;
  const convertingCount = files.filter((f) => f.status === "converting").length;
  const mergeableCount = files.filter((f) => getMergeSourceBlob(f) !== null).length;
  const errorCount = files.filter((f) => f.status === "error").length;

  /** Staging in progress — only format select stays usable */
  const isUploading = files.some(
    (f) =>
      f.status === "pending" &&
      (Boolean(f.uploading) || (!f.uploadReady && !f.uploadError)),
  );
  /** Convert jobs in flight */
  const isConverting =
    convertingCount > 0 || Boolean(batchProgress);
  /**
   * Lock convert / download / bulk / extras so the queue never stuck mid-upload
   * or mid-convert. Format dropdown stays open while `isUploading` only.
   */
  const isQueueBusy = isConverting || isUploading;
  /** Convert when every pending file finished staging (ready) or failed staging */
  const pendingAwaitingUpload = files.filter(
    (f) =>
      f.status === "pending" &&
      !f.uploadReady &&
      !f.uploadError,
  ).length;
  const canStartConvert =
    pendingCount > 0 &&
    !isQueueBusy &&
    pendingAwaitingUpload === 0 &&
    files.some(
      (f) =>
        f.status === "pending" &&
        !!f.targetFormat &&
        (f.uploadReady || Boolean(f.uploadError)),
    );
  /**
   * Download All / ZIP only after every queue item has finished (done or error)
   * and nothing is still converting — avoids extra load mid-batch.
   */
  const canBulkExport =
    doneCount > 0 &&
    pendingCount === 0 &&
    convertingCount === 0 &&
    !batchProgress &&
    !isUploading;

  const allTargetFormats = (() => {
    const all = new Set<string>();
    files.filter((f) => f.status === "pending").forEach((f) => {
      (targetsForExt(f.ext, targetFormatsMap) || []).forEach((t) => all.add(t));
    });
    return [...all].sort();
  })();

  const groupedTargetFormats = (formatList: string[]) => {
    if (!formatsData?.grouped) return [];

    // Flatten all enabled formats from the data
    const enabledFormats = new Set<string>();
    Object.values(formatsData.grouped).forEach((group) => {
      group.formats.forEach((f) => enabledFormats.add(f.ext));
    });

    const groups: Record<string, string[]> = {};
    for (const fmt of formatList) {
      if (!enabledFormats.has(fmt)) continue;

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
        const targets = targetsForExt(f.ext, targetFormatsMap);
        if (targets.includes(format)) {
          return { ...f, targetFormat: format };
        }
        return f;
      }),
    );
    const applicableCount = files.filter(
      (f) =>
        f.status === "pending" &&
        targetsForExt(f.ext, targetFormatsMap).includes(format),
    ).length;
    showToast(`Applied .${format.toUpperCase()} to ${applicableCount} file(s)`);
  };

  const hasPendingVideo = files.some(
    (f) => getCategoryFromExt(f.ext) === "video" && f.status === "pending",
  );
  const hasPendingAudio = files.some(
    (f) => getCategoryFromExt(f.ext) === "audio" && f.status === "pending",
  );
  const hasPendingImage = files.some(
    (f) => getCategoryFromExt(f.ext) === "image" && f.status === "pending",
  );
  const hasPendingDocument = files.some(
    (f) => getCategoryFromExt(f.ext) === "document" && f.status === "pending",
  );
  const hasPendingData = files.some(
    (f) => getCategoryFromExt(f.ext) === "data" && f.status === "pending",
  );
  const hasPendingArchive = files.some(
    (f) => getCategoryFromExt(f.ext) === "archive" && f.status === "pending",
  );
  const hasPendingSubtitle = files.some(
    (f) => getCategoryFromExt(f.ext) === "subtitle" && f.status === "pending",
  );
  const hasPendingPdf = files.some(
    (f) => f.ext === "pdf" && f.status === "pending",
  );

  const availablePresetCategories = useMemo(() => {
    const list: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [];
    if (hasPendingPdf) list.push({ id: "pdf", label: "PDF Tools", icon: FileIcon });
    if (hasPendingDocument) list.push({ id: "document", label: "Document", icon: FileText });
    if (hasPendingImage) list.push({ id: "image", label: "Image", icon: Sparkles });
    if (hasPendingVideo) list.push({ id: "video", label: "Video", icon: Film });
    if (hasPendingAudio) list.push({ id: "audio", label: "Audio", icon: Music2 });
    if (hasPendingData) list.push({ id: "data", label: "Data", icon: Database });
    if (hasPendingArchive) list.push({ id: "archive", label: "Archive", icon: Archive });
    if (hasPendingSubtitle) list.push({ id: "subtitle", label: "Subtitle", icon: Subtitles });
    return list;
  }, [
    hasPendingPdf,
    hasPendingDocument,
    hasPendingImage,
    hasPendingVideo,
    hasPendingAudio,
    hasPendingData,
    hasPendingArchive,
    hasPendingSubtitle,
  ]);

  const defaultPresetTab = availablePresetCategories[0]?.id ?? "document";
  const [presetTabChoice, setPresetTabChoice] = useState<string>();
  const activePresetTab =
    presetTabChoice &&
    availablePresetCategories.some((c) => c.id === presetTabChoice)
      ? presetTabChoice
      : defaultPresetTab;

  const requestedCategories = [preferredFrom, preferredTo].map((format) => format && getCategoryFromExt(format));
  const mediaUnavailable =
    (requestedCategories.includes("audio") && !AUDIO_CONVERSION_ENABLED) ||
    (requestedCategories.includes("video") && !VIDEO_CONVERSION_ENABLED);

  const hasFiles = files.length > 0;
  const completedConversions = recentConversions.filter((conversion) => isConversionSuccess(conversion.status)).slice(0, 5);

  const urlImport = (
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
  );

  return (
    <div className={hasFiles ? "space-y-5 pb-20 sm:space-y-6 sm:pb-0" : "space-y-5 sm:space-y-6"}>
      {!hasFiles && (
        <Card ref={uploadCardRef} className="mx-auto w-full min-w-0 max-w-3xl scroll-mt-24 gap-0 rounded-2xl border-border bg-card py-0 shadow-sm">
          <CardContent className="p-3 sm:p-5">
            <ConverterFormatFields
              from={preferredFrom}
              to={preferredTo}
              sourceFormats={pickerFormats.sources}
              lockedSource={embedded && Boolean(preferredFrom)}
              outputFormats={pickerFormats.outputs}
              onChange={changePreferredFormats}
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={fileAccept}
              hidden
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <div
              className={`flex min-h-36 flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed p-3.5 text-center sm:min-h-40 ${
                dragOver
                  ? "border-emerald-600 bg-emerald-100 dark:bg-emerald-950/70"
                  : "border-emerald-500/45 bg-slate-50/70 dark:bg-slate-900/55"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <span className="grid size-9 place-items-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <Upload aria-hidden="true" className="size-5" />
              </span>
              <Button
                type="button"
                className="h-11 w-full max-w-60 rounded-lg bg-emerald-700 px-6 font-semibold text-white hover:bg-emerald-800"
                onClick={() => fileInputRef.current?.click()}
              >
                {preferredFrom ? `Choose ${preferredFrom.toUpperCase()} files` : "Choose files"}
              </Button>
              <p className="text-sm text-muted-foreground">{dragOver ? "Drop files to add them" : "or drag and drop"}</p>
            </div>
            <p className="mt-2.5 text-center text-xs text-muted-foreground">
              {formatNonVideoMaxUploadLabel()} per file · {formatVideoMaxUploadLabel()} per video
            </p>
            {mediaUnavailable && (
              <p className="mt-2 text-center text-sm text-destructive">This media conversion is currently unavailable.</p>
            )}
            <details className="mt-2 text-center">
              <summary className="mx-auto w-fit cursor-pointer py-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">Import from a link</summary>
              <div className="mt-4">{urlImport}</div>
            </details>
          </CardContent>
        </Card>
      )}

      {hasFiles && (
        <div ref={uploadCardRef} className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={fileAccept}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              Queue active ({files.length} file{files.length === 1 ? "" : "s"})
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              · Up to {MAX_NONVIDEO_BATCH} files total
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 text-xs font-semibold"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Add more files
          </Button>
        </div>
      )}

      {/* ─── File Queue ─── */}
      {batchProgress && batchProgress.total > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-600 dark:text-sky-400" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
              <span className="text-sky-700 dark:text-sky-300 font-medium truncate">
                {batchProgress.current}/{batchProgress.total} converting…
              </span>
              <span className="text-sky-600 dark:text-sky-400 font-mono shrink-0">
                {Math.round(
                  ((batchProgress.current - 1) / batchProgress.total) * 100,
                )}
                %
              </span>
            </div>
            <div className="h-2 bg-sky-100 dark:bg-sky-900/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-[width] duration-300"
                style={{
                  width: `${Math.max(
                    8,
                    ((batchProgress.current - 0.15) / batchProgress.total) * 100,
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Quick Presets (single tabbed section, above queue) ─── */}
      {availablePresetCategories.length > 0 && (
        <Card data-slot="quick-presets" className="border-border/60 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm">Quick presets</h3>
                <p className="text-[11px] text-muted-foreground">
                  One tap applies the right output format for the files in your queue
                </p>
              </div>
            </div>

            <Tabs
              value={activePresetTab}
              onValueChange={(v) => setPresetTabChoice(v)}
            >
              <TabsList className="h-auto w-full flex-wrap justify-start gap-1.5 rounded-xl p-1">
                {availablePresetCategories.map((cat) => (
                  <TabsTrigger
                    key={cat.id}
                    value={cat.id}
                    className="flex-none h-7 gap-1.5 rounded-lg px-2.5 text-xs font-medium [&_svg]:size-3.5"
                  >
                    <cat.icon className="h-3.5 w-3.5" />
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {hasPendingPdf && (
                <TabsContent value="pdf" className="mt-3">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white shrink-0">
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
                                  a.download = brandedDownloadFilename(
                                    `${pdfFile.name.replace(/\.pdf$/i, "")}-pages`,
                                    "zip",
                                  );
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
                </TabsContent>
              )}

              {hasPendingDocument && (
                <TabsContent value="document" className="mt-3">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">Document presets</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Jump to PDF, TXT, or DOCX
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {documentQuickPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          applyCategoryQuickPreset(
                            "document",
                            documentQuickPresets,
                            preset.id,
                            "document",
                          )
                        }
                        className="flex items-center gap-2.5 p-3 rounded-xl border border-border hover:border-sky-400/60 hover:bg-sky-50/80 dark:hover:bg-sky-950/25 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold">{preset.label}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {preset.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              )}

              {hasPendingImage && (
                <TabsContent value="image" className="mt-3">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center text-white shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">Image presets</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Square crop, WhatsApp size, or quality
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {imageQuickActions.map((preset) => {
                      const Icon = preset.id === "square" ? Crop : MessageCircle;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            applyCategoryQuickPreset(
                              "image",
                              imageQuickActions,
                              preset.id,
                              "image",
                            )
                          }
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-border hover:border-violet-400/60 hover:bg-violet-50/80 dark:hover:bg-violet-950/25 text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold">{preset.label}</div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {preset.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {qualityPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        disabled={isQueueBusy}
                        onClick={() => {
                          if (isQueueBusy) return;
                          applyPresetToAll(preset.quality);
                        }}
                        className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-left transition-colors disabled:opacity-50 disabled:pointer-events-none"
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
                </TabsContent>
              )}

              {hasPendingVideo && (
                <TabsContent value="video" className="mt-3">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shrink-0">
                      <Film className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">Video presets</h3>
                      <p className="text-[11px] text-muted-foreground">
                        One tap for compress, WhatsApp, or MP3 extract
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {videoQuickPresets.map((preset) => {
                      const Icon =
                        preset.id === "whatsapp"
                          ? MessageCircle
                          : preset.id === "extract-mp3"
                            ? Music2
                            : Film;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyVideoQuickPreset(preset.id)}
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-border hover:border-amber-400/60 hover:bg-amber-50/80 dark:hover:bg-amber-950/25 text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold">{preset.label}</div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {preset.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>
              )}

              {hasPendingAudio && (
                <TabsContent value="audio" className="mt-3">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white shrink-0">
                      <Music2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">Audio presets</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Voice, podcast, or music bitrate
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {audioQuickPresets.map((preset) => {
                      const Icon =
                        preset.id === "voice"
                          ? Mic
                          : preset.id === "podcast"
                            ? Radio
                            : Music2;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            applyCategoryQuickPreset(
                              "audio",
                              audioQuickPresets,
                              preset.id,
                              "audio file",
                            )
                          }
                          className="flex items-center gap-2.5 p-3 rounded-xl border border-border hover:border-rose-400/60 hover:bg-rose-50/80 dark:hover:bg-rose-950/25 text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold">{preset.label}</div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {preset.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>
              )}

              {hasPendingData && (
                <TabsContent value="data" className="mt-3">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">Data presets</h3>
                      <p className="text-[11px] text-muted-foreground">
                        CSV, JSON, or Excel in one tap
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {dataQuickPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          applyCategoryQuickPreset(
                            "data",
                            dataQuickPresets,
                            preset.id,
                            "data file",
                          )
                        }
                        className="flex items-center gap-2.5 p-3 rounded-xl border border-border hover:border-emerald-400/60 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/25 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                          <Database className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold">{preset.label}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {preset.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              )}

              {hasPendingArchive && (
                <TabsContent value="archive" className="mt-3">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white shrink-0">
                      <Archive className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">Archive presets</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Unpack &amp; repack as ZIP or 7Z
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {archiveQuickPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          applyCategoryQuickPreset(
                            "archive",
                            archiveQuickPresets,
                            preset.id,
                            "archive",
                          )
                        }
                        className="flex items-center gap-2.5 p-3 rounded-xl border border-border hover:border-orange-400/60 hover:bg-orange-50/80 dark:hover:bg-orange-950/25 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-700 dark:text-orange-300 flex items-center justify-center shrink-0">
                          <Archive className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold">{preset.label}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {preset.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              )}

              {hasPendingSubtitle && (
                <TabsContent value="subtitle" className="mt-3">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shrink-0">
                      <Subtitles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">Subtitle presets</h3>
                      <p className="text-[11px] text-muted-foreground">
                        Toggle between SRT and VTT
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {subtitleQuickPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          applyCategoryQuickPreset(
                            "subtitle",
                            subtitleQuickPresets,
                            preset.id,
                            "subtitle",
                          )
                        }
                        className="flex items-center gap-2.5 p-3 rounded-xl border border-border hover:border-indigo-400/60 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/25 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                          <Subtitles className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold">{preset.label}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {preset.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {files.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 px-3 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                  <Layers className="w-4 h-4" />
                  Conversion Queue
                  <Badge variant="secondary" className="text-xs">
                    {files.length}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-normal">
                    {formatBytes(files.reduce((sum, f) => sum + f.size, 0))} total
                  </span>
                </CardTitle>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  Mix any file types in one batch — pick a different output format for each file.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]" aria-live="polite">
                  {pendingCount > 0 && (
                    <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300">
                      {pendingCount} awaiting conversion
                    </Badge>
                  )}
                  {convertingCount > 0 && (
                    <Badge variant="outline" className="border-sky-300 text-sky-700 dark:text-sky-300">
                      {convertingCount} processing
                    </Badge>
                  )}
                  {doneCount > 0 && (
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300">
                      {doneCount} ready to download
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-300">
                      {errorCount} needs attention
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Limits: {formatNonVideoMaxUploadLabel()} per file · {formatVideoMaxUploadLabel()} per video · {MAX_NONVIDEO_BATCH} files per batch.
                  <span className="ml-1 inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                    <Shield className="h-3 w-3" aria-hidden /> Temporary processing; downloads stay in your browser.
                  </span>
                </p>
              </div>
              <div className="flex w-full items-center gap-2 flex-wrap sm:w-auto sm:justify-end">
                {pendingCount > 1 && !isConverting && (
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
                  className="hidden sm:inline-flex"
                  onClick={convertAll}
                  disabled={!canStartConvert}
                  title={
                    isUploading
                      ? "Wait until all uploads finish"
                      : isConverting
                        ? "Conversion in progress"
                        : undefined
                  }
                >
                  {isQueueBusy ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  )}
                  {isUploading
                    ? "Uploading…"
                    : isConverting
                      ? "Converting…"
                      : "Convert All"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={downloadAll}
                  disabled={!canBulkExport}
                  title={
                    canBulkExport
                      ? "Download all converted files"
                      : "Available when every file has finished converting"
                  }
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={async () => {
                    if (!canBulkExport) return;
                    const doneFiles = files.filter(
                      (f) => f.status === "done" && f.result,
                    );
                    if (doneFiles.length === 0) return;
                    showToast(`Creating ZIP with ${doneFiles.length} files...`);
                    try {
                      const { default: JSZip } = await import("jszip");
                      const zip = new JSZip();
                      const usedNames = new Set<string>();
                      for (const f of doneFiles) {
                        const baseName = f.name.replace(/\.[^/.]+$/, "");
                        const arrayBuffer = await f.result!.arrayBuffer();
                        const entryBase =
                          f.outputPackage === "zip"
                            ? `${baseName}-pages`
                            : baseName;
                        const entryExt =
                          f.outputPackage === "zip"
                            ? "zip"
                            : f.targetFormat || "bin";
                        const preferred = brandedDownloadFilename(
                          entryBase,
                          entryExt,
                        );
                        zip.file(
                          uniqueZipEntryName(usedNames, preferred),
                          arrayBuffer,
                        );
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
                  disabled={!canBulkExport}
                  title={
                    canBulkExport
                      ? "Download all as ZIP"
                      : "Available when every file has finished converting"
                  }
                >
                  <DownloadCloud className="w-3.5 h-3.5 mr-1" />
                  ZIP
                </Button>
                {mergeableCount >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    disabled={isQueueBusy}
                    onClick={async () => {
                      if (isQueueBusy) return;
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
                    Merge
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  onClick={() => dropQueueItems(isActiveItem)}
                  disabled={doneCount + errorCount === 0 || isQueueBusy}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Clear Done</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="sm:flex-none"
                  onClick={resetQueue}
                  disabled={files.length === 0}
                  aria-label="Clear all files"
                  title="Clear queue and cancel active uploads/conversions"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* ── Prominent Batch Completion Banner with Quick ZIP Download ── */}
          {canBulkExport && doneCount > 0 && (
            <div className="mx-3 sm:mx-6 mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-xs">
                  <Check className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    All {doneCount} file{doneCount === 1 ? "" : "s"} converted successfully!
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Ready to save to your device.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="default"
                  className="flex-1 sm:flex-none h-9 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm font-semibold text-xs px-4"
                  onClick={async () => {
                    const doneFiles = files.filter(
                      (f) => f.status === "done" && f.result,
                    );
                    if (doneFiles.length === 0) return;
                    showToast(`Creating ZIP with ${doneFiles.length} files...`);
                    try {
                      const { default: JSZip } = await import("jszip");
                      const zip = new JSZip();
                      const usedNames = new Set<string>();
                      for (const f of doneFiles) {
                        const baseName = f.name.replace(/\.[^/.]+$/, "");
                        const arrayBuffer = await f.result!.arrayBuffer();
                        const entryBase =
                          f.outputPackage === "zip"
                            ? `${baseName}-pages`
                            : baseName;
                        const entryExt =
                          f.outputPackage === "zip"
                            ? "zip"
                            : f.targetFormat || "bin";
                        const preferred = brandedDownloadFilename(
                          entryBase,
                          entryExt,
                        );
                        zip.file(
                          uniqueZipEntryName(usedNames, preferred),
                          arrayBuffer,
                        );
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
                >
                  <DownloadCloud className="w-4 h-4 mr-1.5" />
                  Download All (ZIP)
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  className="h-9 rounded-lg text-xs px-3"
                  onClick={downloadAll}
                  title="Download individually"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Files</span>
                </Button>
              </div>
            </div>
          )}

          <CardContent className="pt-0 px-3 sm:px-6">
            <div className="max-h-[min(55vh,28rem)] sm:max-h-[50vh] overflow-y-auto pr-1 sm:pr-2 overflow-x-hidden">
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
                      className={`p-3 rounded-xl border flex flex-col cursor-grab active:cursor-grabbing transition-all shadow-xs ${
                        item.status === "done"
                          ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40"
                          : item.status === "error"
                            ? "border-red-300 dark:border-red-700 bg-red-50/70 dark:bg-red-950/40"
                            : item.status === "converting"
                              ? "border-sky-300 dark:border-sky-700 bg-sky-50/70 dark:bg-sky-950/40"
                              : "border-border bg-card/60 hover:bg-card/90"
                      } ${dragIndex === itemIndex ? "opacity-50 ring-2 ring-emerald-500 ring-offset-1" : ""}`}
                    >
                      <Collapsible>
                        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Grip Handle */}
                          <div className="hidden sm:block text-muted-foreground/40 mr-0.5 cursor-grab shrink-0">
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* File Thumbnail */}
                          <FileThumbnail item={item} />

                          {/* File Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs sm:text-sm font-semibold truncate leading-snug">
                              {item.name}
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground mt-0.5 flex-wrap">
                              <span className="uppercase font-mono font-medium">
                                .{item.ext}
                              </span>
                              {item.status === "done" && item.outputSize != null ? (
                                <>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 font-mono border-emerald-400/70 text-emerald-700 dark:text-emerald-300"
                                  >
                                    {formatBytes(item.size)} → {formatBytes(item.outputSize)}
                                  </Badge>
                                  {item.size > 0 && (
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] px-1.5 py-0 ${
                                        item.outputSize < item.size
                                          ? "border-emerald-400 text-emerald-600 dark:text-emerald-400"
                                          : item.outputSize > item.size
                                            ? "border-amber-400 text-amber-700 dark:text-amber-400"
                                            : "border-border text-muted-foreground"
                                      }`}
                                    >
                                      {formatSizeChangeLabel(
                                        item.size,
                                        item.outputSize,
                                      )}
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
                              ) : (
                                <span>{formatBytes(item.size)}</span>
                              )}
                              {item.status === "error" && (
                                <span className="flex w-full max-w-md flex-wrap items-center gap-x-2 gap-y-1 text-red-600 dark:text-red-400 font-medium break-words">
                                  <span>{item.error || "Conversion failed"}</span>
                                  <span className="font-normal text-[10px] text-muted-foreground">
                                    Choose another format or retry.
                                  </span>
                                </span>
                              )}
                              {item.status === "pending" && item.uploading && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex flex-col gap-1.5 w-full max-w-xs">
                                  <span className="flex items-center gap-1">
                                    <Upload className="w-3 h-3" />
                                    Uploading…
                                    {typeof item.progress === "number"
                                      ? ` ${item.progress}%`
                                      : ""}
                                  </span>
                                  <span
                                    className="h-1.5 w-full rounded-full bg-emerald-100 dark:bg-emerald-950 overflow-hidden"
                                    role="progressbar"
                                    aria-valuenow={item.progress ?? 0}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  >
                                    <span
                                      className="block h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                                      style={{
                                        width: `${Math.min(100, Math.max(0, item.progress ?? 5))}%`,
                                      }}
                                    />
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-normal">
                                    File uploads now — convert when ready
                                  </span>
                                </span>
                              )}
                              {item.status === "pending" &&
                                item.uploadReady &&
                                !item.uploading && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Ready to convert
                                  </span>
                                )}
                              {item.status === "pending" && item.uploadError && (
                                <span className="text-amber-600 dark:text-amber-400 font-medium break-words">
                                  Upload failed — convert will re-upload
                                </span>
                              )}
                              {item.status === "converting" && (
                                <span className="text-sky-600 dark:text-sky-400 font-medium flex flex-col gap-1.5 w-full max-w-xs">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 animate-spin" />
                                    {item.progressPhase === "queued"
                                      ? item.queueMessage
                                        ? item.queueMessage.slice(0, 80)
                                        : "In line… waiting for a free slot"
                                      : item.progressPhase === "converting"
                                        ? isVideoItem(item.ext, item.targetFormat)
                                          ? "Encoding video… (may take a few minutes)"
                                          : "Converting…"
                                        : item.progressPhase === "reading"
                                          ? "Reading file…"
                                          : "Uploading…"}
                                    {typeof item.progress === "number" &&
                                    item.progressPhase !== "queued" &&
                                    item.progressPhase !== "converting"
                                      ? ` ${item.progress}%`
                                      : item.progressPhase === "converting"
                                        ? ""
                                        : ""}
                                  </span>
                                  <span
                                    className="h-1.5 w-full rounded-full bg-sky-100 dark:bg-sky-950 overflow-hidden"
                                    role="progressbar"
                                    aria-valuenow={
                                      item.progressPhase === "converting"
                                        ? 70
                                        : (item.progress ?? 0)
                                    }
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                  >
                                    <span
                                      className={`block h-full rounded-full transition-[width] duration-300 ${
                                        item.progressPhase === "queued"
                                          ? "bg-amber-500"
                                          : "bg-sky-500"
                                      } ${
                                        item.progressPhase === "converting"
                                          ? "animate-pulse"
                                          : ""
                                      }`}
                                      style={{
                                        width:
                                          item.progressPhase === "converting"
                                            ? "70%"
                                            : `${Math.min(100, Math.max(0, item.progress ?? 5))}%`,
                                      }}
                                    />
                                  </span>
                                  {item.progressPhase === "uploading" ? (
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                      Conversion starts after upload completes
                                    </span>
                                  ) : item.progressPhase === "queued" ? (
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                      Busy server — auto-retry. Keep this tab open.
                                    </span>
                                  ) : item.progressPhase === "converting" &&
                                    isVideoItem(item.ext, item.targetFormat) ? (
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                      Keep this tab open — long video encode runs
                                      in the background
                                    </span>
                                  ) : item.progressPhase === "converting" ? (
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                      Processing on the server — keep this tab open
                                    </span>
                                  ) : null}
                                </span>
                              )}
                            </div>
                            {item.status === "done" &&
                              item.outputSize &&
                              item.size > 0 && (
                                <div className="mt-2 max-w-xs">
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
                                      Before {formatBytes(item.size)}
                                    </span>
                                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                                      After {formatBytes(item.outputSize)}
                                    </span>
                                  </div>
                                </div>
                              )}
                          </div>
                          </div>

                          {/* Action strip: full width row on mobile, inline on desktop */}
                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-t-0">
                          {/* Format Selector */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-mono text-muted-foreground uppercase hidden sm:inline">
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
                                  const small =
                                    item.file.size > 0 &&
                                    item.file.size <= INLINE_UPLOAD_MAX_BYTES;
                                  const reset: Partial<FileItem> = {
                                    targetFormat: val,
                                    status: "pending",
                                    result: undefined,
                                    outputSize: undefined,
                                    outputPackage: undefined,
                                    pageCount: undefined,
                                    endTime: undefined,
                                    uploadId: undefined,
                                    uploadReady: small,
                                    uploading: !small,
                                    uploadError: undefined,
                                  };
                                  updateFile(item.id, reset);
                                  // Re-stage large files only after failed/reconvert
                                  if (!small) {
                                    setTimeout(() => {
                                      const live = filesRef.current.find(
                                        (f) => f.id === item.id,
                                      );
                                      if (live) enqueueAutoUpload([live]);
                                    }, 0);
                                  }
                                } else {
                                  updateFile(item.id, { targetFormat: val });
                                }
                              }}
                              disabled={item.status === "converting" || isConverting}
                            >
                              <SelectTrigger aria-label={`Output format for ${item.name}`} className="w-20 sm:w-24 h-8 text-xs font-semibold">
                                <SelectValue placeholder="Format">{item.targetFormat.toUpperCase()}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {groupedTargetFormats(
                                  (targetsForExt(item.ext, targetFormatsMap) || []).filter(
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
                                  ZIP
                                </Badge>
                              )}
                            {item.status === "done" && item.outputPackage === "zip" && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] whitespace-nowrap"
                              >
                                {item.pageCount ?? "?"}p ZIP
                              </Badge>
                            )}
                          </div>

                          {/* Actions — Convert only after THIS file finished staging; format always until convert runs */}
                          <div className="flex items-center gap-1 shrink-0">
                            {item.status === "pending" &&
                              !isConverting &&
                              !item.uploading &&
                              (item.uploadReady || Boolean(item.uploadError)) && (
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
                                  className="h-9 bg-emerald-700 text-xs text-white hover:bg-emerald-800"
                                  onClick={() => convertFile(item)}
                                  title={
                                    item.uploadError
                                      ? "Retry convert (will re-upload)"
                                      : "Convert"
                                  }
                                  aria-label="Convert file"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 mr-1" />{" "}
                                  Convert
                                </Button>
                              </>
                            )}
                            {(item.status === "converting" ||
                              (item.status === "pending" &&
                                (isConverting ||
                                  item.uploading ||
                                  (!item.uploadReady && !item.uploadError)))) && (
                              <div
                                className="w-8 h-8 flex items-center justify-center"
                                title={
                                  item.status === "converting"
                                    ? "Converting…"
                                    : item.uploading ||
                                        (!item.uploadReady && !item.uploadError)
                                      ? "Uploading… only format is available until upload finishes"
                                      : "Waiting in queue — remove with X to skip"
                                }
                              >
                                {item.status === "pending" &&
                                (item.uploading ||
                                  (!item.uploadReady && !item.uploadError)) ? (
                                  <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                                ) : (
                                  <Clock className="w-4 h-4 text-sky-600" />
                                )}
                              </div>
                            )}
                            {item.status === "done" && !isQueueBusy && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => downloadFile(item)}
                                  title="Download"
                                  aria-label={`Download ${item.name}`}
                                >
                                  <Download className="w-4 h-4 text-emerald-600" />
                                </Button>
                                {item.outputPackage !== "zip" &&
                                  canPreviewResult(item) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  onClick={() => {
                                    if (item.result) {
                                      const baseName = item.name.replace(
                                        /\.[^/.]+$/,
                                        "",
                                      );
                                      openPreview(
                                        item.result,
                                        `${baseName}.${item.targetFormat}`,
                                      );
                                    }
                                  }}
                                  title="Preview"
                                  aria-label={`Preview ${item.name}`}
                                  >
                                    <Eye className="w-4 h-4 text-sky-500" />
                                  </Button>
                                )}
                                {currentUser ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => saveBookmark(item)}
                                    title="Save as bookmark"
                                  >
                                    <BookmarkPlus className="w-4 h-4 text-amber-500" />
                                  </Button>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openAuth("login")}
                                        aria-label="Sign in to bookmark"
                                      >
                                        <BookmarkPlus className="w-4 h-4 text-amber-500/70" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="max-w-[220px] text-center"
                                    >
                                      Sign in or sign up to save bookmarks
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </>
                            )}
                            {item.status === "error" && !isQueueBusy && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-300"
                                onClick={() => convertFile(item)}
                                title="Retry conversion"
                                aria-label={`Retry conversion for ${item.name}`}
                              >
                                <RotateCcw className="mr-1 h-3.5 w-3.5 text-amber-500" />
                                Retry
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeFile(item.id)}
                              title="Remove from queue"
                              aria-label="Remove from queue"
                            >
                              <X className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
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

      {/* ─── Image Resize Options (below queue) ─── */}
      {hasPendingImage && (
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

      {currentUser && completedConversions.length > 0 && (
        <details className="group mx-auto w-full max-w-3xl rounded-xl border border-border bg-card">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-4 text-sm font-semibold hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
            <History aria-hidden="true" className="size-4 text-emerald-700 dark:text-emerald-300" />
            Recent conversions
            <ChevronDown aria-hidden="true" className="ml-auto size-4 text-muted-foreground group-open:rotate-180" />
          </summary>
          <ul className="divide-y divide-border/60 border-t border-border/60 px-4">
            {completedConversions.map((conversion) => (
              <li key={conversion.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-4">
                <span className="truncate text-sm font-medium" title={conversion.fileName}>
                  {conversion.fileName}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-xs uppercase text-muted-foreground">
                  {conversion.originalExt}
                  <ArrowRightLeft aria-hidden="true" className="size-3" />
                  {conversion.targetExt}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:block">{formatDate(conversion.createdAt)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* ─── Image Preview Dialog ─── */}
      <Dialog
        open={previewUrl !== null}
        onOpenChange={handleOpenChange}
      >
        <DialogContent className="max-w-3xl w-[calc(100%-1.5rem)] sm:w-full">
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
              onClick={closePreview}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile sticky Convert All */}
      {pendingCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 sm:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <Button
            className="w-full h-12 rounded-xl bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800 shadow-lg shadow-emerald-700/20"
            onClick={convertAll}
            disabled={!canStartConvert}
          >
            {isQueueBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUploading
                  ? "Uploading…"
                  : batchProgress
                    ? `${batchProgress.current}/${batchProgress.total} converting…`
                    : "Converting…"}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Convert {pendingCount} file{pendingCount > 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
