"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Save, Zap, Search, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  order: number;
}

export function AdminFeatures() {
  const [features, setFeatures] = useState<FeatureCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Partial<FeatureCard> | null>(null);

  const loadFeatures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/features");
      const data = await res.json();
      setFeatures(data.data || []);
    } catch (error) {
      console.error("Failed to load features:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const handleSave = async () => {
    if (!editingFeature?.title || !editingFeature?.description) return;

    try {
      const method = editingFeature.id ? "PUT" : "POST";
      const res = await fetch("/api/admin/features", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingFeature),
      });

      if (res.ok) {
        loadFeatures();
        setShowDialog(false);
        setEditingFeature(null);
      }
    } catch (error) {
      console.error("Failed to save feature:", error);
    }
  };

  const toggleFeature = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch("/api/admin/features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });
      if (res.ok) loadFeatures();
    } catch (error) {
      console.error("Failed to toggle feature:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feature?")) return;
    try {
      const res = await fetch(`/api/admin/features?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) loadFeatures();
    } catch (error) {
      console.error("Failed to delete feature:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Features</h2>
          <p className="text-sm text-muted-foreground">
            Manage feature cards displayed on the homepage
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingFeature({ title: "", description: "", icon: "Zap", enabled: true, order: 0 });
            setShowDialog(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Feature
        </Button>
      </div>

      <Card className="overflow-hidden border-border/50 shadow-sm bg-card">
        <div className="divide-y divide-border/50">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="p-6 animate-pulse bg-muted/20 h-24" />
            ))
          ) : features.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No features found</p>
            </div>
          ) : (
            features.map((feature) => (
              <div
                key={feature.id}
                className="p-6 flex items-center justify-between hover:bg-muted/30 transition-all group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="cursor-grab text-muted-foreground/30 hover:text-muted-foreground">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground truncate max-w-md">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {feature.enabled ? "Active" : "Disabled"}
                    </span>
                    <Switch
                      checked={feature.enabled}
                      onCheckedChange={() => toggleFeature(feature.id, feature.enabled)}
                    />
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full hover:bg-emerald-500/10 hover:text-emerald-600"
                      onClick={() => {
                        setEditingFeature(feature);
                        setShowDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-full hover:bg-red-50 hover:text-red-500"
                      onClick={() => handleDelete(feature.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFeature?.id ? "Edit Feature" : "Add Feature Card"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="e.g. Batch Conversion"
                value={editingFeature?.title || ""}
                onChange={(e) => setEditingFeature({ ...editingFeature, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Brief description of the feature"
                value={editingFeature?.description || ""}
                onChange={(e) => setEditingFeature({ ...editingFeature, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon Name</Label>
                <Input
                  placeholder="lucide icon name"
                  value={editingFeature?.icon || "Zap"}
                  onChange={(e) => setEditingFeature({ ...editingFeature, icon: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={editingFeature?.order || 0}
                  onChange={(e) => setEditingFeature({ ...editingFeature, order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="space-y-0.5">
                <Label>Enabled</Label>
                <p className="text-xs text-muted-foreground">
                  Show this card on the homepage
                </p>
              </div>
              <Switch
                checked={editingFeature?.enabled ?? true}
                onCheckedChange={(checked) => setEditingFeature({ ...editingFeature, enabled: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Save className="w-4 h-4 mr-2" />
              {editingFeature?.id ? "Update Feature" : "Add Feature"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
