"use client";

import { useMemo } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/common/SiteHeader";
import { PageIntro } from "@/components/common/PageIntro";
import { FileIllustration } from "@/components/common/FileIllustration";
import {
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  ArrowRightLeft,
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
  LayoutGrid,
  Video,
} from "lucide-react";
import { formats, categoryMeta } from "@/lib/formats";
import { SiteFooter } from "@/components/common/SiteFooter";
import { Button } from "@/components/ui/button";
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

const catText: Record<string, string> = {
  image: "text-emerald-600 dark:text-emerald-400",
  video: "text-violet-600 dark:text-violet-400",
  audio: "text-amber-600 dark:text-amber-400",
  document: "text-sky-600 dark:text-sky-400",
  data: "text-rose-600 dark:text-rose-400",
  archive: "text-slate-600 dark:text-slate-400",
  ebook: "text-teal-600 dark:text-teal-400",
  presentation: "text-orange-600 dark:text-orange-400",
  subtitle: "text-cyan-600 dark:text-cyan-400",
  font: "text-pink-600 dark:text-pink-400",
  other: "text-gray-600 dark:text-gray-400",
};

function getCatIcon(cat: string, size = "w-5 h-5") {
  const map: Record<string, React.ReactNode> = {
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
  return map[cat] ?? <FileQuestion className={size} />;
}

export default function FormatDetailClient({ ext }: { ext: string }) {
  const format = useMemo(() => formats.find((f) => f.ext === ext), [ext]);

  // All formats that list this ext in their targetFormats
  const convertsFrom = useMemo(
    () => formats.filter((f) => f.targetFormats.includes(ext) && f.ext !== ext),
    [ext]
  );

  if (!format) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <SiteHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
          <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center text-4xl">
            ❓
          </div>
          <h1 className="text-2xl font-bold">
            Format not found:{" "}
            <span className="font-mono text-muted-foreground">.{ext}</span>
          </h1>
          <p className="text-muted-foreground">
            This format doesn&apos;t exist in our supported list.
          </p>
          <Link href="/conversions">
            <Button>← View All Conversions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const meta = categoryMeta[format.category as keyof typeof categoryMeta];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader />

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link
            href="/conversions"
            className="hover:text-foreground transition-colors"
          >
            Conversions
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-mono font-semibold uppercase">
            .{ext}
          </span>
        </div>

        <PageIntro
          title={`Convert ${format.ext.toUpperCase()} files`}
          description={format.description}
          icons={<FileIllustration type={format.category} extension={format.ext} className="h-13 w-11" />}
        >
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="secondary">{meta?.label}</Badge>
            <span className="text-sm text-muted-foreground">{format.name}</span>
          </div>
          {format.mimeTypes.length > 0 && (
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">MIME: {format.mimeTypes.join(", ")}</p>
          )}
          <Button asChild className="mt-5 h-11 gap-2 bg-emerald-700 px-5 text-white hover:bg-emerald-800">
            <Link href={`/?from=${encodeURIComponent(ext)}`} rel="nofollow">
              Start converting <ArrowRightLeft aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </PageIntro>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-card border rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-emerald-500">
              {format.targetFormats.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Convert To
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-violet-500">
              {convertsFrom.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Convert From
            </div>
          </div>
          <div className="bg-card border rounded-xl p-4 text-center">
            <div
              className={`text-xl font-bold ${catText[format.category] ?? "text-foreground"}`}
            >
              {meta?.label}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Category</div>
          </div>
        </div>

        {/* ── Convert TO section ─────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
              <ArrowRight className="w-4 h-4" />
            </div>
            <h2 className="text-2xl font-bold">
              Convert{" "}
              <span className="font-mono uppercase">.{ext}</span> to…
            </h2>
            <Badge variant="secondary">{format.targetFormats.length}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mb-5 ml-11">
            {format.name} can be converted to the following{" "}
            {format.targetFormats.length} format
            {format.targetFormats.length !== 1 ? "s" : ""}. Pick one to start
            converting straight away.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {format.targetFormats.map((t) => {
              const tFmt = formats.find((f) => f.ext === t);
              const tCat = tFmt?.category ?? "other";
              const tMeta =
                categoryMeta[tCat as keyof typeof categoryMeta];
              return (
                <Link key={t} href={`/${ext}-to-${t}`}>
                  <div
                    className={`border rounded-xl p-3 hover:shadow-md transition-all cursor-pointer group bg-card hover:bg-muted/40 border-l-4 ${catBorder[tCat] ?? "border-l-gray-400"}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`w-6 h-6 ${catColors[tCat] ?? "bg-gray-500"} rounded flex items-center justify-center text-white shrink-0`}
                      >
                        {getCatIcon(tCat, "w-3 h-3")}
                      </span>
                      <span className="font-mono text-sm font-bold uppercase">
                        .{t}
                      </span>
                    </div>
                    {tFmt && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-1.5">
                        {tFmt.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] ${catText[tCat] ?? "text-gray-500"}`}
                      >
                        {tMeta?.label ?? tCat}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <Separator className="mb-12" />

        {/* ── Convert FROM section ──────────────────────────────────────── */}
        {convertsFrom.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center text-white">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <h2 className="text-2xl font-bold">
                Convert… to{" "}
                <span className="font-mono uppercase">.{ext}</span>
              </h2>
              <Badge variant="secondary">{convertsFrom.length}</Badge>
            </div>
            <p className="text-muted-foreground text-sm mb-5 ml-11">
              The following {convertsFrom.length} format
              {convertsFrom.length !== 1 ? "s" : ""} can be converted into{" "}
              {format.name}. Pick one to convert from it.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {convertsFrom.map((f) => {
                const fMeta =
                  categoryMeta[f.category as keyof typeof categoryMeta];
                return (
                  <Link key={f.ext} href={`/${f.ext}-to-${ext}`}>
                    <div
                      className={`border rounded-xl p-3 hover:shadow-md transition-all cursor-pointer group bg-card hover:bg-muted/40 border-l-4 ${catBorder[f.category] ?? "border-l-gray-400"}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`w-6 h-6 ${catColors[f.category] ?? "bg-gray-500"} rounded flex items-center justify-center text-white shrink-0`}
                        >
                          {getCatIcon(f.category, "w-3 h-3")}
                        </span>
                        <span className="font-mono text-sm font-bold uppercase">
                          .{f.ext}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-1.5">
                        {f.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] ${catText[f.category] ?? "text-gray-500"}`}
                        >
                          {fMeta?.label ?? f.category}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <div className="bg-card border rounded-2xl p-8 text-center">
          <div
            className={`w-16 h-16 ${catColors[format.category]} rounded-2xl flex items-center justify-center text-white mx-auto mb-4`}
          >
            {getCatIcon(format.category, "w-8 h-8")}
          </div>
          <h3 className="text-xl font-bold mb-2">
            Ready to convert your {format.name} file?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Free, fast, and private. No file size limits, no watermarks, no
            sign-up required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={`/?from=${encodeURIComponent(ext)}`} rel="nofollow">
              <Button
                size="lg"
                className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2"
              >
                <ArrowRightLeft className="w-5 h-5" />
                Convert .{ext} Now
              </Button>
            </Link>
            <Link href="/conversions">
              <Button size="lg" variant="outline" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                View All Formats
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
