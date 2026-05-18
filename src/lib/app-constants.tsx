"use client";

// ─── Shared Application Constants ────────────────────────────────────────────

import React from "react";
import {
  Globe,
  Sparkles,
  FileText,
  Share2,
  Image as ImageIcon,
  ArrowRightLeft,
  LayoutGrid,
  LayoutDashboard,
  BarChart3,
  Users,
  Folder,
  Layers,
  Zap,
  Link as LinkIcon,
  Megaphone,
  Settings,
} from "lucide-react";
import { type ViewType } from "@/lib/formats";

// ─── Quality Presets ─────────────────────────────────────────────────────────

export const qualityPresets = [
  {
    label: "Web Optimized",
    quality: 75,
    desc: "Best for websites & apps",
    icon: <Globe className="w-3.5 h-3.5" />,
    color: "bg-sky-500",
  },
  {
    label: "High Quality",
    quality: 92,
    desc: "Minimal compression loss",
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: "bg-emerald-500",
  },
  {
    label: "Print Ready",
    quality: 98,
    desc: "Maximum fidelity for print",
    icon: <FileText className="w-3.5 h-3.5" />,
    color: "bg-violet-500",
  },
  {
    label: "Social Media",
    quality: 80,
    desc: "Optimized for sharing",
    icon: <Share2 className="w-3.5 h-3.5" />,
    color: "bg-amber-500",
  },
  {
    label: "Thumbnail",
    quality: 60,
    desc: "Small file, fast loading",
    icon: <ImageIcon className="w-3.5 h-3.5" />,
    color: "bg-rose-500",
  },
];

// ─── Supported Extensions (for file input accept) ────────────────────────────

export const SUPPORTED_EXTENSIONS = [
  ".apng", ".avif", ".blp", ".bmp", ".cur", ".dcx", ".dds", ".dib", ".eps",
  ".fli", ".flc", ".gif", ".heic", ".heif", ".icns", ".ico", ".jp2", ".jpeg",
  ".jpg", ".jxl", ".mpo", ".msp", ".pbm", ".pcx", ".pfm", ".pgm", ".png",
  ".pnm", ".ppm", ".psd", ".qoi", ".raw", ".cr2", ".sgi", ".svg", ".tga",
  ".tgs", ".tif", ".tiff", ".webp", ".xbm", ".xpm",
  ".mp3", ".wav", ".ogg", ".aac", ".flac", ".wma", ".m4a", ".opus",
  ".adoc", ".doc", ".docx", ".html", ".htm", ".ipynb", ".md", ".muse",
  ".odt", ".opml", ".org", ".pdf", ".rst", ".rtf", ".tex", ".textile",
  ".txt", ".eml", ".msg",
  ".csv", ".dta", ".env", ".feather", ".fwf", ".ini", ".json", ".jsonl",
  ".ods", ".orc", ".parquet", ".sav", ".sqlite", ".toml", ".toon", ".tsv",
  ".vcf", ".xls", ".xlsx", ".xpt", ".xml", ".yaml", ".yml",
  ".7z", ".rar", ".tar", ".tar.bz2", ".tar.gz", ".tar.xz", ".tar.zst",
  ".zip", ".gz", ".bz2", ".xz",
  ".azw3", ".cb7", ".cbr", ".cbz", ".epub", ".fb2", ".lrf", ".mobi",
  ".pdb", ".snb",
  ".key", ".odp", ".pot", ".potx", ".pps", ".ppsx", ".ppt", ".pptm", ".pptx",
  ".ass", ".mpl", ".srt", ".ssa", ".sub", ".vtt",
  ".otf", ".ttf", ".woff", ".woff2", ".eot",
  ".drawio", ".p7m",
].join(",");

// ─── Category Colors ──────────────────────────────────────────────────────────

export const categoryColors: Record<string, string> = {
  image: "bg-emerald-500",
  video: "bg-violet-500",
  audio: "bg-amber-500",
  document: "bg-sky-500",
  data: "bg-rose-500",
  archive: "bg-slate-500",
  ebook: "bg-teal-500",
  presentation: "bg-orange-500",
  subtitle: "bg-cyan-500",
  font: "bg-pink-500",
  other: "bg-gray-500",
};

