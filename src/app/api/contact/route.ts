import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { db } from "@/lib/db";

const ALLOWED_KINDS = new Set([
  "general",
  "broken-convert",
  "privacy",
  "billing",
]);

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
    const rawKind = String(body.kind || "general").trim().slice(0, 40);
    const kind = ALLOWED_KINDS.has(rawKind) ? rawKind : "general";
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

    await db.contactMessage.create({
      data: {
        name: name || null,
        email,
        kind,
        sourceExt: sourceExt || null,
        targetExt: targetExt || null,
        message,
        ipAddress: ip === "unknown" ? null : ip,
        status: "new",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Thanks — we received your message.",
    });
  } catch (error) {
    console.error("[contact]", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 },
    );
  }
}
