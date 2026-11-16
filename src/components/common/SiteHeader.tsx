"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun } from "lucide-react";
import { BrandMark } from "@/components/common/BrandMark";
import { BrandTitle } from "@/components/common/BrandTitle";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Converter" },
  { href: "/conversions", label: "Formats" },
  { href: "/guides", label: "Guides" },
  { href: "/changelog", label: "Changelog" },
];

export function SiteHeader({ section }: { section?: string }) {
  const pathname = usePathname() ?? "";

  const links = NAV_ITEMS.map(({ href, label }) => {
    const exact = pathname === href;
    const current = exact || section === href || (href !== "/" && pathname.startsWith(`${href}/`));
    return (
      <Link
        key={href}
        href={href}
        aria-current={exact ? "page" : current ? "location" : undefined}
        className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold transition-colors ${current
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "text-foreground hover:bg-muted"
        }`}
      >
        {label}
      </Link>
    );
  });

  function toggleTheme() {
    const root = document.documentElement;
    const dark = root.classList.toggle("dark");
    root.style.colorScheme = dark ? "dark" : "light";
    localStorage.setItem("theme", dark ? "dark" : "light");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
        <Link href="/" className="mr-auto flex shrink-0 items-center gap-2">
          <BrandMark className="size-8 sm:size-9" />
          <BrandTitle className="text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl dark:text-white" />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">{links}</nav>
        <Button type="button" variant="ghost" size="icon" aria-label="Toggle color theme" onClick={toggleTheme}>
          <Moon aria-hidden="true" className="size-4 dark:hidden" />
          <Sun aria-hidden="true" className="hidden size-4 dark:block" />
        </Button>
        <details className="relative md:hidden">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-lg hover:bg-muted [&::-webkit-details-marker]:hidden">
            <Menu aria-hidden="true" className="size-5" />
            <span className="sr-only">Site navigation</span>
          </summary>
          <nav aria-label="Primary" className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border bg-background p-1.5 shadow-md">
            {links}
          </nav>
        </details>
      </div>
    </header>
  );
}
