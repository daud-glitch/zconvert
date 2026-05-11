"use client";

import React, { useMemo, useEffect } from "react";
import { type FileItem } from "@/lib/app-types";
import { getCategoryFromExt, getCategoryIcon } from "@/lib/app-helpers";
import { categoryColors } from "@/lib/app-constants";

export function FileThumbnail({ item }: { item: FileItem }) {
  const url = useMemo(() => {
    if (item.file.type.startsWith("image/")) {
      return URL.createObjectURL(item.file);
    }
    return null;
  }, [item.file]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  if (url) {
    return (
      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
        <img src={url} alt={item.name} className="w-full h-full object-cover" />
      </div>
    );
  }

  const cat = getCategoryFromExt(item.ext);
  return (
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${
        categoryColors[cat] || "bg-gray-500"
      }`}
    >
      {getCategoryIcon(cat)}
    </div>
  );
}
