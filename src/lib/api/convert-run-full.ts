import type { ConvertRunner } from "@/lib/api/convert-handler";

/** Runs the full converter (each API route traces a different subset via next.config excludes). */
export const runFullConvert: ConvertRunner = async (
  buffer,
  sourceExt,
  target,
  quality,
  width,
  height,
) => {
  const { convertFile } = await import("@/lib/converter");
  return {
    buffer: await convertFile(
      buffer,
      sourceExt,
      target,
      quality,
      width,
      height,
    ),
  };
};
