"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  X,
  Layers,
  LogOut,
  Sun,
  Moon,
  Keyboard,
  ArrowUp,
  Lock,
  User,
  Github,
  Twitter,
  Globe,
  Shield,
  Zap,
} from "lucide-react";
import { BrandMark } from "@/components/common/BrandMark";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { type ViewType } from "@/lib/formats";
import { navItems } from "@/lib/app-constants";
import { ConverterView } from "@/components/converter/ConverterView";
import { FormatsView } from "@/components/formats/FormatsView";
import { HistoryView } from "@/components/history/HistoryView";
import { BookmarksView } from "@/components/bookmarks/BookmarksView";
import { ProfileView } from "@/components/profile/ProfileView";
import { AdminView } from "@/components/admin/AdminView";
import { useApp } from "@/lib/app-context";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { CmsAdSlot } from "@/components/cms/CmsAdSlot";
import { CmsFeatureCards } from "@/components/cms/CmsFeatureCards";
import {
  useCmsBundle,
  linksByGroup,
  adsByLocation,
} from "@/hooks/use-cms";
import Link from "next/link";

export default function HomeClient({ defaultView }: { defaultView?: ViewType }) {
  const {
    currentView,
    setCurrentView,
    currentUser,
    logout,
    loading,
    authDialogOpen,
    authDialogMode,
    openAuth,
    closeAuth,
  } = useApp();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const { features, links, ads } = useCmsBundle();
  const footerLegal = linksByGroup(links, "footer_legal");
  const footerProduct = linksByGroup(links, "footer_product");
  const topAds = [
    ...adsByLocation(ads, "homepage_top"),
    ...adsByLocation(ads, "converter_top"),
  ];
  const footerAds = adsByLocation(ads, "footer");

  useEffect(() => {
    setCurrentView(defaultView || "converter");
  }, [defaultView, setCurrentView]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    let next = false;
    if (saved === "dark" || saved === "light") {
      next = saved === "dark";
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      next = true;
    }
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode, themeReady]);

  const toggleTheme = () => {
    setDarkMode((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      document.documentElement.style.colorScheme = next ? "dark" : "light";
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts((s) => !s);
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "u" || e.key === "U") {
          e.preventDefault();
          document.querySelector<HTMLInputElement>("input[type=file]")?.click();
        }
      }
      if (e.key === "d" && !e.ctrlKey && !e.metaKey) toggleTheme();
      if (e.key === "1") setCurrentView("converter");
      if (e.key === "2") setCurrentView("formats");
      if (e.key === "3") setCurrentView("history");
      if (e.key === "4") setCurrentView("bookmarks");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setCurrentView, themeReady]);

  const toggleView = (view: ViewType) => {
    setCurrentView(view);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300 overflow-x-hidden">
      {/* ── Top Accent Line ─────────────────────────────────────────── */}
      <div className="h-1.5 w-full bg-emerald-500 fixed top-0 left-0 z-[100]" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-1.5 z-50 w-full max-w-[100vw] border-b border-border/40 bg-background overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 min-w-0">
            {/* Logo */}
            <div
              className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0 shrink"
              onClick={() => toggleView("converter")}
            >
              <BrandMark className="h-8 w-8 sm:h-10 sm:w-10" />
              <div className="min-w-0">
                <span className="text-base sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 block truncate">
                  Cloud Converter
                </span>
                <p className="hidden sm:block text-[10px] text-muted-foreground font-medium uppercase tracking-widest -mt-1 opacity-70 truncate">
                  Universal File Lab
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={`gap-2 h-9 px-4 rounded-full ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => toggleView(item.id as ViewType)}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            {/* Action Buttons */}
            <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-8 h-8 sm:w-9 sm:h-9 text-muted-foreground hover:text-foreground"
                onClick={toggleTheme}
                title="Toggle theme (D)"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </Button>

              <Separator orientation="vertical" className="h-5 sm:h-6 mx-0.5 sm:mx-1 hidden sm:block" />

              {currentUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full ring-2 ring-emerald-500/20 p-0"
                    >
                      <div className="flex items-center justify-center w-full h-full bg-emerald-500/10 text-emerald-600 font-bold rounded-full text-xs">
                        {currentUser.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-0.5">
                        <p className="text-sm font-medium leading-none">
                          {currentUser.name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setCurrentView("profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    {currentUser.role === "admin" && (
                      <DropdownMenuItem onClick={() => setCurrentView("admin")}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={logout}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full px-2 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm"
                    onClick={() => openAuth("login")}
                    disabled={loading}
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full px-2.5 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => openAuth("signup")}
                    disabled={loading}
                  >
                    Sign Up
                  </Button>
                </div>
              )}

              {/* Mobile Menu Trigger */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full w-8 h-8 sm:w-9 sm:h-9"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
              >
                {mobileNavOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Layers className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-border bg-background animate-in slide-in-from-top-4">
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className={`w-full justify-start gap-3 h-12 rounded-xl ${
                      isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => toggleView(item.id as ViewType)}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative min-w-0 w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full min-w-0 px-3 sm:px-6 lg:px-8 py-5 sm:py-10 flex-1 flex flex-col">
          {currentView === "converter" && topAds.length > 0 && (
            <div className="mb-6">
              <CmsAdSlot ads={topAds} />
            </div>
          )}
          {currentView === "converter" && <ConverterView />}
          {currentView === "formats" && <FormatsView />}
          {currentView === "history" && <HistoryView />}
          {currentView === "bookmarks" && <BookmarksView />}
          {currentView === "profile" && <ProfileView />}
          {currentView === "admin" && <AdminView />}
          {currentView === "converter" && (
            <CmsFeatureCards features={features} />
          )}
        </div>

        {/* Shortcuts Hint (Floating) */}
        {!mobileNavOpen && (
          <div className="fixed bottom-6 right-6 z-40 hidden sm:block">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-background/80 backdrop-blur shadow-lg border-emerald-500/20 hover:border-emerald-500/40 text-[10px] font-bold uppercase tracking-widest gap-2"
              onClick={() => setShowShortcuts(true)}
            >
              <Keyboard className="w-3 h-3" />
              Shortcuts (?)
            </Button>
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                {/* Brand mark — matches site favicon */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/favicon.svg"
                  alt=""
                  width={28}
                  height={28}
                  className="h-7 w-7 rounded-lg shadow-sm"
                />
                <span className="text-xl font-bold tracking-tight">
                  Cloud Converter
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                A high-performance file conversion suite. Convert images, video,
                documents, and more — up to 100 MB per file on this server.
              </p>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-emerald-500/10 hover:text-emerald-500"
                >
                  <Github className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-sky-500/10 hover:text-sky-500"
                >
                  <Twitter className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-violet-500/10 hover:text-violet-500"
                >
                  <Globe className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-foreground/80">
                Quick Links
              </h4>
              <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
                {(footerProduct.length
                  ? footerProduct
                  : [
                      { id: "c", label: "Converter", url: "/" },
                      { id: "f", label: "Supported Formats", url: "/conversions" },
                    ]
                ).map((link) =>
                  link.url.startsWith("/") && !link.url.startsWith("//") ? (
                    <Link
                      key={link.id}
                      href={link.url}
                      className="text-left hover:text-emerald-500 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.id}
                      href={link.url}
                      className="text-left hover:text-emerald-500 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label}
                    </a>
                  ),
                )}
                <button
                  onClick={() => setCurrentView("history")}
                  className="text-left hover:text-emerald-500 transition-colors"
                >
                  My History
                </button>
                <button
                  onClick={() => setCurrentView("bookmarks")}
                  className="text-left hover:text-emerald-500 transition-colors"
                >
                  Bookmarks
                </button>
              </nav>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-foreground/80">
                Security & Privacy
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  Temp process — files not kept
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-4 h-4 text-violet-500" />
                  History stays in your browser
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Local IndexedDB Storage
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-10 border-border/40" />

          {footerAds.length > 0 && (
            <div className="mb-8">
              <CmsAdSlot ads={footerAds} />
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Cloud Converter. All rights
              reserved. Built for performance and privacy.
            </p>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              {(footerLegal.length
                ? footerLegal
                : [
                    { id: "t", label: "Terms", url: "/terms" },
                    { id: "p", label: "Privacy", url: "/privacy" },
                    { id: "c", label: "Contact", url: "/contact" },
                  ]
              ).map((link) =>
                link.url.startsWith("/") && !link.url.startsWith("//") ? (
                  <Link
                    key={link.id}
                    href={link.url}
                    className="hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.id}
                    href={link.url}
                    className="hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                ),
              )}
              <button
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Back to Top <ArrowUp className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Overlays ───────────────────────────────────────────────── */}
      <AuthDialog
        isOpen={authDialogOpen}
        onClose={closeAuth}
        initialMode={authDialogMode}
      />

      {/* Shortcuts Overlay */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-card border border-border shadow-2xl rounded-3xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                  <Keyboard className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Shortcuts</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setShowShortcuts(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              {[
                { key: "1-4", desc: "Switch Views" },
                { key: "Ctrl + U", desc: "Upload Files" },
                { key: "D", desc: "Toggle Dark Mode" },
                { key: "?", desc: "Show this menu" },
                { key: "Esc", desc: "Close everything" },
              ].map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    {s.desc}
                  </span>
                  <kbd className="px-2.5 py-1 rounded-lg bg-background border border-border shadow-sm text-[11px] font-bold font-mono">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>

            <Button
              className="w-full mt-8 h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              onClick={() => setShowShortcuts(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
