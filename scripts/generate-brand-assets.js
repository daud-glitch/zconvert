/**
 * Generate Convertek brand pack from the official 3D glass icon.
 * Run: node scripts/generate-brand-assets.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.resolve(
  process.env.BRAND_SRC ||
    path.join(
      process.env.USERPROFILE || "",
      ".cursor",
      "projects",
      "e-Zconvetr-zconvert",
      "assets",
      "c__Users_Daoud_Khan_AppData_Roaming_Cursor_User_workspaceStorage_604929fff5daeca64cd8e0f1345833d6_images_convertek-icon-ce00e631-50f1-468a-acee-b4a732f3d874.png",
    ),
);

const OUT = {
  brandSource: path.join(ROOT, "public", "brand", "convertek-logo-source.png"),
  logoMark: path.join(ROOT, "public", "logo-mark.png"),
  brandMark: path.join(ROOT, "public", "brand", "logo-mark.png"),
  brandPremium: path.join(ROOT, "public", "brand", "convertek-premium-3d-mark.png"),
  brand3d: path.join(ROOT, "public", "brand", "convertek-3d-logo-mark.png"),
  icon1024: path.join(ROOT, "public", "icon-1024.png"),
  icon512: path.join(ROOT, "public", "icon-512.png"),
  icon192: path.join(ROOT, "public", "icon-192.png"),
  apple: path.join(ROOT, "public", "apple-touch-icon.png"),
  fav64: path.join(ROOT, "public", "favicon-64.png"),
  fav32: path.join(ROOT, "public", "favicon-32.png"),
  fav16: path.join(ROOT, "public", "favicon-16.png"),
  favIco: path.join(ROOT, "public", "favicon.ico"),
  favSvg: path.join(ROOT, "public", "favicon.svg"),
  iconSvg: path.join(ROOT, "public", "icon.svg"),
  logoSvg: path.join(ROOT, "public", "logo.svg"),
  og: path.join(ROOT, "public", "og-image.png"),
  desktopIco: path.join(
    ROOT,
    "CloudConverter.Desktop",
    "src",
    "CloudConverter.Desktop",
    "Assets",
    "app.ico",
  ),
  desktopPng: path.join(
    ROOT,
    "CloudConverter.Desktop",
    "src",
    "CloudConverter.Desktop",
    "Assets",
    "app.png",
  ),
};

/** Near-black backdrop → transparent so logos float cleanly on light/dark UI. */
async function makeTransparentMark(inputBuffer, size) {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    // Remove solid black / very dark frame corners (not emerald green core)
    if (r < 18 && g < 22 && b < 18) {
      data[o + 3] = 0;
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png({
    compressionLevel: 9,
    palette: false,
  });
}

/** Multi-size ICO: 16 + 32 + 48 + 64 (PNG-compressed ICO entries). */
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = [];
  for (const buf of pngBuffers) {
    const meta = Buffer.alloc(16);
    // width/height 0 means 256 for classic ICO; for PNG < 256 write real sizes if we know them
    meta[0] = 0; // filled after
    meta[1] = 0;
    meta[2] = 0;
    meta[3] = 0;
    meta.writeUInt16LE(1, 4); // color planes
    meta.writeUInt16LE(32, 6); // bit count
    meta.writeUInt32LE(buf.length, 8);
    meta.writeUInt32LE(offset, 12);
    entries.push({ meta, buf });
    offset += buf.length;
  }

  // Sizes from PNG IHDR
  for (const e of entries) {
    const w = e.buf.readUInt32BE(16);
    const h = e.buf.readUInt32BE(20);
    e.meta[0] = w >= 256 ? 0 : w;
    e.meta[1] = h >= 256 ? 0 : h;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // icon type
  header.writeUInt16LE(count, 4);

  return Buffer.concat([
    header,
    ...entries.map((e) => e.meta),
    ...entries.map((e) => e.buf),
  ]);
}

function svgWrapper(pngBase64, size = 64, label = "Convertek") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}">
  <image href="data:image/png;base64,${pngBase64}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>
