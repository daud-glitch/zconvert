"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
  Lock,
  Mail,
  ShieldCheck,
  LogIn,
  KeyRound,
} from "lucide-react";
import { BrandMark } from "@/components/common/BrandMark";
import { BrandTitle } from "@/components/common/BrandTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import {
  TurnstileField,
  type TurnstileHandle,
  isTurnstileEnabled,
} from "@/components/security/TurnstileField";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpToken, setTotpToken] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);
  const turnstileOn = isTurnstileEnabled();

  // Sync dark mode with main app preference
  useEffect(() => {
    try {
      const t = localStorage.getItem("theme");
      if (
        t === "dark" ||
        (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) router.replace(redirectTo);
        else setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, [redirectTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const captcha =
      turnstileToken || turnstileRef.current?.getToken() || undefined;
    if (turnstileOn && !captcha) {
      setError("Please complete the security check.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          isAdminLogin: false,
          ...(requires2FA && { token: totpToken }),
          ...(captcha ? { turnstileToken: captcha } : {}),
        }),
      });

      const data = await res.json().catch(() => ({ error: "Server returned non-JSON response" }));

      if (!res.ok) {
        setError(data.error || `Login failed (Status ${res.status})`);
        turnstileRef.current?.reset();
        setTurnstileToken("");
        setLoading(false);
        return;
      }

      if (data.requires2FA) {
        setRequires2FA(true);
        turnstileRef.current?.reset();
        setTurnstileToken("");
        setLoading(false);
        return;
      }

      router.push(redirectTo);
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : "Could not reach server"}`);
      turnstileRef.current?.reset();
      setTurnstileToken("");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-emerald-500" />

      {/* Back link */}
      <div className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Converter
        </Link>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <BrandMark className="h-14 w-14 mb-4" rounded="rounded-2xl" />
            <h1 className="text-2xl font-bold tracking-tight">
              <BrandTitle className="text-2xl font-bold tracking-tight text-foreground" />
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to your account
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
            {!requires2FA ? (
              <>
                <GoogleAuthButton
                  label="Continue with Google"
                  disabled={loading}
                  withDivider={false}
                />

                <div className="relative py-0.5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">
                      or continue with email
                    </span>
                  </div>
                </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-emerald-600 hover:underline font-medium shrink-0"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <TurnstileField
                  ref={turnstileRef}
                  onToken={setTurnstileToken}
                  className="flex justify-center"
                />

                <Button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </span>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  No account?{" "}
                  <Link
                    href="/signup"
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    Sign up
                  </Link>
                </p>
              </form>
              </>
            ) : (
              /* ── 2FA Code ── */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-12 h-12 bg-sky-100 dark:bg-sky-950 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-sky-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">
                      Two-Factor Authentication
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="totp" className="text-sm font-medium">
                    Authentication code
                  </Label>
                  <div className="relative mt-1.5">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="totp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={totpToken}
                      onChange={(e) =>
                        setTotpToken(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )
                      }
                      className="pl-9 tracking-widest text-center text-lg font-mono"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <TurnstileField
                  ref={turnstileRef}
                  onToken={setTurnstileToken}
                  className="flex justify-center"
                />

                <Button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                  disabled={loading || totpToken.length !== 6}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Verify Code
                    </span>
                  )}
                </Button>

                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground text-center transition-colors"
                  onClick={() => {
                    setRequires2FA(false);
                    setTotpToken("");
                    setError("");
                    turnstileRef.current?.reset();
                    setTurnstileToken("");
                  }}
                >
                  ← Use a different account
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Converted files stay in your browser (IndexedDB). The server
            processes uploads temporarily and keeps only anonymized usage stats.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg animate-pulse" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
