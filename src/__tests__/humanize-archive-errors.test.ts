import { describe, expect, it } from "vitest";
import { humanizeConversionError } from "@/lib/upload-limits";

describe("humanizeConversionError archive vs audio", () => {
  it("does not mislabel archive extract failures as audio", () => {
    const msg = humanizeConversionError(
      "Failed to extract RAR archive: Conversion failed!",
    );
    expect(msg.toLowerCase()).not.toContain("audio");
    expect(msg.toLowerCase()).not.toContain("wav/mp3");
    expect(msg.toLowerCase()).toMatch(/extract|rar|archive/);
  });

  it("keeps RAR packaging guidance", () => {
    const msg = humanizeConversionError(
      "RAR output requires an external RAR CLI (WinRAR/rar). Set RAR_BIN to enable, or choose ZIP/TAR.GZ instead.",
    );
    expect(msg.toLowerCase()).toMatch(/rar|zip|7z/);
    expect(msg.toLowerCase()).not.toContain("audio");
  });

  it("does not report a RAR extract failure as missing RAR packaging", () => {
    const msg = humanizeConversionError(
      "Could not extract RAR archive. Install UnRAR/WinRAR (or set UNRAR_BIN), or ensure RAR_BIN is available. Details: unexpected end of archive.",
    );
    expect(msg.toLowerCase()).not.toContain("packaging");
    expect(msg.toLowerCase()).toMatch(/rar/);
    expect(msg.toLowerCase()).toMatch(/password|corrupt|extract/);
  });

  it("keeps the container hint when a ZIP is renamed .tar", () => {
    const msg = humanizeConversionError(
      "Failed to extract TAR archive: this file is a ZIP archive, not an uncompressed TAR. Rename it to .zip and convert from there.",
    );
    expect(msg.toLowerCase()).toContain("zip");
    expect(msg.toLowerCase()).toContain("tar");
    expect(msg.toLowerCase()).not.toContain("audio");
  });

  it("keeps the wrapper hint when a compressed tar will not decompress", () => {
    const msg = humanizeConversionError(
      "Failed to extract TAR archive: could not decompress the GZIP wrapper (incorrect header check). The file may be truncated or corrupt.",
    );
    expect(msg.toLowerCase()).toContain("gzip");
    expect(msg.toLowerCase()).not.toContain("audio");
  });

  it("still humanizes real ffmpeg audio failures", () => {
    const msg = humanizeConversionError(
      "ffmpeg exited with code 234: size= 0KiB time=N/A bitrate=N/A speed=N/A Conversion failed!",
    );
    expect(msg.toLowerCase()).toContain("audio");
  });
});
