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
];

const bySlug = new Map(guides.map((g) => [g.slug, g]));

export function getGuide(slug: string): Guide | undefined {
  return bySlug.get(slug);
}

export function getGuideSlugs(): string[] {
  return guides.map((g) => g.slug);
}
