import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type ArchiveEntry = { name: string; data: Buffer };

type CommandResult = {
  code: number;
  stderr: string;
};

const TOOLCHAIN_ENABLED = process.env.EXTERNAL_TOOLCHAIN_ENABLED !== "0";
const TOOLCHAIN_TIMEOUT_MS = Number(
  process.env.EXTERNAL_TOOLCHAIN_TIMEOUT_MS || "240000",
);

function splitCandidates(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }
  return out;
}

function getSofficeCandidates(): string[] {
  return unique([
    ...splitCandidates(process.env.SOFFICE_BIN),
    ...splitCandidates(process.env.SOFFICE_PATH),
    "soffice",
    "soffice.exe",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ]);
}

function getCalibreCandidates(): string[] {
  return unique([
    ...splitCandidates(process.env.CALIBRE_EBOOK_CONVERT_BIN),
    ...splitCandidates(process.env.CALIBRE_PATH),
    "ebook-convert",
    "ebook-convert.exe",
  ]);
}

function getUnrarCandidates(): string[] {
  return unique([
    ...splitCandidates(process.env.UNRAR_BIN),
    ...splitCandidates(process.env.RAR_BIN), // Rar.exe / rar can also extract with `x`
    path.join(
      process.cwd(),
      "vendor",
      "rar",
      process.platform === "win32" ? "UnRAR.exe" : "unrar",
    ),
    path.join(
      process.cwd(),
      "vendor",
      "rar",
      process.platform === "win32" ? "Rar.exe" : "rar",
    ),
    "unrar",
    "unrar.exe",
    "rar",
    "rar.exe",
    "C:\\Program Files\\WinRAR\\UnRAR.exe",
    "C:\\Program Files\\WinRAR\\Rar.exe",
    "C:\\Program Files\\WinRAR\\rar.exe",
    "C:\\Program Files (x86)\\WinRAR\\UnRAR.exe",
    "C:\\Program Files (x86)\\WinRAR\\Rar.exe",
    // Full 7-Zip GUI build supports RAR extract; 7za from 7zip-bin does not
    "C:\\Program Files\\7-Zip\\7z.exe",
    "C:\\Program Files (x86)\\7-Zip\\7z.exe",
    "7z",
    "7z.exe",
  ]);
}

function getRarCandidates(): string[] {
  return unique([
    ...splitCandidates(process.env.RAR_BIN),
    path.join(
      process.cwd(),
      "vendor",
      "rar",
      process.platform === "win32" ? "Rar.exe" : "rar",
    ),
    path.join(process.cwd(), "vendor", "rar", "rar"),
    "rar",
    "rar.exe",
    "C:\\Program Files\\WinRAR\\Rar.exe",
    "C:\\Program Files\\WinRAR\\rar.exe",
    "C:\\Program Files (x86)\\WinRAR\\Rar.exe",
  ]);
}

/**
 * Extract RAR (RAR4/RAR5) using UnRAR / WinRAR / full 7z.
 * Note: 7zip-min ships 7za which often fails on modern RAR (exit code 2).
 */
export async function extractRarWithToolchain(
  input: Buffer,
): Promise<ArchiveEntry[] | null> {
  if (!TOOLCHAIN_ENABLED) return null;
  if (!input?.length) return null;

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "zconvert-unrar-"));
  const rarPath = path.join(tmp, "archive.rar");
  const outDir = path.join(tmp, "out");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(rarPath, input);

  try {
    const candidates = getUnrarCandidates();

    for (const candidate of candidates) {
      // Skip missing absolute paths; bare names resolve via PATH (ENOENT → code 127)
      if (path.isAbsolute(candidate) && !existsSync(candidate)) continue;

      const base = path.basename(candidate).toLowerCase();
      let args: string[];
      if (base === "7z.exe" || base === "7z") {
        args = ["x", rarPath, `-o${outDir}`, "-y"];
      } else if (base === "unrar.exe" || base === "unrar") {
        args = ["x", "-y", "-idq", rarPath, outDir + path.sep];
      } else {
        args = ["x", "-y", "-idq", rarPath, outDir + path.sep];
      }

      const res = await runCommand(candidate, args, {
        timeoutMs: TOOLCHAIN_TIMEOUT_MS,
      });
      if (res.code !== 0) {
        if (res.code !== 127) {
          console.warn(
            `[rar-extract] ${candidate} failed code=${res.code}: ${res.stderr.slice(0, 200)}`,
          );
        }
        continue;
      }

      const files: ArchiveEntry[] = [];
      async function walk(dir: string, prefix = ""): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const e of entries) {
          const full = path.join(dir, e.name);
          const rel = prefix ? `${prefix}/${e.name}` : e.name;
          if (e.isDirectory()) await walk(full, rel);
          else {
            files.push({
              name: rel.replace(/\\/g, "/"),
              data: await fs.readFile(full),
            });
          }
        }
      }
      await walk(outDir);
      if (files.length > 0) return files;
    }

    return null;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

