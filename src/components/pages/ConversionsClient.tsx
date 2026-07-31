"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Moon,
  Sun,
  RefreshCw,
  ChevronRight,
  LayoutGrid,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Music,
  Database,
  Archive,
  BookOpen,
  Presentation,
  Subtitles,
  Type,
  FileQuestion,
  Video,
} from "lucide-react";
import { formats, categoryMeta } from "@/lib/formats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const catColors: Record<string, string> = {
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

const catBorder: Record<string, string> = {
  image: "border-l-emerald-500",
  video: "border-l-violet-500",
  audio: "border-l-amber-500",
  document: "border-l-sky-500",
  data: "border-l-rose-500",
  archive: "border-l-slate-500",
  ebook: "border-l-teal-500",
  presentation: "border-l-orange-500",
  subtitle: "border-l-cyan-500",
  font: "border-l-pink-500",
  other: "border-l-gray-500",
};

const catTargetBg: Record<string, string> = {
  image: "hover:bg-emerald-500",
  video: "hover:bg-violet-500",
  audio: "hover:bg-amber-500",
  document: "hover:bg-sky-500",
  data: "hover:bg-rose-500",
  archive: "hover:bg-slate-500",
  ebook: "hover:bg-teal-500",
  presentation: "hover:bg-orange-500",
  subtitle: "hover:bg-cyan-500",
  font: "hover:bg-pink-500",
  other: "hover:bg-gray-500",
};

function getCatIcon(cat: string, size = "w-4 h-4") {
  const cls = size;
  const map: Record<string, React.ReactNode> = {
    image: <ImageIcon className={cls} />,
    video: <Video className={cls} />,
    audio: <Music className={cls} />,
    document: <FileText className={cls} />,
    data: <Database className={cls} />,
    archive: <Archive className={cls} />,
    ebook: <BookOpen className={cls} />,
    presentation: <Presentation className={cls} />,
    subtitle: <Subtitles className={cls} />,
    font: <Type className={cls} />,
    other: <FileQuestion className={cls} />,
  };
  return map[cat] ?? <FileQuestion className={cls} />;
}

// Build a lookup: ext → category
const extCatMap: Record<string, string> = {};
formats.forEach((f) => {
  extCatMap[f.ext] = f.category;
});

export default function ConversionsClient() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const prefersDark = typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;
    return saved ? saved === "dark" : prefersDark;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const toggleDark = () => {
    setDarkMode((d) => {
      const next = !d;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  const categories = useMemo(
    () => [...new Set(formats.map((f) => f.category))],
    []
  );

  const filtered = useMemo(() => {
    return formats.filter((f) => {
      const matchesCat =
        activeCategory === "all" || f.category === activeCategory;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        f.ext.includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [search, activeCategory]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof formats> = {};
    filtered.forEach((f) => {
      if (!g[f.category]) g[f.category] = [];
      g[f.category].push(f);
    });
    return g;
  }, [filtered]);

  const totalConversions = useMemo(
    () => formats.reduce((acc, f) => acc + f.targetFormats.length, 0),
    []
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Accent bar */}
      <div className="h-1 bg-emerald-500" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Cloud Converter
              </span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Converter
                </Button>
              </Link>
              <Button
                size="sm"
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" />
                Conversions
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDark}
                title="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">Conversions</span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
            All{" "}
            <span className="text-emerald-600 dark:text-emerald-400">
              Conversions
            </span>
          </h1>
          <p className="text-lg text-muted-foreground">
            {formats.length} input formats &middot; {totalConversions}+
            conversion pairs &middot; {categories.length} categories
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-lg mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search formats by name, extension or description…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              activeCategory === "all"
                ? "bg-foreground text-background border-transparent"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            All ({formats.length})
          </button>
          {categories.map((cat) => {
            const meta = categoryMeta[cat as keyof typeof categoryMeta];
            const count = formats.filter((f) => f.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all flex items-center gap-1.5 ${
                  activeCategory === cat
                    ? `${catColors[cat]} text-white border-transparent`
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {getCatIcon(cat, "w-3.5 h-3.5")}
                {meta?.label || cat}{" "}
                <span className="opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        <Separator className="mb-8" />

        {/* No results */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No formats found</h3>
            <p className="text-muted-foreground mb-4">
              Try a different search or category.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setActiveCategory("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Grouped format sections */}
        {Object.entries(grouped).map(([cat, fmts]) => {
          const meta = categoryMeta[cat as keyof typeof categoryMeta];
          return (
            <div key={cat} className="mb-14">
              {/* Category header */}
              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`w-9 h-9 ${catColors[cat]} rounded-xl flex items-center justify-center text-white`}
                >
                  {getCatIcon(cat)}
                </div>
                <h2 className="text-xl font-bold">{meta?.label || cat}</h2>
                <Badge variant="secondary" className="text-xs">
                  {fmts.length} formats
                </Badge>
              </div>

              {/* Format cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fmts.map((fmt) => (
                  <div
                    key={fmt.ext}
                    className={`bg-card border rounded-xl overflow-hidden border-l-4 ${catBorder[cat]} hover:shadow-lg transition-shadow flex flex-col`}
                  >
                    <div className="p-4 flex-1">
                      {/* Format header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className={`w-12 h-12 ${catColors[cat]} rounded-xl flex items-center justify-center text-white font-bold font-mono text-xs shrink-0`}
                        >
                          .{fmt.ext.length > 4 ? fmt.ext.slice(0, 4) : fmt.ext}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">{fmt.name}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full text-white ${catColors[cat]}`}
                            >
                              {meta?.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {fmt.description}
                          </p>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      {/* All target formats */}
                      <div className="mb-3">
                        <p className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                          Convert .{fmt.ext} to — {fmt.targetFormats.length}{" "}
                          formats
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {fmt.targetFormats.map((t) => {
                            const tCat = extCatMap[t] || "other";
                            return (
                              <Link key={t} href={`/conversions/${t}`}>
                                <span
                                  className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-muted hover:text-white transition-colors cursor-pointer ${catTargetBg[tCat]}`}
                                >
                                  {t}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Card footer CTA */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
                      <Link href="/">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Convert Now
                        </Button>
                      </Link>
                      <Link href={`/conversions/${fmt.ext}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                        >
                          Details <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <span>
              &copy; {new Date().getFullYear()} Cloud Converter. All rights
              reserved.
            </span>
            <Link
              href="/"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              ← Back to Converter
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
