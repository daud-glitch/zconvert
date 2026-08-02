import { NextRequest, NextResponse } from "next/server";
import { publicSiteUrl } from "@/lib/mail";
import crypto from "crypto";

/**
 * Google OAuth start. Requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET.
 * Optional: GOOGLE_AUTH_ENABLED=1 (on by default if client id set).
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (
    !clientId ||
    process.env.GOOGLE_AUTH_ENABLED === "0" ||
    process.env.GOOGLE_AUTH_ENABLED === "false"
  ) {
    return NextResponse.json(
      { error: "Google sign-in is not configured" },
      { status: 503 },
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${publicSiteUrl()}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
  );
  res.cookies.set("oauth_google_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
