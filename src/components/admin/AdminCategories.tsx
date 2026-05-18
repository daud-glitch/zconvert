"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Layers, Save, Search, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categoryColors } from "@/lib/app-constants";
import { getCategoryIcon } from "@/lib/app-helpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Category {
  id: string;
  name: string;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  enabled: boolean;
  order: number;
  _count?: { formats: number };
}

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${res.status}`);
      }
      const data = await res.json();
      setCategories(data.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load categories";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSave = async () => {
    if (!editingCategory?.name || !editingCategory?.label) {
      setError("System name and display label are required.");
      return;
    }

    try {
      setError(null);
      const method = editingCategory.id ? "PUT" : "POST";
      const res = await fetch("/api/admin/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCategory),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save category");
      }

      loadCategories();
      setShowDialog(false);
      setEditingCategory(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save category";
      setError(message);
    }
  };

  const toggleCategory = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to toggle category");
      }
      loadCategories();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to toggle category";
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
      const res = await fetch(`/api/admin/categories?id=${deleteConfirm}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete category");
      }
      setDeleteConfirm(null);
      loadCategories();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete category";
      setError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-sm text-muted-foreground">
            Manage file groups and their display settings
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory({ name: "", label: "", icon: "Layers", enabled: true, order: 0 });
            setShowDialog(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))
        ) : categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No categories found. Create one to get started.
          </div>
        ) : (
          categories.map((cat) => (
            <Card key={cat.id} className="group overflow-hidden border-border/50 hover:border-emerald-500/50 transition-all duration-300">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 ${
                      categoryColors[cat.name] || "bg-gray-500"
                    } rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/5`}
                  >
                    {getCategoryIcon(cat.name, "w-5 h-5")}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">{cat.label}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                      {cat._count?.formats || 0} formats
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={cat.enabled}
                    onCheckedChange={() => toggleCategory(cat.id, cat.enabled)}
                  />
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 rounded-full hover:bg-emerald-500/10 hover:text-emerald-600"
                      onClick={() => {
                        setEditingCategory(cat);
                        setShowDialog(true);
                      }}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 rounded-full hover:bg-red-50 hover:text-red-500"
                      onClick={() => handleDelete(cat.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory?.id ? "Edit Category" : "Add Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>System Name</Label>
                <Input
                  placeholder="e.g. image"
                  value={editingCategory?.name || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value.toLowerCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Label</Label>
                <Input
                  placeholder="e.g. Images"
                  value={editingCategory?.label || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, label: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon Name</Label>
                <Input
                  placeholder="lucide icon name"
                  value={editingCategory?.icon || "Layers"}
                  onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={editingCategory?.order || 0}
                  onChange={(e) => setEditingCategory({ ...editingCategory, order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 mt-2">
              <div className="space-y-0.5">
                <Label>Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Allow conversions for this category
                </p>
              </div>
              <Switch
                checked={editingCategory?.enabled ?? true}
                onCheckedChange={(checked) => setEditingCategory({ ...editingCategory, enabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Save className="w-4 h-4 mr-2" />
              {editingCategory?.id ? "Update Category" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this category? This action cannot be undone.
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
