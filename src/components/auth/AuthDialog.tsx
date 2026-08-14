"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/app-context";
import { Loader2, Mail, Lock, User, ArrowRight, ShieldCheck } from "lucide-react";
import {
  GoogleAuthButton,
  isGoogleAuthEnabled,
} from "@/components/auth/GoogleAuthButton";
import { TurnstileField } from "@/components/security/TurnstileField";
import { useTurnstileForm } from "@/components/security/useTurnstileForm";

type AuthMode = "login" | "signup" | "forgot";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export function AuthDialog({
  isOpen,
  onClose,
  initialMode = "login",
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const turnstile = useTurnstileForm();
  const { login, refreshUser } = useApp();
  const googleOn = isGoogleAuthEnabled();

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRequires2FA(false);
      setTotpToken("");
      setError(null);
      setSuccess(null);
      turnstile.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when dialog opens
  }, [isOpen, initialMode]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setTotpToken("");
    setRequires2FA(false);
    setError(null);
    setSuccess(null);
    turnstile.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setSuccess(null);
    turnstile.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const captcha = turnstile.requireToken();
    if (!captcha.ok) {
      setError(captcha.error);
      setIsLoading(false);
      return;
    }

    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            ...(captcha.token ? { turnstileToken: captcha.token } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(
            typeof data.error === "string"
              ? data.error
              : "Could not send reset email",
          );
          turnstile.reset();
        } else {
          setSuccess(
            data.message ||
              "If an account exists for that email, we sent reset instructions.",
          );
        }
        return;
      }

      if (mode === "login") {
        const result = await login(
          email,
          password,
          requires2FA ? totpToken : undefined,
          captcha.token,
        );
        if (result.requiresTwoFactor) {
          setRequires2FA(true);
          turnstile.reset();
          return;
        }
        if (result.success) {
          handleClose();
        } else {
          setError(result.error || "Login failed");
          turnstile.reset();
        }
      } else {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name,
            ...(captcha.token ? { turnstileToken: captcha.token } : {}),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          await refreshUser();
          handleClose();
        } else {
          setError(
            typeof data.error === "string" ? data.error : "Signup failed",
          );
          turnstile.reset();
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
      turnstile.reset();
    } finally {
      setIsLoading(false);
    }
  };

  const title = requires2FA
    ? "Two-Factor Authentication"
    : mode === "forgot"
      ? "Forgot password"
      : mode === "login"
        ? "Welcome Back"
        : "Create Account";

  const description = requires2FA
    ? "Enter the 6-digit code from your authenticator app"
    : mode === "forgot"
      ? "We will email a reset link if that account exists"
      : mode === "login"
        ? "Login to access your history and bookmarks"
        : "Sign up to keep your data safe and synced";

  const submitLabel = requires2FA
    ? "Verify Code"
    : mode === "forgot"
      ? "Send reset link"
      : mode === "login"
        ? "Sign In"
        : "Sign Up";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {error && (
            <div className="p-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg">
              {success}
            </div>
          )}

          {!requires2FA && mode !== "forgot" && googleOn && (
            <GoogleAuthButton
              label={
                mode === "signup"
                  ? "Sign up with Google"
                  : "Continue with Google"
              }
              disabled={isLoading}
              withDivider={false}
            />
          )}

          {!requires2FA && mode !== "forgot" && googleOn && (
            <div className="relative py-0.5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {requires2FA ? (
              <div className="space-y-2">
                <Label htmlFor="totp">Authentication Code</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className="pl-10 tracking-widest"
                    value={totpToken}
                    onChange={(e) =>
                      setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    autoFocus
                  />
                </div>
              </div>
            ) : (
              <>
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="John Doe"
                        className="pl-10"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={mode === "signup"}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus={mode === "forgot"}
                    />
                  </div>
                </div>

                {mode !== "forgot" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="password">Password</Label>
                      {mode === "login" ? (
                        <button
                          type="button"
                          onClick={() => switchMode("forgot")}
                          className="text-xs text-emerald-600 hover:underline font-medium shrink-0"
                        >
                          Forgot password?
                        </button>
                      ) : null}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <TurnstileField
              key={`${mode}-${requires2FA ? "2fa" : "auth"}`}
              ref={turnstile.ref}
              onToken={turnstile.onToken}
              onExpire={turnstile.onExpire}
              active={isOpen}
              className="flex justify-center min-h-[65px]"
            />

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={
                isLoading ||
                !turnstile.canSubmit ||
                (requires2FA && totpToken.length < 6)
              }
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {submitLabel}
            </Button>

            {!requires2FA && mode === "login" && (
              <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="text-emerald-600 hover:underline font-medium"
                >
                  Create one
                </button>
              </div>
            )}

            {!requires2FA && mode === "signup" && (
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="text-emerald-600 hover:underline font-medium"
                >
                  Sign in
                </button>
              </div>
            )}

            {!requires2FA && mode === "forgot" && (
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground"
                onClick={() => switchMode("login")}
              >
                ← Back to sign in
              </button>
            )}

            {requires2FA && (
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setRequires2FA(false);
                  setTotpToken("");
                  setError(null);
                  turnstile.reset();
                }}
              >
                Back to password
              </button>
            )}
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
