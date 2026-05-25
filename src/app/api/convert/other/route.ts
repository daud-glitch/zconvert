import { NextRequest } from "next/server";
import { handleConvertPost } from "@/lib/api/convert-handler";
import { runFullConvert } from "@/lib/api/convert-run-full";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Audio, ebook, presentation, subtitle, font, drawio, p7m, etc. */
export async function POST(request: NextRequest) {
  return handleConvertPost(request, runFullConvert);
}
