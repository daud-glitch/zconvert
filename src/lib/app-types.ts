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
  /** 0–100 upload/convert progress (upload while pending, convert while converting) */
  progress?: number;
  progressPhase?: "reading" | "uploading" | "converting" | "queued";
  /** Shown while waiting in server convert line */
  queueMessage?: string;
  /** Server staging session from auto-upload; convert uses X-Upload-Id */
  uploadId?: string;
  /** True while auto-upload (staging) is in progress */
  uploading?: boolean;
  /** Staging finished successfully (file on server) */
  uploadReady?: boolean;
  /** Staging error message (convert can still re-upload from local File) */
  uploadError?: string;
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
  version?: string;
}

// ─── Admin Types ──────────────────────────────────────────────────────────────

export interface AdminStats {
  totalConversions: number;
  totalUsers: number;
  conversionsByCategory: {
    category: string;
    count: number;
    size: number;
    outputSize?: number;
  }[];
  conversionsByStatus: Record<string, number>;
  recentConversions: ConversionRecord[];
  storageSaved: number;
  storageUsed: number;
  avgDurationMs?: number | null;
  popularPairs?: { pair: string; originalExt: string; targetExt: string; count: number }[];
  dailyStats?: {
    date: string;
    conversions: number;
    users: number;
    pageViews: number;
    storageUsed: number;
  }[];
  /** Referrer / UTM traffic sources (last 30 days) */
  trafficSources?: {
    source: string;
    count: number;
    percent: number;
  }[];
  trafficTotals?: {
    pageViews: number;
    uniqueSources: number;
    days: number;
  };
  system?: {
    apiOnline: boolean;
    databaseConnected: boolean;
    processUptimeSec: number;
  };
}

export interface FormatStatusItem {
  id: string | null;
  ext: string;
  name: string;
  description: string;
  enabled: boolean;
  targetFormats: string[];
  mimeTypes: string[];
}

export interface FormatCategoryStatus {
  id?: string | null;
  category: string;
  label: string;
  color: string;
  formatCount: number;
  enabledCount?: number;
  disabledCount?: number;
  pairCount: number;
  enabled?: boolean;
  status: "functional" | "partial";
  note?: string;
  formats?: FormatStatusItem[];
}

export interface FormatStatusData {
  categories: FormatCategoryStatus[];
  totalFormats: number;
  enabledFormats?: number;
  totalPairs: number;
  functionalCategories: number;
  partialCategories: number;
  version?: string;
  source?: "database" | "static";
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
