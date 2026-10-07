import { describe, expect, it } from "vitest";
import { gzipSync } from "node:zlib";
import JSZip from "jszip";
import { convertFile } from "@/lib/converter";
import { extractArchiveEntries } from "@/lib/format-readers";

/** Hand-rolled ustar writer — keeps the fixture independent of tar-stream. */
function makeTar(files: { name: string; data: Buffer }[]): Buffer {
  const blocks: Buffer[] = [];
  for (const file of files) {
    const header = Buffer.alloc(512);
    header.write(file.name, 0, "latin1");
    header.write("0000644\0", 100, "latin1");
    header.write("0000000\0", 108, "latin1");
    header.write("0000000\0", 116, "latin1");
    header.write(`${file.data.length.toString(8).padStart(11, "0")}\0`, 124, "latin1");
    header.write("14000000000\0", 136, "latin1");
    header.write("        ", 148, "latin1");
    header.write("0", 156, "latin1");
    header.write("ustar\0", 257, "latin1");
    header.write("00", 263, "latin1");
    let sum = 0;
    for (const byte of header) sum += byte;
    header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, "latin1");
    blocks.push(header);
    const padded = Buffer.alloc(Math.ceil(file.data.length / 512) * 512);
    file.data.copy(padded);
    blocks.push(padded);
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

const TAR = makeTar([
  { name: "AndroidManifest.xml", data: Buffer.from("<manifest/>\n") },
  { name: "classes.dex", data: Buffer.from([0x64, 0x65, 0x78, 0x0a, 0x30, 0x33, 0x35]) },
]);

async function entryNames(input: Buffer, src = "tar") {
  const entries = await extractArchiveEntries(input, src);
  return entries.map((e) => e.name).sort();
}

async function compressWith7zip(input: Buffer, ext: string): Promise<Buffer | null> {
  try {
    const { pack } = await import("7zip-min");
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const path = await import("node:path");
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "zconvert-tar-test-"));
    try {
      const tarPath = path.join(tmp, "archive.tar");
      const outPath = path.join(tmp, `archive.${ext}`);
      await fs.writeFile(tarPath, input);
      await pack(tarPath, outPath);
      return await fs.readFile(outPath);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
    }
  } catch {
    return null; // 7-Zip not available on this host.
  }
}

describe("tar extraction tolerates mislabeled containers", () => {
  it("extracts a plain tar", async () => {
    expect(await entryNames(TAR)).toEqual(["AndroidManifest.xml", "classes.dex"]);
  });

  it("gunzips a gzip-wrapped tar served as .tar", async () => {
    expect(await entryNames(gzipSync(TAR))).toEqual(["AndroidManifest.xml", "classes.dex"]);
  });

  it("unwraps a bzip2-wrapped tar served as .tar", async () => {
    const bz2 = await compressWith7zip(TAR, "tar.bz2");
    if (!bz2) return;
    expect(await entryNames(bz2)).toEqual(["AndroidManifest.xml", "classes.dex"]);
  });

  it("unwraps an xz-wrapped tar served as .tar", async () => {
    const xz = await compressWith7zip(TAR, "tar.xz");
    if (!xz) return;
    expect(await entryNames(xz)).toEqual(["AndroidManifest.xml", "classes.dex"]);
  });

  it("unwraps a zstd-wrapped tar served as .tar", async () => {
    const zlib = (await import("node:zlib")) as unknown as {
      zstdCompressSync?: (value: Buffer) => Buffer;
    };
    if (typeof zlib.zstdCompressSync !== "function") return;
    const wrapped = Buffer.from(zlib.zstdCompressSync(TAR));
    expect(await entryNames(wrapped)).toEqual(["AndroidManifest.xml", "classes.dex"]);
  });

  it("names the real container when a ZIP is renamed .tar", async () => {
    const zip = new JSZip();
    zip.file("a.txt", "hello");
    const zipBytes = Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
    await expect(entryNames(zipBytes)).rejects.toThrow(/really a ZIP|is a ZIP/i);
  });

  it("does not mistake a PKG-INFO tar for a ZIP", async () => {
    // Python sdists put PKG-INFO first, so the tar starts with the bytes "PK".
    const sdist = makeTar([
      { name: "PKG-INFO", data: Buffer.from("Metadata-Version: 2.1\n") },
      { name: "setup.py", data: Buffer.from("from setuptools import setup\n") },
    ]);
    expect(await entryNames(sdist)).toEqual(["PKG-INFO", "setup.py"]);
  });

  it("parses a plain tar renamed .tar.gz", async () => {
    expect(await entryNames(TAR, "tar.gz")).toEqual(["AndroidManifest.xml", "classes.dex"]);
  });
});

describe("tar -> apk", () => {
  it("repacks a gzipped tar as an APK (ZIP container)", async () => {
    const out = await convertFile(gzipSync(TAR), "tar", "apk");
    expect(out.subarray(0, 2).toString("hex")).toBe("504b");
    const zip = await JSZip.loadAsync(out);
    expect(Object.keys(zip.files).sort()).toEqual([
      "AndroidManifest.xml",
      "classes.dex",
    ]);
    expect(await zip.file("AndroidManifest.xml")?.async("string")).toBe("<manifest/>\n");
  });

  it("still repacks a plain tar", async () => {
    const out = await convertFile(TAR, "tar", "apk");
    const zip = await JSZip.loadAsync(out);
    expect(Object.keys(zip.files).sort()).toEqual(["AndroidManifest.xml", "classes.dex"]);
  });

  it("surfaces an actionable error for a zip renamed .tar", async () => {
    const zip = new JSZip();
    zip.file("a.txt", "hello");
    const zipBytes = Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
    await expect(convertFile(zipBytes, "tar", "apk")).rejects.toThrow(
      /Failed to extract TAR archive.*ZIP/i,
    );
  });
});
