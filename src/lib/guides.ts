/**
 * Editorial guides — original, hand-written content.
 *
 * AdSense rejected Convertek for "thin pages". The site was almost entirely
 * generated surfaces: 2,358 pair pages, ~150 format pages, and a converter.
 * A reviewer has nothing to read that a machine didn't template.
 *
 * These guides are the answer: long-form pages that make a decision the
 * reader actually has (which format to use, what breaks when you convert)
 * and link into the pair pages from there, which also gives the pair pages
 * properly-linked parents instead of only sibling cross-links.
 *
 * Every `related` pair below is validated against the formats registry in
 * src/__tests__/guides.test.ts — a typo'd conversion would ship as a dead link.
 */

export interface GuideBlock {
  heading: string;
  paragraphs: string[];
  /** Optional definition-style list rendered under the paragraphs. */
  list?: { term: string; text: string }[];
}

export interface Guide {
  slug: string;
  title: string;
  /** Meta description, <= 160 chars. */
  description: string;
  /** ISO date, shown as "last updated". */
  updated: string;
  readingMinutes: number;
  keywords: string[];
  /** Lead paragraph rendered under the H1. */
  lead: string;
  blocks: GuideBlock[];
  /** Internal links to conversion pair pages (`from` → `to`). */
  related: { from: string; to: string }[];
  /** Internal links to format directory pages. */
  relatedFormats: string[];
  faqs: { question: string; answer: string }[];
}

