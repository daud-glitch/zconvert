import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  try {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (dbUser.twoFactorEnabled) {
      return NextResponse.json({ enabled: true });
    }

    const secret = speakeasy.generateSecret({ name: "ZConvert" });

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
  } catch {
    return NextResponse.json({ error: "Failed to setup 2FA" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (dbUser.twoFactorEnabled) {
      return NextResponse.json(
        { error: "2FA already enabled" },
        { status: 400 },
      );
    }

    if (!dbUser.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA not initialized. Call GET first." },
        { status: 400 },
      );
    }

    const verified = speakeasy.totp.verify({
      secret: dbUser.twoFactorSecret,
      encoding: "ascii",
      token,
      window: 1,
    });

    if (!verified) {
      return NextResponse.json({ error: "Invalid 2FA code" }, { status: 401 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    return NextResponse.json({
      success: true,
      message: "2FA enabled successfully",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to verify 2FA" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser(request);

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token required to disable 2FA" },
        { status: 400 },
      );
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!dbUser || !dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
      return NextResponse.json(
        { error: "2FA is not enabled" },
        { status: 400 },
      );
    }

    const verified = speakeasy.totp.verify({
      secret: dbUser.twoFactorSecret,
      encoding: "ascii",
      token,
      window: 1,
    });

    if (!verified) {
      return NextResponse.json({ error: "Invalid 2FA code" }, { status: 401 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return NextResponse.json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to disable 2FA" },
      { status: 500 },
    );
  }
}
