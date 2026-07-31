import type { FormatCategory } from "@/lib/formats";
import { isFfmpegConversionAvailable } from "@/lib/upload-limits";

export type CategoryCapabilityStatus = "functional" | "partial";

export type CategoryCapability = {
  status: CategoryCapabilityStatus;
  note: string;
};

export const categoryCapability: Record<FormatCategory, CategoryCapability> = {
  image: {
    status: "functional",
    note: "Raster pipeline via sharp; some codecs depend on host libvips.",
  },
  subtitle: {
    status: "functional",
    note: "Full SRT/VTT/ASS/SSA/SUB/MPL parse and serialize.",
  },
  data: {
    status: "functional",
    note: "Tabular and spreadsheet conversions.",
  },
  document: {
    status: "partial",
    note: "Text-level conversion; layout/styles largely lost. Legacy .DOC needs LibreOffice.",
  },
  video: {
    status: isFfmpegConversionAvailable() ? "functional" : "partial",
    note: isFfmpegConversionAvailable()
      ? "ffmpeg video transcode + audio extract enabled on this host."
      : "Requires ffmpeg (disabled on Vercel unless FORCE_FFMPEG or a media worker).",
  },
  audio: {
    status: isFfmpegConversionAvailable() ? "functional" : "partial",
    note: isFfmpegConversionAvailable()
      ? "ffmpeg-backed; available on this host."
      : "Requires ffmpeg (disabled on Vercel unless FORCE_FFMPEG or a media worker).",
  },
  archive: {
    status: "partial",
    note: "ZIP/TAR/GZ solid; RAR/7z/XZ/ZST may need CLI or Node zstd support.",
  },
  ebook: {
    status: "partial",
    note: "EPUB/FB2/comics + Calibre for Kindle/legacy when ebook-convert is installed.",
  },
  presentation: {
    status: "partial",
    note: "Text extract and rewrap (PDF/HTML/PPTX/ODP); not full slide fidelity.",
  },
  font: {
    status: "partial",
    note: "Real conversions are to/from WOFF2 via wawoff2 only.",
  },
  other: {
    status: "partial",
    note: "Draw.io and P7M best-effort unwrap/export paths.",
  },
};

export function getCategoryCapability(
  category: FormatCategory,
): CategoryCapability {
  return categoryCapability[category];
}
