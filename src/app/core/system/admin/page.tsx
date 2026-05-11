"use client";

import { useState } from "react";
import { MainApp } from "@/app/page";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function AdminSecretPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, isAdminLogin: true }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch (err) {
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <MainApp defaultView="admin" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-3 pb-6">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto text-red-500 mb-2">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl text-center font-bold tracking-tight">
            Restricted Access
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Please enter your administrator credentials to continue.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 text-sm font-medium text-red-500 bg-red-50 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-800/50 text-center">
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
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
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
