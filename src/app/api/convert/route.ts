import { NextRequest } from "next/server";
import { handleConvertPost } from "@/lib/api/convert-handler";
import { runFullConvert } from "@/lib/api/convert-run-full";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Legacy endpoint — client prefers category routes; this still accepts raw/multipart uploads. */
export async function POST(request: NextRequest) {
  return handleConvertPost(request, runFullConvert);
}
