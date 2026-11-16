"use client";

import { useRef, useState } from "react";
import MainApp from "@/components/pages/HomeClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import {
  TurnstileField,
  type TurnstileHandle,
  isTurnstileEnabled,
} from "@/components/security/TurnstileField";

export default function AdminSecretPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);
  const turnstileOn = isTurnstileEnabled();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

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
          email,
          password,
          isAdminLogin: true,
          ...(captcha ? { turnstileToken: captcha } : {}),
        }),
      });

      const data = await res.json().catch(() => ({ error: "Invalid response from server" }));
      if (res.ok && data.success) {
        setIsAuthenticated(true);
      } else {
        setError(data.error || `Error ${res.status}: Login failed`);
        turnstileRef.current?.reset();
        setTurnstileToken("");
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : "Connection failed"}`);
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <MainApp defaultView="admin" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-sm">
        <CardHeader className="space-y-3 pb-6">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <CardTitle className="text-center text-2xl font-bold tracking-tight">
            Restricted Access
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Please enter your administrator credentials to continue.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-sm font-medium text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Administrator Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <TurnstileField
              ref={turnstileRef}
              onToken={setTurnstileToken}
              className="flex justify-center"
            />
            <Button
              type="submit"
              className="h-11 w-full bg-emerald-700 text-base font-semibold text-white hover:bg-emerald-800"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Authorize"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
