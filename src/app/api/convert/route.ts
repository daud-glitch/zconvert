import { NextRequest, NextResponse } from "next/server";
import { handleConvertPost } from "@/lib/api/convert-handler";
import { runFullConvert } from "@/lib/api/convert-run-full";
import { getFormatByExt } from "@/lib/formats";
import type { FormatCategory } from "@/lib/formats";

export const runtime = "nodejs";
export const maxDuration = 120;

const CATEGORY_PATH: Record<FormatCategory, string> = {
  image: "/api/convert/image",
  data: "/api/convert/data",
  archive: "/api/convert/archive",
  document: "/api/convert/document",
  audio: "/api/convert/other",
  ebook: "/api/convert/other",
  presentation: "/api/convert/other",
  subtitle: "/api/convert/other",
  font: "/api/convert/other",
  other: "/api/convert/other",
};

/** Legacy endpoint — prefer category routes from the client for smaller serverless bundles. */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const ext =
      file?.name?.includes(".") ?
        file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
      : "";
    const category = ext ? getFormatByExt(ext)?.category : undefined;

    if (category && category !== "other") {
      const path = CATEGORY_PATH[category];
      const url = new URL(path, request.url);
      const forwarded = new Headers();
      request.headers.forEach((v, k) => {
        if (k !== "host" && k !== "content-length") forwarded.set(k, v);
      });
      const res = await fetch(url, {
        method: "POST",
        headers: forwarded,
        body: formData,
      });
      return new NextResponse(res.body, {
        status: res.status,
        headers: res.headers,
      });
    }
  } catch (e) {
    console.warn("[api/convert] category forward failed, using inline:", e);
  }

  return handleConvertPost(request, runFullConvert);
}
