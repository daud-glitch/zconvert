"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  X,
  Layers,
  Settings,
  LogIn,
  LogOut,
  Sun,
  Moon,
  Keyboard,
  ArrowUp,
  Lock,
  Github,
  Twitter,
  Globe,
  Shield,
  Zap,
} from "lucide-react";
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
import { AdminView } from "@/components/admin/AdminView";

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function MainApp({
  defaultView = "converter",
}: {
  defaultView?: ViewType;
}) {
  const [currentView, setCurrentView] = useState<ViewType>(defaultView);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email: string;
    name: string | null;
    role: string;
  } | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

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
      if (e.key === "d" && !e.ctrlKey && !e.metaKey) setDarkMode((d) => !d);
      if (e.key === "1") setCurrentView("converter");
      if (e.key === "2") setCurrentView("formats");
      if (e.key === "3") setCurrentView("history");
      if (e.key === "4") setCurrentView("bookmarks");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const navigate = (view: ViewType) => {
    setCurrentView(view);
    setMobileNavOpen(false);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    navigate("converter");
  };

  // Fetch current session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user ?? null))
      .catch(() => {});
  }, []);

  const footerLinks = [
    { label: "Converter", view: "converter" as ViewType },
    { label: "Formats", view: "formats" as ViewType },
    { label: "Bookmarks", view: "bookmarks" as ViewType },
  ];

  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Accent Bar ─── */}
      <div className="accent-bar" />

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate("converter")}
            >
              <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Cloud Converter
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) =>
                item.href ? (
                  <a key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <span className="mr-2">{item.icon}</span>
                      {item.label}
                    </Button>
                  </a>
                ) : (
                  <Button
                    key={item.view}
                    variant={currentView === item.view ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate(item.view!)}
                    className={
                      currentView === item.view
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Button>
                ),
              )}
              {/* Auth */}
              {currentUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <div className="w-6 h-6 bg-foreground text-background rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                        {(currentUser.name || currentUser.email || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <span className="hidden lg:block max-w-[100px] truncate text-sm">
                        {currentUser.name || currentUser.email}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                      {currentUser.email}
                    </div>
                    <DropdownMenuSeparator />
                    {currentUser.role === "admin" && (
                      <DropdownMenuItem
                        onClick={() => navigate("admin" as ViewType)}
                      >
                        <Settings className="w-3.5 h-3.5 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-red-500 focus:text-red-500"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-3.5 h-3.5 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <a href="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground gap-1.5"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                </a>
              )}
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShortcuts(true)}
                title="Keyboard shortcuts (?)"
                className="text-muted-foreground hover:text-foreground"
              >
                <Keyboard className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                title={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
                className="text-muted-foreground hover:text-foreground"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
            </nav>

            {/* Mobile controls */}
            <div className="flex items-center gap-1 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                title={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
              >
                {darkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
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

          {/* Mobile Nav */}
          {mobileNavOpen && (
            <nav className="md:hidden pb-4 space-y-1">
              {navItems.map((item) =>
                item.href ? (
                  <a key={item.href} href={item.href} className="block">
                    <Button variant="ghost" className="w-full justify-start">
                      <span className="mr-3">{item.icon}</span>
                      {item.label}
                    </Button>
                  </a>
                ) : (
                  <Button
                    key={item.view}
                    variant={currentView === item.view ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => navigate(item.view!)}
                  >
                    <span className="mr-3">{item.icon}</span>
                    {item.label}
                  </Button>
                ),
              )}
            </nav>
          )}
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "converter" && <ConverterView navigate={navigate} />}
        {currentView === "formats" && <FormatsView navigate={navigate} />}
        {currentView === "history" && <HistoryView navigate={navigate} />}
        {currentView === "bookmarks" && <BookmarksView navigate={navigate} />}
        {currentView === "admin" &&
          (currentUser?.role === "admin" ? (
            <AdminView navigate={navigate} />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950 rounded-2xl flex items-center justify-center">
                <Lock className="w-8 h-8 text-amber-500" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-1">
                  Admin Access Required
                </h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  You need to sign in with an admin account to access this
                  panel.
                </p>
              </div>
              <a href="/login">
                <Button className="bg-emerald-500 hover:bg-emerald-600 mt-2">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </a>
            </div>
          ))}
      </main>

      {/* ─── Footer ─── */}
      <footer className="footer-enhanced mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold tracking-tight">
                  Cloud Converter
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Universal file converter. Self-hosted, private, and free
                forever.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Navigation</h4>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {footerLinks.map((link) => (
                  <button
                    key={link.view}
                    onClick={() => navigate(link.view)}
                    className="text-sm text-muted-foreground footer-link-hover cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))}
                <a
                  href="/conversions"
                  className="text-sm text-muted-foreground footer-link-hover"
                >
                  Conversions
                </a>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              &copy;{" "}
              <span
                className="cursor-default"
                onClick={() => {
                  window.location.href = "/core/system/admin";
                }}
                title=" "
              >
                {new Date().getFullYear()}
              </span>{" "}
              Cloud Converter. All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <a href="#" className="flex items-center gap-1 footer-link-hover">
                <Github className="w-3.5 h-3.5" /> GitHub
              </a>
              <a href="#" className="flex items-center gap-1 footer-link-hover">
                <Twitter className="w-3.5 h-3.5" /> Twitter
              </a>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" /> Self-Hosted
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> Private
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" /> No Limits
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Keyboard Shortcuts Dialog ─── */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/50"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                  <Keyboard className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold">Keyboard Shortcuts</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowShortcuts(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2.5">
              {[
                { key: "?", desc: "Toggle this dialog" },
                { key: "Ctrl + U", desc: "Upload files" },
                { key: "1", desc: "Go to Converter" },
                { key: "2", desc: "Go to Formats" },
                { key: "3", desc: "Go to History" },
                { key: "4", desc: "Go to Bookmarks" },
                { key: "D", desc: "Toggle dark mode" },
              ].map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-sm text-muted-foreground">
                    {s.desc}
                  </span>
                  <kbd className="kbd">{s.key}</kbd>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border text-center">
              <span className="text-xs text-muted-foreground">
                Press <kbd className="kbd">?</kbd> to close
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Back to Top ─── */}
      {showBackToTop && (
        <button
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Back to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─── Next.js Root Page ────────────────────────────────────────────────────────
export default function HomePage() {
  return <MainApp />;
}
