"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Mail, User, UserPlus } from "lucide-react";
import { BrandMark } from "@/components/common/BrandMark";
import { BrandTitle } from "@/components/common/BrandTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { TurnstileField } from "@/components/security/TurnstileField";
import { useTurnstileForm } from "@/components/security/useTurnstileForm";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const turnstile = useTurnstileForm();

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
    } catch {
      // ignore
    }
  }, []);

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

    const captcha = turnstile.requireToken();
    if (!captcha.ok) {
      setError(captcha.error);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          ...(captcha.token ? { turnstileToken: captcha.token } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : `Signup failed (Status ${res.status})`,
        );
        turnstile.reset();
        setLoading(false);
        return;
      }
      router.push(redirectTo);
    } catch (err) {
      setError(
        `Network error: ${err instanceof Error ? err.message : "Could not reach server"}`,
      );
      turnstile.reset();
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
      <div className="h-1 w-full bg-emerald-500" />

      <div className="p-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Converter
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <BrandMark className="h-14 w-14 mb-4" rounded="rounded-2xl" />
            <h1 className="text-2xl font-bold tracking-tight">
              <BrandTitle className="text-2xl font-bold tracking-tight text-foreground" />
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create your free account
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
            <GoogleAuthButton
              label="Sign up with Google"
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
                <Label htmlFor="name" className="text-sm font-medium">
                  Full name
                </Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

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
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
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
                ref={turnstile.ref}
                onToken={turnstile.onToken}
                onExpire={turnstile.onExpire}
                className="flex justify-center"
              />

              <Button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                disabled={loading || !turnstile.canSubmit}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Sign Up
                  </span>
                )}
              </Button>
            </form>

            <div className="text-center space-y-1 text-xs text-muted-foreground">
              <p>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-emerald-600 hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
              <p>
                Forgot your password?{" "}
                <Link
                  href="/forgot-password"
                  className="text-emerald-600 hover:underline font-medium"
                >
                  Reset it
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg animate-pulse" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
