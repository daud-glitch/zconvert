import { readFile } from "fs/promises";
import { convertPdfToRasterOutput } from "../src/lib/pdf-utils";

async function main() {
  const pdfPath = process.argv[2] || "test-urdu-direct.pdf";
  const buf = await readFile(pdfPath);
  const out = await convertPdfToRasterOutput(buf, "png", 85, "test-doc");
  console.log(
    JSON.stringify({
      type: out.type,
      bytes: out.data.length,
      pageCount: out.type === "zip" ? out.pageCount : 1,
      zipMagic: out.data[0] === 0x50 && out.data[1] === 0x4b,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
