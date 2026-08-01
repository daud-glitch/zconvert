/**
 * Ensure a runnable ffmpeg binary exists for Heroku/Linux deploys.
 * Prefer ffmpeg-static; otherwise download eugeneware static build into vendor/ffmpeg.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { execFileSync } = require("child_process");
const { createGunzip } = require("zlib");
const { pipeline } = require("stream/promises");

const ROOT = path.join(__dirname, "..");
const VENDOR_DIR = path.join(ROOT, "vendor", "ffmpeg");
const VENDOR_BIN = path.join(
  VENDOR_DIR,
  process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
);
const RELEASE = process.env.FFMPEG_BINARY_RELEASE || "b6.1.1";
const DOWNLOADS =
  process.env.FFMPEG_BINARIES_URL ||
  "https://github.com/eugeneware/ffmpeg-static/releases/download";

function cleanEnv() {
  const env = { ...process.env };
  delete env.LD_LIBRARY_PATH;
  delete env.LIBRARY_PATH;
  return env;
}

function canRun(bin) {
  try {
    try {
      fs.chmodSync(bin, 0o755);
    } catch {
      // ignore
    }
    execFileSync(bin, ["-version"], {
      stdio: "ignore",
      timeout: 20_000,
      env: cleanEnv(),
    });
    return true;
  } catch {
    return false;
  }
}

function copyToVendor(src) {
  fs.mkdirSync(VENDOR_DIR, { recursive: true });
  fs.copyFileSync(src, VENDOR_BIN);
  try {
    fs.chmodSync(VENDOR_BIN, 0o755);
  } catch {
    // ignore
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
          headers: { "User-Agent": "zconvert-ensure-ffmpeg" },
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
          // Release assets are gzip-compressed single binaries.
          const body = res.pipe(createGunzip());
          pipeline(body, out)
            .then(() => {
              fs.renameSync(tmp, dest);
              try {
                fs.chmodSync(dest, 0o755);
              } catch {
                // ignore
              }
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

async function downloadStaticRelease() {
  const platform = process.env.npm_config_platform || process.platform;
  const arch = process.env.npm_config_arch || process.arch;
  const url = `${DOWNLOADS}/${RELEASE}/ffmpeg-${platform}-${arch}.gz`;
  console.log("[ensure-ffmpeg] downloading", url);
  await downloadTo(url, VENDOR_BIN);
}

async function main() {
  if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN) && canRun(process.env.FFMPEG_BIN)) {
    console.log("[ensure-ffmpeg] FFMPEG_BIN OK:", process.env.FFMPEG_BIN);
    return;
  }

  if (fs.existsSync(VENDOR_BIN) && canRun(VENDOR_BIN)) {
    console.log("[ensure-ffmpeg] vendor OK:", VENDOR_BIN);
    return;
  }

  let staticPath = null;
  try {
    staticPath = require("ffmpeg-static");
  } catch (err) {
    console.warn("[ensure-ffmpeg] ffmpeg-static require failed:", err.message);
  }

  if (staticPath && fs.existsSync(staticPath) && canRun(staticPath)) {
    console.log("[ensure-ffmpeg] ffmpeg-static OK:", staticPath);
    copyToVendor(staticPath);
    return;
  }

  // Try re-running ffmpeg-static installer into its package dir
  const installJs = path.join(ROOT, "node_modules", "ffmpeg-static", "install.js");
  if (fs.existsSync(installJs)) {
    try {
      console.log("[ensure-ffmpeg] re-running ffmpeg-static install.js");
      execFileSync(process.execPath, [installJs], {
        cwd: ROOT,
        stdio: "inherit",
        env: { ...process.env, CI: "1" },
      });
      staticPath = require("ffmpeg-static");
      // clear require cache
      delete require.cache[require.resolve("ffmpeg-static")];
      staticPath = require("ffmpeg-static");
      if (staticPath && fs.existsSync(staticPath) && canRun(staticPath)) {
        copyToVendor(staticPath);
        console.log("[ensure-ffmpeg] ffmpeg-static install repaired:", staticPath);
        return;
      }
    } catch (err) {
      console.warn("[ensure-ffmpeg] ffmpeg-static install.js failed:", err.message);
    }
  }

  const isLinuxOrHeroku =
    process.platform === "linux" || Boolean(process.env.DYNO) || Boolean(process.env.HEROKU);

  if (!isLinuxOrHeroku) {
    console.warn(
      "[ensure-ffmpeg] no runnable ffmpeg on",
      process.platform,
      "- install system ffmpeg or ffmpeg-static for local media conversion",
    );
    return;
  }

  await downloadStaticRelease();
  if (!canRun(VENDOR_BIN)) {
    throw new Error(
      `[ensure-ffmpeg] downloaded binary is not runnable: ${VENDOR_BIN}`,
    );
  }
  console.log("[ensure-ffmpeg] vendor binary ready:", VENDOR_BIN);
}

main().catch((err) => {
  console.error("[ensure-ffmpeg] FAILED:", err);
  // Don't fail Windows/dev builds hard; fail on Heroku/Linux where media must work.
  if (process.env.DYNO || process.platform === "linux") {
    process.exit(1);
  }
});
