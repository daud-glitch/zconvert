"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRightLeft,
  BookOpen,
  LayoutGrid,
  ScrollText,
} from "lucide-react";
import { BrandMark } from "@/components/common/BrandMark";
import { BrandTitle } from "@/components/common/BrandTitle";

const NAV_ITEMS = [
  { href: "/", label: "Converter", icon: ArrowRightLeft },
  { href: "/conversions", label: "Formats", icon: LayoutGrid },
  { href: "/guides", label: "Guides", icon: BookOpen },
  { href: "/changelog", label: "Changelog", icon: ScrollText },
];

/**
 * A nav item is current when the pathname is its href or a sub-path of it, so
 * /guides/heic-to-jpg-guide still highlights Guides while /conversions/png
 * highlights Formats.
 */
function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Compact header for content pages (guides, format pages, pair pages, legal).
 *
 * The homepage has the full app header; these pages previously started with a
 * breadcrumb, so the guides — the site's editorial content — were only
 * reachable through the footer.
 */
export function SiteHeader() {
  const pathname = usePathname() ?? "";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <BrandMark className="h-7 w-7" rounded="rounded-lg" />
          <BrandTitle className="text-base font-bold tracking-tight text-emerald-600 dark:text-emerald-400" />
        </Link>

        <nav
          aria-label="Primary"
          className="flex min-w-0 items-center gap-0.5 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const current = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  current
                    ? "bg-emerald-500/10 font-semibold text-emerald-700 dark:text-emerald-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
