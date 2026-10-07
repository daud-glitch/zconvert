import type { FormatCategory, FormatInfo } from "@/lib/formats";

/**
 * Editorial copy for the conversion pair pages.
 *
 * AdSense rejected the site for "thin pages". The pair pages were 2,358 near
 * identical shells — same three steps, same two format blurbs, same four FAQ
 * answers — differing only in the two extension names. That reads as auto
 * generated doorway content.
 *
 * Everything here is derived from the two formats actually being converted
 * (categories, MIME types, whether the pair crosses categories), so a PNG→JPG
 * page explains raster compression while a CSV→JSON page explains rows and
 * nesting. No two category pairings produce the same prose.
 */

export interface PairGuideSection {
  heading: string;
  intro: string;
  points: { title: string; body: string }[];
}

export const CATEGORY_NOUN: Record<FormatCategory, string> = {
  image: "image",
  video: "video",
  audio: "audio",
  document: "document",
  data: "data",
  archive: "archive",
  ebook: "ebook",
  presentation: "presentation",
  subtitle: "subtitle",
  font: "font",
  other: "file",
};

const CATEGORY_PHRASE: Record<FormatCategory, string> = {
  image: "pixels, dimensions and colour depth",
  video: "frames, bitrate and audio tracks",
  audio: "sample rate, channels and bitrate",
  document: "text, layout, fonts and images",
  data: "rows, columns and value types",
  archive: "the files packed inside and their paths",
  ebook: "chapters, images and reading order",
  presentation: "slides, notes and embedded media",
  subtitle: "timings, line breaks and cue order",
  font: "glyph outlines and font metrics",
  other: "the internal structure of the file",
};

/** What a reader typically wants from a file of this category. */
const CATEGORY_USE: Record<FormatCategory, string> = {
  image: "sharing, editing or publishing a picture",
  video: "playing, editing or re-encoding a clip",
  audio: "listening to or editing a recording",
  document: "reading, printing or circulating a document",
  data: "analysing, importing or exchanging records",
  archive: "storing several files as one smaller bundle",
  ebook: "reading a book on an e-reader or in an app",
  presentation: "showing slides in a talk or meeting",
  subtitle: "captioning a video in a player or editor",
  font: "installing a typeface in an app or on a device",
  other: "opening the file in the software that produced it",
};

/** Formats whose content is lossy — useful for honest quality guidance. */
const LOSSY = new Set([
  "jpg",
  "jpeg",
  "jfif",
  "avif",
  "heic",
  "mp3",
  "aac",
  "ogg",
  "opus",
  "m4a",
  "wma",
  "mp4",
  "mov",
  "webm",
  "avi",
  "mkv",
  "flv",
  "wmv",
]);

/** Lossless formats that keep everything they are given. */
const LOSSLESS = new Set([
  "png",
  "gif",
  "bmp",
  "tiff",
  "tif",
  "webp",
  "svg",
  "ico",
  "wav",
  "flac",
  "aiff",
  "alac",
  "csv",
  "tsv",
  "json",
  "xml",
  "yaml",
  "yml",
  "parquet",
  "txt",
  "md",
  "html",
  "zip",
  "tar",
  "7z",
  "srt",
  "vtt",
]);

function qualityNote(from: FormatInfo, to: FormatInfo): string | null {
  const fromLossy = LOSSY.has(from.ext);
  const toLossy = LOSSY.has(to.ext);
  const fromLossless = LOSSLESS.has(from.ext);
  const toLossless = LOSSLESS.has(to.ext);

  if (fromLossless && toLossy) {
    return `.${from.ext.toUpperCase()} keeps every detail, but .${to.ext.toUpperCase()} uses lossy compression to stay small. The first conversion is where quality is decided — after that, re-saving the .${to.ext.toUpperCase()} again compresses it a second time. Keep your original file if you may need to re-export later.`;
  }
  if (fromLossy && toLossless) {
    return `.${from.ext.toUpperCase()} has already discarded detail during compression, and converting to .${to.ext.toUpperCase()} cannot bring it back. The output will be lossless from here on, so the file gets larger without recovering what the original threw away.`;
  }
  if (fromLossy && toLossy) {
    return `Both .${from.ext.toUpperCase()} and .${to.ext.toUpperCase()} are lossy formats. Each conversion re-compresses the file, so quality drops a little every round trip. Convert once from the original rather than chaining conversions.`;
  }
  if (fromLossless && toLossless) {
    return `Both .${from.ext.toUpperCase()} and .${to.ext.toUpperCase()} are lossless, so the content itself survives the trip intact. The main difference is how efficiently each format packages ${CATEGORY_PHRASE[from.category]} — which is what changes the file size.`;
  }
  return null;
}

