"use client";

import React, { useEffect, useRef, useState } from "react";
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
import {
  TurnstileField,
  type TurnstileHandle,
  isTurnstileEnabled,
} from "@/components/security/TurnstileField";

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
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);
  const { login, refreshUser } = useApp();
  const googleOn = isGoogleAuthEnabled();
  const turnstileOn = isTurnstileEnabled();

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRequires2FA(false);
      setTotpToken("");
      setError(null);
      setTurnstileToken("");
      turnstileRef.current?.reset();
    }
  }, [isOpen, initialMode]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setTotpToken("");
    setRequires2FA(false);
    setError(null);
    setTurnstileToken("");
    turnstileRef.current?.reset();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const captcha =
      turnstileToken || turnstileRef.current?.getToken() || undefined;
    if (turnstileOn && !captcha) {
      setError("Please complete the security check.");
      setIsLoading(false);
      return;
    }

    try {
      if (mode === "login") {
        const result = await login(
          email,
          password,
          requires2FA ? totpToken : undefined,
          captcha,
        );
        if (result.requiresTwoFactor) {
          setRequires2FA(true);
          turnstileRef.current?.reset();
          setTurnstileToken("");
          return;
        }
        if (result.success) {
          handleClose();
        } else {
          setError(result.error || "Login failed");
          turnstileRef.current?.reset();
          setTurnstileToken("");
        }
      } else {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name,
            ...(captcha ? { turnstileToken: captcha } : {}),
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
          turnstileRef.current?.reset();
          setTurnstileToken("");
        }
      }
    } catch {
      setError("An error occurred. Please try again.");
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {requires2FA
              ? "Two-Factor Authentication"
              : mode === "login"
                ? "Welcome Back"
                : "Create Account"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {requires2FA
              ? "Enter the 6-digit code from your authenticator app"
              : mode === "login"
                ? "Login to access your history and bookmarks"
                : "Sign up to keep your data safe and synced"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {error && (
            <div className="p-3 text-sm bg-destructive/10 border border-destructive/20 text-destructive rounded-lg">
              {error}
            </div>
          )}

          {!requires2FA && googleOn && (
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

          {!requires2FA && googleOn && (
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
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
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
              </>
            )}

            <TurnstileField
              ref={turnstileRef}
              onToken={setTurnstileToken}
              className="flex justify-center min-h-[0]"
            />

            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isLoading || (requires2FA && totpToken.length < 6)}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {requires2FA
                ? "Verify Code"
                : mode === "login"
                  ? "Sign In"
                  : "Sign Up"}
            </Button>

            {!requires2FA && (
              <div className="text-center text-sm text-muted-foreground">
                {mode === "login" ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setError(null);
                        turnstileRef.current?.reset();
                        setTurnstileToken("");
                      }}
                      className="text-emerald-600 hover:underline font-medium"
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setError(null);
                        turnstileRef.current?.reset();
                        setTurnstileToken("");
                      }}
                      className="text-emerald-600 hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            )}

            {requires2FA && (
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setRequires2FA(false);
                  setTotpToken("");
                  setError(null);
                  turnstileRef.current?.reset();
                  setTurnstileToken("");
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
