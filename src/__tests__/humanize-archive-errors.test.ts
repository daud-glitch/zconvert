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

  it("still humanizes real ffmpeg audio failures", () => {
    const msg = humanizeConversionError(
      "ffmpeg exited with code 234: size= 0KiB time=N/A bitrate=N/A speed=N/A Conversion failed!",
    );
    expect(msg.toLowerCase()).toContain("audio");
  });
});
