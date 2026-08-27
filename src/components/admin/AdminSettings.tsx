"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Globe,
  Lock,
  RefreshCw,
  MonitorSmartphone,
  Server,
  Code,
  Database,
  Package,
  FileText,
  Archive,
  BarChart3,
  Loader2,
  Check,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type ManagedSetting = {
  key: string;
  value: string;
  type: string;
  category: string;
  description: string | null;
};

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  general: {
    label: "General",
    icon: <Globe className="w-4 h-4" />,
    color: "text-emerald-500",
  },
  conversion: {
    label: "Conversion",
    icon: <RefreshCw className="w-4 h-4" />,
    color: "text-sky-500",
  },
  analytics: {
    label: "Analytics & traffic",
    icon: <BarChart3 className="w-4 h-4" />,
    color: "text-violet-500",
  },
  donations: {
    label: "Donations (/donate page)",
    icon: <Heart className="w-4 h-4" />,
    color: "text-rose-500",
  },
};

const SETTING_LABELS: Record<string, string> = {
  analytics_enabled: "Traffic analytics",
  donate_kofi_url: "Ko-fi URL",
  donate_paypal_url: "PayPal URL",
  donate_buymeacoffee_url: "Buy Me a Coffee URL",
  donate_contact_email: "Donation contact email",
};

function isTruthy(v: string) {
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export function AdminSettings() {
  const [settings, setSettings] = useState<ManagedSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load settings");
      const list = Array.isArray(data.data) ? (data.data as ManagedSetting[]) : [];
      setSettings(list);
      const nextDrafts: Record<string, string> = {};
      for (const s of list) nextDrafts[s.key] = s.value;
      setDrafts(nextDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
      setSettings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveSetting = async (key: string, value: string | boolean | number) => {
    setSavingKey(key);
    setError(null);
    setSavedKey(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save setting");
      const savedVal = data.data?.value != null ? String(data.data.value) : String(value);
      setSettings((prev) =>
        prev.map((s) => (s.key === key ? { ...s, value: savedVal } : s)),
      );
      setDrafts((prev) => ({ ...prev, [key]: savedVal }));
      setSavedKey(key);
      setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save setting");
    } finally {
      setSavingKey(null);
    }
  };

  const grouped = settings.reduce<Record<string, ManagedSetting[]>>(
    (acc, s) => {
      const cat = s.category || "general";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(s);
      return acc;
    },
    {},
  );

  const categoryOrder = ["donations", "analytics", "general", "conversion"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Application Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure conversions, branding, donations, and traffic analytics
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading settings…
        </div>
      ) : (
        <div className="space-y-6">
          {categoryOrder
            .filter((cat) => (grouped[cat] || []).length > 0)
            .map((cat) => {
              const meta = CATEGORY_META[cat] || {
                label: cat,
                icon: <Settings className="w-4 h-4" />,
                color: "text-muted-foreground",
              };
              const rows = grouped[cat] || [];
              return (
                <Card key={cat} className="card-elevated">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <span className={meta.color}>{meta.icon}</span>
                      {meta.label}
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        {rows.length}
                      </Badge>
                    </CardTitle>
                    {cat === "analytics" ? (
                      <CardDescription className="text-xs">
                        When enabled, anonymous page views and traffic sources
                        (referrer / UTM) appear under Admin → Analytics. IP is
                        stored as a hash only.
                      </CardDescription>
                    ) : cat === "donations" ? (
                      <CardDescription className="text-xs">
                        Links appear on the public /donate page. Leave a URL
                        empty to hide that button. Bank / IBAN details stay
                        private — users email the contact address below.
                      </CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {rows.map((s) => {
                      const draft = drafts[s.key] ?? s.value;
                      const busy = savingKey === s.key;
                      const justSaved = savedKey === s.key;

                      if (s.type === "boolean") {
                        return (
                          <div
                            key={s.key}
                            className="flex items-start justify-between gap-4 p-3 rounded-xl border border-border bg-muted/20"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium flex items-center gap-2">
                                {SETTING_LABELS[s.key] ||
                                  s.key.replace(/_/g, " ")}
                                {justSaved ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : null}
                              </div>
                              {s.description ? (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {s.description}
                                </p>
                              ) : null}
                              <p className="text-[10px] font-mono text-muted-foreground mt-1">
                                {s.key}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {busy ? (
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                              ) : null}
                              <Switch
                                checked={isTruthy(draft)}
                                disabled={busy}
                                onCheckedChange={(checked) => {
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [s.key]: checked ? "true" : "false",
                                  }));
                                  void saveSetting(s.key, checked);
                                }}
                              />
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={s.key}
                          className="p-3 rounded-xl border border-border bg-muted/20 space-y-2"
                        >
                          <div>
                            <Label className="text-sm font-medium">
                              {SETTING_LABELS[s.key] ||
                                s.key.replace(/_/g, " ")}
                            </Label>
                            {s.description ? (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {s.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              type={s.type === "number" ? "number" : "text"}
                              value={draft}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [s.key]: e.target.value,
                                }))
                              }
                              className="font-mono text-sm"
                            />
                            <Button
                              size="sm"
                              className="shrink-0 bg-emerald-500 hover:bg-emerald-600"
                              disabled={busy || draft === s.value}
                              onClick={() => {
                                const val =
                                  s.type === "number"
                                    ? Number(draft)
                                    : draft;
                                void saveSetting(s.key, val);
                              }}
                            >
                              {busy ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : justSaved ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                "Save"
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

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
                value: "Next.js (App Router)",
              },
              {
                icon: <Code className="w-3.5 h-3.5" />,
                label: "Runtime",
                value: "TypeScript + Node",
              },
              {
                icon: <Database className="w-3.5 h-3.5" />,
                label: "Database",
                value: "PostgreSQL (Prisma)",
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
              {
                icon: <BarChart3 className="w-3.5 h-3.5" />,
                label: "Traffic tracking",
                value: "First-party page views",
              },
              {
                icon: <Lock className="w-3.5 h-3.5" />,
                label: "Privacy",
                value: "Hashed IP · no file bodies",
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
