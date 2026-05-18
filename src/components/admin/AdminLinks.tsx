"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Link as LinkIcon, ExternalLink, Save, Search, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Link {
  id: string;
  label: string;
  url: string;
  group: string;
  enabled: boolean;
  order: number;
  icon: string | null;
}

export function AdminLinks() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingLink, setEditingLink] = useState<Partial<Link> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/links");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load links");
      }
      const data = await res.json();
      setLinks(data.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load links";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  const handleSave = async () => {
    if (!editingLink?.label || !editingLink?.url || !editingLink?.group) {
      setError("Label, URL, and group are required.");
      return;
    }

    try {
      setError(null);
      const method = editingLink.id ? "PUT" : "POST";
      const res = await fetch("/api/admin/links", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingLink),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save link");
      }

      loadLinks();
      setShowDialog(false);
      setEditingLink(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save link";
      setError(message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setError(null);
      const res = await fetch(`/api/admin/links?id=${deleteConfirm}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete link");
      }
      setDeleteConfirm(null);
      loadLinks();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete link";
      setError(message);
    }
  };

  const filteredLinks = links.filter(
    (l) =>
      l.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.group.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Navigation Links</h2>
          <p className="text-sm text-muted-foreground">
            Manage header, footer, and social navigation
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingLink({ label: "", url: "", group: "header_nav", enabled: true, order: 0 });
            setShowDialog(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Link
        </Button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search links by label, URL or group..."
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

      <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Label</th>
                <th className="px-6 py-4">URL / Path</th>
                <th className="px-6 py-4">Group</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-6 py-4">
                      <div className="h-10 bg-muted/50 animate-pulse rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <LinkIcon className="w-8 h-8 text-muted-foreground opacity-20" />
                      <p className="text-muted-foreground">No links found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-muted/30 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground cursor-grab" />
                        <span className="font-bold">{link.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                        {link.url}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter bg-muted/50">
                        {link.group.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {link.enabled ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-200 text-[10px] h-5">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px] h-5">
                            Hidden
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-600"
                          onClick={() => {
                            setEditingLink(link);
                            setShowDialog(true);
                          }}
                          aria-label="Edit link"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-full hover:bg-red-50 hover:text-red-500"
                          onClick={() => setDeleteConfirm(link.id)}
                          aria-label="Delete link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLink?.id ? "Edit Link" : "Add New Link"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  placeholder="e.g. Terms of Service"
                  value={editingLink?.label || ""}
                  onChange={(e) => setEditingLink({ ...editingLink, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <Select
                  value={editingLink?.group || "header_nav"}
                  onValueChange={(val) => setEditingLink({ ...editingLink, group: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="header_nav">Header Navigation</SelectItem>
                    <SelectItem value="footer_product">Footer Product</SelectItem>
                    <SelectItem value="footer_company">Footer Company</SelectItem>
                    <SelectItem value="footer_legal">Footer Legal</SelectItem>
                    <SelectItem value="social">Social Links</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL / Path</Label>
              <Input
                placeholder="e.g. /terms or https://twitter.com/..."
                value={editingLink?.url || ""}
                onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Order</Label>
                <Input
                  type="number"
                  value={editingLink?.order || 0}
                  onChange={(e) => setEditingLink({ ...editingLink, order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Icon (Optional)</Label>
                <Input
                  placeholder="lucide icon name"
                  value={editingLink?.icon || ""}
                  onChange={(e) => setEditingLink({ ...editingLink, icon: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 mt-2">
              <div className="space-y-0.5">
                <Label>Visibility</Label>
                <p className="text-xs text-muted-foreground">
                  Show this link in the designated group
                </p>
              </div>
              <Switch
                checked={editingLink?.enabled ?? true}
                onCheckedChange={(checked) => setEditingLink({ ...editingLink, enabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Save className="w-4 h-4 mr-2" />
              {editingLink?.id ? "Update Link" : "Add Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Link</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this link? This action cannot be undone.
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
