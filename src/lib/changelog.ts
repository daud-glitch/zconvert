export type ChangelogEntry = {
  date: string;
  title: string;
  items: string[];
};

/** User-facing product fixes and improvements, newest first. */
export const changelogEntries: ChangelogEntry[] = [
  {
    date: "2026-08-29",
    title: "New formats as outputs",
    items: [
      "Recently added formats can now be used as conversion outputs — not just inputs. Examples: MP3→AIFF, MP4→M2TS, ZIP→APK/JAR, CSV→NDJSON, TXT→LOG, PNG→JFIF, and cross-converts between the new audio/video/archive types.",
    ],
  },
  {
    date: "2026-08-29",
    title: "New formats & homepage",
    items: [
      "Homepage popular pairs expanded to 15 — including MP4→MP3, PDF→PNG, and DOCX→PDF shortcuts below the hero.",
      "New image inputs: JFIF and WBMP.",
      "New audio inputs: AIFF, AIF, CAF, AC3, and AMR (convert to MP3, WAV, FLAC, and more).",
      "New video inputs: M2TS, MTS, VOB, and ASF (convert to MP4, MKV, or extract audio).",
      "New archive inputs: APK and JAR (ZIP-based — extract or repackage to ZIP/TAR).",
      "New data input: NDJSON (newline-delimited JSON, same as JSONL).",
      "New document input: LOG files (convert to PDF, HTML, DOCX, and more).",
    ],
  },
  {
    date: "2026-08-28",
    title: "Conversion fixes",
    items: [
      "SPSS .sav files now convert reliably to CSV, JSON, and other data targets — including compressed (ZSAV) files and datasets that previously failed with a generic error. A second ReadStat-based reader is used automatically when the primary parser cannot read the file.",
    ],
  },
  {
    date: "2026-08-26",
    title: "Conversion fixes",
    items: [
      "Parquet files now convert reliably to CSV, TXT, PDF, and other data targets — GZIP, ZSTD, Brotli, and LZ4 compression are supported (previously many real-world Parquet uploads failed).",
      "AZW3 and MOBI ebooks convert to Markdown and other text formats without requiring Calibre on the server — a built-in Kindle/KF8 reader extracts text when Calibre is unavailable.",
    ],
  },
  {
    date: "2026-08-25",
    title: "Conversion fixes",
    items: [
      "DrawIO (.drawio) diagrams now convert to PNG, JPG, and SVG by rendering shapes and connectors — previously PNG export failed unless the file already contained an embedded image.",
    ],
  },
  {
    date: "2026-08-24",
    title: "Conversion fixes",
    items: [
      "BLP (Blizzard texture) files now convert correctly. Palettized, DXT, and uncompressed BLP2 textures that previously failed with “BLP2 compression 0 not supported” can be converted to BMP, AVIF, PNG, and other image formats.",
    ],
  },
];
