import { NextRequest } from "next/server";
import { handleConvertPost } from "@/lib/api/convert-handler";
import { runFullConvert } from "@/lib/api/convert-run-full";

export const runtime = "nodejs";
/** Self-hosted video/audio conversions can take several minutes. */
export const maxDuration = 300;

/** Audio, video, ebook, presentation, subtitle, font, drawio, p7m, etc. */
export async function POST(request: NextRequest) {
  return handleConvertPost(request, runFullConvert);
}
