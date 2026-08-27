"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Megaphone, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Ad {
  id: string;
  title: string;
  location: string;
  type: string;
  content: string | null;
  code: string | null;
  enabled: boolean;
  order: number;
}

export function AdminAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAd, setEditingAd] = useState<Partial<Ad> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadAds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ads");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load ads");
      }
      const data = await res.json();
      setAds(data.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load ads";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const handleSave = async () => {
    if (!editingAd?.title || !editingAd?.location || !editingAd?.type) {
      setError("Title, location, and type are required.");
      return;
    }

    try {
      setError(null);
      const method = editingAd.id ? "PUT" : "POST";
      const res = await fetch("/api/admin/ads", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingAd),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save ad");
      }

      loadAds();
      setShowDialog(false);
      setEditingAd(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save ad";
      setError(message);
    }
  };

  const toggleAd = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch("/api/admin/ads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to toggle ad");
      }
      loadAds();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle ad";
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
      const res = await fetch(`/api/admin/ads?id=${deleteConfirm}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete ad");
      }
      setDeleteConfirm(null);
      loadAds();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete ad";
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ad Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage advertisement placements and visibility
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAd({ title: "", location: "homepage_top", type: "banner", enabled: true, order: 0 });
            setShowDialog(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Placement
        </Button>
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
                <th className="px-6 py-4">Placement Title</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Type</th>
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
              ) : ads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Megaphone className="w-8 h-8 opacity-20" />
                      No ad placements found
                    </div>
                  </td>
                </tr>
              ) : (
                ads.map((ad) => (
                  <tr key={ad.id} className="hover:bg-muted/30 group transition-colors">
                    <td className="px-6 py-4 font-bold">{ad.title}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-[10px] uppercase bg-muted/50">
                        {ad.location.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-tighter">
                        {ad.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <Switch
                          checked={ad.enabled}
                          onCheckedChange={() => toggleAd(ad.id, ad.enabled)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-600"
                          onClick={() => {
                            setEditingAd(ad);
                            setShowDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 rounded-full hover:bg-red-50 hover:text-red-500"
                          onClick={() => handleDelete(ad.id)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAd?.id ? "Edit Ad Placement" : "Add Ad Placement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Placement Title</Label>
              <Input
                placeholder="e.g. Homepage Top Banner"
                value={editingAd?.title || ""}
                onChange={(e) => setEditingAd({ ...editingAd, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Select
                  value={editingAd?.location || "homepage_top"}
                  onValueChange={(val) => setEditingAd({ ...editingAd, location: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="homepage_top">Homepage Top</SelectItem>
                    <SelectItem value="homepage_side">Homepage Sidebar</SelectItem>
                    <SelectItem value="converter_top">Converter Top</SelectItem>
                    <SelectItem value="converter_side">Converter Sidebar</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ad Type</Label>
                <Select
                  value={editingAd?.type || "banner"}
                  onValueChange={(val) => setEditingAd({ ...editingAd, type: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Image Banner</SelectItem>
                    <SelectItem value="code">HTML/JS Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ad Content / Code</Label>
              <Textarea
                placeholder="Paste your ad code or content here..."
                className="min-h-[120px] font-mono text-xs"
                value={editingAd?.code || editingAd?.content || ""}
                onChange={(e) => setEditingAd({ ...editingAd, code: e.target.value, content: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="space-y-0.5">
                <Label>Visibility</Label>
                <p className="text-xs text-muted-foreground">
                  Show this ad to public users
                </p>
              </div>
              <Switch
                checked={editingAd?.enabled ?? true}
                onCheckedChange={(checked) => setEditingAd({ ...editingAd, enabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Save className="w-4 h-4 mr-2" />
              {editingAd?.id ? "Update Ad" : "Add Placement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ad Placement</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this ad placement? This action cannot be undone.
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
