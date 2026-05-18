import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/auth";

const ALLOWED_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "avif",
  "gif",
  "svg",
  "ico",
  "bmp",
  "tiff",
  "tif",
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "mp3",
  "wav",
  "ogg",
  "flac",
  "aac",
  "mp4",
  "webm",
  "avi",
  "mkv",
  "mov",
  "zip",
  "tar",
  "gz",
  "rar",
  "7z",
  "json",
  "xml",
  "csv",
  "txt",
  "html",
  "md",
  "epub",
  "azw3",
  "mobi",
  "fb2",
  "otf",
  "ttf",
  "woff",
  "woff2",
]);

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "169.254.169.254",
  "metadata.azure.com",
  "metadata.internal",
]);

const BLOCKED_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i,
];

const MAX_RESPONSE_SIZE = 50 * 1024 * 1024;
const MAX_TIMEOUT_MS = 30_000;

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(lower)) return true;
  return BLOCKED_IP_PATTERNS.some((p) => p.test(lower));
}

function getFileExtension(url: URL): string {
  const path = url.pathname;
  const lastDot = path.lastIndexOf(".");
  if (lastDot >= 0 && lastDot < path.length - 1) {
    return path
      .slice(lastDot + 1)
      .toLowerCase()
      .split("?")[0];
  }
  return "";
}

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rl = checkRateLimit(`fetch-url:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    const response = NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 },
    );
    Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
      if (v) response.headers.set(k, v);
    });
    return response;
  }

  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json(
      { error: "url parameter is required" },
      { status: 400 },
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return NextResponse.json(
      { error: "Only HTTP(S) URLs are allowed" },
      { status: 400 },
    );
  }

  const hostname = url.hostname;
  if (isBlockedHost(hostname)) {
    return NextResponse.json(
      { error: "This URL is not accessible" },
      { status: 403 },
    );
  }

  const ext = getFileExtension(url);
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: `File type .${ext} is not allowed` },
      { status: 400 },
    );
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ZConvert/1.0 (File Converter)",
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(MAX_TIMEOUT_MS),
      redirect: "follow",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch URL";
    return NextResponse.json(
      { error: `Fetch failed: ${message}` },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: `Remote server returned ${response.status} ${response.statusText}`,
      },
      { status: response.status },
    );
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > MAX_RESPONSE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large (max ${Math.round(MAX_RESPONSE_SIZE / 1024 / 1024)}MB)`,
        },
        { status: 413 },
      );
    }
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await response.arrayBuffer();
  } catch {
    return NextResponse.json(
      { error: "Failed to read response body" },
      { status: 502 },
    );
  }

  if (buffer.byteLength > MAX_RESPONSE_SIZE) {
    return NextResponse.json(
      {
        error: `File too large (max ${Math.round(MAX_RESPONSE_SIZE / 1024 / 1024)}MB)`,
      },
      { status: 413 },
    );
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0].trim() ||
    "application/octet-stream";

  const filename =
    url.pathname.split("/").pop()?.split("?")[0] || "downloaded_file";

  const resp = new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Original-Content-Type": contentType,
      "Content-Length": String(buffer.byteLength),
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, X-Original-Content-Type",
    },
  });

  Object.entries(rateLimitHeaders(rl)).forEach(([k, v]) => {
    if (v) resp.headers.set(k, v);
  });

  return resp;
}
