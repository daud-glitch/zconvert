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
  User,
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
import { ProfileView } from "@/components/profile/ProfileView";
import { AdminView } from "@/components/admin/AdminView";
import { useApp } from "@/lib/app-context";
import { AuthDialog } from "@/components/auth/AuthDialog";

export default function HomeClient({ defaultView }: { defaultView?: ViewType }) {
  const { currentView, setCurrentView, currentUser, logout, loading } = useApp();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    if (defaultView) {
      setCurrentView(defaultView);
    }
  }, [defaultView, setCurrentView]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      setDarkMode(saved === "dark");
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDarkMode(true);
    }
  }, []);

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
  }, [setCurrentView]);

  const toggleView = (view: ViewType) => {
    setCurrentView(view);
    setMobileNavOpen(false);
  };

  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthDialogOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* ── Top Accent Line ─────────────────────────────────────────── */}
      <div className="h-1.5 w-full bg-emerald-500 fixed top-0 left-0 z-[100]" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-1.5 z-50 w-full border-b border-border/40 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => toggleView("converter")}
            >
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  Cloud Converter
                </span>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest -mt-1 opacity-70">
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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground"
                onClick={() => setDarkMode(!darkMode)}
                title="Toggle theme (D)"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              <Separator orientation="vertical" className="h-6 mx-1" />

              {currentUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full ring-2 ring-emerald-500/20 p-0"
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
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full px-4 h-9"
                    onClick={() => openAuth("login")}
                    disabled={loading}
                  >
                    Login
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full px-4 h-9 bg-emerald-500 hover:bg-emerald-600 text-white"
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
                className="md:hidden rounded-full"
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
      <main className="flex-1 flex flex-col relative">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex-1 flex flex-col">
          {currentView === "converter" && <ConverterView />}
          {currentView === "formats" && <FormatsView />}
          {currentView === "history" && <HistoryView />}
          {currentView === "bookmarks" && <BookmarksView />}
          {currentView === "profile" && <ProfileView />}
          {currentView === "admin" && <AdminView />}
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
                <RefreshCw className="w-6 h-6 text-emerald-500" />
                <span className="text-xl font-bold tracking-tight">
                  Cloud Converter
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                A high-performance, private file conversion suite. No file size
                limits, no registration required, and everything stays in your
                browser whenever possible.
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
                <button
                  onClick={() => setCurrentView("converter")}
                  className="text-left hover:text-emerald-500 transition-colors"
                >
                  Converter
                </button>
                <button
                  onClick={() => setCurrentView("formats")}
                  className="text-left hover:text-emerald-500 transition-colors"
                >
                  Supported Formats
                </button>
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
                  100% Private Processing
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-4 h-4 text-violet-500" />
                  No Data Stored on Servers
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Local IndexedDB Storage
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-10 border-border/40" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Cloud Converter. All rights
              reserved. Built for performance and privacy.
            </p>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <button className="hover:text-foreground">Terms</button>
              <button className="hover:text-foreground">Privacy</button>
              <button className="hover:text-foreground">Cookies</button>
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
        onClose={() => setAuthDialogOpen(false)}
        initialMode={authMode}
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
