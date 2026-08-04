/**
 * @vitest-environment node
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  getServerMaxUploadBytes,
  getClientMaxUploadBytes,
  getNonVideoMaxUploadBytes,
  getVideoMaxUploadBytes,
  getMaxNonVideoBatchFiles,
  getMaxUploadBytesForCategory,
  isFfmpegConversionAvailable,
  isVercelDeployment,
} from "@/lib/upload-limits";
import { isConversionSuccess } from "@/lib/app-helpers";
import { getCategoryCapability } from "@/lib/format-capability";
import { formats, getFormatByExt, isConversionPairListed } from "@/lib/formats";

describe("upload limits defaults", () => {
  const envKeys = [
    "VERCEL",
    "MAX_UPLOAD_SIZE_MB",
    "NEXT_PUBLIC_MAX_UPLOAD_MB",
    "MAX_NONVIDEO_UPLOAD_MB",
    "NEXT_PUBLIC_MAX_NONVIDEO_UPLOAD_MB",
    "MAX_VIDEO_UPLOAD_MB",
    "NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB",
    "MAX_NONVIDEO_BATCH",
    "NEXT_PUBLIC_MAX_NONVIDEO_BATCH",
    "NEXT_PUBLIC_VERCEL",
    "FORCE_FFMPEG",
    "DISABLE_FFMPEG",
    "NEXT_PUBLIC_CONVERT_API_URL",
  ] as const;
  const snapshot: Record<string, string | undefined> = {};

  function clearUploadEnv() {
    for (const key of envKeys) {
      snapshot[key] = process.env[key];
      delete process.env[key];
    }
  }

  function restoreUploadEnv() {
    for (const key of envKeys) {
      const prev = snapshot[key];
      if (prev === undefined) delete process.env[key];
      else process.env[key] = prev;
    }
  }

  afterEach(() => {
    restoreUploadEnv();
  });

  it("defaults server upload to 100MB when not on Vercel", () => {
    clearUploadEnv();
    expect(isVercelDeployment()).toBe(false);
    expect(getServerMaxUploadBytes()).toBe(100 * 1024 * 1024);
  });

  it("caps server upload on Vercel to ~4.5MB", () => {
    clearUploadEnv();
    process.env.VERCEL = "1";
    process.env.MAX_UPLOAD_SIZE_MB = "100";
    expect(getServerMaxUploadBytes()).toBeLessThanOrEqual(
      Math.floor(4.5 * 1024 * 1024),
    );
  });

  it("defaults client upload to 100MB off Vercel (video ceiling)", () => {
    clearUploadEnv();
    expect(getClientMaxUploadBytes()).toBe(100 * 1024 * 1024);
  });

  it("defaults non-video to 30MB and video to 100MB", () => {
    clearUploadEnv();
    expect(getNonVideoMaxUploadBytes()).toBe(30 * 1024 * 1024);
    expect(getVideoMaxUploadBytes()).toBe(100 * 1024 * 1024);
    expect(getMaxNonVideoBatchFiles()).toBe(10);
    expect(getMaxUploadBytesForCategory("image")).toBe(30 * 1024 * 1024);
    expect(getMaxUploadBytesForCategory("video")).toBe(100 * 1024 * 1024);
  });

  it("treats ffmpeg as available off Vercel", () => {
    clearUploadEnv();
    expect(isFfmpegConversionAvailable()).toBe(true);
  });

  it("disables ffmpeg on Vercel without FORCE_FFMPEG", () => {
    clearUploadEnv();
    process.env.VERCEL = "1";
    expect(isFfmpegConversionAvailable()).toBe(false);
  });
});

describe("status helpers", () => {
  it("accepts done and completed as success", () => {
    expect(isConversionSuccess("done")).toBe(true);
    expect(isConversionSuccess("completed")).toBe(true);
    expect(isConversionSuccess("error")).toBe(false);
  });
});

describe("format capability map", () => {
  it("includes video and honest statuses", () => {
    expect(getCategoryCapability("video").status).toMatch(/functional|partial/);
    expect(getCategoryCapability("subtitle").status).toBe("functional");
    expect(getCategoryCapability("font").status).toBe("partial");
  });
});

describe("formats honesty", () => {
  it("does not list unsupported exotic data/ebook inputs", () => {
    expect(getFormatByExt("orc")).toBeUndefined();
    expect(getFormatByExt("toon")).toBeUndefined();
    expect(getFormatByExt("xpt")).toBeUndefined();
    expect(getFormatByExt("tgs")).toBeUndefined();
  });

  it("lists video and common image pairs", () => {
    expect(getFormatByExt("mp4")?.category).toBe("video");
    expect(isConversionPairListed("png", "jpg")).toBe(true);
    expect(isConversionPairListed("mp4", "mp3")).toBe(true);
    expect(formats.length).toBeGreaterThan(80);
  });

  it("limits font targets to real woff2 pairs", () => {
    expect(getFormatByExt("ttf")?.targetFormats).toEqual(["woff2"]);
    expect(getFormatByExt("woff2")?.targetFormats).toEqual(["ttf"]);
  });
});
