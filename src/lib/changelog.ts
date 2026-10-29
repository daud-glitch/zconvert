export type ChangelogEntry = {
  /** Stable unique id — dates repeat when several entries ship the same day. */
  id: string;
  date: string;
  title: string;
  items: string[];
};

/** User-facing product fixes and improvements, newest first. */
export const changelogEntries: ChangelogEntry[] = [
  {
    id: "2026-10-29-rar-packaging",
    date: "2026-10-29",
    title: "RAR conversion is fixed",
    items: [
      "RAR files convert again. The server now installs its own rar and unrar binaries on startup and again on the first RAR job, so a deploy or a dyno restart can no longer leave every RAR conversion failing with \u201cRAR packaging is not available on this server\u201d.",
      "Creating RAR archives is working: ZIP, 7Z, TAR, TAR.GZ, TAR.BZ2, TAR.XZ, TAR.ZST, GZ, APK and JAR can all be packed to RAR.",
      "Opening RAR archives is working too: RAR converts to ZIP, 7Z, TAR, TAR.GZ, TAR.BZ2, TAR.XZ, TAR.ZST, APK, JAR and CBZ.",
      "A RAR that genuinely cannot be opened now says why \u2014 password-protected, split across several volumes, or corrupt \u2014 instead of claiming the server has no RAR support. A toolchain that fails to load also falls back to the built-in extractor instead of aborting the job.",
      "The admin overview reports whether rar and unrar are installed on the running dyno, with the resolved path and whether it came from an environment variable, the bundled vendor folder, or PATH.",
    ],
  },
  {
    id: "2026-10-28-flc-feather-dta-fixes",
    date: "2026-10-28",
    title: "Animation, Feather, Stata and P7M fixes",
    items: [
      "FLI and FLC animations now convert instead of failing with \u201cInput image exceeds pixel limit\u201d. The frame header was being read at the wrong offset, so the image size came from unrelated bytes; the first frame is now decoded properly and coloured with the file's palette rather than in greyscale.",
      "Feather files saved with compressed record batches (LZ4 or ZSTD, the default in pandas and pyarrow when compression is requested) now convert. Previously every such file failed with \u201cRecord batch is compressed but codec not found\u201d.",
      "A Stata .dta file that cannot be read now reports the real reason \u2014 the release it declares and the byte where parsing stopped \u2014 instead of the contentless \u201cThe file structure is invalid or unsupported\u201d.",
      "Signed .p7m files now open their contents instead of failing with \u201cCould not extract content from P7M signature\u201d. Signatures that store their document in BER form, in PEM armour, inside an S/MIME wrapper, split across several segments or nested in a second signature are all read now, and the document inside is converted normally. An encrypted .p7m, a detached signature that holds no document, and digest-only files each say which of those they are.",
    ],
  },
  {
    id: "2026-10-28-cookie-and-ad-consent",
    date: "2026-10-28",
    title: "Cookie and ad consent",
    items: [
      "Visitors in the EEA, the UK and Switzerland now get a cookie notice before any advertising or analytics storage runs, with Accept all, Reject optional and per-category preferences.",
      "The choice can be changed or withdrawn at any time from the \u201cCookie settings\u201d link in the footer, on every page.",
      "Google AdSense is installed site-wide, and the ad code requests non-personalised ads until you allow advertising — declining keeps personalisation off instead of blocking the page.",
      "The Privacy Policy explains Google AdSense cookies, the opt-out links, and how to turn personalised ads off.",
      "The Terms of Service gained an advertising section covering how ads are selected, what is never shared with advertisers, and how to report a misleading ad.",
    ],
  },
  {
    id: "2026-10-24-eps-icns-and-failure-counts",
    date: "2026-10-24",
    title: "Conversion fixes",
    items: [
      "EPS files now convert instead of failing with \u201cvector content cannot be rasterized\u201d. Previews stored behind a DOS EPS binary header, behind a corrupt element length, as JPEG thumbnails, and as hex \u201c%%BeginPreview\u201d bitmaps are all decoded. An EPS that truly holds vector artwork only now says so and explains how to convert it, rather than blaming a missing toolkit.",
      "macOS .icns icons whose internal element lengths are wrong now convert \u2014 the embedded PNG, JPEG or JPEG 2000 payload is located even when the icon's element table is damaged.",
      "The admin \u201cFailed conversions\u201d panel no longer shows \u201cNaN failures\u201d with blank Fails, Attempts and Rate cells; those columns now report the real per-pair numbers and totals.",
    ],
  },
  {
    id: "2026-10-16-icns-sav-fixes",
    date: "2026-10-16",
    title: "Conversion fixes",
    items: [
      "macOS .icns icons now convert instead of failing with \u201ccontains no decodable image\u201d. Icons stored as raw pixels (ic04/ic05 and the 32-bit variants), icons with 8-bit alpha masks, and icons whose only image is a bare JPEG 2000 codestream are all decoded now.",
      "SPSS .sav datasets that contain column headers but no data rows convert successfully \u2014 they are valid datasets, so they no longer report \u201ccontains no data rows\u201d.",
      "Interrupted SPSS .sav uploads now salvage the records that were fully received instead of failing outright. Files truncated before their header is readable still report a clear error.",
    ],
  },
  {
    id: "2026-08-30-conversion-fixes",
    date: "2026-08-30",
    title: "Conversion fixes",
    items: [
      "JSON and CSV to M3U playlists now produce real entries. Records without a url column were silently skipped, so the download contained nothing but the #EXTM3U header.",
      "Data and document to PDF downloads are far smaller — plain text no longer embeds a 1 MB font, cutting a typical CSV-to-PDF from about 570 KB to under 1 KB.",
      "PDF to JFIF now returns a real JPEG instead of PNG bytes with the wrong extension, and an impossible raster target reports a clear error rather than downloading a mislabelled file.",
      "Uncompressed BLP2 (Blizzard) textures now convert instead of failing with an unsupported-encoding error.",
      "Failed conversions no longer show a generic \u201ctech team notified\u201d line \u2014 you now get the specific reason.",
    ],
  },
  {
    id: "2026-08-29-sav-bom",
    date: "2026-08-29",
    title: "Conversion fixes",
    items: [
      "SPSS .sav uploads that still failed — files with a UTF-8 BOM prefix or extra leading bytes — now parse correctly. Non-SPSS files renamed to .sav (ZIP, Office documents, CSV, SPSS Portable) now say what they actually are instead of failing with a generic error.",
    ],
  },
  {
    id: "2026-08-29-new-formats-as-outputs",
    date: "2026-08-29",
    title: "New formats as outputs",
    items: [
      "Recently added formats can now be used as conversion outputs — not just inputs. Examples: MP3→AIFF, MP4→M2TS, ZIP→APK/JAR, CSV→NDJSON, TXT→LOG, PNG→JFIF, and cross-converts between the new audio/video/archive types.",
    ],
  },
  {
    id: "2026-08-29-new-formats-homepage",
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
    id: "2026-08-28-sav-readstat",
    date: "2026-08-28",
    title: "Conversion fixes",
    items: [
      "SPSS .sav files now convert reliably to CSV, JSON, and other data targets — including compressed (ZSAV) files and datasets that previously failed with a generic error. A second ReadStat-based reader is used automatically when the primary parser cannot read the file.",
    ],
  },
  {
    id: "2026-08-26-parquet-ebooks",
    date: "2026-08-26",
    title: "Conversion fixes",
    items: [
      "Parquet files now convert reliably to CSV, TXT, PDF, and other data targets — GZIP, ZSTD, Brotli, and LZ4 compression are supported (previously many real-world Parquet uploads failed).",
      "AZW3 and MOBI ebooks convert to Markdown and other text formats without requiring Calibre on the server — a built-in Kindle/KF8 reader extracts text when Calibre is unavailable.",
    ],
  },
  {
    id: "2026-08-25-drawio-render",
    date: "2026-08-25",
    title: "Conversion fixes",
    items: [
      "DrawIO (.drawio) diagrams now convert to PNG, JPG, and SVG by rendering shapes and connectors — previously PNG export failed unless the file already contained an embedded image.",
    ],
  },
  {
    id: "2026-08-24-blp-compression",
    date: "2026-08-24",
    title: "Conversion fixes",
    items: [
      "BLP (Blizzard texture) files now convert correctly. Palettized, DXT, and uncompressed BLP2 textures that previously failed with “BLP2 compression 0 not supported” can be converted to BMP, AVIF, PNG, and other image formats.",
    ],
  },
];