/** What genuinely happens to the content when the categories differ. */
function crossingNote(from: FormatInfo, to: FormatInfo): string {
  if (from.category === to.category) {
    return `Both files belong to the ${from.category} category, so this is a like-for-like repackage: the same kind of content, stored in a different container. What changes is how .${to.ext.toUpperCase()} encodes ${CATEGORY_PHRASE[to.category]} — not what the file is about.`;
  }

  const fromUse = CATEGORY_USE[from.category];
  const toUse = CATEGORY_USE[to.category];

  if (from.category === "video" && to.category === "audio") {
    return `This conversion keeps the sound and drops the picture: the audio track is decoded out of the .${from.ext.toUpperCase()} container and re-encoded as .${to.ext.toUpperCase()} for ${toUse}. Length, loudness and voice carry over; frames do not.`;
  }
  if (from.category === "document" && to.category === "image") {
    return `The document is rendered page by page into ${toUse}. Text stays readable exactly where it was laid out, but it stops being selectable — an image cannot be copied from or searched, and very long pages can become large files.`;
  }
  if (from.category === "image" && to.category === "document") {
    return `The image is placed inside a ${to.category} so it can be ${toUse}. The picture itself is unchanged, but the new container adds a page frame around it — which affects how it prints, shares and scales.`;
  }
  if (from.category === "presentation" && to.category === "document") {
    return `Slides are flattened into a paginated document so it can be ${toUse}. Each slide becomes a fixed page: animation and transitions stop, but the layout, text and embedded images stay as the audience saw them.`;
  }
  if (from.category === "data" && to.category === "document") {
    return `The records are laid out into a readable ${to.category} for ${toUse}. Structure becomes presentation — columns become a table or list, and what was a machine-readable field is now something a person reads.`;
  }
  if (to.category === "data") {
    return `The file is parsed and its contents are written out as structured ${to.category} for ${toUse}. Everything that could be extracted from the source lands in the output; formatting and styling that have no equivalent in .${to.ext.toUpperCase()} are left behind.`;
  }
  if (from.category === "data") {
    return `The records in the .${from.ext.toUpperCase()} file are re-encoded as a ${to.category} for ${toUse}. Values and structure carry over, but anything that is purely a data concept — column types, delimiters, nesting — has to be expressed in the new format's terms.`;
  }

  return `This conversion translates ${CATEGORY_PHRASE[from.category]} into ${CATEGORY_PHRASE[to.category]} so the result can be used for ${toUse}. The meaning of the file is preserved; the way it is stored, and some format-specific detail, changes with the target.`;
}

