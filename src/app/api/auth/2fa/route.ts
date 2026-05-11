import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json({ enabled: true });
    }

    const secret = speakeasy.generateSecret({ name: "CloudConverter" });

    await db.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret.ascii },
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return NextResponse.json({
      enabled: false,
      secret: secret.base32,
      qrCode: qrCodeUrl,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to setup 2FA" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get("session");
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.twoFactorSecret) {
      return NextResponse.json({ error: "2FA not setup" }, { status: 400 });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "ascii",
      token,
      window: 1,
    });

    if (!verified) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to verify 2FA" },
      { status: 500 },
    );
  }
}
