"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { type ViewType } from "@/lib/formats";

export function Breadcrumb({
  items,
  navigate,
}: {
  items: { label: string; view?: ViewType }[];
  navigate: (view: ViewType) => void;
}) {
  return (
    <nav
      className="flex items-center gap-1.5 text-sm mb-6"
      aria-label="Breadcrumb"
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
          {item.view ? (
            <button
              onClick={() => navigate(item.view!)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
