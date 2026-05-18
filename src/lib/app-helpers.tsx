// ─── Shared Application Helpers ───────────────────────────────────────────────

import React from "react";
import {
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Database,
  Archive,
  BookOpen,
  Subtitles,
  Type,
  FileQuestion,
  Presentation,
  File as FileIcon,
  FileImage,
  FileVideo,
  FileAudio,
} from "lucide-react";

// ─── Formatting Utilities ─────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Category Detection ───────────────────────────────────────────────────────

export function getCategoryFromExt(ext: string): string {
  const map: Record<string, string> = {
    png: "image", jpg: "image", jpeg: "image", webp: "image", avif: "image",
    bmp: "image", gif: "image", tiff: "image", tif: "image", ico: "image",
    svg: "image", heic: "image", psd: "image", tga: "image", raw: "image",
    cr2: "image", apng: "image", blp: "image", cur: "image", dcx: "image",
    dds: "image", dib: "image", eps: "image", heif: "image", icns: "image",
    jp2: "image", jxl: "image", mpo: "image", msp: "image", pbm: "image",
    pcx: "image", pfm: "image", pgm: "image", pnm: "image", ppm: "image",
    qoi: "image", sgi: "image", tgs: "image", xbm: "image", xpm: "image",
    fli: "image", flc: "image",
    mp3: "audio", wav: "audio", ogg: "audio", aac: "audio", flac: "audio",
    wma: "audio", m4a: "audio", opus: "audio",
    pdf: "document", docx: "document", doc: "document", txt: "document",
    md: "document", html: "document", htm: "document", rtf: "document",
    odt: "document", adoc: "document", ipynb: "document", muse: "document",
    opml: "document", org: "document", rst: "document", tex: "document",
    textile: "document", eml: "document", msg: "document",
    json: "data", yaml: "data", yml: "data", xml: "data", toml: "data",
    tsv: "data", env: "data", feather: "data", ini: "data", jsonl: "data",
    ods: "data", orc: "data", parquet: "data", sqlite: "data", toon: "data",
    vcf: "data", xlsx: "data", dta: "data", fwf: "data", sav: "data",
    xls: "data", xpt: "data",
    zip: "archive", tar: "archive", gz: "archive", rar: "archive",
    "7z": "archive", bz2: "archive", xz: "archive", "tar.bz2": "archive",
    "tar.gz": "archive", "tar.xz": "archive", "tar.zst": "archive",
    epub: "ebook", mobi: "ebook", azw3: "ebook", cbz: "ebook", cb7: "ebook",
    cbr: "ebook", fb2: "ebook", lrf: "ebook", pdb: "ebook", snb: "ebook",
    key: "presentation", odp: "presentation", pot: "presentation",
    potx: "presentation", pps: "presentation", ppsx: "presentation",
    ppt: "presentation", pptm: "presentation", pptx: "presentation",
    srt: "subtitle", vtt: "subtitle", ass: "subtitle", ssa: "subtitle",
    woff: "font", woff2: "font", ttf: "font", otf: "font", eot: "font",
    drawio: "other", p7m: "other",
  };
  return map[ext] || "other";
}

// ─── Category Icons ───────────────────────────────────────────────────────────

export function getCategoryIcon(
  category: string,
  size: string = "w-4 h-4",
): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    image: <ImageIcon className={size} />,
    video: <Video className={size} />,
    audio: <Music className={size} />,
    document: <FileText className={size} />,
    data: <Database className={size} />,
    archive: <Archive className={size} />,
    ebook: <BookOpen className={size} />,
    presentation: <Presentation className={size} />,
    subtitle: <Subtitles className={size} />,
    font: <Type className={size} />,
    other: <FileQuestion className={size} />,
  };
  return icons[category] || <FileIcon className={size} />;
}

export function getCategoryIconLg(category: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    image: <FileImage className="w-6 h-6" />,
    video: <FileVideo className="w-6 h-6" />,
    audio: <FileAudio className="w-6 h-6" />,
    document: <FileText className="w-6 h-6" />,
    data: <Database className="w-6 h-6" />,
    archive: <Archive className="w-6 h-6" />,
    ebook: <BookOpen className="w-6 h-6" />,
    presentation: <Presentation className="w-6 h-6" />,
    subtitle: <Subtitles className="w-6 h-6" />,
    font: <Type className="w-6 h-6" />,
    other: <FileQuestion className="w-6 h-6" />,
  };
  return icons[category] || <FileIcon className="w-6 h-6" />;
}