</svg>
`;
}

async function buildOg(logoBuf) {
  const W = 1200;
  const H = 630;
  const iconSize = 320;

  const icon = await makeTransparentMark(logoBuf, iconSize).then((s) =>
    s.png().toBuffer(),
  );

  // Deep emerald atmospheric background + soft gradient orb
  const bg = Buffer.from(`
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#042f1f"/>
          <stop offset="45%" stop-color="#065f46"/>
          <stop offset="100%" stop-color="#022c22"/>
        </linearGradient>
        <radialGradient id="orb" cx="72%" cy="42%" r="45%">
          <stop offset="0%" stop-color="#34d399" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#34d399" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="soft" cx="20%" cy="70%" r="40%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g)"/>
      <rect width="${W}" height="${H}" fill="url(#orb)"/>
      <rect width="${W}" height="${H}" fill="url(#soft)"/>
      <text x="88" y="250" font-family="Segoe UI, system-ui, sans-serif" font-size="78" font-weight="700" fill="#ecfdf5">Convertek</text>
      <text x="88" y="320" font-family="Segoe UI, system-ui, sans-serif" font-size="32" font-weight="600" fill="#6ee7b7">Any file. Any format.</text>
      <text x="88" y="368" font-family="Segoe UI, system-ui, sans-serif" font-size="26" font-weight="500" fill="#a7f3d0">Drop it. Convert it. Download it.</text>
      <text x="88" y="520" font-family="Segoe UI, system-ui, sans-serif" font-size="22" font-weight="500" fill="#86efac">www.convertek.tech</text>
    </svg>
  `);

  return sharp(bg)
    .composite([
      {
        input: icon,
        left: Math.round(W - iconSize - 96),
        top: Math.round((H - iconSize) / 2),
      },
    ])
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(OUT.og);
}

async function main() {
  if (!fs.existsSync(SRC)) {
    throw new Error(`Source icon not found: ${SRC}`);
  }
  console.log("Source:", SRC);
  const raw = fs.readFileSync(SRC);
  const meta = await sharp(raw).metadata();
  console.log(`Input ${meta.width}x${meta.height}`);

  // Store pristine source
  await fs.promises.mkdir(path.dirname(OUT.brandSource), { recursive: true });
  await sharp(raw).png().toFile(OUT.brandSource);

  // Master transparent 1024 mark
  const mark1024 = await makeTransparentMark(raw, 1024).then((s) =>
    s.png().toBuffer(),
  );
  await fs.promises.writeFile(OUT.icon1024, mark1024);
  await fs.promises.writeFile(OUT.logoMark, mark1024);
  await fs.promises.writeFile(OUT.brandMark, mark1024);
  await fs.promises.writeFile(OUT.brandPremium, mark1024);
  await fs.promises.writeFile(OUT.brand3d, mark1024);

  const sizes = [
    [512, OUT.icon512],
    [192, OUT.icon192],
    [180, OUT.apple],
    [64, OUT.fav64],
    [32, OUT.fav32],
    [16, OUT.fav16],
  ];
  const pngForIco = [];
  for (const [size, dest] of sizes) {
    const buf = await makeTransparentMark(raw, size).then((s) =>
      s.png().toBuffer(),
    );
    await fs.promises.writeFile(dest, buf);
    if ([16, 32, 48, 64].includes(size)) pngForIco.push(buf);
    console.log("wrote", path.relative(ROOT, dest));
  }

  // 48 for ICO mid size
  const png48 = await makeTransparentMark(raw, 48).then((s) =>
    s.png().toBuffer(),
  );
  pngForIco.splice(2, 0, png48); // 16,32,48,64

  const icoBuf = buildIco(pngForIco);
  await fs.promises.writeFile(OUT.favIco, icoBuf);
  console.log("wrote favicon.ico");

  // SVG wrappers (64px embedded PNG — crisp at any size in modern browsers)
  const png64 = await fs.promises.readFile(OUT.fav64);
  const b64 = png64.toString("base64");
  await fs.promises.writeFile(OUT.favSvg, svgWrapper(b64, 64));
  await fs.promises.writeFile(OUT.iconSvg, svgWrapper(b64, 64));
  await fs.promises.writeFile(OUT.logoSvg, svgWrapper(b64, 64));
  console.log("wrote favicon.svg / icon.svg / logo.svg");

  await buildOg(raw);
  console.log("wrote og-image.png");

  // Desktop assets
  if (fs.existsSync(path.dirname(OUT.desktopPng))) {
    const desk256 = await makeTransparentMark(raw, 256).then((s) =>
      s.png().toBuffer(),
    );
    await fs.promises.writeFile(OUT.desktopPng, desk256);
    const deskIcoPngs = [];
    for (const s of [16, 32, 48, 64, 128, 256]) {
      deskIcoPngs.push(
        await makeTransparentMark(raw, s).then((x) => x.png().toBuffer()),
      );
    }
    await fs.promises.writeFile(OUT.desktopIco, buildIco(deskIcoPngs));
    console.log("wrote desktop Assets/app.png + app.ico");
  }

  console.log("\nBrand pack ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
