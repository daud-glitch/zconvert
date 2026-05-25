// ─── Shared Application Types ────────────────────────────────────────────────

export interface FileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  ext: string;
  status: "pending" | "converting" | "done" | "error";
  targetFormat: string;
  result?: Blob;
  error?: string;
  quality: number;
  resizeWidth: number | null;
  resizeHeight: number | null;
  startTime?: number;
  endTime?: number;
  outputSize?: number;
  /** Set when a multi-page PDF was converted to per-page images in a ZIP. */
  outputPackage?: "zip";
  pageCount?: number;
}

export interface ConversionRecord {
  id: string;
  fileName: string;
  originalExt: string;
  targetExt: string;
  category: string;
  inputSize: number;
  outputSize: number;
  status: string;
  duration: number | null;
  error: string | null;
  createdAt: string;
}

export interface BookmarkRecord {
  id: string;
  name: string;
  inputExt: string;
  outputExt: string;
  category: string;
  createdAt: string;
}

export interface FormatsData {
  grouped: Record<
    string,
    {
      meta: { label: string; color: string; bgColor: string; icon: string };
      formats: {
        ext: string;
        name: string;
        description: string;
        category: string;
        targetFormats: string[];
      }[];
      count: number;
    }
  >;
  totalFormats: number;
  totalConversions: number;
  categoryCounts: Record<string, number>;
}

// ─── Admin Types ──────────────────────────────────────────────────────────────

export interface AdminStats {
  totalConversions: number;
  totalUsers: number;
  conversionsByCategory: { category: string; count: number; size: number }[];
  conversionsByStatus: Record<string, number>;
  recentConversions: ConversionRecord[];
  storageSaved: number;
  storageUsed: number;
}

export interface FormatCategoryStatus {
  category: string;
  label: string;
  color: string;
  formatCount: number;
  pairCount: number;
  status: "functional" | "partial";
}

export interface FormatStatusData {
  categories: FormatCategoryStatus[];
  totalFormats: number;
  totalPairs: number;
  functionalCategories: number;
  partialCategories: number;
}

export type AdminTab =
  | "overview"
  | "analytics"
  | "users"
  | "categories"
  | "formats"
  | "features"
  | "links"
  | "pages"
  | "ads"
  | "settings";
