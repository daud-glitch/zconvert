"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Layers,
  File as FileIcon,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Search,
  Save,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type FormatStatusData,
  type FormatStatusItem,
} from "@/lib/app-types";
import { categoryColors, categoryBorderColors } from "@/lib/app-constants";
import { getCategoryIcon } from "@/lib/app-helpers";
import { notifyFormatsChanged } from "@/hooks/use-formats";

export function AdminFormats() {
  const [formatStatus, setFormatStatus] = useState<FormatStatusData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<
    (FormatStatusItem & { category: string }) | null
  >(null);
  const [editTargets, setEditTargets] = useState("");
  const [saving, setSaving] = useState(false);

  const loadStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/format-status", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Failed to load (${res.status})`);
      }
      setFormatStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load formats");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const syncCatalog = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/formats/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Sync failed");
      }
      await loadStatus(true);
      notifyFormatsChanged(data.version);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const toggleFormat = async (id: string | null, enabled: boolean) => {
    if (!id) {
      setError("Format is not in the database yet. Click Sync Catalog first.");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/admin/formats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled: !enabled }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update format");
      }
      notifyFormatsChanged(data.version);
      await loadStatus(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle format");
    }
  };

  const toggleCategoryFormats = async (
    formats: FormatStatusItem[],
    enabled: boolean,
  ) => {
    const ids = formats.map((f) => f.id).filter(Boolean) as string[];
    if (ids.length === 0) {
      setError("No database format IDs. Click Sync Catalog first.");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/admin/format-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, enabled }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Bulk update failed");
      }
      notifyFormatsChanged(data.version);
      await loadStatus(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk update failed");
    }
  };

  const openEdit = (fmt: FormatStatusItem, category: string) => {
    setEditing({ ...fmt, category });
    setEditTargets(fmt.targetFormats.join(", "));
  };

  const saveEdit = async () => {
    if (!editing?.id) {
      setError("Format is not in the database yet. Click Sync Catalog first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const targets = editTargets
        .split(/[\s,]+/)
        .map((t) => t.trim().toLowerCase().replace(/^\./, ""))
        .filter(Boolean);
      const res = await fetch("/api/admin/formats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          name: editing.name,
          description: editing.description,
          enabled: editing.enabled,
          targetFormats: targets,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save format");
      }
      notifyFormatsChanged(data.version);
      setEditing(null);
      await loadStatus(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save format");
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!formatStatus) return [];
    const q = search.trim().toLowerCase();
    if (!q) return formatStatus.categories;
    return formatStatus.categories
      .map((cat) => ({
        ...cat,
        formats: (cat.formats || []).filter(
          (f) =>
            f.ext.includes(q) ||
            f.name.toLowerCase().includes(q) ||
            f.description.toLowerCase().includes(q),
        ),
      }))
      .filter(
        (cat) =>
          cat.category.includes(q) ||
          cat.label.toLowerCase().includes(q) ||
          (cat.formats && cat.formats.length > 0),
      );
  }, [formatStatus, search]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center text-white">
          <Layers className="w-6 h-6" />
        </div>
        <p className="text-sm text-muted-foreground">Loading format library...</p>
      </div>
    );
  }

  if (!formatStatus) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
        <Button onClick={() => loadStatus()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Format Library</h2>
          <p className="text-sm text-muted-foreground">
            Enable/disable formats live — changes sync to the public site
            immediately.
            {formatStatus.source && (
              <>
                {" "}
                Source:{" "}
                <span className="font-medium text-foreground">
                  {formatStatus.source}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button
            size="sm"
            variant="outline"
            onClick={syncCatalog}
            disabled={syncing}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Catalog"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Formats",
            value: formatStatus.totalFormats || 0,
            icon: <FileIcon className="w-4 h-4" />,
            color: "bg-emerald-500",
          },
          {
            label: "Enabled Live",
            value: formatStatus.enabledFormats ?? formatStatus.totalFormats,
            icon: <CheckCircle2 className="w-4 h-4" />,
            color: "bg-sky-500",
          },
          {
            label: "Conversion Pairs",
            value: formatStatus.totalPairs?.toLocaleString() || "0",
            icon: <ArrowRightLeft className="w-4 h-4" />,
            color: "bg-violet-500",
          },
          {
            label: "Partial Cats",
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
              className={`w-9 h-9 ${s.color} rounded-lg flex items-center justify-center text-white shrink-0`}
            >
              {s.icon}
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold truncate">{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search formats or categories..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filteredCategories.map((cat) => {
          const isOpen = expanded[cat.category] ?? false;
          const formats = cat.formats || [];
          return (
            <Card
              key={cat.category}
              className={`card-elevated border ${categoryBorderColors[cat.category] || "border-border"}`}
            >
              <CardContent className="p-0">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [cat.category]: !isOpen,
                    }))
                  }
                >
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div
                    className={`w-10 h-10 ${categoryColors[cat.category] || "bg-gray-500"} rounded-xl flex items-center justify-center text-white shrink-0`}
                  >
                    {getCategoryIcon(cat.category, "w-5 h-5")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold capitalize">
                        {cat.label}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-2 py-0.5 font-semibold ${
                          cat.status === "functional"
                            ? "border-emerald-300 text-emerald-600 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950"
                            : "border-amber-300 text-amber-600 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950"
                        }`}
                      >
                        {cat.status === "functional"
                          ? "✓ Functional"
                          : "◐ Partial"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cat.enabledCount ?? cat.formatCount}/{cat.formatCount}{" "}
                      enabled · {cat.pairCount?.toLocaleString() || 0} pairs
                    </p>
                  </div>
                </button>

                {cat.status === "partial" && (
                  <div className="px-4 pb-3 flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>
                      {cat.note ||
                        "Some conversions may be limited by host tools or fidelity."}
                    </span>
                  </div>
                )}

                {isOpen && (
                  <div className="border-t border-border px-4 pb-4 space-y-3">
                    <div className="flex flex-wrap gap-2 pt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => toggleCategoryFormats(formats, true)}
                      >
                        Enable all
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => toggleCategoryFormats(formats, false)}
                      >
                        Disable all
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {formats.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">
                          No formats match your search.
                        </p>
                      ) : (
                        formats.map((fmt) => (
                          <div
                            key={fmt.ext}
                            className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/30"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold uppercase">
                                  .{fmt.ext}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {fmt.name}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                → {fmt.targetFormats.length} targets
                                {fmt.targetFormats.length > 0 && (
                                  <>
                                    {" "}
                                    (
                                    {fmt.targetFormats.slice(0, 6).join(", ")}
                                    {fmt.targetFormats.length > 6 ? "…" : ""})
                                  </>
                                )}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs shrink-0"
                              onClick={() => openEdit(fmt, cat.category)}
                            >
                              Edit
                            </Button>
                            <Switch
                              checked={fmt.enabled}
                              onCheckedChange={() =>
                                toggleFormat(fmt.id, fmt.enabled)
                              }
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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
                  Real conversion using native libraries on this host.
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
                  (ffmpeg, LibreOffice, RAR) may apply.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Format{editing ? ` .${editing.ext}` : ""}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={4}
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Target formats (comma-separated)</Label>
                <Textarea
                  rows={3}
                  value={editTargets}
                  onChange={(e) => setEditTargets(e.target.value)}
                  placeholder="png, jpg, webp"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-border">
                <div>
                  <Label>Enabled on website</Label>
                  <p className="text-xs text-muted-foreground">
                    Disabled formats disappear from the public converter.
                  </p>
                </div>
                <Switch
                  checked={editing.enabled}
                  onCheckedChange={(checked) =>
                    setEditing({ ...editing, enabled: checked })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={saving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
