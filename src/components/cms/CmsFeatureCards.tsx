"use client";

import type { ReactNode } from "react";
import { Sparkles, Layers, Code2, Zap, Shield, FileIcon } from "lucide-react";
import type { CmsFeature } from "@/hooks/use-cms";

const ICON_MAP: Record<string, ReactNode> = {
  FileIcon: <FileIcon className="w-5 h-5" />,
  LayersIcon: <Layers className="w-5 h-5" />,
  CodeIcon: <Code2 className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  Shield: <Shield className="w-5 h-5" />,
  Sparkles: <Sparkles className="w-5 h-5" />,
};

function resolveIcon(icon: string) {
  if (ICON_MAP[icon]) return ICON_MAP[icon];
  if (icon.length <= 3) {
    return <span className="text-lg leading-none">{icon}</span>;
  }
  return <Sparkles className="w-5 h-5" />;
}

export function CmsFeatureCards({ features }: { features: CmsFeature[] }) {
  if (!features.length) return null;

  return (
    <section className="mt-10 mb-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.id}
            className="rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              {resolveIcon(f.icon)}
            </div>
            <h3 className="text-sm font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              {f.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
