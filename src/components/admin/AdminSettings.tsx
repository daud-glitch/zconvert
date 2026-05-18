"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Globe,
  Lock,
  RefreshCw,
  Key,
  FolderCog,
  Plus,
  MonitorSmartphone,
  Server,
  Code,
  Database,
  Package,
  FileText,
  Archive,
  Circle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

export function AdminSettings() {
  const [settings, setSettings] = useState<{ key: string; value: string }[]>(
    [],
  );
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [activeGroup, setActiveGroup] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(() => {
    setError(null);
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.data)) {
          setSettings(data.data);
        } else {
          setSettings([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load settings";
        setError(message);
        setSettings([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSetting = async (key: string, value: string) => {
    try {
      setError(null);
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save setting");
      }
      loadSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save setting";
      setError(message);
    }
  };

  const addSetting = async () => {
    if (!newKey || !newValue) {
      setError("Both key and value are required.");
      return;
    }
    await saveSetting(newKey, newValue);
    if (!error) {
      setNewKey("");
      setNewValue("");
      setShowAdd(false);
    }
  };

  const deleteSetting = async (key: string) => {
    try {
      setError(null);
      const res = await fetch(`/api/admin/settings?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete setting");
      }
      loadSettings();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete setting";
      setError(message);
    }
  };

  const groups = [
    {
      id: "all",
      label: "All Settings",
      icon: <Settings className="w-3.5 h-3.5" />,
    },
    {
      id: "general",
      label: "General",
      icon: <Globe className="w-3.5 h-3.5" />,
    },
    {
      id: "security",
      label: "Security",
      icon: <Lock className="w-3.5 h-3.5" />,
    },
    {
      id: "conversion",
      label: "Conversion",
      icon: <RefreshCw className="w-3.5 h-3.5" />,
    },
    { id: "api", label: "API", icon: <Key className="w-3.5 h-3.5" /> },
  ];

  const filteredSettings =
    activeGroup === "all"
      ? settings
      : settings.filter((s) => s.key.toLowerCase().startsWith(activeGroup));

  // Default setting templates
  const defaultSettings = [
    {
      key: "general.app_name",
      value: "Cloud Converter",
      label: "Application Name",
    },
    {
      key: "general.max_file_size",
      value: "104857600",
      label: "Max File Size (bytes)",
    },
    {
      key: "general.default_quality",
      value: "85",
      label: "Default Image Quality",
    },
    {
      key: "security.allow_anonymous",
      value: "true",
      label: "Allow Anonymous Access",
    },
    { key: "security.rate_limit", value: "100", label: "Rate Limit (req/min)" },
    { key: "conversion.max_batch_size", value: "50", label: "Max Batch Size" },
    {
      key: "conversion.allowed_formats",
      value: "*",
      label: "Allowed Formats (* = all)",
    },
    { key: "api.enabled", value: "true", label: "Enable REST API" },
    {
      key: "api.require_auth",
      value: "false",
      label: "Require API Authentication",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Application Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure your converter instance
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Plus className="w-4 h-4 mr-1" />
          {showAdd ? "Hide" : "Add Setting"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Add Setting Panel */}
      {showAdd && (
        <Card className="border-dashed border-2 border-emerald-300 dark:border-emerald-700">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Key</Label>
                <Input
                  placeholder="general.setting_name"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  placeholder="setting_value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={addSetting}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
                <Button variant="outline" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
              </div>
            </div>
            {/* Quick Templates */}
            <div className="mt-3">
              <p className="text-[10px] text-muted-foreground mb-1.5">
                Quick templates:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {defaultSettings.map((tpl) => (
                  <button
                    key={tpl.key}
                    onClick={() => {
                      setNewKey(tpl.key);
                      setNewValue(tpl.value);
                    }}
                    className="text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground font-mono"
                    title={tpl.label}
                  >
                    {tpl.key}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Group Filter */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => setActiveGroup(group.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeGroup === group.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {group.icon}
            {group.label}
            {group.id === "all" && (
              <Badge
                variant="secondary"
                className="text-[9px] ml-1 px-1.5 py-0"
              >
                {settings.length}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Settings Table */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
            </div>
          ) : filteredSettings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center">
                <FolderCog className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">
                {activeGroup === "all"
                  ? "No settings configured"
                  : `No ${activeGroup} settings`}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {activeGroup === "all"
                  ? "Add application settings to customize your converter instance."
                  : `No settings found in the "${activeGroup}" group.`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSettings.map((s) => (
                  <TableRow key={s.key} className="group">
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-2">
                        {s.key.startsWith("general") && (
                          <Globe className="w-3 h-3 text-muted-foreground" />
                        )}
                        {s.key.startsWith("security") && (
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        )}
                        {s.key.startsWith("conversion") && (
                          <RefreshCw className="w-3 h-3 text-muted-foreground" />
                        )}
                        {s.key.startsWith("api") && (
                          <Key className="w-3 h-3 text-muted-foreground" />
                        )}
                        {!s.key.startsWith("general") &&
                          !s.key.startsWith("security") &&
                          !s.key.startsWith("conversion") &&
                          !s.key.startsWith("api") && (
                            <Settings className="w-3 h-3 text-muted-foreground" />
                          )}
                        {s.key}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            s.value === "true"
                              ? "text-emerald-600 font-medium"
                              : s.value === "false"
                                ? "text-red-500 font-medium"
                                : ""
                          }
                        >
                          {s.value || (
                            <span className="text-muted-foreground italic">
                              empty
                            </span>
                          )}
                        </span>
                        {s.value === "true" && (
                          <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                        )}
                        {s.value === "false" && (
                          <Circle className="w-2 h-2 fill-red-400 text-red-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-50 group-hover:opacity-100"
                        onClick={() => deleteSetting(s.key)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4 text-muted-foreground" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                icon: <Server className="w-3.5 h-3.5" />,
                label: "Framework",
                value: "Next.js 16 (App Router)",
              },
              {
                icon: <Code className="w-3.5 h-3.5" />,
                label: "Runtime",
                value: "TypeScript 5 + Turbopack",
              },
              {
                icon: <Database className="w-3.5 h-3.5" />,
                label: "Database",
                value: "SQLite (Prisma ORM)",
              },
              {
                icon: <Package className="w-3.5 h-3.5" />,
                label: "Image Engine",
                value: "Sharp",
              },
              {
                icon: <FileText className="w-3.5 h-3.5" />,
                label: "PDF Engine",
                value: "pdf-lib",
              },
              {
                icon: <Archive className="w-3.5 h-3.5" />,
                label: "Archive Engine",
                value: "JSZip + Archiver",
              },
            ].map((info) => (
              <div
                key={info.label}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-background border border-border text-muted-foreground">
                  {info.icon}
                </div>
                <div>
                  <div className="text-xs font-medium">{info.value}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {info.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
