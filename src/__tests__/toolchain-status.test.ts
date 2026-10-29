import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getRarToolchainStatus } from "@/lib/external-toolchain";

const originalRarBin = process.env.RAR_BIN;

afterEach(() => {
  if (originalRarBin === undefined) delete process.env.RAR_BIN;
  else process.env.RAR_BIN = originalRarBin;
});

describe("getRarToolchainStatus", () => {
  it("reports a configured RAR_BIN with its path and source", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rar-status-"));
    const bin = path.join(dir, "rar");
    await fs.writeFile(bin, "#!/bin/sh\nexit 0\n");
    await fs.chmod(bin, 0o755).catch(() => {});
    process.env.RAR_BIN = bin;

    try {
      const status = getRarToolchainStatus();
      expect(status.rar.available).toBe(true);
      expect(status.rar.path).toBe(bin);
      expect(status.rar.source).toBe("env");
      // unrar falls back to the same configured binary (rar x can extract).
      expect(status.unrar.available).toBe(true);
      expect(status.platform).toBe(process.platform);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("always reports the vendor directory and disable flag", () => {
    const status = getRarToolchainStatus();
    expect(status.vendorDir).toContain("vendor");
    expect(typeof status.packagingDisabled).toBe("boolean");
    expect(typeof status.rar.available).toBe("boolean");
    expect(typeof status.unrar.available).toBe("boolean");
  });
});
