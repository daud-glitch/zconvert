import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mail";
import { verifyTurnstileToken } from "@/lib/turnstile";

const SUPPORT = process.env.SUPPORT_EMAIL?.trim() || "support@convertek.tech";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rl = checkRateLimit(`contact:${ip}`, 5, 60 * 60_000);
  if (!rl.allowed) {
    const response = NextResponse.json(
      { error: "Too many messages. Try again later." },
      { status: 429 },
    );
    Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
      if (v) response.headers.set(k, v);
    });
    return response;
  }

  try {
    const body = await request.json();

    const captcha = await verifyTurnstileToken(body.turnstileToken, ip);
    if (!captcha.ok) {
      return NextResponse.json({ error: captcha.error }, { status: 400 });
    }

    const name = String(body.name || "").trim().slice(0, 100);
    const email = String(body.email || "").trim().slice(0, 200);
    const kind = String(body.kind || "general").trim().slice(0, 40);
    const message = String(body.message || "").trim().slice(0, 4000);
    const sourceExt = String(body.sourceExt || "").trim().slice(0, 20);
    const targetExt = String(body.targetExt || "").trim().slice(0, 20);

    if (!email || !message) {
      return NextResponse.json(
        { error: "Email and message are required" },
        { status: 400 },
      );
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (message.length < 10) {
      return NextResponse.json(
        { error: "Message must be at least 10 characters" },
        { status: 400 },
      );
    }

    const subject =
      kind === "broken-convert"
        ? `[Broken convert] ${sourceExt || "?"} → ${targetExt || "?"} · Convertek`
        : `[Contact] ${kind} · Convertek`;

    const text = [
      `From: ${name || "(no name)"} <${email}>`,
      `Type: ${kind}`,
      sourceExt || targetExt
        ? `Formats: ${sourceExt || "?"} → ${targetExt || "?"}`
        : null,
      `IP: ${ip}`,
      "",
      message,
    ]
      .filter(Boolean)
      .join("\n");

    const sent = await sendMail({
      to: SUPPORT,
      subject,
      text,
      html: `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">${text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</pre>`,
      replyTo: name ? `${name} <${email}>` : email,
    });

    if (!sent.ok) {
      return NextResponse.json(
        {
          error: `Could not send message. Email ${SUPPORT} directly.`,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Thanks — we received your message.",
    });
  } catch (error) {
    console.error("[contact]", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
