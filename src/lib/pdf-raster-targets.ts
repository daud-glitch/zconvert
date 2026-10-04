/** Raster formats produced from PDF page screenshots (no heavy deps). */
export const PDF_RASTER_TARGETS = new Set([
  "png",
  "jpg",
  "jpeg",
  // JFIF is a JPEG container — advertised by pdfOutputTargets, so it must
  // rasterise here too or the advertised pair fails at runtime.
  "jfif",
  "webp",
  "gif",
  "bmp",
  "tiff",
  "tif",
  "ico",
  "avif",
]);

export function isPdfRasterTarget(ext: string): boolean {
  return PDF_RASTER_TARGETS.has(ext.toLowerCase().replace(/^\./, ""));
}

export type PdfRasterConvertResult =
  | { type: "single"; data: Buffer }
  | { type: "zip"; data: Buffer; pageCount: number };
