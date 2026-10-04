/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const convertJobTable = {
  create: vi.fn(),
  update: vi.fn(),
  findUnique: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/lib/db", () => ({
  getOptionalDb: () => ({ convertJob: convertJobTable }),
}));

import {
  createMediaJob,
  getMediaJob,
  markMediaJobDone,
  markMediaJobError,
  readMediaJobOutput,
  discardMediaJob,
} from "@/lib/media-job";

const ID = "a".repeat(32);

beforeEach(() => {
  for (const fn of Object.values(convertJobTable)) fn.mockReset();
  convertJobTable.create.mockResolvedValue({});
  convertJobTable.update.mockResolvedValue({});
  convertJobTable.delete.mockResolvedValue({});
});

describe("media job shared store", () => {
  it("persists web-dyno video jobs as processing, never queued", async () => {
    // The convert worker only claims `queued` rows. A web-dyno video job is
    // already being encoded locally, so it must never look claimable or the
    // worker would run it a second time.
    await createMediaJob({
      fileName: "clip.mp4",
      contentType: "video/mp4",
      sourceExt: "mp4",
      targetExt: "webm",
      category: "video",
    });

    expect(convertJobTable.create).toHaveBeenCalledTimes(1);
    const data = convertJobTable.create.mock.calls[0][0].data;
    expect(data.status).toBe("processing");
    expect(data.isVideo).toBe(true);
    expect(data.sourceExt).toBe("mp4");
    expect(data.targetExt).toBe("webm");
    expect(data.expiresAt).toBeInstanceOf(Date);
  });

  it("stores a done job and serves the output back from Postgres", async () => {
    const job = await createMediaJob({
      fileName: "clip.mp4",
      contentType: "video/mp4",
    });

    const payload = Buffer.from("fake-webm-bytes");

    // Simulate the result landing on another dyno: the local Map is empty and
    // only the DB row exists, which is exactly what used to 404.
    convertJobTable.update.mockImplementation(async ({ where, data }: any) => {
      convertJobTable.findUnique.mockResolvedValue({
        status: data.status,
        outputData: data.outputData,
        expiresAt: new Date(Date.now() + 60_000),
        fileName: "clip.webm",
        contentType: "video/webm",
        error: null,
        conversionId: data.conversionId,
        createdAt: new Date(),
      });
      return {};
    });

    await markMediaJobDone(job.id, payload, "conv-1");

    expect(convertJobTable.update).toHaveBeenCalledTimes(1);
    const data = convertJobTable.update.mock.calls[0][0].data;
    expect(data.status).toBe("done");
    expect(data.conversionId).toBe("conv-1");
    // Input is dropped to free Postgres space; output is inlined.
    expect(data.inputData).toBeNull();
    expect(Buffer.from(data.outputData).equals(payload)).toBe(true);

    const served = await readMediaJobOutput(job.id);
    expect(served?.equals(payload)).toBe(true);
  });

  it("keeps oversized output on disk instead of bloating Postgres", async () => {
    const prev = process.env.CONVERT_JOB_MAX_MB;
    // Cap the inline size far below the payload to force the disk path.
    process.env.CONVERT_JOB_MAX_MB = "0.000001";
    let jobId = "";
    try {
      const job = await createMediaJob({ fileName: "big.mp4", contentType: "" });
      jobId = job.id;
      await markMediaJobDone(job.id, Buffer.alloc(2048, 7), null);

      const data = convertJobTable.update.mock.calls[0][0].data;
      expect(data.status).toBe("done");
      expect(data.outputData).toBeNull();

      // The bytes are still retrievable from the local disk copy.
      const served = await readMediaJobOutput(job.id);
      expect(served?.length).toBe(2048);
    } finally {
      if (prev === undefined) delete process.env.CONVERT_JOB_MAX_MB;
      else process.env.CONVERT_JOB_MAX_MB = prev;
      if (jobId) await discardMediaJob(jobId);
    }
  });

  it("records a failure so other dynos report the real error", async () => {
    const job = await createMediaJob({ fileName: "clip.mp4", contentType: "" });
    await markMediaJobError(job.id, "Video codec not available");

    const data = convertJobTable.update.mock.calls[0][0].data;
    expect(data.status).toBe("error");
    expect(data.error).toBe("Video codec not available");
    expect(data.inputData).toBeNull();
  });

  it("resolves a job from Postgres when the local cache is cold", async () => {
    convertJobTable.findUnique.mockResolvedValue({
      id: ID,
      status: "done",
      fileName: "clip.webm",
      contentType: "video/webm",
      error: null,
      conversionId: "conv-9",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const job = await getMediaJob(ID);
    expect(job?.status).toBe("done");
    expect(job?.conversionId).toBe("conv-9");
  });

  it("treats an expired Postgres row as gone and cleans it up", async () => {
    convertJobTable.findUnique.mockResolvedValue({
      id: ID,
      status: "done",
      fileName: "clip.webm",
      contentType: "video/webm",
      error: null,
      conversionId: null,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 60_000),
    });

    expect(await getMediaJob(ID)).toBeNull();
    expect(convertJobTable.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });

  it("does not claim rows that belong to the convert worker", async () => {
    convertJobTable.findUnique.mockResolvedValue({
      id: ID,
      status: "queued",
      fileName: "light.pdf",
      contentType: "application/pdf",
      error: null,
      conversionId: null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    // Worker-owned jobs are served by the ConvertJob branch of the poll route;
    // the media-job lookup must not duplicate or shadow them.
    expect(await getMediaJob(ID)).toBeNull();
  });
});

describe("media job without a database", () => {
  it("still works purely in memory", async () => {
    vi.resetModules();
    vi.doMock("@/lib/db", () => ({ getOptionalDb: () => null }));
    const mod = await import("@/lib/media-job");

    const job = await mod.createMediaJob({
      fileName: "clip.mp4",
      contentType: "video/mp4",
    });
    expect((await mod.getMediaJob(job.id))?.status).toBe("processing");

    await mod.markMediaJobDone(job.id, Buffer.from("bytes"), "c1");
    expect((await mod.getMediaJob(job.id))?.status).toBe("done");
    expect((await mod.readMediaJobOutput(job.id))?.toString()).toBe("bytes");

    await mod.discardMediaJob(job.id);
    expect(await mod.getMediaJob(job.id)).toBeNull();
    vi.doUnmock("@/lib/db");
  });
});