import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getOptionalDb } from "@/lib/db";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { publicSiteUrl, sendMail } from "@/lib/mail";

const GENERIC =
  "If an account exists for that email, we sent password reset instructions.";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rl = checkRateLimit(`forgot-pw:${ip}`, 5, 15 * 60_000);
  if (!rl.allowed) {
    const response = NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 },
    );
    Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
      if (v) response.headers.set(k, v);
    });
    return response;
  }

  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();
    const prisma = getOptionalDb();
    if (!prisma) {
      return NextResponse.json({ success: true, message: GENERIC });
    }

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user || !user.passwordHash || !user.isActive) {
      return NextResponse.json({ success: true, message: GENERIC });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl = `${publicSiteUrl()}/reset-password?token=${rawToken}`;
    const sent = await sendMail({
      to: user.email,
      subject: "Reset your Cloud Converter password",
      text: [
        "You requested a password reset for Cloud Converter.",
        "",
        `Open this link within 1 hour: ${resetUrl}`,
        "",
        "If you did not request this, ignore this email.",
      ].join("\n"),
      html: `
        <p>You requested a password reset for <strong>Cloud Converter</strong>.</p>
        <p><a href="${resetUrl}">Reset password</a> (expires in 1 hour)</p>
        <p style="color:#666;font-size:13px">If you did not request this, you can ignore this email.</p>
      `,
    });

    if (!sent.ok) {
      // Do not reveal mail failure detail to client beyond generic
      console.error("[forgot-password] mail failed:", sent.error);
      return NextResponse.json(
        {
          error:
            "Could not send email right now. Try again later or contact support@cloudconveter.tech",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ success: true, message: GENERIC });
  } catch (error) {
    console.error("[forgot-password]", error);
    return NextResponse.json(
      { error: "Request failed" },
      { status: 500 },
    );
  }
}
