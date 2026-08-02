import { NextRequest, NextResponse } from "next/server";
import {
  discardMediaJob,
  getMediaJob,
  readMediaJobOutput,
} from "@/lib/media-job";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Poll / download async video conversion jobs (avoids Heroku H12 on long encodes). */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  const download = request.nextUrl.searchParams.get("download") === "1";

  if (!id || !/^[a-f0-9]{32}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
  }

  const job = getMediaJob(id);
  if (!job) {
    return NextResponse.json(
      { error: "Job not found or expired. Retry convert." },
      { status: 404 },
    );
  }

  if (job.status === "processing") {
    return NextResponse.json({
      status: "processing",
      jobId: job.id,
    });
  }

  if (job.status === "error") {
    return NextResponse.json(
      {
        status: "error",
        error: job.error || "Conversion failed",
      },
      { status: 422 },
    );
  }

  // done
  if (!download) {
    return NextResponse.json({
      status: "done",
      jobId: job.id,
      fileName: job.fileName,
      conversionId: job.conversionId ?? null,
    });
  }

  const buffer = await readMediaJobOutput(id);
  if (!buffer?.length) {
    return NextResponse.json(
      { error: "Result file missing. Please convert again." },
      { status: 410 },
    );
  }

  const safeName = (job.fileName || "output.bin").replace(/"/g, '\\"');
  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "X-Original-Content-Type":
      job.contentType || "application/octet-stream",
    "Content-Disposition": `inline; filename="${safeName}"`,
    "Content-Length": String(buffer.length),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    "Access-Control-Expose-Headers":
      "Content-Disposition, Content-Length, X-Original-Content-Type, X-Conversion-Id",
  };
  if (job.conversionId) {
    headers["X-Conversion-Id"] = job.conversionId;
  }

  // Consume job after download to free disk
  const body = buffer;
  void discardMediaJob(id);

  return new NextResponse(body as unknown as BodyInit, { headers });
}