export const guides: Guide[] = [
  {
    slug: "choose-the-right-image-format",
    title: "Choosing the Right Image Format: PNG, JPG, WebP, AVIF and SVG",
    description:
      "A practical guide to picking between PNG, JPG, WebP, AVIF, GIF and SVG — what each format compresses, what it throws away, and when to convert.",
    updated: "2026-10-07",
    readingMinutes: 7,
    keywords: [
      "image format comparison",
      "png vs jpg",
      "webp vs avif",
      "when to use svg",
    ],
    lead:
      "Every image format is a trade-off between file size, image quality, and which features — transparency, animation, editability — survive the trip. Picking the wrong one costs you either kilobytes or fidelity. Here is how to decide, and what happens when you convert.",
    blocks: [
      {
        heading: "The two families: lossy and lossless",
        paragraphs: [
          "Lossy formats discard visual data to shrink the file. They model a limit of human vision: remove the detail an eye is least likely to notice, and the file gets dramatically smaller. This works extremely well for photographs, where every pixel is a measurement and small deviations read as imperceptible. It works badly for text, logos and flat-colour graphics, where a small deviation shows up as a smear around every hard edge.",
          "Lossless formats keep every byte of information and compress it the way a ZIP does — by finding redundancy, not by deleting it. The file is always exactly reconstructable, but it is larger. For screenshots, diagrams, logos and anything you will edit again later, that is the correct trade.",
        ],
        list: [
          {
            term: "Lossy",
            text: "JPG, JPEG, WebP (lossy mode), AVIF (lossy mode). Best for photographs and complex scenes.",
          },
          {
            term: "Lossless",
            text: "PNG, GIF, BMP, TIFF, WebP (lossless mode), AVIF (lossless mode). Best for graphics, text and transparency.",
          },
          {
            term: "Vector",
            text: "SVG. Not a bitmap at all — it stores drawing commands, so it scales to any size without pixelation.",
          },
        ],
      },
      {
        heading: "Transparency, animation and colour depth",
        paragraphs: [
          "Transparency is not universal. PNG, WebP, AVIF, GIF and SVG all carry an alpha channel; JPG does not have one at all, so converting a transparent PNG to JPG fills those pixels with a solid background colour — usually white or black, depending on the tool. If the transparency matters, either stay on a format that supports it or decide explicitly what the background should become.",
          "Animation is narrower still. GIF is the historical standard, but WebP and AVIF both support animation at a fraction of the size, and PNG has its own APNG variant. A JPG is always a single still frame.",
          "Colour depth matters for medical, satellite and photographic work. PNG and TIFF carry 16 bits per channel; JPG and most WebP/AVIF output is 8-bit. Converting 16-bit to 8-bit is irreversible — gradients that were smooth can develop visible banding.",
        ],
      },
      {
        heading: "What each format is actually for",
        paragraphs: [
          "Use JPG for photographs shared at a fixed size: web heroes, social posts, email attachments. Use PNG for screenshots, logos, line art and anything with text in it. Use WebP or AVIF when the image is going onto a web page and you want both quality and a small payload — both routinely beat JPG by 25–50% at the same visual quality, which is why browsers and CDNs moved to them. Use SVG for logos, icons and diagrams that need to stay sharp at every size, and for anything a designer will want to edit as shapes rather than pixels.",
          "GIF survives mostly for animation and for the specific aesthetic of its 256-colour palette. For new work, an animated WebP or a short MP4 is usually smaller and better looking. BMP and TIFF remain relevant for raw interchange and printing pipelines, not for delivery.",
        ],
      },
      {
        heading: "When converting is worth it",
        paragraphs: [
          "Convert when the destination imposes a constraint: a CMS that only accepts JPG, a print shop that wants TIFF, a website that should serve AVIF with a JPG fallback, a colleague on software that does not open WebP. Converting to a strictly smaller lossy format is also worth it when bandwidth is the bottleneck and the image is going to be viewed once.",
          "What you should not do is chain conversions. Saving a JPG as WebP and then as JPG runs the lossy compression twice, and the second pass compresses the artefacts of the first. Always convert from the original file, not from a previous export.",
        ],
      },
    ],
    related: [
      { from: "png", to: "jpg" },
      { from: "jpg", to: "png" },
      { from: "webp", to: "jpg" },
      { from: "heic", to: "jpg" },
      { from: "svg", to: "png" },
      { from: "png", to: "webp" },
    ],
    relatedFormats: ["png", "jpg", "webp", "avif", "svg", "gif"],
    faqs: [
      {
        question: "Which image format has the smallest file size?",
        answer:
          "For photographs, AVIF and WebP are typically smallest at equal visual quality, followed by JPG. For graphics with transparency, PNG beats every lossy format once you account for the background it would otherwise gain.",
      },
      {
        question: "Does converting JPG to PNG improve quality?",
        answer:
          "No. PNG is lossless, but it cannot restore detail the JPG already discarded — it only stops further loss and usually makes the file larger.",
      },
      {
        question: "Should I use WebP instead of JPG on my website?",
        answer:
          "Usually yes: WebP is smaller at the same quality. Serve it with a JPG fallback for older clients, and check that your CMS and analytics pipeline accept it.",
      },
    ],
  },
  {
    slug: "pdf-to-docx-conversion-guide",
    title: "PDF to DOCX: How to Convert a PDF Without Wrecking the Layout",
    description:
      "What actually happens when a fixed-layout PDF becomes an editable DOCX, which elements survive, which break, and how to get a document you can keep working in.",
    updated: "2026-10-07",
    readingMinutes: 6,
    keywords: [
      "pdf to word",
      "pdf to docx converter",
      "edit pdf as word document",
      "pdf conversion layout",
    ],
    lead:
      "PDF and DOCX solve opposite problems. A PDF is a finished artefact: every glyph is placed at a coordinate and nothing is meant to move. A DOCX is a working document: text flows, styles cascade and reflow when you type. Converting between them means inferring structure that the PDF no longer contains.",
    blocks: [
      {
        heading: "Why the conversion is an inference, not a translation",
        paragraphs: [
          "A PDF does not store paragraphs, headings or tables as concepts. It stores characters at positions on a page. The word processor that wrote the DOCX had that structure, but the PDF threw it away during export — so converting back means reconstructing it: which lines join into a paragraph, which blocks are headings, which rectangles are table cells and which are just decoration.",
          "That reconstruction is why PDF-to-DOCX quality varies so much by source. A PDF exported from a word processor still contains font and layout hints that make the job easy. A PDF made from a scan contains only a picture of text, and no converter can turn a picture into editable text without OCR first.",
        ],
      },
      {
        heading: "What survives, and what usually does not",
        paragraphs: [
          "Plain flowing text converts well: characters, paragraph breaks, bold and italic, and basic font choices generally come through. So do embedded images and simple single-column layouts. Multi-column layouts are the classic failure mode — a converter that ignores columns interleaves the two streams into unreadable nonsense.",
          "Things that commonly degrade are precisely the things that were positioned rather than structured: floating text boxes, footnotes anchored by hand, headers and footers that were drawn as page content, tracked changes, comments, and any table whose borders were drawn as vector lines rather than a real table grid. Complex kerning, ligatures and rotated text also shift.",
          "Scanned PDFs are a separate category. Without an OCR step the output is an empty document with images in it.",
        ],
      },
      {
        heading: "Getting a usable document out",
        paragraphs: [
          "Start from the cleanest source you have. A PDF exported from Word, Google Docs or LibreOffice converts far better than one printed through a virtual PDF printer, because the structure is closer to the surface. If you only have a scan, run OCR on it before converting and expect to proofread.",
          "Convert once, then work in the DOCX. Do not round-trip DOCX → PDF → DOCX to 'clean it up'; each pass flattens more structure and the second pass inherits every artefact of the first.",
          "After converting, check the things a converter cannot infer: page breaks where you want them, the styles pane (direct formatting should become real styles), tables, and any text that used special fonts. Plan for a few minutes of cleanup rather than zero — a document that needed ten minutes of layout work in the original is still going to need ten minutes here.",
        ],
      },
    ],
    related: [
      { from: "pdf", to: "docx" },
      { from: "docx", to: "pdf" },
      { from: "pdf", to: "txt" },
      { from: "pdf", to: "jpg" },
      { from: "html", to: "pdf" },
      { from: "md", to: "pdf" },
    ],
    relatedFormats: ["pdf", "docx", "doc", "rtf", "odt"],
    faqs: [
      {
        question: "Will a PDF to DOCX conversion keep my formatting?",
        answer:
          "Text, images and basic styling convert reliably. Complex layouts — multi-column pages, floating boxes, drawn tables and hand-anchored headers — usually need manual cleanup.",
      },
      {
        question: "Can I edit a scanned PDF after converting it?",
        answer:
          "Not directly. A scan is an image, so the conversion produces images rather than text. Run OCR first, then convert the recognised text to DOCX.",
      },
      {
        question: "Is it safe to convert a confidential PDF online?",
        answer:
          "On Convertek the file is processed temporarily to produce the output and is not kept as a permanent copy; downloads stay in your browser. Still, follow your organisation's policy for any document you are not allowed to upload.",
      },
    ],
  },
  {
    slug: "extract-audio-from-video",
    title: "How to Extract Audio from a Video: MP4, MOV, MKV to MP3 or WAV",
    description:
      "Turn the soundtrack of any video into a standalone audio file — which output format to pick, what happens to quality, and how long it takes.",
    updated: "2026-10-07",
    readingMinutes: 5,
    keywords: [
      "extract audio from video",
      "mp4 to mp3",
      "video to audio converter",
      "convert mov to mp3",
    ],
    lead:
      "A video file is a container holding at least two independent streams: pictures and sound. Pulling the audio out is not a re-render of the video — it is decoding one stream and re-encoding it on its own. That is why it is fast, and why the result can sound identical to the original.",
    blocks: [
      {
        heading: "The container is not the codec",
        paragraphs: [
          "MP4, MOV, MKV, AVI and WebM are containers. Inside them, the picture might be H.264 or H.265 and the sound might be AAC, MP3, Opus or PCM. When you extract audio, the container and the video codec stop mattering entirely — only the audio stream does.",
          "This is why a conversion can be near-instant: if the target format matches the stream that is already inside, the work is mostly unwrapping rather than re-encoding. When it does not match, every second of audio is decoded and re-encoded, which takes time proportional to the length of the recording.",
        ],
      },
      {
        heading: "Choosing the output format",
        paragraphs: [
          "MP3 is the right default. It plays everywhere — car stereos, phones, presentation software, hearing-aid apps — and its ubiquity outweighs its age. Choose it for podcasts, voice recordings, music you intend to share, and anything going into software of unknown vintage.",
          "Choose WAV when the audio is going into an editor or a DAW and you want no additional lossy compression: it stores PCM exactly. The files are large, roughly ten megabytes per minute of stereo CD-quality audio, so it is a working format rather than a delivery one.",
          "Choose FLAC when you want lossless but also want a smaller file — it typically halves PCM size with no loss. Choose AAC or Opus when you are feeding a modern player or web player and want better quality than MP3 at the same bitrate.",
        ],
        list: [
          {
            term: "MP3",
            text: "Universal playback, lossy, small. The default for almost everything.",
          },
          {
            term: "WAV",
            text: "Uncompressed PCM for editing and archiving. Large, but nothing is thrown away.",
          },
          {
            term: "FLAC",
            text: "Lossless compression — WAV quality at about half the size.",
          },
          {
            term: "AAC / Opus",
            text: "Modern lossy codecs with better quality per kilobit than MP3.",
          },
        ],
      },
      {
        heading: "Quality: one decision, not many",
        paragraphs: [
          "Extraction is one lossy step at most. If the video's audio is already AAC at 128 kbps and you output MP3 at 128 kbps, you have re-compressed once and the result is close to transparent for most listeners. Output at a higher bitrate than the source and you pay for a larger file without gaining anything the source never contained.",
          "The practical rule is to convert directly from the video to your final format. Extracting to MP3 and then converting that MP3 to WAV or AAC adds a second compression stage for no benefit.",
        ],
      },
      {
        heading: "Common reasons for doing this",
        paragraphs: [
          "Pulling a soundtrack out of a lecture or interview to listen on a phone without burning the screen. Saving the audio of a webinar or a recorded call. Taking a song out of a video clip you captured. Extracting dialogue for transcription, where an audio-only file is far smaller and transcribes faster than video. Or breaking a long video into chapters so you can listen during a commute.",
        ],
      },
    ],
    related: [
      { from: "mp4", to: "mp3" },
      { from: "mov", to: "mp3" },
      { from: "mkv", to: "mp3" },
      { from: "wav", to: "mp3" },
      { from: "flac", to: "mp3" },
      { from: "mp4", to: "webm" },
    ],
    relatedFormats: ["mp4", "mp3", "wav", "flac", "aac", "mkv"],
    faqs: [
      {
        question: "Does extracting audio reduce quality?",
        answer:
          "Only if you re-encode to a lossy format, and then only once — output to MP3 or AAC and you compress a single time from the original stream. Output to WAV or FLAC and nothing is discarded.",
      },
      {
        question: "Why is my video file so much bigger than the extracted audio?",
        answer:
          "Because most of the bytes are pictures. Video frames dominate the file size; the audio stream is usually only a few percent of it.",
      },
      {
        question: "Can I extract audio from a video on my phone?",
        answer:
          "Yes — upload the file in a mobile browser, choose the audio format, and download the result. The same limits apply as on desktop.",
      },
    ],
  },
  {
    slug: "csv-json-xml-data-formats",
    title: "CSV vs JSON vs XML: Which Data Format Should You Use?",
    description:
      "When flat rows beat nested structures, when they do not, and how to move a dataset between CSV, JSON, XML and spreadsheet formats without losing meaning.",
    updated: "2026-10-07",
    readingMinutes: 6,
    keywords: [
      "csv vs json",
      "data format comparison",
      "convert csv to json",
      "json to csv",
    ],
    lead:
      "The choice between CSV and JSON is really a choice about shape. If your data is a table, a flat format is the honest representation. If it has depth — objects inside objects, lists inside records — flattening it into columns costs you information, and a nested format keeps it.",
    blocks: [
      {
        heading: "CSV: the lowest common denominator that everyone reads",
        paragraphs: [
          "CSV is a table written as text: rows separated by line breaks, fields separated by a comma, quotes around anything containing a comma or a newline. That is the whole specification, and its ambiguity is both its strength and its weakness. It needs no library, it opens in any spreadsheet, and every language can parse it in a few lines.",
          "What it cannot express is structure. A column holds one value per row. Nested objects, lists of things, mixed types and missing-versus-empty all have to be squeezed into a convention — a JSON blob in a cell, comma-separated values in one field, an empty string standing in for null. Each of those is a decision someone has to know about when reading the file back.",
          "It also has encoding and delimiter traps. Files exported from Excel on Windows often arrive as CP-1252 rather than UTF-8, so accented characters turn into mojibake. European locales export with a semicolon instead of a comma. And a single unescaped quote can shift every subsequent row by one column.",
        ],
      },
      {
        heading: "JSON and XML: structure as a first-class citizen",
        paragraphs: [
          "JSON represents the same records as nested objects and arrays, so a list of tags is a list rather than a string someone split on commas. It is self-describing, handles missing values explicitly, and is the native dialect of web APIs. Its cost is verbosity — keys repeat in every record — and the fact that spreadsheets do not open it directly.",
          "XML solves similar problems with a heavier tool: attributes, namespaces, schema validation and a mature ecosystem for documents that must be formally described. It dominates in enterprise interchange, publishing and formats like SVG, DOCX and SVG that are XML underneath. For an API in 2026, JSON is the default; for a contract that needs a published schema, XML still earns its keep.",
        ],
        list: [
          {
            term: "CSV",
            text: "Flat tables, human-readable, universal. Loses nesting and types.",
          },
          {
            term: "JSON",
            text: "Nested structures, APIs, configuration. Compact, typed-ish, everywhere.",
          },
          {
            term: "XML",
            text: "Validated, namespace-aware documents. Verbose, but formally specifiable.",
          },
          {
            term: "TSV",
            text: "CSV with a tab. Convenient when the data itself contains commas.",
          },
        ],
      },
      {
        heading: "Converting between them without losing meaning",
        paragraphs: [
          "CSV to JSON is easy in one direction and lossy in the other. Going up, each row becomes an object keyed by the header — but every value arrives as a string unless you infer types, so a column of numbers becomes text and a column of dates becomes a pattern of characters. Going back down, something has to decide what a nested object becomes: a JSON blob in a cell, or flattened columns with dotted names.",
          "Before converting, check four things: the encoding (UTF-8 with or without BOM), the delimiter, whether the first row is a header, and how missing values are written. Get those right and the round trip is faithful. Get them wrong and the conversion will succeed technically while quietly shifting columns.",
          "For anything with real nesting, convert to JSON and keep it there. Flattening a nested structure into a spreadsheet is a one-way trip unless you preserve the original alongside the export.",
        ],
      },
    ],
    related: [
      { from: "csv", to: "json" },
      { from: "json", to: "csv" },
      { from: "xlsx", to: "csv" },
      { from: "csv", to: "xlsx" },
      { from: "xml", to: "json" },
      { from: "parquet", to: "csv" },
    ],
    relatedFormats: ["csv", "json", "xml", "xlsx", "tsv", "parquet"],
    faqs: [
      {
        question: "When should I use JSON instead of CSV?",
        answer:
          "When your records have nested structures, lists per record, or mixed value types. If every row is genuinely a flat table, CSV is simpler and everything reads it.",
      },
      {
        question: "Why did my numbers become text after converting CSV to JSON?",
        answer:
          "CSV has no types — every field is a sequence of characters. A converter must either keep values as strings or infer types from the text, and inference can get it wrong.",
      },
      {
        question: "How do I stop accented characters breaking when I convert?",
        answer:
          "Make sure the source file is UTF-8. Files exported as CP-1252 or Latin-1 need to be re-encoded first, otherwise the converted output inherits the mojibake.",
      },
    ],
  },
  {
    slug: "compress-and-share-large-files",
    title: "Making Files Smaller: Compression, Conversion and What Actually Works",
    description:
      "Why some files compress dramatically and others will not budge — lossless vs lossy, archive formats, and the conversions that genuinely reduce size.",
    updated: "2026-10-07",
    readingMinutes: 6,
    keywords: [
      "reduce file size",
      "compress file online",
      "lossy vs lossless compression",
      "shrink pdf",
    ],
    lead:
      "'Compress this file' usually means one of three different things: pack it without changing it, re-encode it and accept some loss, or convert it to a format that stores the same content more efficiently. Which one works depends entirely on what the file already is.",
    blocks: [
      {
        heading: "Lossless compression: finding redundancy, not deleting it",
        paragraphs: [
          "Lossless compression looks for repeated patterns and stores them once. It is why a TXT or CSV shrinks heavily, why a DOCX is already a ZIP archive before you touch it, and why PNG beats BMP. The output can be restored byte for byte.",
          "It also has a hard ceiling. A JPEG is already the result of lossy compression — the redundancy was removed when the photo was saved — so archiving it as a ZIP gains almost nothing, often under one percent. The same applies to MP3, MP4 and any other lossy file: you cannot re-find patterns that are no there.",
        ],
      },
      {
        heading: "Lossy compression: paying with quality",
        paragraphs: [
          "When a file must get substantially smaller and it is media, the answer is re-encoding at a lower quality setting. Images: lower the JPG quality, or move to WebP/AVIF, which reach the same visual quality with fewer bytes. Audio: drop from 320 kbps to 128–192 kbps, which most listeners cannot distinguish on phone speakers. Video: re-encode at a lower resolution or bitrate, which dominates every other saving because video is the biggest thing on any device.",
          "The rule that keeps this safe: re-encode once, from the original. Each pass throws away a fresh layer of detail and compresses the artefacts of the previous one. Chain three conversions and the result is visibly worse than a single careful one — for a larger file, because artefacts are harder to compress.",
        ],
      },
      {
        heading: "Containers and archives",
        paragraphs: [
          "When you need to email a folder or reduce the transfer size of many small files, pack them into an archive. ZIP is the universal choice — it is built into every operating system. 7z and RAR typically achieve 5–15% better compression on documents and logs; TAR.GZ is the convention on Unix systems. None of these will meaningfully shrink a file that is already compressed, such as a JPEG, MP3, MP4 or another ZIP.",
          "For documents specifically, the format itself often offers the biggest win. Exporting a Word document with embedded photographs to PDF usually shrinks it substantially, because PDF's image handling and font embedding are more efficient. A presentation full of full-resolution photos is the classic case: the same deck as a PDF is routinely half the size.",
        ],
        list: [
          {
            term: "Text, CSV, logs, source code",
            text: "Compresses extremely well — often 70–90% smaller as ZIP or GZ.",
          },
          {
            term: "Office documents",
            text: "Already ZIP-based; modest gains. Export to PDF for a bigger reduction.",
          },
          {
            term: "JPEG, MP3, MP4",
            text: "Already lossy-compressed. Archiving barely helps; re-encoding at lower quality does.",
          },
          {
            term: "PNG, WAV, BMP",
            text: "Uncompressed or losslessly compressed — re-encoding to JPG, MP3 or FLAC saves a lot.",
          },
        ],
      },
      {
        heading: "What not to bother with",
        paragraphs: [
          "Do not convert a lossy file to another lossy format hoping for savings — the size change is usually negligible and you have spent quality for nothing. Do not convert to a lossless format if size is the goal; that always makes lossy sources larger. And do not expect any tool to shrink an already-compressed file by a meaningful percentage: the information density is fixed by the format.",
          "If a file genuinely must be small, the levers in order of impact are: remove what is not needed (unused pages, extra tracks, full-resolution originals), reduce resolution or duration, then re-encode once at an appropriate quality. Everything else is rounding.",
        ],
      },
    ],
    related: [
      { from: "png", to: "jpg" },
      { from: "wav", to: "mp3" },
      { from: "docx", to: "pdf" },
      { from: "zip", to: "7z" },
      { from: "mp4", to: "mp3" },
      { from: "tiff", to: "jpg" },
    ],
    relatedFormats: ["zip", "7z", "rar", "pdf", "png", "jpg"],
    faqs: [
      {
        question: "Why does zipping a JPEG do nothing?",
        answer:
          "A JPEG is already compressed — the redundancy ZIP relies on has already been removed, so there is nothing left to exploit.",
      },
      {
        question: "What is the safest way to reduce a file size?",
        answer:
          "Lossless first: remove unused content and pack it into an archive. If that is not enough, re-encode once at a lower quality from the original file.",
      },
      {
        question: "Does converting PNG to JPG reduce quality?",
        answer:
          "Yes, if the PNG contains detail or transparency — JPG has no alpha channel and adds compression artefacts. For photographs the difference is usually invisible; for logos and text it is obvious.",
      },
    ],
  },
  {
    slug: "subtitles-srt-vtt-conversion",
    title: "SRT vs VTT: Converting Subtitles Without Breaking the Timing",
    description:
      "The difference between SRT, VTT, ASS and SBV subtitle files, how timing and styling survive a conversion, and how to fix captions that drift.",
    updated: "2026-10-07",
    readingMinutes: 5,
    keywords: [
      "srt to vtt",
      "subtitle format",
      "convert subtitles",
      "webvtt converter",
    ],
    lead:
      "Subtitle files are small and simple, which is why they convert easily — and why a conversion that gets the details wrong still 'works' while looking broken. The text arrives fine and the captions land a fraction of a second late, or arrive as a wall of unstyled text.",
    blocks: [
      {
        heading: "What the formats actually contain",
        paragraphs: [
          "Every subtitle format is a list of cues: a start time, an end time, and the text to show between them. SRT adds sequence numbers. WebVTT — the format HTML5 video requires — adds a cue identifier, its own timestamp syntax with a period instead of a comma for milliseconds, and a region for positioning. ASS and SSA carry styling: fonts, colours, positions and karaoke tags, which is why anime fansubs use them.",
          "SBV and SAMI serve similar niches in specific ecosystems — YouTube's classic upload format and Windows Media respectively. The structure is always the same idea in different clothes.",
        ],
        list: [
          {
            term: "SRT",
            text: "Plain, universal, no styling. The lingua franca of subtitles.",
          },
          {
            term: "WebVTT",
            text: "Required by the HTML <track> element. Adds styling, positioning and regions.",
          },
          {
            term: "ASS / SSA",
            text: "Full styling and effects. Converting to SRT discards all of it.",
          },
          {
            term: "SBV",
            text: "Simple YouTube-style cues with a comma-free timestamp format.",
          },
        ],
      },
      {
        heading: "Where conversions go wrong",
        paragraphs: [
          "Timestamps are the first hazard: SRT writes `00:00:01,500` while VTT writes `00:00:01.500`, and a converter that copies the string instead of translating it produces a file that no player will parse. The second is cue identifiers and numbering — VTT tolerates missing identifiers, SRT does not tolerate gaps in its sequence.",
          "Styling is the silent one. Converting ASS to SRT succeeds and returns valid text, but every font choice, colour and on-screen position is dropped, because SRT has nowhere to put it. If styling mattered, that conversion was the wrong direction.",
          "Line breaks matter too. Subtitle lines are wrapped at roughly 37–42 characters so they fit the player's safe area. A conversion that rewraps differently — or strips the line breaks — produces captions that are hard to read even though the words are correct.",
        ],
      },
      {
        heading: "Fixing captions that drift",
        paragraphs: [
          "If the text is right but the timing is off, the usual cause is a frame-rate mismatch rather than a conversion bug: the timings were generated for 25 fps and the video is 29.97, so the offset accumulates over the length of the file. Shifting the whole track by a fixed offset fixes a constant drift; a growing drift means the frame rate needs converting, not just the timestamps.",
          "Before uploading to a platform, check which format it asks for — most accept SRT and convert internally, while HTML5 players need VTT. And always spot-check the first and last cues of the output: that is where off-by-one errors in the final timestamp show up.",
        ],
      },
    ],
    related: [
      { from: "srt", to: "vtt" },
      { from: "vtt", to: "srt" },
      { from: "srt", to: "ass" },
      { from: "srt", to: "sbv" },
    ],
    relatedFormats: ["srt", "vtt", "ass", "sbv"],
    faqs: [
      {
        question: "What is the difference between SRT and VTT?",
        answer:
          "SRT is plain text with sequence numbers and comma-milliseconds; VTT is the web standard with a period-milliseconds syntax plus support for styling, positioning and regions.",
      },
      {
        question: "Can I convert styled subtitles to SRT?",
        answer:
          "Yes, but the styling is discarded — SRT has no way to store fonts, colours or positions. Only the text and timings survive.",
      },
      {
        question: "Why are my subtitles out of sync after converting?",
        answer:
          "Usually a frame-rate mismatch between the file the timings were made for and the video you are playing, rather than the conversion itself.",
      },
    ],
  },
  {
    slug: "heic-to-jpg-guide",
    title: "HEIC to JPG: Why iPhone Photos Refuse to Open, and What Converting Changes",
    description:
      "Why HEIC photos from an iPhone fail to open on Windows, Android and older software, what a JPG conversion keeps or discards, and how to avoid quality loss.",
    updated: "2026-10-28",
    readingMinutes: 7,
    keywords: [
      "heic to jpg",
      "iphone photos won't open",
      "convert heic to jpeg",
      "heif vs jpeg",
    ],
    lead:
      "If you have ever tried to upload an iPhone photo to a website that answered with an error, or opened one on an older Windows machine and seen only a grey placeholder, you have met HEIC. The photo is fine. Almost every piece of software that is not Apple simply cannot decode it, and converting to JPG is the fix — with a few consequences worth knowing first.",
    blocks: [
      {
        heading: "HEIC is a container, which is why one file can hide several things",
        paragraphs: [
          "HEIC stands for High Efficiency Image Container; the container format itself is HEIF, and the picture inside is compressed with HEVC — the same family of coding that H.265 video uses. HEVC is roughly twice as efficient as the JPEG standard it replaced, which is why Apple switched the iPhone camera default to it in iOS 11 and why the files are so much smaller for the same visual quality.",
          "The word container is doing real work there. A single HEIC file can hold the still image, a depth map from the portrait camera, an HDR gain map that reconstructs highlights above standard white, the still frame and short video of a Live Photo, and thumbnail previews. That richness is invisible in most viewers but explains why a HEIC is not simply 'a photo' the way a JPG is: conversion has to decide what to keep.",
        ],
      },
      {
        heading: "Why the file will not open anywhere",
        paragraphs: [
          "Support is split by platform, not by file quality. Apple devices read HEIC natively — macOS previews it, Photos edits it, Safari displays it. Windows 10 and 11 need the HEIF Image Extensions from the Microsoft Store, and decoding HEVC video content can require the separate HEVC Video Extensions, which some machines must pay for. Android has read it since Android 9, but individual gallery and messaging apps vary. Browsers are the weakest link: a web page asking for an image upload usually accepts JPG and PNG and rejects HEIC outright.",
          "The other half of the confusion is thumbnails. Because a HEIC carries its own embedded JPEG preview, some file browsers show a correct thumbnail and then fail when you actually open the file — the viewer was showing the thumbnail, not decoding the photo. If a file previews fine but opens blank, that is usually what happened.",
        ],
        list: [
          {
            term: "macOS, iOS, iPadOS",
            text: "Native support everywhere, including editing.",
          },
          {
            term: "Windows 10/11",
            text: "Needs HEIF Image Extensions; older builds may also need the HEVC codec.",
          },
          {
            term: "Android",
            text: "Read from Android 9 onward; app support varies.",
          },
          {
            term: "Web uploads",
            text: "Usually rejected — most forms accept JPG, PNG and WebP only.",
          },
        ],
      },
      {
        heading: "What a JPG conversion keeps, and what it throws away",
        paragraphs: [
          "The pixels survive, re-encoded once into JPEG. That is a second lossy generation only if the HEIC itself was lossy, which it almost always is — in practice the difference is invisible at normal viewing size, because the first encode was at high quality. What changes is everything around the pixels.",
          "High dynamic range is the biggest casualty. Modern iPhones capture more range than a standard JPEG can hold, and store the extra highlights in a gain map. Converters that ignore the map produce a flatter, sometimes clipped image: skies that were smooth acquire white patches, backlit faces lose detail. Transparency, where present, is filled with a background colour because JPG has no alpha channel. Depth data and Live Photo motion are dropped. EXIF is usually carried across — including GPS coordinates, which is worth remembering before posting a photo of your home.",
          "The file also gets bigger. HEVC is efficient enough that the equivalent-quality JPG is often around twice the size, which surprises people who assume conversion compresses.",
        ],
      },
      {
        heading: "Getting the best result out of the conversion",
        paragraphs: [
          "Convert from the original HEIC, never from a screenshot or a re-saved copy — those start from an already-recompressed image. If the photo is going to be edited further in an image editor, convert to PNG instead of JPG so the editing passes do not stack lossy generations; the file will be larger, but it stays clean until you export a final JPG.",
          "Watch orientation. Phone photos are stored landscape with an EXIF rotation flag, and a converter that copies the flag without applying it produces a sideways image. If the result is rotated, the tool ignored the tag. And if the destination is a website rather than a person's desktop, consider WebP or AVIF instead of JPG — both are smaller at equal quality and are supported by every current browser.",
        ],
      },
    ],
    related: [
      { from: "heic", to: "jpg" },
      { from: "heic", to: "png" },
      { from: "heic", to: "pdf" },
      { from: "jpg", to: "png" },
      { from: "png", to: "jpg" },
      { from: "webp", to: "jpg" },
    ],
    relatedFormats: ["heic", "heif", "jpg", "png", "webp", "avif"],
    faqs: [
      {
        question: "Does converting HEIC to JPG reduce quality?",
        answer:
          "Slightly, and usually imperceptibly: JPG is lossy, so the image is re-encoded once at high quality. Convert to PNG instead if the photo still needs editing, to avoid stacking a second lossy pass later.",
      },
      {
        question: "Why is the JPG twice the size of the HEIC?",
        answer:
          "HEVC compresses roughly twice as efficiently as JPEG at the same visual quality, so storing the same picture as JPG needs more bytes. The trade is compatibility, not quality.",
      },
      {
        question: "Can I keep the HDR look after converting?",
        answer:
          "Only if the converter reads Apple's gain map and tone-maps it. Most JPG output is standard dynamic range, so very bright highlights may look flatter or clipped compared with the phone's display.",
      },
      {
        question: "Does the JPG still contain my location?",
        answer:
          "Usually yes — EXIF, including GPS, is preserved by most converters. Strip metadata before publishing a photo publicly if the location should stay private.",
      },
    ],
  },
  {
    slug: "images-to-pdf-guide",
    title: "Photos and Scans to PDF: Page Size, DPI and Ordering Done Right",
    description:
      "Turn phone photos, receipts and scans into one PDF that prints correctly — how page size, resolution, rotation and compression decide the result.",
    updated: "2026-10-28",
    readingMinutes: 6,
    keywords: [
      "jpg to pdf",
      "images to pdf",
      "combine photos into pdf",
      "scan to pdf",
    ],
    lead:
      "Combining images into a PDF looks like the simplest conversion there is, and it is — right up until you print it and find a photo cropped at the edge, a page the wrong way round, or a file too large to email. All three come from decisions the conversion makes on your behalf, and all three are controllable.",
    blocks: [
      {
        heading: "A PDF page is a fixed box; a photo is whatever shape it is",
        paragraphs: [
          "Every PDF page has an explicit size in physical units — A4 is 210 by 297 millimetres, US Letter is 8.5 by 11 inches — and each image has to be placed inside that box. There are only two honest options: fit the whole image inside the page, leaving margins in the empty dimension, or fill the page and crop the overflow. A converter that silently stretches the image to fill the page distorts it, which is the failure people notice last and hate most.",
          "Page size should follow the destination. A4 for most of the world, Letter for North America; both for a mixed audience is a bad idea because a document with alternating page sizes prints badly and looks unprofessional. If your images are a mixture of portrait and landscape, decide whether to keep each photo's orientation as its own page orientation, or to force one orientation and accept margins on half the pages.",
        ],
      },
      {
        heading: "Resolution: decide by destination, not by a number you remember",
        paragraphs: [
          "A PDF stores an image in pixels and scales it to a physical size, so the same photo can be 100 DPI or 400 DPI depending on the page it is placed on. Take a 4000-pixel-wide photo and put it across an A4 page: 4000 divided by 8.27 inches gives about 484 dots per inch. That is well above what any office printer resolves. Put the same photo across a 4-inch-wide region and it is 1000 DPI, which is pure waste.",
          "For print, 300 DPI at the final placed size is the standard target, and 150 DPI is acceptable for internal documents. For screen-only PDFs, 100 to 150 DPI is enough and keeps the file small. The important asymmetry is that you cannot add resolution by asking for it: telling a converter to write a 2000-pixel image at 600 DPI enlarges it to a blurry 600 DPI, it does not create detail. Downsizing, on the other hand, genuinely saves space.",
        ],
      },
      {
        heading: "Ordering, rotation and the mistakes everyone makes",
        paragraphs: [
          "Page order comes from filename order, and filenames sort as text: page1, page10, page2. Zero-pad the numbers — page01, page02, page10 — or the PDF will be in an order that only makes sense to a computer. Sorting by modification date instead helps when the files came from a camera roll in sequence.",
          "Rotation is the second trap. A photo taken sideways is stored with an EXIF orientation flag, and if the converter does not apply it, that page arrives rotated inside the PDF, where you can no longer fix it by rotating your viewer. Check the first and last page of the output before sending it anywhere. Also watch for blank or duplicated pages: sheet-feed scanners occasionally pull two sheets at once, and a phone scan of a two-sided document produces one page per side whether you wanted that or not.",
        ],
      },
      {
        heading: "Keeping it small enough to actually send",
        paragraphs: [
          "An image-only PDF is roughly the sum of the JPEGs inside it, so size is driven by pixel count and quality setting. Recompressing at around 85 percent quality is usually visually indistinguishable from the original photo and cuts the size substantially. Downsampling anything above 300 DPI to 300 DPI saves more, and converting text-only scans to grayscale can halve them again.",
          "Never convert a PDF page back to an image and then into a new PDF to 'compress' it — that is two lossy generations for a file that will look worse and often end up larger. If the document needs to be searchable or selectable, note that a photo of text is just a picture: making the text real requires optical character recognition, which is a separate step from assembling the PDF.",
        ],
        list: [
          {
            term: "Email or upload",
            text: "150 DPI, JPEG quality around 85 percent, grayscale for text pages.",
          },
          {
            term: "Office printing",
            text: "300 DPI at the final page size, sRGB, single page size throughout.",
          },
          {
            term: "Archiving a scan",
            text: "300 to 400 DPI, colour only if the original has colour; keep the originals too.",
          },
        ],
      },
    ],
    related: [
      { from: "jpg", to: "pdf" },
      { from: "png", to: "pdf" },
      { from: "heic", to: "pdf" },
      { from: "tiff", to: "pdf" },
      { from: "pdf", to: "jpg" },
      { from: "webp", to: "pdf" },
    ],
    relatedFormats: ["jpg", "png", "pdf", "tiff", "heic", "gif"],
    faqs: [
      {
        question: "Which page size should I choose for a photo PDF?",
        answer:
          "Match the paper you will print on: A4 outside North America, Letter inside it. Mixing sizes in one document prints badly, so pick one and let the other dimension take margins.",
      },
      {
        question: "How do I make a photo PDF smaller?",
        answer:
          "Lower the JPEG quality to about 85 percent, downsample anything above 300 DPI, and use grayscale for text-only pages. Do not convert it to images and back — that adds loss without shrinking it.",
      },
      {
        question: "Why are my pages rotated inside the PDF?",
        answer:
          "The EXIF orientation flag was copied but not applied. Rotate the source images first, or use a converter that bakes the rotation into the page.",
      },
      {
        question: "Can I make the text in a scanned PDF searchable?",
        answer:
          "Only with OCR. A photo or scan is a picture of text, so the PDF carries no characters until an OCR step recognises them; converting the PDF to TXT or DOCX runs that recognition.",
      },
    ],
  },
  {
    slug: "pdf-to-image-dpi-guide",
    title: "PDF to JPG or PNG: Choosing a Resolution That Is Neither Blurry nor Huge",
    description:
      "What 72, 150 and 300 DPI actually mean for a PDF page, when PNG beats JPG, and why one page can produce a file larger than the document it came from.",
    updated: "2026-10-28",
    readingMinutes: 6,
    keywords: [
      "pdf to jpg",
      "pdf to png",
      "pdf resolution dpi",
      "convert pdf page to image",
    ],
    lead:
      "A PDF has no pixels until you decide to give it some. That is why the same page can come out as a crisp poster or a blurred thumbnail from the same converter — the resolution setting is not a quality slider, it is a decision about how many pixels the page is worth. Get it wrong in one direction and the text is unreadable; wrong in the other and the file is enormous for no reason.",
    blocks: [
      {
        heading: "A PDF describes a page; rendering decides its size in pixels",
        paragraphs: [
          "Text in a PDF is stored as glyphs at coordinates, and vectors are stored as paths. Nothing in the file says how many pixels wide the page is, because a PDF is meant to be sharp at any output size. Turning it into an image is a rendering step that picks a number of pixels per inch of paper, and every dimension follows from that.",
          "For A4 the numbers are worth memorising: at 72 DPI a page is 595 by 842 pixels, at 150 DPI it is 1240 by 1754, at 300 DPI it is 2480 by 3508, and at 600 DPI it is 4961 by 7016. 72 DPI is the historical value one PDF unit is defined against, which is why converters that do not ask you for a resolution quietly produce something that looks soft on any modern screen.",
        ],
      },
      {
        heading: "Picking the number for what you will do with the image",
        paragraphs: [
          "For reading on screen, posting in a chat or dropping a page into a slide deck, 96 to 150 DPI is right: full-page legibility without waste. For printing, or for archiving a page whose fine print matters, 300 DPI is the standard. Go to 400 or 600 DPI only for line art, small technical text, or pages that will be OCRed — and accept that a 600 DPI render has four times the pixels of 300 DPI, so the file is roughly four times larger.",
          "The cost curve is the thing people underestimate. Doubling the resolution quadruples the pixel count, and JPEG or PNG size follows pixel count closely. A 40-page document rendered at 600 DPI is not twice a 300 DPI version, it is four times, and a folder of them can run to gigabytes. If the goal is to look at a document, 150 DPI answers the question; render at 300 only the pages you actually need.",
        ],
        list: [
          {
            term: "72 to 96 DPI",
            text: "Previews and thumbnails. Text is technically present but soft; do not read from it.",
          },
          {
            term: "150 DPI",
            text: "Comfortable on screen, fine for email attachments and slide decks.",
          },
          {
            term: "300 DPI",
            text: "Print quality and general archiving. The default worth choosing.",
          },
          {
            term: "600 DPI",
            text: "Line art, small technical text, OCR input. Four times the bytes of 300 DPI.",
          },
        ],
      },
      {
        heading: "JPG or PNG is a question about what is on the page",
        paragraphs: [
          "A photograph rendered to JPG is a good trade: small file, no visible difference. A page of text or a diagram rendered to JPG is a bad one, because JPEG's compression works in 8 by 8 blocks and produces ringing around hard edges — the fuzz that appears around letters and thin lines at low quality settings. PNG stores those edges exactly, so text stays clean, at the cost of a larger file.",
          "Pick PNG when the page is mostly text, line art, charts or screenshots; pick JPG when the page is mostly photographs or gradients. Two more details matter. Pages with no background colour are transparent in the PDF, and PNG keeps that transparency while JPG fills it with white — usually fine, occasionally a surprise on dark backgrounds. And if the source is a black-and-white scan, asking for grayscale rather than colour can cut the size dramatically with no loss of usefulness.",
        ],
      },
      {
        heading: "Multi-page documents, and what you are really producing",
        paragraphs: [
          "Rendering a 30-page PDF produces 30 images, and how they are delivered matters as much as their quality. One image per page is right when you need a specific page for a document or a slide; a single archive of all pages is right when you need the whole thing offline. Bundling them avoids 30 separate downloads, but it also means you cannot preview before committing to the transfer.",
          "Finally, be clear about what you lose. An image of a page cannot be searched, copied or edited — if the goal was to work with the text, the useful conversion is PDF to TXT, DOCX or HTML, which extracts characters rather than pictures. Rasterising is for when the page itself is the thing you want: a preview image, a thumbnail, a page pasted into a design, or a signature block lifted out of a contract.",
        ],
      },
    ],
    related: [
      { from: "pdf", to: "jpg" },
      { from: "pdf", to: "png" },
      { from: "pdf", to: "webp" },
      { from: "pdf", to: "tiff" },
      { from: "jpg", to: "pdf" },
      { from: "png", to: "pdf" },
    ],
    relatedFormats: ["pdf", "jpg", "png", "webp", "tiff", "svg"],
    faqs: [
      {
        question: "What DPI should I use to convert a PDF to an image?",
        answer:
          "150 DPI for screen use, 300 DPI for printing or archiving, 600 DPI only for fine line art and OCR input. Doubling the DPI quadruples the file size.",
      },
      {
        question: "Why is my JPG of a PDF page blurry?",
        answer:
          "The page was rendered at 72 DPI, the default many tools use because PDF units are defined against it. Re-render at 150 or 300 DPI — the PDF itself has no resolution to lose.",
      },
      {
        question: "Should I convert a PDF page to PNG or JPG?",
        answer:
          "PNG for text, diagrams and screenshots — JPEG adds visible fuzz around letters. JPG for photographic pages, where it is smaller with no visible difference.",
      },
      {
        question: "Can I get the text out instead of a picture?",
        answer:
          "Yes, with a document conversion rather than an image one: PDF to TXT, DOCX or HTML extracts characters. Rendering to an image deliberately keeps only the visual result.",
      },
    ],
  },
  {
    slug: "docx-to-pdf-fidelity-guide",
    title: "DOCX to PDF: Why the Layout Moves, and the Checks That Catch It",
    description:
      "Fonts, fields and page breaks are what change when a Word file becomes a PDF — how to predict the damage and catch it in three minutes before sending.",
    updated: "2026-10-28",
    readingMinutes: 6,
    keywords: [
      "docx to pdf",
      "word to pdf formatting changed",
      "pdf layout shifted",
      "convert word document to pdf",
    ],
    lead:
      "Word-to-PDF is the conversion people trust most and check least, which is unfortunate, because it is a re-layout rather than a snapshot. The text is never the problem; the problem is a paragraph that now spills onto the next page, or a brand font that silently became a substitute. Both are predictable, and both are visible in a quick review.",
    blocks: [
      {
        heading: "Two different programs are doing the layout",
        paragraphs: [
          "A DOCX does not contain pages. It contains text with styles, images anchored to paragraphs, and settings that say how to flow everything — and a program lays that out into pages each time it is opened or printed. Microsoft Word and the office engines used by converters and servers are different programs with different line-breaking rules, hyphenation dictionaries and font-metric tables, so identical input can paginate differently.",
          "That difference is normal and usually small: the same paragraph count, the same fonts, one page break in a different place near the end. It becomes a problem only when a document is tuned to the last line of the last page, which is exactly what happens with a résumé, a two-page brief or a form that must not run to a third page. Convert early enough to see the overflow, not at the moment you send it.",
        ],
      },
      {
        heading: "Fonts are the single biggest cause of drift",
        paragraphs: [
          "If the converting machine does not have the font, it substitutes one. Office suites ship metric-compatible replacements — Calibri maps to Carlito, Arial to Liberation Sans, Times New Roman to Liberation Serif — which are designed to occupy the same space per character, so the layout mostly holds. Custom fonts have no such twin: a corporate typeface becomes whatever the fallback list says, character widths change, and every line on every page reflows.",
          "If the document uses a brand font, either embed it in the DOCX before converting or accept that a local export from Word will look different from a conversion done elsewhere. And check the page count first thing: if it differs from the original, something reflowed, and the cause is almost always a font.",
        ],
      },
      {
        heading: "What else changes hands between the two formats",
        paragraphs: [
          "Tracked changes and comments are the quiet hazard. In Word they are visible as marks; a converted PDF may show them, may show only the accepted text, or may omit the comment margin entirely. Decide which you want — clean copy or review copy — and resolve the tracked changes before converting so the answer is not up to the tool.",
          "Fields are the second category: a table of contents, page numbers, cross-references and date fields are computed by the editing program. If they were stale when you converted, they are frozen stale in the PDF. Update them first. Beyond that, the usual casualties are tables whose rows split across a page break, floating text boxes and shapes that anchor slightly differently, hyperlinks that survive or do not depending on the converter, form controls that become flat, embedded spreadsheets that need their host program, and images using transparency or blend modes that render differently on a non-Microsoft engine.",
        ],
      },
      {
        heading: "A three-minute pre-send check",
        paragraphs: [
          "Compare page counts first, then scan the bottom of each page for a paragraph that used to sit on the previous one. Look at any table that lands near a page break, because a header row separated from its rows is the most common visible defect. Confirm that headers, footers and page numbers are right, click two or three hyperlinks, and check that images have not gone soft — a re-compressed photograph is the one thing in the file that quietly loses quality.",
          "If the PDF is for archival or legal purposes, ask for PDF/A rather than an ordinary PDF: it embeds the fonts and forbids the features that make a document render differently years later. The trade is that PDF/A is a final form — you cannot go back to editing it, so keep the DOCX as the master and treat every PDF as an export.",
        ],
        list: [
          {
            term: "Page count",
            text: "Differs from the original? Suspect a font substitution first.",
          },
          {
            term: "Page breaks",
            text: "Check the last two lines of each page and any table split across pages.",
          },
          {
            term: "Fields",
            text: "Table of contents and page numbers must be updated before converting, not after.",
          },
          {
            term: "Input PDF",
            text: "Long-lived records may want PDF/A, which embeds fonts and pins the layout.",
          },
        ],
      },
    ],
    related: [
      { from: "docx", to: "pdf" },
      { from: "doc", to: "pdf" },
      { from: "pdf", to: "docx" },
      { from: "docx", to: "odt" },
      { from: "docx", to: "txt" },
      { from: "md", to: "pdf" },
    ],
    relatedFormats: ["docx", "doc", "pdf", "odt", "rtf", "md"],
    faqs: [
      {
        question: "Why did my page breaks change when converting DOCX to PDF?",
        answer:
          "A different layout engine re-flowed the text, usually because a font was substituted or line-breaking rules differ. Compare page counts and check the bottom of each page.",
      },
      {
        question: "How do I keep my fonts in the PDF?",
        answer:
          "Use fonts that exist on the converting machine, or embed them in the DOCX first. Metric-compatible substitutes like Carlito for Calibri keep the layout close but are not identical.",
      },
      {
        question: "Can I edit the PDF afterwards?",
        answer:
          "Treat a PDF as a final export. Editing it means converting back to DOCX, which reconstructs structure imperfectly — keep the original DOCX as the master instead.",
      },
    ],
  },
  {
    slug: "video-formats-mp4-webm-mkv",
    title: "MP4, WebM and MKV: Choosing a Video Format That Actually Plays",
    description:
      "Containers versus codecs, which format plays where, and what a video conversion really costs — a practical guide to MP4, WebM, MKV and MOV.",
    updated: "2026-10-28",
    readingMinutes: 7,
    keywords: [
      "mp4 vs webm",
      "mkv to mp4",
      "video format for web",
      "convert video format",
    ],
    lead:
      "Video format advice fails because people use one word for two different things. MP4 and MKV are containers — boxes that hold streams. H.264, HEVC, VP9 and AV1 are codecs — the ways those streams are compressed. Almost every playback problem is a codec problem wearing a container's name, and knowing which one you are changing tells you whether a conversion will take seconds or an hour.",
    blocks: [
      {
        heading: "Container and codec are separate decisions",
        paragraphs: [
          "A container defines what can live inside the file: video tracks, audio tracks, subtitle tracks, chapter markers, metadata. A codec defines how the picture or sound is compressed. MP4 can hold H.264, HEVC or AV1 video with AAC or Opus audio; MKV can hold nearly anything; WebM is restricted to the open codecs, in practice VP8, VP9 or AV1 with Vorbis or Opus.",
          "That split explains the two very different kinds of conversion. Repackaging — moving the same H.264 stream from an MKV into an MP4 — is a copy: fast, lossless, and only possible when the target container accepts the codec already inside. Re-encoding — turning HEVC into H.264 — decodes and re-compresses every frame: slow, lossy, and the only option when the device you are targeting cannot decode the original codec.",
        ],
      },
      {
        heading: "What plays where",
        paragraphs: [
          "MP4 with H.264 video and AAC audio is the closest thing to a universal format: every phone, television, editor, social platform and presentation tool accepts it, which is why it is the safe answer for anything you are sending to someone else. HEVC in an MP4 is roughly 30 to 50 percent smaller at the same quality, but playback depends on the device having a licensed HEVC decoder, and older Windows machines and browsers often do not.",
          "WebM with VP9 or AV1 is for the web: browsers decode it natively and it is typically smaller than H.264 at equal quality, which is why video sites serve it first with an MP4 fallback. It is a poor choice for a file someone will open on a television or drop into a video editor. MKV is a container for keeping things — multiple audio tracks, many subtitle languages, chapters — with excellent desktop player support and patchy support on Apple devices, smart TVs and phones. MOV remains the working format of the Apple ecosystem, and AVI is legacy: large, old codecs and increasingly unsupported.",
        ],
        list: [
          {
            term: "MP4 (H.264 + AAC)",
            text: "The universal default. Share it, upload it, put it in a slide deck.",
          },
          {
            term: "MP4 (HEVC)",
            text: "Smaller, but needs a modern device with the right decoder.",
          },
          {
            term: "WebM (VP9 / AV1)",
            text: "Best for web pages and progressive playback in browsers.",
          },
          {
            term: "MKV",
            text: "Multiple tracks and subtitles for archiving; weak on TVs and Apple devices.",
          },
        ],
      },
      {
        heading: "What a video conversion costs you",
        paragraphs: [
          "A re-encode is one lossy generation. Do it once from the original and the result is usually indistinguishable; do it three times while chasing the right format and the artefacts compound — the second pass has to compress the smears created by the first, which makes the file both worse and, perversely, sometimes bigger.",
          "Two settings dominate the result. Resolution is the biggest lever: 1080p downscaled to 720p at a sane bitrate looks better and is far smaller than 1080p squeezed to a low bitrate. And bitrate should match the content — a static talking-head needs a fraction of what fast motion does. Note also that converters optimised for turnaround, including most server-side ones, trade some encoding efficiency for speed; if you are producing a master or a file for broadcast, export from your own editor instead.",
        ],
      },
      {
        heading: "Tracks, subtitles and the web-specific details",
        paragraphs: [
          "Subtitles are the most common casualty of container conversion. MKV happily carries a dozen subtitle streams; MP4 supports them but many tools drop them silently during conversion, and burned-in subtitles are a different thing entirely from a selectable track. If subtitles matter, keep them as a separate SRT or WebVTT file — which is also the format a web player expects — or check explicitly that the output still lists its tracks.",
          "For web delivery there is one more detail worth knowing: the index at the start of an MP4. A file written with its index at the end has to be fully downloaded before it starts playing, while one written with the index first can play progressively. If a video on a page sits at a spinner until it is completely fetched, the container is fine and the layout of the file is the problem. And if you only needed the sound, extracting to MP3 or WAV is faster than any video conversion and gives you a file that plays anywhere.",
        ],
      },
    ],
    related: [
      { from: "mp4", to: "webm" },
      { from: "webm", to: "mp4" },
      { from: "mkv", to: "mp4" },
      { from: "avi", to: "mp4" },
      { from: "mov", to: "mp4" },
      { from: "mp4", to: "mp3" },
    ],
    relatedFormats: ["mp4", "webm", "mkv", "avi", "mov", "mp3"],
    faqs: [
      {
        question: "Which video format should I upload to a website?",
        answer:
          "MP4 with H.264 video and AAC audio plays everywhere. Offer WebM or AV1 as an additional source for browsers if you want smaller files, but keep MP4 as the fallback.",
      },
      {
        question: "Does converting MKV to MP4 reduce quality?",
        answer:
          "Only if the codec inside is changed. If the video is already H.264, the streams can be copied into an MP4 with no loss at all; a real re-encode costs one generation.",
      },
      {
        question: "Why is WebM smaller than MP4?",
        answer:
          "The codecs it allows — VP9 and AV1 — compress better than H.264 at the same visual quality. The trade is that older devices and editors cannot open it.",
      },
      {
        question: "Where did my subtitles go after converting?",
        answer:
          "Many converters drop embedded subtitle tracks when changing container. Keep subtitles as a separate SRT or WebVTT file, or verify the output still lists its tracks.",
      },
    ],
  },
  {
    slug: "png-to-jpg-guide",
    title: "PNG to JPG: What You Gain, What You Lose, and When to Keep the PNG",
    description:
      "Converting PNG to JPG: why the file shrinks, what happens to transparency, text and logos, and how to pick a quality setting that survives review.",
    updated: "2026-10-29",
    readingMinutes: 6,
    keywords: [
      "png to jpg",
      "convert png to jpeg",
      "png transparency jpg",
      "reduce png file size",
    ],
    lead:
      "PNG to JPG is the most common image conversion there is, and the one most often done for the wrong reason. The file usually gets much smaller — but exactly what disappears on the way is decided by the image content, not by the converter.",
    blocks: [
      {
        heading: "Why the PNG was large in the first place",
        paragraphs: [
          "PNG is lossless. It compresses by finding repeated byte patterns, the same way a ZIP does, so every pixel you saved is still there when the file is reopened. That is excellent for screenshots, diagrams, interface captures and anything with large areas of identical colour, because those areas compress extremely well without any quality cost. It is far less effective on photographs, where neighbouring pixels almost never repeat exactly: the compressor keeps hunting for matches, finds few, and the file stays large.",
          "The other size driver is the alpha channel. A PNG can store per-pixel transparency, and transparency does not compress as neatly as solid colour. A 4000-pixel-wide screenshot of a transparent logo can easily weigh several megabytes, most of it spent describing which pixels are see-through. JPG has no alpha channel at all, which is simultaneously why it is smaller and why the conversion changes how the image looks.",
        ],
      },
      {
        heading: "The transparency problem",
        paragraphs: [
          "A JPG cannot store a transparent pixel. Every pixel must have a colour, so anything transparent has to become something. Most converters fill it with white; some fill with black; a few let you choose. If you convert a transparent logo to JPG and view it on a dark page, you will see the rectangle you never knew was there — a white box around the mark. That is not a bug in the converter, it is the format honestly reporting that it has nowhere to put the information.",
          "The right move is to flatten deliberately before converting. Compose the image over the background it will actually sit on — white for print, the page colour for a website, a brand colour for a slide — and export that flattened result as JPG. If the transparent version still has a use, keep it as PNG and treat the JPG as a delivery copy. Never overwrite the only copy of a transparent asset with a flattened one.",
        ],
      },
      {
        heading: "Where JPG wins and where it damages the image",
        paragraphs: [
          "JPG is a photographic format. It discards detail the eye is unlikely to notice, concentrating on brightness and giving colour less precision, which is a very good model of human vision for photographs, skin tones and landscapes. At a quality setting around 80 to 85, a photo is typically a tenth of the PNG size with no visible difference at normal viewing distance. Lower settings start to show blocking in smooth gradients such as skies, and ringing around high-contrast edges.",
          "Those edges are the problem for anything that is not a photograph. Text, logos, line art and screenshots are made of hard transitions between flat colours, exactly the content JPG's maths handles worst. You get coloured fringes and grey mush around every letter, and thin strokes can disappear entirely at small sizes. If the image contains words, a chart with labels, or a logo with fine detail, converting it to JPG for a smaller file is usually a false economy: the result looks broken and often needs redoing.",
        ],
      },
      {
        heading: "A conversion routine that does not lose anything you need",
        paragraphs: [
          "Start from the original PNG, not from a JPG you already exported. Each JPG pass is a fresh generation of loss, and re-saving a JPG compounds the artefacts of the previous one rather than starting clean. If the image has transparency, decide the background colour first and produce the flattened version as its own file so the decision is explicit and reversible.",
          "Then check the result at the size it will actually be seen, not at 400 percent zoom. A quality setting that looks fine on a phone thumbnail may fall apart on a poster, and the reverse is also true: there is no point paying for 95 percent quality on an image that will render 300 pixels wide. Finally, compare the two file sizes before committing. If the PNG is only a little larger, keeping it avoids the whole set of trade-offs and preserves the alpha channel for future edits.",
        ],
      },
    ],
    related: [
      { from: "png", to: "jpg" },
      { from: "jpg", to: "png" },
      { from: "png", to: "webp" },
      { from: "png", to: "pdf" },
      { from: "png", to: "ico" },
      { from: "png", to: "svg" },
    ],
    relatedFormats: ["png", "jpg", "webp", "pdf", "ico"],
    faqs: [
      {
        question: "Does converting PNG to JPG reduce quality?",
        answer:
          "Yes. JPG is lossy and has no alpha channel, so fine detail is discarded and transparent pixels become a solid colour. Photographs usually survive well; text and logos usually do not.",
      },
      {
        question: "Can I convert PNG to JPG and keep the transparent background?",
        answer:
          "No. JPG has no transparency support. Use WebP or AVIF if you need a small file with alpha, or flatten the image onto the background colour it will sit on.",
      },
      {
        question: "What JPG quality should I use?",
        answer:
          "Around 80 to 85 is the usual sweet spot for photographs. Go higher only for images that will be printed large or cropped afterwards.",
      },
    ],
  },
  {
    slug: "jpg-to-pdf-guide",
    title: "JPG to PDF: Turning Photos into a Document That Prints Correctly",
    description:
      "How to combine JPG photos into one PDF: page size, DPI, orientation and compression, and why a poorly sized image prints blurry or cropped.",
    updated: "2026-10-29",
    readingMinutes: 6,
    keywords: [
      "jpg to pdf",
      "photos to pdf",
      "combine images into pdf",
      "image dpi for printing",
    ],
    lead:
      "Putting a photo into a PDF looks like the simplest conversion on the site, and it is the one where the settings decide whether the print comes back sharp or soft. The image is not changed by the format; it is changed by the page it is placed on.",
    blocks: [
      {
        heading: "A PDF is a page, not a picture",
        paragraphs: [
          "A JPG stores pixels and says nothing about physical size. A PDF stores a page with a defined width and height in points, and places images on it at a chosen position and scale. That is why the same photo can look crisp in one PDF and blurry in another: the number of pixels is identical, but the physical area they are spread across is not. Blurriness in a printed PDF is almost always too few pixels for the page size, not a bad conversion.",
          "The arithmetic is worth knowing. A4 is 210 by 297 millimetres, roughly 8.27 by 11.69 inches. At the 300 dots per inch that print shops expect, that is about 2480 by 3508 pixels. A phone photo at 4032 by 3024 pixels fills an A4 page comfortably. A 1000-pixel-wide image stretched to A4 is working at roughly 120 DPI, which is fine on screen and visibly soft on paper.",
        ],
      },
      {
        heading: "Page size, orientation and margins",
        paragraphs: [
          "Decide the page size before converting, because changing it afterwards means re-laying out every image. A4 is the norm outside North America, Letter inside it, and a mismatch between the two shows up as an unexpected white strip at the edge or content clipped by the printer's unprintable border. Keep a margin of at least five millimetres on all sides for the same reason.",
          "Orientation matters with mixed photos. A portrait photo on a landscape page leaves large empty areas; a landscape photo on a portrait page either gets shrunk to fit or gets cropped. Most converters offer fit-to-page, which preserves the whole image and leaves whitespace, or fill-the-page, which crops. For a document someone will read on paper, fitting is normally correct: a small white band is better than a headless portrait. Also check that the converter respects the EXIF rotation flag, or phone photos taken in portrait can arrive sideways.",
        ],
      },
      {
        heading: "Should the PDF recompress the images?",
        paragraphs: [
          "There are two ways to get a JPG into a PDF. The first embeds the original compressed stream untouched, which is lossless from the JPG's point of view and keeps the file size roughly equal to the sum of the images. The second decodes the image and re-encodes it, usually at a chosen quality or a target resolution, which can shrink a phone-photo PDF dramatically at the cost of one more lossy generation. Neither is wrong, but you should know which one happened.",
          "For a print order, embed the originals and let the print shop handle scaling; for an email attachment with a size limit, recompressing to around 150 DPI at quality 80 is usually indistinguishable on screen and a fraction of the size. If the photos contain readable text — receipts, whiteboards, scanned pages — keep the resolution high and avoid aggressive compression, because JPG artefacts around lettering are what makes a scanned document unreadable.",
        ],
      },
      {
        heading: "Multiple images in one file",
        paragraphs: [
          "When you combine several photos, the order is the document. Most tools sort by filename, which means IMG_1002 comes before IMG_0010 unless the names are zero-padded. Rename or reorder before converting if the sequence matters, and check the first and last page of the output rather than assuming.",
          "Mixed source formats are fine: a PDF can hold JPG, PNG and even transparent PNG images on the same page, and the transparency is preserved because the PDF page provides the background. If the document is going to be edited later, a PDF is a poor working format — keep the images and the arrangement notes, and treat the PDF as the delivered artefact.",
        ],
      },
    ],
    related: [
      { from: "jpg", to: "pdf" },
      { from: "png", to: "pdf" },
      { from: "pdf", to: "jpg" },
      { from: "jpg", to: "png" },
      { from: "heic", to: "pdf" },
      { from: "webp", to: "pdf" },
    ],
    relatedFormats: ["jpg", "pdf", "png", "heic", "webp"],
    faqs: [
      {
        question: "What DPI should photos be for a PDF?",
        answer:
          "300 DPI at the final page size for printing, 150 DPI for screen reading and email. Below about 120 DPI a photo looks soft on paper.",
      },
      {
        question: "Why is my photo blurry in the PDF?",
        answer:
          "The image has fewer pixels than the page area needs at print resolution. Either use a larger original or place it on a smaller page.",
      },
      {
        question: "Does JPG to PDF reduce quality?",
        answer:
          "Not if the JPG is embedded directly. It does if the converter re-encodes it, which many do when you pick a target size or compression level.",
      },
    ],
  },
  {
    slug: "pdf-to-jpg-guide",
    title: "PDF to JPG: Rendering Pages at a Resolution That Still Reads",
    description:
      "Turn PDF pages into JPG images: choosing DPI, handling multipage files, keeping text legible, and knowing when PNG is the better output.",
    updated: "2026-10-29",
    readingMinutes: 5,
    keywords: [
      "pdf to jpg",
      "pdf to image",
      "pdf page to jpeg",
      "pdf dpi",
    ],
    lead:
      "A PDF does not contain pictures of pages — it contains instructions for drawing them. Converting to JPG means deciding how many pixels to spend on that drawing, and that single number decides whether the output is a sharp document or an unreadable smudge.",
    blocks: [
      {
        heading: "Rendering, not extracting",
        paragraphs: [
          "When a PDF is converted to an image, a renderer executes the page's drawing commands — text, vector shapes, embedded images — into a pixel grid at the requested resolution. Text stops being text: it becomes pixels, so the output cannot be selected, searched or read by a screen reader, and it is no longer accessible. That is the real cost of the conversion, not file size.",
          "The exception is a PDF that is only a wrapper around a scanned photo. In that case the page is already one big image and there is nothing meaningful to rasterise, so the result looks the same at any resolution as long as you do not exceed the original. Most PDFs, though, are a mix of vector text and images, and they need enough pixels for the text to resolve.",
        ],
      },
      {
        heading: "Choosing a resolution",
        paragraphs: [
          "For reading on a screen, 150 DPI at the page's physical size is usually enough: an A4 page becomes about 1240 by 1754 pixels, comfortable on a laptop and legible when zoomed. For printing, or for any output that will be re-inserted into a document, 300 DPI is the safe default and gives roughly 2480 by 3508 pixels per A4 page. Going to 600 DPI is only worth it for line art, maps or text you intend to crop hard, and it multiplies the file size by four for a gain most eyes cannot see.",
          "There is a trap above 300 DPI: a page containing a low-resolution embedded photo does not gain detail from a higher render setting. The text gets crisper, the photo stays exactly as soft as it was, and the JPG around it gets larger. If the goal is to recover an image from inside a PDF, rendering the page is the wrong approach — the embedded image should be extracted directly if the tool supports it.",
        ],
      },
      {
        heading: "Multipage files and naming",
        paragraphs: [
          "A multipage PDF becomes one image per page, not one long strip. That is convenient for presentations and awkward for documents: a 90-page report produces 90 files. Check whether the converter lets you select a page range first, and if not, expect to sort the output afterwards. Page numbers in filenames usually come from the renderer rather than the printed page number, so a document whose visible numbering starts at 1 on its fifth sheet will not line up.",
          "Colour is the other detail. A PDF intended for print may carry CMYK colours and an embedded output intent, and most renderers convert to sRGB when producing a JPG. Highly saturated brand colours can shift slightly, and very dark areas can lose separation. For screen use that is fine; for colour-critical proofs, keep the PDF and let the printer handle the conversion.",
        ],
      },
      {
        heading: "When JPG is the wrong output",
        paragraphs: [
          "If the page is mostly text on a white background, JPG's compression produces faint grey halos around every letter and slightly ragged edges at small sizes. PNG stores the same page losslessly and is often only modestly larger for flat documents, so it is the better choice for screenshots of pages, forms and diagrams. Use JPG when the pages are photographic, when file size matters more than crispness, or when a platform rejects PNG.",
          "A practical compromise is to render to JPG at 200 to 300 DPI for photographs and to PNG for anything where text dominates, then compare a 100 percent crop of a heading before converting the whole file. One look at a letter edge tells you more than any general rule.",
        ],
      },
    ],
    related: [
      { from: "pdf", to: "jpg" },
      { from: "pdf", to: "png" },
      { from: "pdf", to: "docx" },
      { from: "pdf", to: "txt" },
      { from: "jpg", to: "pdf" },
    ],
    relatedFormats: ["pdf", "jpg", "png"],
    faqs: [
      {
        question: "What DPI should I use for PDF to JPG?",
        answer:
          "150 DPI for screen reading, 300 DPI for printing or documents that will be edited further. Higher settings only add pixels, not detail.",
      },
      {
        question: "Can I convert only one page of a PDF?",
        answer:
          "Yes, if the converter supports a page range. Otherwise every page is rendered and you delete the ones you do not need.",
      },
      {
        question: "Does PDF to JPG keep the text searchable?",
        answer:
          "No. The text becomes pixels, so it cannot be selected, searched or read aloud. Keep the PDF if that matters.",
      },
    ],
  },
  {
    slug: "ppt-to-pdf-guide",
    title: "PowerPoint to PDF: Keeping Slides Intact on Someone Else's Machine",
    description:
      "Why PowerPoint to PDF changes fonts, animations and video, how to prepare slides for a fixed layout, and when PDF is the wrong format to send.",
    updated: "2026-10-29",
    readingMinutes: 6,
    keywords: [
      "ppt to pdf",
      "powerpoint to pdf",
      "pptx pdf fonts",
      "slides pdf export",
    ],
    lead:
      "Sending a .pptx is asking the recipient to have the right fonts, the right PowerPoint version and the right screen. A PDF removes that uncertainty by fixing every slide into a page — but it also fixes the animations, which is usually the point and occasionally the problem.",
    blocks: [
      {
        heading: "What a PDF actually preserves",
        paragraphs: [
          "Each slide becomes one page with the same dimensions as the slide, so a 16:9 deck becomes a wide page rather than a sheet of A4. Text, shapes, images and charts are rendered as they appear in the editor, which is why a PDF is the reliable way to share a deck: what you saw is what they see. Comments, revision history and the editing structure are not part of that rendering and do not travel.",
          "Anything that depends on time disappears. Transitions, entrance animations and auto-advancing builds are flattened into their final state, which means a slide that revealed one bullet at a time becomes a slide with all the bullets visible at once. If the build was part of the explanation, a PDF loses the argument even though it keeps the words.",
        ],
      },
      {
        heading: "Fonts and the substitution problem",
        paragraphs: [
          "The most common visible defect is a font change. If the deck uses a font that is not embedded or not available to the converter, a substitute with different metrics takes its place, and text that fitted neatly in a box now wraps to a second line or spills outside it. The usual symptoms are a title that suddenly runs onto two lines, a caption overlapping a diagram, or a table column that collapses.",
          "Before converting, either embed the fonts or switch to a font that is guaranteed to be present, then look at the slides that are tightest on space. Bold and italic variants are the ones most often missing in a substitute, so headings are the first place to check. If you cannot embed, exporting to images first tells you immediately whether the layout survived, at the cost of making the text unselectable.",
        ],
      },
      {
        heading: "Media, links and speaker notes",
        paragraphs: [
          "Embedded video and audio do not survive as playable media. A PDF can link to a file, but it will not carry the video inside the page in a way a reader expects, and the poster frame is usually what remains. If the deck depends on a clip, send the video alongside or host it and link to it; do not assume the PDF is self-contained.",
          "Hyperlinks generally survive as clickable annotations, including links to other slides — those become internal jumps between pages, which is one of the nicer properties of a PDF deck. Speaker notes, on the other hand, usually do not appear in the exported pages. Some exporters can include them as notes pages or an appendix; if the notes are the handout, check that option rather than discovering afterwards that a 30-slide deck exported as 30 pages of slides only.",
        ],
      },
      {
        heading: "When to send the deck instead",
        paragraphs: [
          "A PDF is the right deliverable for a finished presentation: a pitch, a report, a conference deck, anything that will be read rather than edited. It is the wrong deliverable when the recipient needs to change the content, reuse a slide, or present with the animations intact. In that case send the .pptx and accept the compatibility risk, or send both and say which one to open.",
          "For printing, check the page size and orientation rather than assuming A4. A 16:9 slide printed on A4 portrait leaves large white bands, and a dark slide consumes a great deal of toner. Many exporters offer a handout layout with several slides per page plus lines for notes, which is usually a better artefact for a meeting than one full page per slide.",
        ],
      },
    ],
    related: [
      { from: "pptx", to: "pdf" },
      { from: "pptx", to: "png" },
      { from: "pptx", to: "jpg" },
      { from: "pptx", to: "html" },
      { from: "odp", to: "pptx" },
      { from: "pptx", to: "txt" },
    ],
    relatedFormats: ["pptx", "pdf", "png", "odp"],
    faqs: [
      {
        question: "Does PowerPoint to PDF keep animations?",
        answer:
          "No. Each slide is rendered in its final state, so builds and transitions are flattened into a single static page.",
      },
      {
        question: "Why did my fonts change in the PDF?",
        answer:
          "The font was not embedded or was unavailable to the converter, so a substitute with different spacing was used. Embed the fonts before exporting.",
      },
      {
        question: "Can I get speaker notes into the PDF?",
        answer:
          "Sometimes. Look for a notes-pages or handout export option; a plain slide export usually leaves the notes behind.",
      },
    ],
  },
  {
    slug: "xlsx-to-csv-guide",
    title: "Excel to CSV: What a Spreadsheet Loses on the Way to Plain Text",
    description:
      "Converting XLSX to CSV: one sheet only, formulas become values, date and number formats disappear, and how to keep encoding and leading zeros.",
    updated: "2026-10-29",
    readingMinutes: 6,
    keywords: [
      "xlsx to csv",
      "excel to csv",
      "csv encoding",
      "csv leading zeros",
    ],
    lead:
      "CSV is the lowest common denominator of tabular data, and that is exactly its value: every tool can read it. The cost is that almost everything a spreadsheet knows beyond the raw values is left behind, and most of the surprises after conversion come from that gap.",
    blocks: [
      {
        heading: "One file, one sheet",
        paragraphs: [
          "A workbook can hold dozens of sheets; a CSV holds one table. There is no place in the format to say that a second table follows, because a CSV is defined as rows of fields separated by a delimiter. A converter therefore has to choose: export the first sheet, the active sheet, or ask you which one. Silent first-sheet export is the usual behaviour and the usual source of a file that looks truncated.",
          "If you need several sheets, export them as separate CSV files and name them by sheet, or use a format that can hold multiple tables. Excel's own xlsx is a zip of XML; ODS works similarly; Parquet can hold a schema and multiple columns efficiently. CSV is for feeding one table into one import step, not for archiving a workbook.",
        ],
      },
      {
        heading: "Formulas and formatting do not travel",
        paragraphs: [
          "A CSV stores the displayed value, not the formula that produced it. That is normally what you want for an import, since the receiving system cannot recalculate a formula it does not have. The trap is that the displayed value depends on formatting: a cell showing 12.30 percent might export as 0.123, and a cell showing 1,234.50 might export as 1234.5. Currency symbols are display formatting and disappear, so the receiving system has no idea what the number means.",
          "Dates are worse. A spreadsheet stores a date as a serial number with a format applied, and CSV export often writes either the serial number or a locale-formatted string such as 03/04/2026, which is ambiguous to half the world. If the destination expects ISO dates, format the column as yyyy-mm-dd before exporting, or convert afterwards. The same applies to percentages and to numbers stored as text.",
        ],
      },
      {
        heading: "Encoding, delimiters and the Excel trap",
        paragraphs: [
          "CSV has no declared encoding, so the reader has to guess. UTF-8 is the correct default, but Excel on Windows will misread a plain UTF-8 file containing accented characters or non-Latin scripts unless it sees a byte-order mark. Writing UTF-8 with a BOM fixes Excel at the cost of confusing some strict parsers, which may treat the BOM as part of the first header name. Know which consumer you are feeding.",
          "The delimiter is the other portability problem. Comma is standard, but locales where the decimal separator is a comma often export with semicolons so the two do not collide. If your values contain commas, the fields must be quoted, and if they contain quotes those must be doubled. A correctly escaped CSV is unambiguous; a hand-edited one usually is not. For values that are only tab-separated, TSV avoids the quoting mess entirely, which is why data tools often prefer it.",
        ],
      },
      {
        heading: "The leading-zero and large-number problem",
        paragraphs: [
          "Postcodes, phone numbers, account numbers and product codes are identifiers, not quantities, but a CSV has no types. A value like 01234 is written faithfully, and then a reader that infers types turns it into 1234 and destroys the identifier. Large integers suffer the same way: a 19-digit ID exceeds the precision of a double and comes back rounded. The usual defence is to keep the column as text in the source and, where the reader allows it, declare the column as text on import.",
          "Scientific notation is the visible symptom of this. If a part number appears as 1.23E+18, it has already been parsed as a number and the original digits are gone. Fix it at the export stage by prefixing or quoting, not by editing the CSV in a spreadsheet that will re-corrupt it on save.",
        ],
      },
    ],
    related: [
      { from: "xlsx", to: "csv" },
      { from: "csv", to: "xlsx" },
      { from: "xlsx", to: "json" },
      { from: "xlsx", to: "tsv" },
      { from: "xlsx", to: "pdf" },
      { from: "csv", to: "json" },
    ],
    relatedFormats: ["xlsx", "csv", "tsv", "json", "ods"],
    faqs: [
      {
        question: "Why does my CSV only contain one sheet?",
        answer:
          "The CSV format holds a single table. Export each sheet separately, or use XLSX, ODS or Parquet when you need more than one.",
      },
      {
        question: "How do I stop Excel removing leading zeros from a CSV?",
        answer:
          "There is no type information in CSV, so the reader guesses. Import the column explicitly as text, or keep the original file and convert to a typed format instead.",
      },
      {
        question: "Do formulas survive XLSX to CSV?",
        answer:
          "No. You get the computed value as text, which is what an import needs. Recalculate in the spreadsheet before exporting if the values are stale.",
      },
    ],
  },
  {
    slug: "svg-to-png-guide",
    title: "SVG to PNG: Rasterising Vector Art Without Soft Edges",
    description:
      "How SVG to PNG conversion works, how to choose the output size, and why fonts, filters and external assets are the usual reasons a render looks wrong.",
    updated: "2026-10-29",
    readingMinutes: 5,
    keywords: [
      "svg to png",
      "convert svg to png",
      "svg rasterize",
      "svg export size",
    ],
    lead:
      "An SVG is a set of drawing instructions: lines, curves, fills and text at coordinates, with no fixed resolution. Converting it to PNG means choosing how many pixels to draw those instructions into, and every problem people report with the result traces back to that choice or to something the SVG referenced but did not contain.",
    blocks: [
      {
        heading: "Vector in, raster out",
        paragraphs: [
          "The conversion is one-way in the useful sense: a PNG can never be turned back into a clean SVG, because the shape information is gone once it becomes pixels. That makes the output size the most important setting. Export at the largest size you will ever need and scale down from there; exporting at 200 pixels and enlarging later gives you a blurry icon, which is the exact problem SVG existed to avoid.",
          "A reasonable target is the CSS pixel size multiplied by two or three, which covers high-density screens. A logo displayed at 240 by 80 CSS pixels should be exported around 720 by 240 so it stays sharp on a phone and in a retina browser. For print, work backwards from the physical size at 300 DPI instead.",
        ],
      },
      {
        heading: "Fonts are the first thing to break",
        paragraphs: [
          "Text in an SVG is still text: it names a font family and the renderer picks one. If that font is not installed on the machine doing the conversion, a substitute with different widths is used, and text that fitted inside a badge now overflows it or sits off-centre. This is the single most common cause of an SVG that looked fine in the browser and wrong in the exported PNG.",
          "The robust fix is to convert text to paths in the design tool before export. The shapes then carry the letterforms themselves and no font is needed. The trade-off is that the text stops being editable and stops being readable by search engines or assistive technology, so keep an editable SVG with live text as the master and use the outlined version only for rasterising.",
        ],
      },
      {
        heading: "External references and effects",
        paragraphs: [
          "An SVG can point at things outside itself: a linked stylesheet, an external font file, an image by URL, a filter defined in another document. Browsers may resolve those references when the file is served from the same origin, but a converter working on a standalone file has nothing to resolve them against. The result renders with missing fills, default black, or no image where a picture should be. If the SVG was exported by a design tool, check for an option to embed images and inline CSS.",
          "Filters and blend modes are the other fragile area. Blur, drop shadows and complex masks are specified but implemented inconsistently, and some renderers silently ignore them. If a shadow is missing in the PNG, the file is not corrupt; the renderer did not support that effect. Flattening effects in the design tool before export gives a predictable result.",
        ],
      },
      {
        heading: "Background and colour",
        paragraphs: [
          "PNG supports transparency, so an SVG with no background exports with a transparent background by default. That is usually right for a logo and wrong for anything that assumes white, such as a document thumbnail. Decide explicitly: transparent for assets that will be composited, a solid colour for images that will be viewed on their own. Some converters add white silently, which is worth checking rather than assuming.",
          "Colour profiles are usually not carried through the conversion. An SVG with a wide-gamut colour will be rendered into sRGB, and very saturated values can shift slightly. For brand assets, compare a rendered PNG against the source before shipping it, and keep the SVG as the canonical file so the PNG can always be regenerated at a new size.",
        ],
      },
    ],
    related: [
      { from: "svg", to: "png" },
      { from: "svg", to: "jpg" },
      { from: "svg", to: "pdf" },
      { from: "png", to: "svg" },
      { from: "jpg", to: "svg" },
      { from: "webp", to: "svg" },
    ],
    relatedFormats: ["svg", "png", "jpg", "pdf"],
    faqs: [
      {
        question: "What size should I export an SVG to PNG?",
        answer:
          "Two to three times the CSS display size for screens, or the physical size at 300 DPI for print. Export large and scale down.",
      },
      {
        question: "Why did the text change in my PNG?",
        answer:
          "The SVG names a font that the converter did not have, so a substitute was used. Convert text to paths before export to avoid it.",
      },
      {
        question: "Can I convert a PNG back to SVG?",
        answer:
          "Only as a traced approximation. The original shapes and editability are not recoverable from pixels.",
      },
    ],
  },
  {
    slug: "audio-formats-mp3-wav-flac",
    title: "MP3 vs WAV vs FLAC: Choosing an Audio Format That Fits the Job",
    description:
      "When to use MP3, WAV, FLAC, AAC or OGG, what bitrate and sample rate actually buy you, and why converting lossy audio to lossless is pointless.",
    updated: "2026-10-29",
    readingMinutes: 6,
    keywords: [
      "mp3 vs wav",
      "flac vs mp3",
      "audio format comparison",
      "audio bitrate guide",
    ],
    lead:
      "Audio formats split into two jobs: keeping a recording intact, and delivering it small enough to stream. Choosing the wrong side of that line costs either storage or quality, and the conversion you cannot undo is the one that throws quality away.",
    blocks: [
      {
        heading: "Lossless and lossy, in audio terms",
        paragraphs: [
          "WAV is not really a compression format. It is a container that usually holds uncompressed PCM samples, which is why a WAV is large: every sample of every channel is stored at full precision. It is the working format of recording, editing and interchange, because every tool reads it and nothing is lost. FLAC compresses those same samples losslessly, typically halving the size, and decodes back to bit-identical audio. It is the right archive format when you want to keep everything without keeping a huge file.",
          "MP3, AAC, OGG Vorbis and Opus are lossy. They discard information the ear is unlikely to miss, using psychoacoustic models, and the result is typically a tenth of the WAV size. The detail is gone for good; decoding an MP3 to WAV produces a large file that contains exactly the same limited information. That asymmetry is the single most important fact about audio conversion.",
        ],
      },
      {
        heading: "What bitrate and sample rate actually buy",
        paragraphs: [
          "At 128 kbps, an MP3 is acceptable for speech and background listening and audibly imperfect on cymbals, strings and complex mixes. At 192 kbps most listeners cannot tell it from the source on ordinary equipment. At 256 to 320 kbps the difference is inaudible to nearly everyone, and the file is still a fraction of WAV. The curve flattens: going from 128 to 192 buys a lot, 192 to 320 buys very little. For spoken word, a mono file at 64 to 96 kbps is entirely adequate and halves the size again.",
          "Sample rate matters differently. 44.1 kHz covers the full range of human hearing; 48 kHz is the video and broadcast standard; higher rates exist for production headroom, not for delivery. Downsampling 96 kHz to 44.1 kHz is a real conversion that needs proper filtering, and it is the one place where a careless converter can introduce audible artefacts. Bit depth is about dynamic range: 16-bit is CD standard, 24-bit is for recording and editing, and converting 24-bit to 16-bit requires dithering to avoid quantisation distortion in quiet passages.",
        ],
      },
      {
        heading: "Matching the format to the destination",
        paragraphs: [
          "For a podcast, MP3 at 96 to 128 kbps mono or 192 kbps stereo is universally playable and small. For music distribution, the platform will specify its preferred format, often WAV or FLAC for masters and AAC for streaming. For a website, MP3 remains the safest single source, though Opus and AAC give better quality at the same bitrate where the browser supports them. For video editing, keep WAV or FLAC until the final export, because every lossy generation accumulates.",
          "Phone and voice recordings add a wrinkle: they are often mono, low sample rate and already compressed. Converting one to a high-bitrate stereo MP3 cannot restore anything, and it triples the size. Check the source properties before choosing output settings, and match them rather than exceeding them.",
        ],
      },
      {
        heading: "Conversions you should refuse to make",
        paragraphs: [
          "Do not convert MP3 to FLAC expecting better sound, and do not convert it to WAV expecting a master. Both produce larger files containing the same lossy audio, and the FLAC or WAV label then misleads whoever receives it into thinking they have an original. The only way to regain quality is to go back to a lossless source, if one exists.",
          "Do not chain lossy conversions either. MP3 to AAC, or AAC to MP3, applies the model twice and the second pass spends its bits encoding the artefacts of the first. Convert once, from the best source you have, to the format the destination needs. If you must change container without re-encoding, that is a remux, and it preserves the audio exactly — but it only works when the codec is already supported by the target container.",
        ],
      },
    ],
    related: [
      { from: "wav", to: "mp3" },
      { from: "mp3", to: "wav" },
      { from: "flac", to: "mp3" },
      { from: "mp3", to: "flac" },
      { from: "aac", to: "mp3" },
      { from: "ogg", to: "mp3" },
    ],
    relatedFormats: ["mp3", "wav", "flac", "ogg", "aac"],
    faqs: [
      {
        question: "Is WAV better quality than MP3?",
        answer:
          "A WAV from a lossless source contains everything; an MP3 has discarded detail. But converting an MP3 to WAV does not restore that detail.",
      },
      {
        question: "What bitrate is good enough for music?",
        answer:
          "192 kbps is transparent to most listeners on normal equipment; 256 to 320 kbps leaves a margin. Below 128 kbps artefacts become easy to hear.",
      },
      {
        question: "Should I use FLAC or WAV for archiving?",
        answer:
          "FLAC, unless a tool requires uncompressed PCM. It is lossless, roughly half the size, and carries tags that WAV handles poorly.",
      },
    ],
  },
  {
    slug: "favicon-ico-guide",
    title: "Favicons and App Icons: Making an ICO That Every Browser Displays",
    description:
      "What an ICO file really contains, which sizes browsers and phones ask for, and why a favicon that looks fine in the tab is unreadable on a bookmark bar.",
    updated: "2026-10-29",
    readingMinutes: 5,
    keywords: [
      "png to ico",
      "favicon sizes",
      "create favicon",
      "apple touch icon",
    ],
    lead:
      "A favicon is the smallest design asset on a site and one of the few that appears on every page. It is also the one most often produced by shrinking a logo until it becomes an unrecognisable smudge, because the format and the sizes are misunderstood.",
    blocks: [
      {
        heading: "An ICO is a container, not an image",
        paragraphs: [
          "The .ico format is a small archive of images at different sizes, each possibly stored as a PNG or as a BMP with an alpha mask. That is its advantage over a plain PNG: the browser can pick the 16-pixel version for a tab and the 48-pixel version for a bookmark list, each drawn at its native size instead of scaled from one master. A modern ICO typically carries 16, 32 and 48 pixel entries.",
          "If you supply only a PNG, most browsers will scale it and the result depends on their scaler. A 512-pixel PNG scaled down to 16 pixels loses thin strokes and fine detail; a hand-tuned 16-pixel entry stays legible because it was drawn for that size. This is why the best favicons are not simple downscales.",
        ],
      },
      {
        heading: "The sizes that actually get requested",
        paragraphs: [
          "Browsers ask for 16 and 32 pixels for tabs, and 48 for some bookmark and history views. Windows shortcut icons use 48 and 256. iOS uses a 180-pixel Apple touch icon, Android uses 192 and 512 for the home screen and splash, and web app manifests want 192 and 512 with a purpose declaration. A single ICO with 16, 32 and 48 plus a 180 PNG and two manifest PNGs covers essentially everything.",
          "Serving the right size matters for more than looks. A browser asked for a 16-pixel icon and given a 512-pixel one must decode and downscale it, which costs work on every tab and can produce a blurry result on displays without good filtering. Small files also mean the favicon request does not compete with the page for bandwidth on a slow connection.",
        ],
      },
      {
        heading: "Designing for 16 pixels",
        paragraphs: [
          "At 16 pixels there is no room for text, gradients or thin outlines. A single strong shape with high contrast against both light and dark browser chrome is the only reliable approach. Detailed logos should be simplified for the favicon: drop the wordmark, thicken the strokes, increase the padding slightly so the shape is not clipped by the rounded tab, and check the result at actual size rather than at 400 percent.",
          "Test on both a light and a dark tab bar. A dark logo on transparency disappears in dark mode; a light logo on transparency disappears in light mode. The usual fix is a filled background shape behind the mark, or two variants selected by a media query, which most modern browsers support through the manifest or a prefers-color-scheme link.",
        ],
      },
      {
        heading: "Caching, and why your new icon does not show",
        paragraphs: [
          "Browsers cache favicons aggressively, often beyond normal cache headers, and some store them per profile in a way that survives a hard refresh. After deploying a new icon you may see the old one for hours or days. The reliable trick is to change the filename, for example from favicon.ico to favicon-v2.ico, and update the link tags, because a new URL has no cached entry.",
          "Also check that the file is actually being served at the root path the browser probes automatically, and that the server returns the correct content type. A 404 at /favicon.ico, or an HTML error page served with a 200, is a common reason a valid icon never appears. Declaring the icon explicitly in the page head removes the guesswork.",
        ],
      },
    ],
    related: [
      { from: "png", to: "ico" },
      { from: "jpg", to: "ico" },
      { from: "ico", to: "png" },
      { from: "ico", to: "jpg" },
    ],
    relatedFormats: ["ico", "png", "jpg", "svg"],
    faqs: [
      {
        question: "What sizes should a favicon ICO contain?",
        answer:
          "At minimum 16, 32 and 48 pixels. Add a 180-pixel PNG for iOS and 192 and 512 pixel PNGs for Android and the web app manifest.",
      },
      {
        question: "Can I use a PNG as a favicon?",
        answer:
          "Yes, and modern browsers accept it, but an ICO with hand-tuned small sizes usually looks sharper in a tab.",
      },
      {
        question: "Why is my old favicon still showing?",
        answer:
          "It is cached by the browser, sometimes persistently. Serve the new icon from a new filename and update the link tags.",
      },
    ],
  },
  {
    slug: "mov-to-mp4-guide",
    title: "MOV to MP4: Making iPhone and Mac Video Play Everywhere",
    description:
      "Why MOV files fail on Windows, Android and the web, when a MOV to MP4 conversion can copy the video untouched, and when it must re-encode.",
    updated: "2026-10-29",
    readingMinutes: 6,
    keywords: [
      "mov to mp4",
      "iphone video format",
      "quicktime mp4",
      "hevc to h264",
    ],
    lead:
      "A video that plays perfectly on the iPhone that recorded it and shows a black frame everywhere else is almost always a MOV problem. The fix is usually a container change that costs no quality at all — if the codec inside is one the destination understands.",
    blocks: [
      {
        heading: "Container and codec are two different things",
        paragraphs: [
          "MOV is Apple's QuickTime container and MP4 is the ISO base media container. They are close relatives, and both can hold H.264 or HEVC video with AAC audio. That is why a MOV recorded with H.264 can often be rewrapped into an MP4 with the video and audio streams copied byte for byte: no decoding, no re-encoding, no generation loss, and the conversion finishes in seconds even for a large file.",
          "When people say a MOV will not play, the codec is frequently the real culprit. Newer iPhones record HEVC by default, and HEVC inside a MOV will not play on many Windows machines, Android devices or browsers even after the container is changed to MP4. In that case the video must be decoded and re-encoded to H.264, which is slower and costs one generation of quality.",
        ],
      },
      {
        heading: "How to tell which case you are in",
        paragraphs: [
          "Check the codec before converting. On a Mac, the Finder's information panel or QuickTime's inspector shows it; on Windows, the file's properties do; command-line tools such as ffprobe report it directly. If the video is H.264, choose a converter that copies the streams. If it is HEVC or ProRes, expect a real re-encode and budget time accordingly — ProRes in particular produces very large intermediates and takes a while to decode.",
          "The audio matters too. QuickTime can carry uncompressed or unusual audio that MP4 players reject, and a stream copy that includes incompatible audio produces a file that opens but has no sound. Converting the audio to AAC while copying the video is a good compromise: the video stays untouched and the audio loss is inaudible.",
        ],
      },
      {
        heading: "What re-encoding costs, and how to keep it small",
        paragraphs: [
          "A re-encode applies lossy compression to an already compressed source. At a generous bitrate the difference is hard to see; at a low one the artefacts of the first encode get compressed again and the result looks worse than either input. Set the output bitrate close to the source's, or use a quality-based setting that targets visual quality rather than a fixed size.",
          "Watch the resolution as well. A 4K phone video re-encoded at 1080p is a deliberate, often sensible reduction for sharing, but it is irreversible. Keep the original MOV as the master, and treat the MP4 as the delivery copy. The same applies to frame rate: 60 fps to 30 fps halves the data and changes the look of motion, so only do it when the destination or file size demands it.",
        ],
      },
      {
        heading: "Rotation, metadata and the web",
        paragraphs: [
          "Phone video often carries a rotation matrix rather than being physically rotated. A converter that drops the metadata produces a video that plays sideways, which looks like a bug in the player. Most modern tools apply the rotation during re-encode and preserve it during a remux, but it is worth checking the first frames of the output rather than assuming.",
          "For the web, the container change alone is not enough: a video served for progressive playback should have its index at the front of the file so the browser can start before the download finishes. If a page shows a spinner until the whole clip is fetched, the file is fine and its layout is not. Also confirm the audio track survived; a silent video on a website is a common and quiet failure.",
        ],
      },
    ],
    related: [
      { from: "mov", to: "mp4" },
      { from: "mp4", to: "mov" },
      { from: "mov", to: "mp3" },
      { from: "mov", to: "avi" },
      { from: "m4v", to: "mp4" },
      { from: "mkv", to: "mp4" },
    ],
    relatedFormats: ["mov", "mp4", "m4v", "mp3"],
    faqs: [
      {
        question: "Does MOV to MP4 reduce quality?",
        answer:
          "Not if the H.264 video stream is copied into the new container. It does if the codec has to change, for example HEVC to H.264.",
      },
      {
        question: "Why won't my iPhone video play on Windows?",
        answer:
          "It is probably HEVC in a MOV container. Convert to MP4 with H.264 video and AAC audio for the widest support.",
      },
      {
        question: "How do I keep the original quality?",
        answer:
          "Use a stream-copy conversion when the codec is already H.264, and keep the original MOV as your master either way.",
      },
    ],
  },
  {
    slug: "epub-vs-pdf-ebooks-guide",
    title: "EPUB vs PDF: Which eBook Format to Convert To, and What Breaks",
    description:
      "EPUB reflows and PDF does not. What each format preserves, why PDF to EPUB conversion is approximate, and which one to send to readers.",
    updated: "2026-10-29",
    readingMinutes: 6,
    keywords: [
      "epub vs pdf",
      "pdf to epub",
      "ebook format",
      "convert ebook",
    ],
    lead:
      "EPUB and PDF solve opposite problems. One describes a document that should reflow to fit any screen; the other describes a page that should look identical everywhere. Converting between them is less a format change than a change of intent, and that is why results vary so much.",
    blocks: [
      {
        heading: "Reflowable versus fixed layout",
        paragraphs: [
          "An EPUB is a zip of HTML, CSS and assets with a manifest. The text is text, so the reader controls font size, typeface, margins and line spacing, and the content reflows to the screen. That is ideal for novels, essays and anything read linearly on a phone, and it is what accessibility tools depend on. It also means the author cannot control exactly where a page breaks or how a line falls.",
          "A PDF is a fixed page. Every element has a coordinate and a size, so a two-column layout with captions, sidebars and precise typography looks the same on every device. That is ideal for manuals, textbooks, reports and anything where layout carries meaning. The cost is that reading a fixed A4 page on a phone means zooming and panning, and text extraction depends on how the PDF was produced.",
        ],
      },
      {
        heading: "Why PDF to EPUB is approximate",
        paragraphs: [
          "A PDF does not know what a paragraph is. It knows where glyphs were drawn. A converter has to infer structure from positions: lines close together form a paragraph, a short line followed by a gap may be a heading, a repeated footer must be removed. When the inference is right the result reads well; when it is wrong you get broken sentences, headings buried in body text, and page numbers scattered through the prose.",
          "Images are extracted as separate files and may lose their position relative to the text, tables often collapse into unreadable sequences of cells, and multi-column layouts are the hardest case. Scanned PDFs are worse still: there is no text at all, only pictures of words, so conversion produces either images of pages or garbage unless OCR runs first. Expect to proofread and repair, and do not promise a clean automatic result.",
        ],
      },
      {
        heading: "What survives an EPUB to PDF conversion",
        paragraphs: [
          "This direction is more predictable. The EPUB's HTML is rendered to pages, so the text, images and basic formatting come through, but the reader-controlled settings are frozen at whatever the renderer chose. Font size, page size and margins become fixed, and a book that looked comfortable on a phone may end up with very wide lines on A4 unless the page size is set sensibly.",
          "Fonts referenced by the EPUB but not embedded in it will be substituted, which can change line breaks. Fixed-layout EPUBs, used for comics and children's books, convert much more faithfully because they already specify positions. Reflowable books with complex tables or code blocks are where the layout tends to suffer.",
          "Also check for DRM. A protected EPUB cannot be converted by an ordinary tool, and the failure usually surfaces as an unreadable or empty output rather than a clear message. Only convert files you have the right to use.",
        ],
      },
      {
        heading: "Choosing the format to distribute",
        paragraphs: [
          "Send EPUB to people who will read on a phone, a tablet or a dedicated e-reader: the text scales, the file is small, and the reading experience is what those devices are built for. Send PDF when the layout is the message, when the document will be printed, or when the recipient needs a file that looks the same on every machine. Sending both is a legitimate answer and often the kindest one.",
          "When converting, keep the source. A PDF to EPUB conversion is a lossy interpretation of structure, not a reversible transformation, so going back rarely recovers the original layout. If the book is still being edited, work from the original manuscript format — DOCX, Markdown or HTML — and generate both outputs from it rather than converting one output into the other.",
        ],
      },
    ],
    related: [
      { from: "epub", to: "pdf" },
      { from: "pdf", to: "epub" },
      { from: "mobi", to: "epub" },
      { from: "epub", to: "docx" },
      { from: "epub", to: "txt" },
      { from: "epub", to: "html" },
    ],
    relatedFormats: ["epub", "pdf", "mobi", "docx", "html"],
    faqs: [
      {
        question: "Should I publish my book as EPUB or PDF?",
        answer:
          "EPUB for reading on phones and e-readers, PDF when layout and printing matter. Offering both covers the common cases.",
      },
      {
        question: "Why is my PDF to EPUB conversion messy?",
        answer:
          "A PDF stores positions, not paragraphs, so structure has to be guessed. Multi-column layouts, tables and scanned pages are the usual failures.",
      },
      {
        question: "Does EPUB to PDF keep the formatting?",
        answer:
          "Text and images survive, but reader-controlled settings become fixed and missing fonts are substituted, which can shift line breaks.",
      },
    ],
  },
];

const bySlug = new Map(guides.map((g) => [g.slug, g]));

export function getGuide(slug: string): Guide | undefined {
  return bySlug.get(slug);
}

export function getGuideSlugs(): string[] {
  return guides.map((g) => g.slug);
}
