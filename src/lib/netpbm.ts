/** Decode ASCII Netpbm (P1–P3) to RGBA for sharp. */
export function decodeNetpbm(input: Buffer): {
  data: Buffer;
  width: number;
  height: number;
  channels: 4;
} {
  const text = input
    .toString("utf-8")
    .replace(/#[^\n\r]*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = text.split(" ");
  const magic = parts[0];
  if (!/^P[1-3]$/.test(magic)) {
    throw new Error("Only ASCII P1/P2/P3 Netpbm is supported");
  }

  const width = parseInt(parts[1], 10);
  const height = parseInt(parts[2], 10);
  const maxVal = magic === "P1" ? 1 : parseInt(parts[3], 10);
  const dataStart = magic === "P1" ? 3 : 4;
  const values = parts.slice(dataStart).map(Number);
  const pixelCount = width * height;

  const rgba = Buffer.alloc(pixelCount * 4);

  if (magic === "P1") {
    for (let i = 0; i < pixelCount; i++) {
      const v = values[i] ? 0 : 255;
      rgba[i * 4] = v;
      rgba[i * 4 + 1] = v;
      rgba[i * 4 + 2] = v;
      rgba[i * 4 + 3] = 255;
    }
  } else if (magic === "P2") {
    for (let i = 0; i < pixelCount; i++) {
      const v = Math.round((values[i] / maxVal) * 255);
      rgba[i * 4] = v;
      rgba[i * 4 + 1] = v;
      rgba[i * 4 + 2] = v;
      rgba[i * 4 + 3] = 255;
    }
  } else {
    for (let i = 0; i < pixelCount; i++) {
      rgba[i * 4] = Math.round((values[i * 3] / maxVal) * 255);
      rgba[i * 4 + 1] = Math.round((values[i * 3 + 1] / maxVal) * 255);
      rgba[i * 4 + 2] = Math.round((values[i * 3 + 2] / maxVal) * 255);
      rgba[i * 4 + 3] = 255;
    }
  }

  return { data: rgba, width, height, channels: 4 };
}
