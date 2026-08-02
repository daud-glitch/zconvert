import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getOptionalDb } from "@/lib/db";
import { publicSiteUrl } from "@/lib/mail";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleUserInfo = {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
  verified_email?: boolean;
};

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const site = publicSiteUrl();
  const fail = (msg: string) =>
    NextResponse.redirect(
      `${site}/login?error=${encodeURIComponent(msg)}`,
    );

  if (!clientId || !clientSecret) {
    return fail("Google sign-in is not configured");
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get("oauth_google_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("Invalid Google sign-in state");
  }

  const redirectUri = `${site}/api/auth/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenRes.ok || !tokenJson.access_token) {
    console.error("[google-oauth] token error", tokenJson);
    return fail("Google authorization failed");
  }

  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    },
  );
  const profile = (await profileRes.json()) as GoogleUserInfo;
  if (!profile.email) {
    return fail("Google account has no email");
  }

  const prisma = getOptionalDb();
  if (!prisma) {
    return fail("Database unavailable");
  }

  const email = profile.email.toLowerCase().trim();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: profile.name || email.split("@")[0],
        avatar: profile.picture || null,
        // OAuth-only account (no password until they set one via reset)
        passwordHash: null,
        role: "user",
      },
    });
  } else if (!user.isActive) {
    return fail("Account is disabled");
  } else {
    await prisma.user
      .update({
        where: { id: user.id },
        data: {
          name: user.name || profile.name || undefined,
          avatar: user.avatar || profile.picture || undefined,
          lastLoginAt: new Date(),
        },
      })
      .catch(() => {});
  }

  if (user.twoFactorEnabled) {
    // Require password+2FA login path for 2FA admins for now
    return fail("This account has 2FA enabled — sign in with email and password");
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: request.headers.get("x-forwarded-for") || null,
      userAgent: request.headers.get("user-agent") || null,
    },
  });

  const res = NextResponse.redirect(`${site}/`);
  res.cookies.set(
    "session",
    JSON.stringify({ token: sessionToken, userId: user.id }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    },
  );
  res.cookies.set("oauth_google_state", "", { maxAge: 0, path: "/" });
  return res;
}
