"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, FileText, Globe, Eye, Settings, Clock, Save, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/app-helpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  enabled: boolean;
  seoTitle: string | null;
  seoDesc: string | null;
  updatedAt: string;
}

export function AdminPages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPage, setEditingPage] = useState<Partial<Page> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pages");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load pages");
      }
      const data = await res.json();
      setPages(data.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load pages";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleSave = async () => {
    if (!editingPage?.title || !editingPage?.slug || !editingPage?.content) {
      setError("Title, slug, and content are required.");
      return;
    }
    
    if (!/^[a-z0-9-]+$/.test(editingPage.slug)) {
      setError("Slug can only contain lowercase letters, numbers, and hyphens.");
      return;
    }

    try {
      setError(null);
      const method = editingPage.id ? "PUT" : "POST";
      const res = await fetch("/api/admin/pages", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPage),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save page");
      }

      loadPages();
      setShowDialog(false);
      setEditingPage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save page";
      setError(message);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setError(null);
      const res = await fetch(`/api/admin/pages?id=${deleteConfirm}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete page");
      }
      setDeleteConfirm(null);
      loadPages();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete page";
      setError(message);
    }
  };

  const filteredPages = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pages</h2>
          <p className="text-sm text-muted-foreground">
            Manage static content and legal pages
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingPage({ title: "", slug: "", content: "", enabled: true });
            setShowDialog(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4 mr-2" /> New Page
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search pages by title or slug..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-11 bg-card border-border/50"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredPages.length === 0 ? (
        <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No pages found</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {searchQuery ? "Try a different search term" : "Create your first static page to get started."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPages.map((page) => (
            <Card
              key={page.id}
              className="group relative overflow-hidden border-border/50 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300"
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg truncate group-hover:text-emerald-500 transition-colors">
                        {page.title}
                      </h3>
                      {!page.enabled && (
                        <Badge variant="outline" className="text-[10px] h-4 bg-muted text-muted-foreground">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-0.5 rounded-md font-mono">
                        <Globe className="w-3 h-3" />
                        /{page.slug}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Updated {formatDate(page.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-600"
                      onClick={() => {
                        setEditingPage(page);
                        setShowDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full hover:bg-red-50 hover:text-red-500"
                      onClick={() => handleDelete(page.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPage?.id ? "Edit Page" : "Create New Page"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Page Title</Label>
                <Input
                  placeholder="e.g. Privacy Policy"
                  value={editingPage?.title || ""}
                  onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <div className="flex items-center">
                  <span className="bg-muted px-3 h-10 flex items-center text-xs text-muted-foreground border border-r-0 rounded-l-md">
                    /
                  </span>
                  <Input
                    placeholder="privacy"
                    className="rounded-l-none"
                    value={editingPage?.slug || ""}
                    onChange={(e) => setEditingPage({ ...editingPage, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Content (Markdown/HTML)</Label>
              <Textarea
                placeholder="Enter page content..."
                className="min-h-[300px] font-mono text-sm"
                value={editingPage?.content || ""}
                onChange={(e) => setEditingPage({ ...editingPage, content: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">SEO Title (Optional)</Label>
                <Input
                  placeholder="Custom meta title"
                  className="h-9 text-sm"
                  value={editingPage?.seoTitle || ""}
                  onChange={(e) => setEditingPage({ ...editingPage, seoTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">SEO Description (Optional)</Label>
                <Input
                  placeholder="Custom meta description"
                  className="h-9 text-sm"
                  value={editingPage?.seoDesc || ""}
                  onChange={(e) => setEditingPage({ ...editingPage, seoDesc: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="space-y-0.5">
                <Label>Page Visibility</Label>
                <p className="text-xs text-muted-foreground">
                  Visible to public users when enabled
                </p>
              </div>
              <Switch
                checked={editingPage?.enabled ?? true}
                onCheckedChange={(checked) => setEditingPage({ ...editingPage, enabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Save className="w-4 h-4 mr-2" />
              {editingPage?.id ? "Update Page" : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this page? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
