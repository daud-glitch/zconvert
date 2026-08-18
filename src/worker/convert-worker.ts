/**
 * Heroku worker: drains Postgres ConvertJob queue with parallel slots.
 * Procfile: worker: npm run worker
 *
 * Set CONVERT_USE_WORKER=1 on web. Scale: heroku ps:scale worker=1
 *
 * Parallelism matches convert-queue limits (default 5 light + 1 video).
 * Claims use SKIP LOCKED so multiple in-flight jobs stay safe.
 */
async function main() {
  // ffmpeg path: `npm run worker` runs scripts/ensure-ffmpeg.js first
  const { getOptionalDb } = await import("../lib/db");
  const {
    claimNextConvertJob,
    completeConvertJob,
    failConvertJob,
    sweepExpiredConvertJobs,
  } = await import("../lib/convert-job-store");
  const { withConvertSlot, convertSlotLimits } = await import(
    "../lib/convert-queue"
  );
  const { runFullConvert } = await import("../lib/api/convert-run-full");
  const { logConversion } = await import("../lib/conversion-log");
  const { humanizeConversionError } = await import("../lib/upload-limits");
  const { isPdfRasterTarget } = await import("../lib/pdf-raster-targets");

  if (!getOptionalDb()) {
    console.error("[worker] DATABASE_URL / Prisma not available — exiting");
    process.exit(1);
  }

  const limits = convertSlotLimits();
  const maxInflight = limits.maxLight + limits.maxVideo;

  let idleTicks = 0;
  const inflight = new Set<Promise<void>>();

  const processJob = async (
    job: NonNullable<Awaited<ReturnType<typeof claimNextConvertJob>>>,
  ) => {
    const start = Date.now();
    try {
      const outBuf = await withConvertSlot(
        job.isVideo,
        async () => {
          if (job.sourceExt === "pdf" && isPdfRasterTarget(job.targetExt)) {
            const { convertPdfToRasterOutput } = await import(
              "../lib/pdf-utils"
            );
            const baseName = job.fileName.replace(/\.pdf$/i, "");
            const pdfOut = await convertPdfToRasterOutput(
              job.inputData,
              job.targetExt,
              job.quality,
              baseName,
            );
            return pdfOut.data;
          }
          const out = await runFullConvert(
            job.inputData,
            job.sourceExt,
            job.targetExt,
            job.quality,
            job.width,
            job.height,
          );
          return out.buffer;
        },
        job.inputData.length,
      );

      const conversionId = await logConversion({
        userId: job.userId,
        fileName: job.fileName,
        originalExt: job.sourceExt,
        targetExt: job.targetExt,
        category: job.category || "other",
        inputSize: job.inputData.length,
        outputSize: outBuf.length,
        status: "done",
        duration: Date.now() - start,
        ipAddress: job.ipAddress,
      });

      await completeConvertJob(job.id, outBuf, conversionId);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Worker conversion failed";
      console.error(`[worker] fail ${job.id}:`, msg);
      await failConvertJob(job.id, humanizeConversionError(msg));
      await logConversion({
        userId: job.userId,
        fileName: job.fileName,
        originalExt: job.sourceExt,
        targetExt: job.targetExt,
        category: job.category || "other",
        inputSize: job.inputData.length,
        outputSize: 0,
        status: "error",
        duration: Date.now() - start,
        error: msg,
        ipAddress: job.ipAddress,
      }).catch(() => undefined);
    }
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      if (idleTicks % 60 === 0) {
        await sweepExpiredConvertJobs().catch(() => 0);
      }

      // Fill free parallel slots (claim → process without blocking the loop)
      while (inflight.size < maxInflight) {
        const job = await claimNextConvertJob();
        if (!job) break;
        idleTicks = 0;
        const p = processJob(job).finally(() => {
          inflight.delete(p);
        });
        inflight.add(p);
      }

      if (inflight.size === 0) {
        idleTicks += 1;
        await sleep(1500);
        continue;
      }

      // Wait until any job frees a slot, then fill again
      await Promise.race(inflight);
    } catch (loopErr) {
      console.error("[worker] loop error", loopErr);
      await sleep(3000);
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
