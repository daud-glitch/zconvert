"use client";

import { useRef, useState } from "react";
import { LifeBuoy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TurnstileField,
  type TurnstileHandle,
  isTurnstileEnabled,
} from "@/components/security/TurnstileField";
import { PageHero } from "@/components/common/PageHero";
import { SiteFooter } from "@/components/common/SiteFooter";
import { SiteHeader } from "@/components/common/SiteHeader";

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
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileHandle>(null);
  const turnstileOn = isTurnstileEnabled();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");
    setLoading(true);

    const captcha =
      turnstileToken || turnstileRef.current?.getToken() || undefined;
    if (turnstileOn && !captcha) {
      setError("Please complete the security check.");
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
          ...(captcha ? { turnstileToken: captcha } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Send failed");
        turnstileRef.current?.reset();
        setTurnstileToken("");
      } else {
        setOk(data.message || "Sent");
        setMessage("");
        turnstileRef.current?.reset();
        setTurnstileToken("");
      }
    } catch {
      setError("Network error");
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <PageHero
          breadcrumb={[
            { href: "/", label: "Home" },
            { href: "/contact", label: "Contact" },
          ]}
          eyebrow="Support"
          eyebrowIcon={<LifeBuoy className="h-4 w-4" aria-hidden />}
          title="Contact"
          lead="Report a broken conversion, send feedback, or ask a question."
        />

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
            ref={turnstileRef}
            onToken={setTurnstileToken}
            className="flex justify-center"
          />

          <Button
            type="submit"
            className="w-full bg-emerald-700 hover:bg-emerald-800"
            disabled={loading}
          >
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Sending…" : "Send message"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Your message goes to our support inbox. We usually reply within 1–2
            business days.
          </p>
        </form>
      </main>
      <SiteFooter />
    </>
  );
}