/** Practical, format-specific advice instead of a generic "drag and drop" line. */
function tipPoints(from: FormatInfo, to: FormatInfo): { title: string; body: string }[] {
  const tips: { title: string; body: string }[] = [];

  tips.push({
    title: "Start from the original file",
    body: `Convert the .${from.ext.toUpperCase()} you started with, not an earlier .${to.ext.toUpperCase()} output. Every extra round trip costs quality and can accumulate formatting drift.`,
  });

  if (from.mimeTypes.length > 0 || to.mimeTypes.length > 0) {
    const mime =
      from.mimeTypes[0] && to.mimeTypes[0]
        ? `${from.mimeTypes[0]} becomes ${to.mimeTypes[0]}`
        : from.mimeTypes[0]
          ? `the source is declared as ${from.mimeTypes[0]}`
          : to.mimeTypes[0]
            ? `the output is declared as ${to.mimeTypes[0]}`
            : "";
    if (mime) {
      tips.push({
        title: "Check the real type, not the extension",
        body: `${mime[0].toUpperCase()}${mime.slice(1)}. If a file was renamed rather than converted, it will fail to open — rename it back to its true extension before uploading and the conversion will recognise it.`,
      });
    }
  }

  if (from.category === "data") {
    tips.push({
      title: "Confirm the structure first",
      body: `Open the .${from.ext.toUpperCase()} briefly and check delimiters, headers and encoding. A misplaced separator or a stray quote is the usual reason the output looks wrong even though the conversion succeeded.`,
    });
  } else if (from.category === "image" && to.category === "image") {
    tips.push({
      title: "Watch transparency and animation",
      body: `If the .${from.ext.toUpperCase()} has a transparent background or animation, confirm .${to.ext.toUpperCase()} supports it. Where it does not, the background is flattened onto a solid colour and only the first frame survives.`,
    });
  } else if (from.category === "document" && to.category !== "document") {
    tips.push({
      title: "Long documents convert as pages",
      body: `Page-based output renders one page at a time. Split very large .${from.ext.toUpperCase()} files first if you only need a specific section — it is faster and keeps the result easy to work with.`,
    });
  } else if (from.category === "video" || from.category === "audio") {
    tips.push({
      title: "Length decides the time",
      body: `Conversion runs in real terms on duration: a few seconds of media finishes almost at once, while a full-length .${from.ext.toUpperCase()} takes noticeably longer. Upload once and let it finish rather than retrying.`,
    });
  } else if (from.category === "archive") {
    tips.push({
      title: "The contents travel with it",
      body: `Archives are repacked, not opened. Password-protected or damaged .${from.ext.toUpperCase()} bundles fail for the same reason in the target format, so test the source archive before converting.`,
    });
  } else {
    tips.push({
      title: "Keep the output next to the original",
      body: `Save the .${to.ext.toUpperCase()} file alongside the source rather than replacing it. Having both means you can try a different target later without hunting down the original again.`,
    });
  }

  tips.push({
    title: "Limits worth knowing",
    body: `Uploads are capped per file (30 MB, or 100 MB for video) and processed temporarily — nothing is kept as a permanent copy. For huge ${from.category} files, split or compress the source first.`,
  });

  return tips;
}

/**
 * The "what actually changes" section for a pair page.
 * Returns null when there is nothing honest and specific to say.
 */
export function pairGuideSection(
  from: FormatInfo,
  to: FormatInfo,
): PairGuideSection {
  const fromUpper = from.ext.toUpperCase();
  const toUpper = to.ext.toUpperCase();
  const points: { title: string; body: string }[] = [];

  points.push({
    title: `What .${fromUpper} and .${toUpper} each hold`,
    body: `.${fromUpper} is a ${from.category} format built for ${CATEGORY_USE[from.category]}, storing ${CATEGORY_PHRASE[from.category]}. .${toUpper} is a ${to.category} format built for ${CATEGORY_USE[to.category]}, storing ${CATEGORY_PHRASE[to.category]}. Converting between them is a decision about which of those two jobs the result needs to do.`,
  });

  const crossing = crossingNote(from, to);
  points.push({
    title:
      from.category === to.category
        ? "What changes in the conversion"
        : "What changes when categories differ",
    body: crossing,
  });

  const quality = qualityNote(from, to);
  if (quality) {
    points.push({
      title: "Quality and file size",
      body: quality,
    });
  }

  points.push({
    title: "When this conversion is the right one",
    body:
      from.category === to.category
        ? `Reach for .${toUpper} when the software, device or platform you are sending to expects it — the content is the same ${from.category}, only the packaging differs. The reverse direction works the same way, so you can always convert back from .${toUpper} to .${from.ext.toUpperCase()} using the same tool.`
        : `Reach for .${toUpper} when you need a file for ${CATEGORY_USE[to.category]}, starting from ${CATEGORY_USE[from.category]}. If that is not what you are after, check what else .${from.ext.toUpperCase()} converts to before committing to this target.`,
  });

  return {
    heading: `Converting ${fromUpper} to ${toUpper}: what actually changes`,
    intro: `${from.name} to ${to.name} is one of the conversions this site performs, but the two formats are not interchangeable containers. Here is what the file keeps, what it loses, and how to get a result you can use.`,
    points,
  };
}

/** Practical tips block, rendered alongside the guide. */
export function pairTips(from: FormatInfo, to: FormatInfo): {
  heading: string;
  points: { title: string; body: string }[];
} {
  return {
    heading: `Tips for a clean ${from.ext.toUpperCase()} to ${to.ext.toUpperCase()} conversion`,
    points: tipPoints(from, to),
  };
}
