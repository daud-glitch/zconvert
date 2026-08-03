import { NextResponse } from "next/server";
import { convertQueueDepth } from "@/lib/convert-queue";
import {
  countQueuedConvertJobs,
  isConvertWorkerEnabled,
} from "@/lib/convert-job-store";

/**
 * Lightweight queue snapshot (this dyno + Postgres worker queue).
 * GET /api/convert/queue
 */
export async function GET() {
  const depth = convertQueueDepth();
  const workerWaiting = await countQueuedConvertJobs().catch(() => 0);
  return NextResponse.json(
    {
      workerEnabled: isConvertWorkerEnabled(),
      workerWaiting,
      waiting: depth.waiting,
      activeLight: depth.activeLight,
      activeVideo: depth.activeVideo,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
