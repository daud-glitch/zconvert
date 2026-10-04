import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * IndexNow key file.
 *
 * IndexNow validates ownership by fetching the key from `keyLocation`
 * (notify-indexnow.cjs points here). Without this route the key 404s and
 * every submission is rejected as unverified.
 *
 * The key is only ever echoed back when the requested filename matches
 * INDEXNOW_KEY exactly, so this cannot be used to reflect arbitrary input.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string }> },
) {
  const expected = process.env.INDEXNOW_KEY?.trim();
  const { key } = await context.params;

  const requested = (key || "").trim().toLowerCase();
  const normalizedExpected = (expected || "").toLowerCase();

  if (!expected || requested !== `${normalizedExpected}.txt`) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return new NextResponse(expected, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}