async function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; timeoutMs?: number },
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: options?.cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    let timedOut = false;
    const timeoutMs = options?.timeoutMs ?? TOOLCHAIN_TIMEOUT_MS;

    const timeout = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, timeoutMs);

    proc.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    proc.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (error.code === "ENOENT") {
        resolve({ code: 127, stderr: `${command} not found` });
        return;
      }
      reject(error);
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        resolve({ code: 124, stderr: `${command} timed out` });
        return;
      }
      resolve({ code: code ?? 1, stderr });
    });
  });
}

async function runFirstAvailable(
  candidates: string[],
  args: string[],
  options?: { cwd?: string; timeoutMs?: number },
): Promise<{ command: string } | null> {
  let lastError = "";
  for (const candidate of candidates) {
    const res = await runCommand(candidate, args, options);
    if (res.code === 0) {
      return { command: candidate };
    }
    lastError = res.stderr;
  }
  if (lastError) {
    console.warn("External toolchain command failed:", lastError.slice(0, 300));
  }
  return null;
}

async function pickOutputFile(
  outDir: string,
  targetExt: string,
): Promise<Buffer | null> {
  const files = await fs.readdir(outDir);
  const match = files.find((name) =>
    name.toLowerCase().endsWith(`.${targetExt.toLowerCase()}`),
  );
  if (!match) return null;
  return fs.readFile(path.join(outDir, match));
}

export async function convertViaLibreOffice(
  input: Buffer,
  inputExt: string,
  outputExt: string,
  outputFilter?: string,
): Promise<Buffer | null> {
  if (!TOOLCHAIN_ENABLED) return null;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "zconvert-lo-"));
  const inDir = path.join(tmp, "in");
  const outDir = path.join(tmp, "out");
  await fs.mkdir(inDir, { recursive: true });
  await fs.mkdir(outDir, { recursive: true });

  const normalizedIn = inputExt.toLowerCase().replace(/^\./, "");
  const normalizedOut = outputExt.toLowerCase().replace(/^\./, "");
  const inputPath = path.join(inDir, `input.${normalizedIn}`);
  await fs.writeFile(inputPath, input);

  const convertSpec = outputFilter
    ? `${normalizedOut}:${outputFilter}`
    : normalizedOut;
  const args = [
    "--headless",
    "--nologo",
    "--nodefault",
    "--nolockcheck",
    "--norestore",
    "--convert-to",
    convertSpec,
    "--outdir",
    outDir,
    inputPath,
  ];

  try {
    const done = await runFirstAvailable(getSofficeCandidates(), args);
    if (!done) return null;
    return await pickOutputFile(outDir, normalizedOut);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

export async function convertViaCalibre(
  input: Buffer,
  inputExt: string,
  outputExt: string,
): Promise<Buffer | null> {
  if (!TOOLCHAIN_ENABLED) return null;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "zconvert-calibre-"));
  const normalizedIn = inputExt.toLowerCase().replace(/^\./, "");
  const normalizedOut = outputExt.toLowerCase().replace(/^\./, "");
  const inputPath = path.join(tmp, `input.${normalizedIn}`);
  const outputPath = path.join(tmp, `output.${normalizedOut}`);
  await fs.writeFile(inputPath, input);

  try {
    const done = await runFirstAvailable(getCalibreCandidates(), [
      inputPath,
      outputPath,
    ]);
    if (!done) return null;
    return await fs.readFile(outputPath);
  } catch {
    return null;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

export async function createRarWithToolchain(
  files: ArchiveEntry[],
): Promise<Buffer | null> {
  if (process.env.DISABLE_RAR === "1" || process.env.DISABLE_RAR === "true") {
    return null;
  }
  if (!files.length) return null;

  // Lazily ensure vendor rar on long-running dynos (Heroku start already runs ensure-rar)
  try {
    const vendorRar = path.join(
      process.cwd(),
      "vendor",
      "rar",
      process.platform === "win32" ? "Rar.exe" : "rar",
    );
    if (!existsSync(vendorRar) && process.platform === "linux") {
      console.warn("[rar] vendor rar missing — run: npm run ensure-rar");
    }
  } catch {
    // ignore
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "zconvert-rar-"));
  const inDir = path.join(tmp, "in");
  const outPath = path.join(tmp, "archive.rar");
  await fs.mkdir(inDir, { recursive: true });

  for (const file of files) {
    // Normalize archive entry paths (no absolute / parent traversal)
    const safeName = file.name
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .split("/")
      .filter((p) => p && p !== "." && p !== "..")
      .join("/");
    if (!safeName) continue;
    const filePath = path.join(inDir, safeName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.data);
  }

  try {
    // rar/WinRAR: add recursively, strip base path (ep1), non-interactive
    const done = await runFirstAvailable(
      getRarCandidates(),
      ["a", "-r", "-ep1", "-idq", "-y", outPath, "."],
      { cwd: inDir, timeoutMs: TOOLCHAIN_TIMEOUT_MS },
    );
    if (!done) return null;
    try {
      const buf = await fs.readFile(outPath);
      return buf.length > 0 ? buf : null;
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}


