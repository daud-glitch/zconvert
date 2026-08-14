"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileField } from "@/components/security/TurnstileField";
import { useTurnstileForm } from "@/components/security/useTurnstileForm";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState("general");
  const [sourceExt, setSourceExt] = useState("");
  const [targetExt, setTargetExt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const turnstile = useTurnstileForm();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");
    setLoading(true);

    const captcha = turnstile.requireToken();
    if (!captcha.ok) {
      setError(captcha.error);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          kind,
          sourceExt,
          targetExt,
          message,
          ...(captcha.token ? { turnstileToken: captcha.token } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Send failed");
        turnstile.reset();
      } else {
        setOk(data.message || "Sent");
        setMessage("");
      }
    } catch {
      setError("Network error");
      turnstile.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="h-1 w-full bg-emerald-500" />
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Converter
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contact</h1>
            <p className="text-sm text-muted-foreground">
              Report a broken conversion or email{" "}
              <a
                href="mailto:support@convertek.tech"
                className="text-emerald-600 hover:underline"
              >
                support@convertek.tech
              </a>
            </p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div>
            <Label htmlFor="kind">Topic</Label>
            <select
              id="kind"
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="general">General question</option>
              <option value="broken-convert">Broken conversion</option>
              <option value="privacy">Privacy</option>
              <option value="billing">Account</option>
            </select>
          </div>

          {kind === "broken-convert" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="src">From format</Label>
                <Input
                  id="src"
                  className="mt-1.5"
                  placeholder="mp4"
                  value={sourceExt}
                  onChange={(e) => setSourceExt(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tgt">To format</Label>
                <Input
                  id="tgt"
                  className="mt-1.5"
                  placeholder="mp3"
                  value={targetExt}
                  onChange={(e) => setTargetExt(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <div>
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              className="mt-1.5"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Your email</Label>
            <Input
              id="email"
              type="email"
              required
              className="mt-1.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <textarea
              id="message"
              required
              rows={5}
              className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened? Include browser and file type if reporting a convert error."
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {ok ? <p className="text-sm text-emerald-600">{ok}</p> : null}

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
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Sending…" : "Send message"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Messages are delivered to{" "}
            <a
              href="mailto:support@convertek.tech"
              className="text-emerald-600 hover:underline"
            >
              support@convertek.tech
            </a>
            . We usually reply within 1–2 business days.
          </p>
        </form>
      </div>
    </div>
  );
}
