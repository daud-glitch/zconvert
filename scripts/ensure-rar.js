/**
 * Ensure a rar CLI binary exists for archive creation on Linux/Heroku.
 * Source: official RAR for Linux from rarlab.com (trial CLI; license for production use is the operator's responsibility).
 *
 * Layout: vendor/rar/rar
 * Override: RAR_BIN or RAR_BINARY_URL / RAR_BINARY_VERSION
 */
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { execFileSync } = require("child_process");
const { pipeline } = require("stream/promises");

const ROOT = path.join(__dirname, "..");
const VENDOR_DIR = path.join(ROOT, "vendor", "rar");
const VENDOR_BIN = path.join(VENDOR_DIR, "rar");
const VERSION = process.env.RAR_BINARY_VERSION || "723";
const DEFAULT_URL =
  process.env.RAR_BINARY_URL ||
  `https://www.rarlab.com/rar/rarlinux-x64-${VERSION}.tar.gz`;

function canRun(bin) {
  try {
    try {
      fs.chmodSync(bin, 0o755);
    } catch {
      // ignore
    }
    // `rar` with no args returns usage and non-zero on some versions; try "a" help
    execFileSync(bin, [], {
      stdio: "ignore",
      timeout: 15_000,
    });
    return true;
  } catch (err) {
    // Exit code > 0 with usage is still "runnable"
    if (err && (err.status === 0 || err.status === 7 || err.status === 1)) {
      return fs.existsSync(bin);
    }
    // ENOENT or cannot execute
    if (err && err.code === "ENOENT") return false;
    // Still present and spawned → OK (rar prints usage and exits 7)
    return fs.existsSync(bin) && fs.statSync(bin).size > 10_000;
  }
}

function downloadTo(url, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.download`;

  return new Promise((resolve, reject) => {
    const get = (u, redirects = 0) => {
      const lib = u.startsWith("http://") ? http : https;
      const req = lib.get(
        u,
        {
          headers: { "User-Agent": "zconvert-ensure-rar" },
          timeout: 120_000,
        },
        (res) => {
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location &&
            redirects < 8
          ) {
            res.resume();
            get(res.headers.location, redirects + 1);
            return;
          }
          if (res.statusCode !== 200) {
            res.resume();
            reject(new Error(`Download failed HTTP ${res.statusCode}: ${u}`));
            return;
          }
          const out = fs.createWriteStream(tmp);
          pipeline(res, out)
            .then(() => {
              fs.renameSync(tmp, dest);
              resolve();
            })
            .catch((err) => {
              try {
                fs.unlinkSync(tmp);
              } catch {
                // ignore
              }
              reject(err);
            });
        },
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Download timeout: ${u}`));
      });
    };
    get(url);
  });
}

function extractRarBinary(tgzPath) {
  fs.mkdirSync(VENDOR_DIR, { recursive: true });
  const extractDir = path.join(VENDOR_DIR, "_extract");
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });

  // Prefer system tar (available on Heroku Linux)
  try {
    execFileSync("tar", ["-xzf", tgzPath, "-C", extractDir], {
      stdio: "ignore",
      timeout: 60_000,
    });
  } catch (err) {
    throw new Error(`tar extract failed: ${err.message}`);
  }

  // Package layout is typically extractDir/rar/rar
  const candidates = [];
  function walk(dir, depth = 0) {
    if (depth > 4) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full, depth + 1);
      else if (name === "rar" || name === "Rar.exe") candidates.push(full);
    }
  }
  walk(extractDir);

  const bin = candidates.find((c) => path.basename(c).toLowerCase() === "rar");
  if (!bin) {
    throw new Error("rar binary not found inside tarball");
  }
  fs.copyFileSync(bin, VENDOR_BIN);
  try {
    fs.chmodSync(VENDOR_BIN, 0o755);
  } catch {
    // ignore
  }
  fs.rmSync(extractDir, { recursive: true, force: true });
  try {
    fs.unlinkSync(tgzPath);
  } catch {
    // ignore
  }
}

async function main() {
  if (process.env.RAR_BIN && fs.existsSync(process.env.RAR_BIN) && canRun(process.env.RAR_BIN)) {
    console.log("[ensure-rar] RAR_BIN OK:", process.env.RAR_BIN);
    return;
  }

  if (fs.existsSync(VENDOR_BIN) && canRun(VENDOR_BIN)) {
    console.log("[ensure-rar] vendor OK:", VENDOR_BIN);
    return;
  }

  const isLinuxOrHeroku =
    process.platform === "linux" ||
    Boolean(process.env.DYNO) ||
    Boolean(process.env.HEROKU);

  if (!isLinuxOrHeroku) {
    console.warn(
      "[ensure-rar] skip auto-install on",
      process.platform,
      "- install WinRAR or set RAR_BIN for local RAR packaging",
    );
    return;
  }

  const tgzPath = path.join(VENDOR_DIR, "rarlinux.tar.gz");
  fs.mkdirSync(VENDOR_DIR, { recursive: true });
  console.log("[ensure-rar] downloading", DEFAULT_URL);
  await downloadTo(DEFAULT_URL, tgzPath);
  extractRarBinary(tgzPath);

  if (!canRun(VENDOR_BIN)) {
    throw new Error(`[ensure-rar] downloaded binary not runnable: ${VENDOR_BIN}`);
  }
  console.log("[ensure-rar] vendor binary ready:", VENDOR_BIN);
}

main().catch((err) => {
  console.error("[ensure-rar] FAILED:", err.message || err);
  // Soft-fail: ZIP/7z still work; RAR packaging stays optional on broken downloads
  if (process.env.ENSURE_RAR_STRICT === "1") {
    process.exit(1);
  }
});
