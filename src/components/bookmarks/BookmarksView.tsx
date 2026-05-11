"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Download, Trash2, Plus, Copy, Star, Bookmark, BookmarkPlus, ArrowRightLeft, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge"; // not actually needed but fine
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { type ViewType, categoryMeta } from "@/lib/formats";
import { type BookmarkRecord, type FormatsData } from "@/lib/app-types";
import { getCategoryIconLg } from "@/lib/app-helpers";
import { categoryColors, categoryBorderColors } from "@/lib/app-constants";
import { Breadcrumb } from "@/components/common/Breadcrumb";

export function BookmarksView({ navigate }: { navigate: (view: ViewType) => void }) {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInput, setNewInput] = useState("");
  const [newOutput, setNewOutput] = useState("");
  const [newCategory, setNewCategory] = useState("image");
  const [formatsList, setFormatsList] = useState<FormatsData | null>(null);
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: "success" | "error" }[]
  >([]);

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

  const loadBookmarks = useCallback(() => {
    fetch("/api/bookmarks")
      .then((r) => r.json())
      .then((data) => setBookmarks(data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadBookmarks();
    fetch("/api/formats")
      .then((r) => r.json())
      .then(setFormatsList)
      .catch(() => {});
  }, [loadBookmarks]);

  const addBookmark = async () => {
    if (!newName || !newInput || !newOutput) {
      showToast("Please fill all fields", "error");
      return;
    }
    try {
      await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          inputExt: newInput,
          outputExt: newOutput,
          category: newCategory,
        }),
      });
      loadBookmarks();
      setShowAdd(false);
      setNewName("");
      setNewInput("");
      setNewOutput("");
      showToast("Bookmark created!");
    } catch {
      showToast("Failed to create bookmark", "error");
    }
  };

  const deleteBookmark = async (id: string) => {
    await fetch(`/api/bookmarks?id=${id}`, { method: "DELETE" });
    loadBookmarks();
    showToast("Bookmark deleted");
  };

  const exportBookmarks = () => {
    const json = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transmute-bookmarks.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Bookmarks exported!");
  };

  const importBookmarks = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (Array.isArray(imported)) {
          for (const bm of imported) {
            await fetch("/api/bookmarks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bm),
            });
          }
          loadBookmarks();
          showToast(`Imported ${imported.length} bookmarks!`);
        }
      } catch {
        showToast("Invalid bookmark file", "error");
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
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

      <Breadcrumb
        items={[{ label: "Home", view: "converter" }, { label: "Bookmarks" }]}
        navigate={navigate}
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookmarks</h1>
          <p className="text-muted-foreground mt-1">
            Save your favorite conversion presets for quick access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportBookmarks}
            disabled={bookmarks.length === 0}
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={importBookmarks}>
            <Copy className="w-4 h-4 mr-1" />
            Import
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Bookmark
          </Button>
        </div>
      </div>

      {/* BKI Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: <BookmarkPlus className="w-5 h-5" />,
            label: "Batch Presets",
            desc: "Save conversion presets to apply to multiple files at once",
            color: "bg-amber-500",
          },
          {
            icon: <Star className="w-5 h-5" />,
            label: "Key Formats",
            desc: "Pin your most-used format pairs for one-click access",
            color: "bg-emerald-500",
          },
          {
            icon: <Copy className="w-5 h-5" />,
            label: "Import & Export",
            desc: "Share your bookmark collection across devices and teams",
            color: "bg-violet-500",
          },
        ].map((f) => (
          <Card key={f.label} className="card-elevated card-inner-glow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${f.color} rounded-lg flex items-center justify-center text-white`}
                >
                  {f.icon}
                </div>
                <div>
                  <div className="font-semibold text-sm">{f.label}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Bookmarks List */}
      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950 rounded-2xl flex items-center justify-center">
            <Bookmark className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="font-semibold text-lg">No bookmarks yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Save your favorite conversion presets for quick access. Convert a
            file and bookmark it, or create one manually.
          </p>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Create Your First Bookmark
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bookmarks.map((bm) => (
            <Card
              key={bm.id}
              className={`overflow-hidden border-l-4 ${categoryBorderColors[bm.category] || "border-l-gray-500"}`}
            >
              <CardContent className="p-0">
                <div className="flex items-center gap-3 p-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${
                      categoryColors[bm.category] || "bg-gray-500"
                    }`}
                  >
                    {getCategoryIconLg(bm.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{bm.name}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono uppercase bg-muted px-1.5 py-0.5 rounded">
                        {bm.inputExt}
                      </span>
                      <ArrowRightLeft className="w-3 h-3" />
                      <span className="font-mono uppercase bg-muted px-1.5 py-0.5 rounded">
                        {bm.outputExt}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => deleteBookmark(bm.id)}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Bookmark Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bookmark</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input
                placeholder="e.g., PNG to WebP"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Input Format</Label>
                <Input
                  placeholder="png"
                  value={newInput}
                  onChange={(e) => setNewInput(e.target.value.toLowerCase())}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Output Format</Label>
                <Input
                  placeholder="webp"
                  value={newOutput}
                  onChange={(e) => setNewOutput(e.target.value.toLowerCase())}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryMeta).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={addBookmark}>Create Bookmark</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
