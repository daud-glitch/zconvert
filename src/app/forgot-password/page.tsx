"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileField } from "@/components/security/TurnstileField";
import { useTurnstileForm } from "@/components/security/useTurnstileForm";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const turnstile = useTurnstileForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const captcha = turnstile.requireToken();
    if (!captcha.ok) {
      setError(captcha.error);
      setLoading(false);
      return;
    }

    try {
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
        setError(data.error || "Request failed");
        turnstile.reset();
      } else {
        setMessage(
          data.message ||
            "If an account exists for that email, we sent reset instructions.",
        );
      }
    } catch {
      setError("Network error");
      turnstile.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="h-1 w-full bg-emerald-500" />
      <div className="p-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Forgot password
            </h1>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              We will email a reset link if that account exists
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  className="mt-1.5"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {message ? (
                <p className="text-sm text-emerald-600">{message}</p>
              ) : null}
              <TurnstileField
                ref={turnstile.ref}
                onToken={turnstile.onToken}
                onExpire={turnstile.onExpire}
                className="flex justify-center"
              />
              <Button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600"
                disabled={loading || !turnstile.canSubmit}
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