export const categoryTextColors: Record<string, string> = {
  image: "text-emerald-600",
  video: "text-violet-600",
  audio: "text-amber-600",
  document: "text-sky-600",
  data: "text-rose-600",
  archive: "text-slate-600",
  ebook: "text-teal-600",
  presentation: "text-orange-600",
  subtitle: "text-cyan-600",
  font: "text-pink-600",
  other: "text-gray-600",
};

export const categoryBorderColors: Record<string, string> = {
  image: "border-emerald-500",
  video: "border-violet-500",
  audio: "border-amber-500",
  document: "border-sky-500",
  data: "border-rose-500",
  archive: "border-slate-500",
  ebook: "border-teal-500",
  presentation: "border-orange-500",
  subtitle: "border-cyan-500",
  font: "border-pink-500",
  other: "border-gray-500",
};

export const categoryLightBg: Record<string, string> = {
  image: "bg-emerald-50 dark:bg-emerald-950",
  video: "bg-violet-50 dark:bg-violet-950",
  audio: "bg-amber-50 dark:bg-amber-950",
  document: "bg-sky-50 dark:bg-sky-950",
  data: "bg-rose-50 dark:bg-rose-950",
  archive: "bg-slate-50 dark:bg-slate-800",
  ebook: "bg-teal-50 dark:bg-teal-950",
  presentation: "bg-orange-50 dark:bg-orange-950",
  subtitle: "bg-cyan-50 dark:bg-cyan-950",
  font: "bg-pink-50 dark:bg-pink-950",
  other: "bg-gray-50 dark:bg-gray-900",
};

// ─── Format Badge Data ────────────────────────────────────────────────────────

export const formatBadgeData: { label: string; category: string }[] = [
  { label: "PNG", category: "image" },
  { label: "JPG", category: "image" },
  { label: "WebP", category: "image" },
  { label: "AVIF", category: "image" },
  { label: "PDF", category: "document" },
  { label: "DOCX", category: "document" },
  { label: "MD", category: "document" },
  { label: "HTML", category: "document" },
  { label: "PPTX", category: "presentation" },
  { label: "XLSX", category: "data" },
  { label: "JSON", category: "data" },
  { label: "CSV", category: "data" },
  { label: "EPUB", category: "ebook" },
  { label: "YAML", category: "data" },
];

// ─── Comparison Features ──────────────────────────────────────────────────────

export const comparisonFeatures = [
  { feature: "No Size Limits", transmute: true, cloudconvert: false, zamzar: false, onlineconvert: false },
  { feature: "100% Private", transmute: true, cloudconvert: false, zamzar: false, onlineconvert: false },
  { feature: "Free Forever", transmute: true, cloudconvert: false, zamzar: false, onlineconvert: false },
  { feature: "REST API", transmute: true, cloudconvert: true, zamzar: false, onlineconvert: false },
  { feature: "SSO / SAML", transmute: true, cloudconvert: false, zamzar: false, onlineconvert: false },
  { feature: "Custom Formats", transmute: true, cloudconvert: true, zamzar: false, onlineconvert: true },
  { feature: "No Watermarks", transmute: true, cloudconvert: false, zamzar: true, onlineconvert: false },
  { feature: "Self-Hosted", transmute: true, cloudconvert: false, zamzar: false, onlineconvert: false },
];

// ─── Navigation Items ─────────────────────────────────────────────────────────

export const navItems = [
  {
    id: "converter",
    label: "Converter",
    icon: ArrowRightLeft,
  },
  {
    id: "formats",
    label: "Formats",
    icon: LayoutGrid,
  },
  {
    id: "history",
    label: "History",
    icon: BarChart3,
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    icon: Folder,
  },
];

// ─── Admin Nav Items ──────────────────────────────────────────────────────────

import { type AdminTab } from "@/lib/app-types";

export const adminNavItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
  { id: "categories", label: "Categories", icon: <Folder className="w-4 h-4" /> },
  { id: "formats", label: "Formats", icon: <Layers className="w-4 h-4" /> },
  { id: "features", label: "Features", icon: <Zap className="w-4 h-4" /> },
  { id: "links", label: "Links", icon: <LinkIcon className="w-4 h-4" /> },
  { id: "pages", label: "Pages", icon: <FileText className="w-4 h-4" /> },
  { id: "ads", label: "Ad Management", icon: <Megaphone className="w-4 h-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];
