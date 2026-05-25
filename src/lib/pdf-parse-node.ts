/**
 * pdf-parse v2 needs pdfjs worker + CanvasFactory in Node/serverless (DOMMatrix polyfill).
 * @see https://github.com/mehmet-kozan/pdf-parse/blob/main/docs/troubleshooting.md
 */
import type { PDFParse } from "pdf-parse";
import type { CanvasFactory } from "pdf-parse/worker";

let ready: Promise<{
  PDFParse: typeof PDFParse;
  CanvasFactory: typeof CanvasFactory;
}> | null = null;

function loadPdfParseNode() {
  if (!ready) {
    ready = (async () => {
      await import("pdf-parse/worker");
      const [main, worker] = await Promise.all([
        import("pdf-parse"),
        import("pdf-parse/worker"),
      ]);
      return { PDFParse: main.PDFParse, CanvasFactory: worker.CanvasFactory };
    })();
  }
  return ready;
}

/** Create a pdf-parse parser configured for Node.js / Vercel. */
export async function createPdfParser(input: Buffer): Promise<PDFParse> {
  const { PDFParse, CanvasFactory } = await loadPdfParseNode();
  return new PDFParse({ data: input, CanvasFactory });
}
