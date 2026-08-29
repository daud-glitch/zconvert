export type ViewType =
  | "converter"
  | "formats"
  | "history"
  | "bookmarks"
  | "profile"
  | "admin"
  | "admin-users"
  | "admin-settings";

export type FormatCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "data"
  | "archive"
  | "ebook"
  | "presentation"
  | "subtitle"
  | "font"
  | "other";

export interface FormatInfo {
  ext: string;
  name: string;
  description: string;
  category: FormatCategory;
  mimeTypes: string[];
  targetFormats: string[];
}

export const categoryMeta: Record<
  FormatCategory,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  image: {
    label: "Image",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-500",
    icon: "Image",
  },
  video: {
    label: "Video",
    color: "text-violet-700 dark:text-violet-400",
    bgColor: "bg-violet-500",
    icon: "Video",
  },
  audio: {
    label: "Audio",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-500",
    icon: "Music",
  },
  document: {
    label: "Document",
    color: "text-sky-700 dark:text-sky-400",
    bgColor: "bg-sky-500",
    icon: "FileText",
  },
  data: {
    label: "Data",
    color: "text-rose-700 dark:text-rose-400",
    bgColor: "bg-rose-500",
    icon: "Database",
  },
  archive: {
    label: "Archive",
    color: "text-slate-700 dark:text-slate-400",
    bgColor: "bg-slate-500",
    icon: "Archive",
  },
  ebook: {
    label: "Ebook",
    color: "text-teal-700 dark:text-teal-400",
    bgColor: "bg-teal-500",
    icon: "BookOpen",
  },
  presentation: {
    label: "Presentation",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-500",
    icon: "Layout",
  },
  subtitle: {
    label: "Subtitle",
    color: "text-cyan-700 dark:text-cyan-400",
    bgColor: "bg-cyan-500",
    icon: "Subtitles",
  },
  font: {
    label: "Font",
    color: "text-pink-700 dark:text-pink-400",
    bgColor: "bg-pink-500",
    icon: "Type",
  },
  other: {
    label: "Other",
    color: "text-gray-700 dark:text-gray-400",
    bgColor: "bg-gray-500",
    icon: "FileQuestion",
  },
};

// ─── Shared target arrays ────────────────────────────────────────────────────
/** Targets the image converter can actually produce (sharp / pdf-lib). */
const imgOutputSupported = [
  "avif",
  "bmp",
  "cur",
  "gif",
  "ico",
  "jpeg",
  "jpg",
  "pdf",
  "png",
  "svg",
  "tiff",
  "webp",
] as const;

const imgStandard = [...imgOutputSupported];

const imgAnimated = [...imgOutputSupported];

const imgNoSelf = (self: string, extras?: string[]) => {
  const set = new Set<string>(imgStandard);
  set.delete(self);
  if (extras) extras.forEach((e) => set.delete(e));
  return [...set].sort();
};

const imgNoSelfAnimated = (self: string, extras?: string[]) => {
  const set = new Set<string>(imgAnimated);
  set.delete(self);
  if (extras) extras.forEach((e) => set.delete(e));
  return [...set].sort();
};

// Document outputs the server can produce (text/PDF/Office/XML — not legacy .doc or spreadsheets)
const docOutputSupported = [
  "adoc",
  "csv",
  "doc",
  "docx",
  "epub",
  "html",
  "ipynb",
  "json",
  "md",
  "muse",
  "odt",
  "opml",
  "org",
  "pdf",
  "pptx",
  "rst",
  "rtf",
  "tex",
  "textile",
  "tsv",
  "txt",
  "xml",
  "yaml",
] as const;

const docStandard = [...docOutputSupported];

/** PDF → document + raster image targets (images use pdf-parse screenshots). */
const pdfOutputTargets = [
  "pdf",
  ...docOutputSupported.filter((f) => f !== "pdf"),
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "tiff",
] as const;

const docNoSelf = (self: string, extras?: string[]) => {
  const set = new Set<string>(docStandard);
  set.delete(self);
  if (extras) extras.forEach((e) => set.delete(e));
  return [...set].sort();
};

// Data outputs the server can produce (tabular/text/spreadsheet — not binary columnar DB formats)
const dataOutputSupported = [
  "csv",
  "env",
  "fwf",
  "geojson",
  "html",
  "ini",
  "json",
  "jsonl",
  "md",
  "ods",
  "pdf",
  "toml",
  "tsv",
  "txt",
  "xls",
  "xlsx",
  "xml",
  "yaml",
  "parquet",
] as const;

const dataStandard = [...dataOutputSupported];

/** Ebook text/document outputs. */
const ebookOutputSupported = [
  "adoc",
  "docx",
  "epub",
  "html",
  "ipynb",
  "md",
  "muse",
  "odt",
  "opml",
  "org",
  "pdf",
  "pptx",
  "rst",
  "rtf",
  "tex",
  "textile",
  "txt",
] as const;

const ebookNoSelf = (self: string) => {
  const set = new Set<string>(ebookOutputSupported);
  set.delete(self);
  return [...set].sort();
};

const dataNoSelf = (self: string, extras?: string[]) => {
  const set = new Set<string>(dataStandard);
  set.delete(self);
  if (extras) extras.forEach((e) => set.delete(e));
  return [...set].sort();
};

const subtitleAll = [
  "ass",
  "lrc",
  "mpl",
  "sbv",
  "srt",
  "ssa",
  "sub",
  "vtt",
] as const;

const subNoSelf = (self: string) =>
  subtitleAll.filter((ext) => ext !== self) as unknown as string[];

// Presentation outputs the server can produce
const presOutputSupported = [
  "html",
  "jpeg",
  "jpg",
  "odp",
  "pdf",
  "png",
  "pptx",
  "txt",
] as const;

const presStandard = [...presOutputSupported];

const presNoSelf = (self: string, extras?: string[]) => {
  const set = new Set<string>(presStandard);
  set.delete(self);
  if (extras) extras.forEach((e) => set.delete(e));
  return [...set].sort();
};

/** Archive outputs supported in-process (7z/rar/xz/zst need external tools). */
export const archiveOutputSupported = [
  "7z",
  "rar",
  "cbz",
  "tar",
  "tar.bz2",
  "tar.gz",
  "tar.xz",
  "tar.zst",
  "zip",
] as const;

export const archiveStandard = [...archiveOutputSupported];


const videoOutputSupported = [
  "mp4",
  "webm",
  "avi",
  "mkv",
  "mov",
  "wmv",
  "flv",
  "m4v",
  "mpeg",
  "mpg",
  "3gp",
  "ogv",
  "ts",
] as const;

const videoAudioExtractTargets = [
  "mp3",
  "wav",
  "aac",
  "m4a",
  "ogg",
  "opus",
  "flac",
] as const;

const videoTargets = (self: string) => {
  const outs = videoOutputSupported.filter((e) => e !== self);
  return [...outs, ...videoAudioExtractTargets].sort();
};

const archiveNoSelf = (self: string) => {
  const set = new Set<string>(archiveStandard);
  set.delete(self);
  return [...set].sort();
};

const allFormats: FormatInfo[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // Images
  // ═══════════════════════════════════════════════════════════════════════════
  {
    ext: "apng",
    name: "APNG",
    description:
      "APNG (Animated Portable Network Graphics) is an extension of the PNG format that supports frame-by-frame animation, created as a superior alternative to GIF. It offers full 24-bit color and 8-bit alpha transparency per frame, producing smooth, high-quality animations. APNG files are widely supported in modern browsers and are ideal for animated icons, stickers, and lightweight web animations.",
    category: "image",
    mimeTypes: ["image/apng"],
    targetFormats: imgNoSelfAnimated("apng"),
  },
  {
    ext: "avif",
    name: "AVIF",
    description:
      "AVIF (AV1 Image File Format) is a modern image format based on the AV1 video codec developed by the Alliance for Open Media. It delivers superior compression efficiency compared to JPEG and PNG, often reducing file sizes by 50% or more while maintaining excellent visual quality. AVIF supports HDR, wide color gamut, and transparency, making it an ideal choice for the modern web.",
    category: "image",
    mimeTypes: ["image/avif"],
    targetFormats: imgNoSelf("avif"),
  },
  {
    ext: "blp",
    name: "BLP",
    description:
      "BLP is a proprietary texture format developed by Blizzard Entertainment, used primarily in games such as World of Warcraft and StarCraft II. It supports various GPU-friendly compression modes optimized for real-time rendering in game engines. BLP files can store mipmaps and are typically not used outside of Blizzard's gaming ecosystem.",
    category: "image",
    mimeTypes: ["image/x-blp"],
    targetFormats: imgNoSelf("blp"),
  },
  {
    ext: "bmp",
    name: "BMP",
    description:
      "BMP (Bitmap) is one of the oldest raster image formats, developed by Microsoft for the Windows operating system. It stores pixel data in an uncompressed or minimally compressed form, resulting in large file sizes but perfect lossless quality. BMP is widely supported across Windows applications and is commonly used as an intermediate format in image processing workflows.",
    category: "image",
    mimeTypes: ["image/bmp", "image/x-bmp"],
    targetFormats: imgNoSelf("bmp"),
  },
  {
    ext: "cur",
    name: "CUR",
    description:
      "CUR is the Windows cursor file format used to store static mouse cursor images for the operating system. It shares the same internal structure as the ICO format and supports multiple sizes and color depths within a single file. CUR files define the appearance of mouse pointers in Windows applications and throughout the OS shell.",
    category: "image",
    mimeTypes: ["image/x-win-bitmap"],
    targetFormats: imgNoSelf("cur"),
  },
  {
    ext: "dcx",
    name: "DCX",
    description:
      "DCX is a multi-page extension of the PCX image format, originally developed to support fax transmission of multiple pages within a single file. Each page is stored as a separate PCX image inside the DCX container. DCX was popular in the early 1990s for storing scanned fax documents but has since been largely superseded by formats like PDF and TIFF.",
    category: "image",
    mimeTypes: ["image/x-dcx"],
    targetFormats: imgNoSelfAnimated("dcx"),
  },
  {
    ext: "dds",
    name: "DDS",
    description:
      "DDS (DirectDraw Surface) is a raster image format developed by Microsoft for use with Direct3D and DirectX applications. It supports GPU-native texture compression formats such as DXT/BC, mipmaps, and cube maps, making it ideal for 3D game textures and real-time environments. DDS files can be loaded directly by the GPU without decompression, enabling fast real-time rendering in games and interactive applications.",
    category: "image",
    mimeTypes: ["image/vnd-ms.dds"],
    targetFormats: imgNoSelf("dds"),
  },
  {
    ext: "dib",
    name: "DIB",
    description:
      "DIB (Device Independent Bitmap) is a variant of the BMP format designed to ensure consistent rendering across different display devices and color depths. Unlike the older device-dependent bitmap, DIB includes a color table and stores image data in a device-agnostic way. It is primarily used internally by Windows GDI (Graphics Device Interface) for drawing and printing operations.",
    category: "image",
    mimeTypes: ["image/bmp"],
    targetFormats: imgNoSelf("dib"),
  },
  {
    ext: "eps",
    name: "EPS",
    description:
      "EPS (Encapsulated PostScript) is a vector graphics file format based on Adobe's PostScript page description language. It can contain both vector graphics and embedded raster images, making it a staple in professional publishing and print workflows. EPS files are resolution-independent and are widely supported by design applications such as Adobe Illustrator and CorelDRAW.",
    category: "image",
    mimeTypes: ["application/postscript"],
    targetFormats: (() => {
      const set = new Set<string>(imgStandard);
      set.add("svg");
      set.delete("eps");
      return [...set].sort();
    })(),
  },
  {
    ext: "fli",
    name: "FLI",
    description:
      "FLI is an early animation format created by Autodesk for their Animator software in the late 1980s. It stores frame-by-frame animation data using delta compression, recording only the pixels that change between frames to reduce file size. FLI was popular for creating simple animations on DOS-based systems but is rarely used in modern workflows.",
    category: "image",
    mimeTypes: ["video/x-fli"],
    targetFormats: imgNoSelfAnimated("fli"),
  },
  {
    ext: "flc",
    name: "FLC",
    description:
      "FLC is an improved version of the FLI animation format, also developed by Autodesk for their Animator Pro software. It supports larger frame sizes and better compression than the original FLI format. Like FLI, FLC files store animations as sequences of difference frames and were widely used in early multimedia applications and DOS-era games.",
    category: "image",
    mimeTypes: ["video/x-fli"],
    targetFormats: imgNoSelfAnimated("flc"),
  },
  {
    ext: "gif",
    name: "GIF",
    description:
      "GIF (Graphics Interchange Format) is one of the most recognized image formats on the internet, developed by CompuServe in 1987. It supports up to 256 colors per frame and lossless LZW compression, and is famous for its animation capability, making it ideal for simple looping clips and reaction images. GIF remains enormously popular for sharing short animations and memes across social media and messaging platforms.",
    category: "image",
    mimeTypes: ["image/gif"],
    targetFormats: imgNoSelfAnimated("gif"),
  },
  {
    ext: "heic",
    name: "HEIC",
    description:
      "HEIC (High Efficiency Image Container) is Apple's default image format for iPhone and iPad cameras, based on the HEVC video codec developed by MPEG. It delivers significantly better compression than JPEG while maintaining comparable or higher visual quality, typically halving file sizes at equivalent quality. HEIC supports multiple images, depth maps, thumbnail previews, and metadata within a single file.",
    category: "image",
    mimeTypes: ["image/heic"],
    targetFormats: imgNoSelf("heic"),
  },
  {
    ext: "heif",
    name: "HEIF",
    description:
      "HEIF (High Efficiency Image Format) is the generic container format developed by MPEG from which HEIC (using HEVC encoding) is derived. It supports image sequences, live photos, multi-frame images, and audio tracks within a single container, with superior compression compared to JPEG. HEIF is used across Apple, Samsung, and other platforms as a modern alternative to older image container formats.",
    category: "image",
    mimeTypes: ["image/heif"],
    targetFormats: imgNoSelf("heif"),
  },
  {
    ext: "icns",
    name: "ICNS",
    description:
      "ICNS is Apple's icon format used on macOS and iOS to store application icons at multiple resolutions within a single file. A single ICNS file can contain icons ranging from 16×16 to 1024×1024 pixels, including Retina (2×) variants for high-DPI displays. ICNS files ensure that application icons look sharp at any display size and are required for app distribution in the Apple ecosystem.",
    category: "image",
    mimeTypes: ["image/x-icns"],
    targetFormats: imgNoSelf("icns"),
  },
  {
    ext: "ico",
    name: "ICO",
    description:
      "ICO is the Windows icon file format used to display icons for applications, files, folders, and shortcuts in the operating system. It can contain multiple image sizes and color depths within a single file, ensuring icons look sharp at different display scales and DPI settings. ICO files are also used as website favicons — the small icon displayed in browser tabs, bookmarks, and address bars.",
    category: "image",
    mimeTypes: ["image/x-icon", "image/vnd.microsoft.icon"],
    targetFormats: imgNoSelf("ico"),
  },
  {
    ext: "jp2",
    name: "JP2",
    description:
      "JP2 (JPEG 2000) is an advanced image compression standard developed by the Joint Photographic Experts Group as a next-generation successor to JPEG. It uses wavelet-based compression to achieve significantly better quality at similar file sizes, and supports both lossy and lossless compression in the same format. JP2 is widely used in archival imaging, medical photography, and cinema digital intermediate workflows.",
    category: "image",
    mimeTypes: ["image/jp2"],
    targetFormats: imgNoSelf("jp2"),
  },
  {
    ext: "jpeg",
    name: "JPEG",
    description:
      "JPEG (Joint Photographic Experts Group) is the most widely used lossy image compression format in the world, designed for compressing natural photographic images. It achieves high compression ratios by discarding visual detail that the human eye is less sensitive to, typically reducing file sizes by 10× or more. JPEG is universally supported across every device and application, and remains the standard format for digital photography and web images.",
    category: "image",
    mimeTypes: ["image/jpeg"],
    targetFormats: imgNoSelf("jpeg"),
  },
  {
    ext: "jpg",
    name: "JPEG",
    description:
      "JPG is the most common file extension for the JPEG image format, which uses lossy compression to significantly reduce file sizes while maintaining visually acceptable quality. Every digital camera, smartphone, and web browser supports JPG natively, making it the dominant format for sharing photographs worldwide. Its excellent balance between file size and image quality has kept it the most-used image format for decades.",
    category: "image",
    mimeTypes: ["image/jpeg", "image/jpg"],
    targetFormats: imgNoSelf("jpg"),
  },
  {
    ext: "jfif",
    name: "JFIF",
    description:
      "JFIF (JPEG File Interchange Format) is a common file extension for JPEG images, especially on Windows and older digital cameras. It uses the same JPEG compression as .jpg files and converts to PNG, WebP, PDF, and other standard image formats.",
    category: "image",
    mimeTypes: ["image/jpeg", "image/pjpeg"],
    targetFormats: imgNoSelf("jfif", ["jpg", "jpeg"]),
  },
  {
    ext: "jxl",
    name: "JXL",
    description:
      "JPEG XL (JXL) is a next-generation image codec designed as a long-term replacement for JPEG, PNG, and GIF. It offers significantly better compression than JPEG (often 60% smaller at equivalent quality), supports lossless compression, animation, and HDR color. A unique feature of JPEG XL is its ability to losslessly re-encode existing JPEG files, saving storage space without any quality degradation.",
    category: "image",
    mimeTypes: ["image/jxl"],
    targetFormats: imgNoSelf("jxl"),
  },
  {
    ext: "mpo",
    name: "MPO",
    description:
      "MPO (Multi-Picture Object) is an image format used by stereoscopic 3D cameras, particularly those from Fujifilm and the Nintendo 3DS, to store two slightly offset perspectives of the same scene. The format pairs a standard JPEG with a secondary JPEG representing the other eye's viewpoint. MPO files can be displayed as regular 2D photos or experienced in 3D on compatible displays and hardware.",
    category: "image",
    mimeTypes: ["image/mpo"],
    targetFormats: imgNoSelf("mpo"),
  },
  {
    ext: "msp",
    name: "MSP",
    description:
      "MSP is the proprietary bitmap image format used by Microsoft Paint in the early Windows 1.x and 2.x era. It stores only monochrome (black and white) images in a simple uncompressed binary format without any metadata or color information. MSP is a historical format not supported by modern applications, but files can be converted to preserve content from very old PC collections.",
    category: "image",
    mimeTypes: ["image/x-msp"],
    targetFormats: imgNoSelf("msp"),
  },
  {
    ext: "pbm",
    name: "PBM",
    description:
      "PBM (Portable Bitmap) is part of the Netpbm family of simple image formats designed for easy cross-platform transfer without compatibility issues. It stores monochrome black-and-white images in either plain-text or binary format with minimal overhead or proprietary encoding. PBM is widely used in Unix-like systems and forms the foundation of image processing pipelines and academic computer vision tooling.",
    category: "image",
    mimeTypes: ["image/x-portable-bitmap"],
    targetFormats: imgNoSelf("pbm"),
  },
  {
    ext: "pcx",
    name: "PCX",
    description:
      "PCX (PiCture eXchange) is one of the earliest raster image formats, developed by ZSoft Corporation for PC Paintbrush software in 1985. It uses run-length encoding (RLE) compression and supports color depths from 1-bit to 24-bit. PCX was the dominant image format on DOS-based PCs before being superseded by BMP, JPEG, and PNG in the Windows era.",
    category: "image",
    mimeTypes: ["image/x-pcx"],
    targetFormats: imgNoSelf("pcx"),
  },
  {
    ext: "pfm",
    name: "PFM",
    description:
      "PFM (Portable Float Map) extends the Netpbm format family to store floating-point pixel values instead of integer values, preserving full mathematical precision. It is commonly used in scientific imaging, computer graphics research, and HDR imaging workflows where precise floating-point luminance data must not be quantized. PFM files are larger than standard image formats but essential for downstream processing that requires exact numerical accuracy.",
    category: "image",
    mimeTypes: ["image/x-portable-floatmap"],
    targetFormats: imgNoSelf("pfm"),
  },
  {
    ext: "pgm",
    name: "PGM",
    description:
      "PGM (Portable Graymap) is part of the Netpbm family of portable image formats and stores grayscale images in either plain-text or binary form. It supports bit depths up to 65535 and is widely used in computer vision research, scientific imaging, and image processing pipelines. PGM files are simple to parse programmatically, making them popular in academic and research environments.",
    category: "image",
    mimeTypes: ["image/x-portable-graymap"],
    targetFormats: imgNoSelf("pgm"),
  },
  {
    ext: "png",
    name: "PNG",
    description:
      "PNG (Portable Network Graphics) is a widely-used lossless raster image format created as an open, patent-free alternative to GIF. It supports 24-bit color, full 8-bit alpha channel transparency, and highly efficient lossless compression. PNG is the preferred format for images with sharp edges, text overlays, logos, and any content where pixel-perfect lossless quality is essential, and it is universally supported in every browser and application.",
    category: "image",
    mimeTypes: ["image/png"],
    targetFormats: imgNoSelf("png"),
  },
  {
    ext: "pnm",
    name: "PNM",
    description:
      "PNM (Portable Any Map) is an umbrella format encompassing the PBM (bitmap), PGM (graymap), and PPM (pixmap) Netpbm image formats. A PNM reader can automatically detect and decode monochrome, grayscale, or full-color images using the same code path. It is commonly used in Unix image processing pipelines and scientific computing environments due to its extreme simplicity and cross-platform portability.",
    category: "image",
    mimeTypes: ["image/x-portable-anymap"],
    targetFormats: imgNoSelf("pnm"),
  },
  {
    ext: "ppm",
    name: "PPM",
    description:
      "PPM (Portable Pixmap) is part of the Netpbm format family and stores full-color RGB images in a simple, uncompressed plain-text or binary format. It is the most straightforward way to represent raw color pixel data and is widely used in academic research, computer vision experiments, and cross-platform image processing pipelines. In plain-text form, PPM files are human-readable, which makes debugging image data trivial.",
    category: "image",
    mimeTypes: ["image/x-portable-pixmap"],
    targetFormats: imgNoSelf("ppm"),
  },
  {
    ext: "psd",
    name: "PSD",
    description:
      "PSD (Photoshop Document) is Adobe's native file format for Adobe Photoshop, the industry-standard image editing application. It preserves all editing information including layers, masks, adjustment layers, paths, blend modes, and channels, enabling fully non-destructive editing workflows. PSD files are essential in professional graphic design and photo retouching, though they can be very large due to their comprehensive layer data.",
    category: "image",
    mimeTypes: ["image/vnd.adobe.photoshop"],
    targetFormats: imgNoSelf("psd"),
  },
  {
    ext: "qoi",
    name: "QOI",
    description:
      "QOI (Quite OK Image) is a fast, simple lossless image format designed as a speed-optimized alternative to PNG. It encodes and decodes images in a single linear pass with extremely simple logic, often achieving faster encoding than PNG while producing comparable file sizes. QOI is gaining adoption in game development, real-time graphics, and embedded systems where encoding speed matters as much as compression ratio.",
    category: "image",
    mimeTypes: ["image/x-qoi"],
    targetFormats: imgNoSelf("qoi"),
  },
  {
    ext: "sgi",
    name: "SGI",
    description:
      "SGI (Silicon Graphics Image) is a raster image format developed by Silicon Graphics for use on their professional IRIX workstations. It supports multiple color channels, various bit depths, and optional RLE compression for efficient storage. SGI images were common in professional 3D animation and visual effects workflows throughout the 1990s and are still encountered in some specialized legacy creative pipelines.",
    category: "image",
    mimeTypes: ["image/sgi"],
    targetFormats: imgNoSelf("sgi"),
  },
  {
    ext: "svg",
    name: "SVG",
    description:
      "SVG (Scalable Vector Graphics) is an XML-based vector image format maintained by the W3C as an open web standard. Unlike raster formats, SVG images are mathematically defined and scale infinitely without any quality loss, and can be styled and animated with CSS and JavaScript directly in browsers. SVG is the definitive format for logos, icons, illustrations, and data visualizations that must look crisp across every screen size and resolution.",
    category: "image",
    mimeTypes: ["image/svg+xml"],
    targetFormats: imgNoSelf("svg"),
  },
  {
    ext: "tga",
    name: "TGA",
    description:
      "TGA (Targa Image) is a raster image format developed by Truevision in 1984, supporting 8, 16, 24, and 32-bit color with an optional alpha channel for transparency. It uses optional RLE compression and was a leading format in early video production and 3D rendering due to its straightforward structure and alpha support. TGA remains in active use today in game development, digital compositing, and animation pipelines.",
    category: "image",
    mimeTypes: ["image/x-targa"],
    targetFormats: imgNoSelf("tga"),
  },
  {
    ext: "tiff",
    name: "TIFF",
    description:
      "TIFF (Tagged Image File Format) is a flexible, high-quality raster image format widely used in professional photography, desktop publishing, scanning, and archival imaging. It supports lossless compression, multiple color spaces (RGB, CMYK, LAB), multi-page documents, and can embed multiple images within a single file. TIFF is the standard format for scanned documents, medical imaging, and any workflow that demands the highest possible image fidelity.",
    category: "image",
    mimeTypes: ["image/tiff"],
    targetFormats: (() => {
      const set = new Set<string>(imgStandard);
      set.delete("tiff");
      return [...set].sort();
    })(),
  },
  {
    ext: "wbmp",
    name: "WBMP",
    description:
      "WBMP (Wireless Bitmap) is a monochrome image format used in early mobile WAP pages. It stores simple black-and-white graphics and converts to PNG, JPEG, and other modern image formats.",
    category: "image",
    mimeTypes: ["image/vnd.wap.wbmp"],
    targetFormats: imgNoSelf("wbmp"),
  },
  {
    ext: "webp",
    name: "WebP",
    description:
      "WebP is a modern image format developed by Google that provides superior lossless and lossy compression for images on the web. It typically produces files 25-34% smaller than JPEG at equivalent quality, and up to 26% smaller than PNG for lossless images. WebP also supports animation and alpha transparency, making it a versatile single replacement for JPEG, PNG, and GIF in modern web applications.",
    category: "image",
    mimeTypes: ["image/webp"],
    targetFormats: imgNoSelf("webp"),
  },
  {
    ext: "xbm",
    name: "XBM",
    description:
      "XBM (X BitMap) is a monochrome raster image format native to the X Window System, used on Unix-like operating systems. Uniquely, it stores bitmap data as a C language source code array, making it directly includable in C programs without any parsing library. XBM is primarily used for small monochrome icons and cursor bitmaps in X11 applications, though it is rarely encountered outside of this ecosystem.",
    category: "image",
    mimeTypes: ["image/x-xbitmap"],
    targetFormats: (() => {
      const set = new Set<string>(imgStandard);
      set.delete("xbm");
      return [...set].sort();
    })(),
  },
  {
    ext: "xpm",
    name: "XPM",
    description:
      "XPM (X PixMap) is a color extension of the XBM format, also native to the X Window System on Unix-like operating systems. Like XBM, it stores pixel color data as a C source code array using a color name table, but supports multiple indexed colors per pixel. XPM is commonly used for small color icons in X11-based desktop environments and GUI toolkits such as GTK and Motif.",
    category: "image",
    mimeTypes: ["image/x-xpixmap"],
    targetFormats: imgNoSelf("xpm"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Audio
  // ═══════════════════════════════════════════════════════════════════════════
  {
    ext: "mp3",
    name: "MP3",
    description:
      "MP3 (MPEG Audio Layer 3) is the world's most popular digital audio format, developed by the Moving Picture Experts Group in the early 1990s. It uses psychoacoustic lossy compression to dramatically reduce file sizes while retaining audio quality that is perceptually adequate for most listeners. MP3 transformed the music industry by making digital music portable enough to share over the internet and store on devices with limited storage.",
    category: "audio",
    mimeTypes: ["audio/mpeg"],
    targetFormats: ["wav", "ogg", "aac", "flac", "opus"],
  },
  {
    ext: "wav",
    name: "WAV",
    description:
      "WAV (Waveform Audio File Format) is an uncompressed audio container format developed by Microsoft and IBM for storing raw audio data. It preserves audio at full, lossless quality with no encoding artifacts, making it the preferred format for audio production, editing, and professional archival. WAV files are larger than compressed formats like MP3, but are universally supported and suffer no quality degradation when re-encoded.",
    category: "audio",
    mimeTypes: ["audio/wav", "audio/x-wav"],
    targetFormats: ["mp3", "ogg", "aac", "flac", "opus"],
  },
  {
    ext: "ogg",
    name: "OGG",
    description:
      "OGG Vorbis is a free, open-source lossy audio compression format developed by the Xiph.Org Foundation as a patent-unencumbered alternative to MP3. It produces audio quality comparable to MP3 and AAC at similar or smaller file sizes without any royalty or licensing requirements. OGG is widely used in open-source software, Linux distributions, web games, and applications where licensing freedom is a priority.",
    category: "audio",
    mimeTypes: ["audio/ogg"],
    targetFormats: ["mp3", "wav", "aac", "flac", "opus"],
  },
  {
    ext: "aac",
    name: "AAC",
    description:
      "AAC (Advanced Audio Coding) is a lossy audio compression format standardized by ISO/IEC and designed as a higher-quality successor to MP3. It achieves better audio fidelity than MP3 at the same bit rate by using more advanced psychoacoustic models and encoding techniques. AAC is the default audio format for iTunes, Apple Music, YouTube, and all iOS devices, and is supported natively across virtually every modern platform.",
    category: "audio",
    mimeTypes: ["audio/aac"],
    targetFormats: ["mp3", "wav", "ogg", "flac", "opus"],
  },
  {
    ext: "flac",
    name: "FLAC",
    description:
      "FLAC (Free Lossless Audio Codec) is an open-source audio format that compresses audio without any loss of quality, allowing perfect bit-for-bit reconstruction of the original recording. It typically reduces file sizes by 40-60% compared to uncompressed WAV while remaining completely lossless. FLAC is the format of choice for audiophiles, music archivists, and mastering engineers who require studio-quality audio fidelity in a manageable file size.",
    category: "audio",
    mimeTypes: ["audio/flac"],
    targetFormats: ["mp3", "wav", "ogg", "aac", "opus"],
  },
  {
    ext: "m4a",
    name: "M4A",
    description:
      "M4A is a file extension for an audio file encoded with advanced audio coding (AAC) which is a lossy compression. M4A was generally intended as the successor to MP3, which had not been originally designed for audio only but was layer III in an MPEG 1 or 2 video files. M4A stands for MPEG 4 Audio.",
    category: "audio",
    mimeTypes: ["audio/mp4", "audio/x-m4a"],
    targetFormats: ["mp3", "wav", "ogg", "aac", "flac", "opus"],
  },
  {
    ext: "wma",
    name: "WMA",
    description:
      "WMA (Windows Media Audio) is a series of audio codecs and their corresponding audio coding formats developed by Microsoft. It is a proprietary technology that forms part of the Windows Media framework. WMA consists of four distinct codecs: WMA, WMA Pro, WMA Lossless, and WMA Voice.",
    category: "audio",
    mimeTypes: ["audio/x-ms-wma"],
    targetFormats: ["mp3", "wav", "ogg", "aac", "flac", "opus"],
  },
  {
    ext: "opus",
    name: "OPUS",
    description:
      "Opus is a totally open, royalty-free, highly versatile audio codec. Opus is unmatched for interactive speech and music transmission over the Internet, but is also intended for storage and streaming applications. It is standardized by the Internet Engineering Task Force (IETF) as RFC 6716 which incorporated technology from Skype's SILK codec and Xiph.Org's CELT codec.",
    category: "audio",
    mimeTypes: ["audio/opus", "audio/ogg; codecs=opus"],
    targetFormats: ["mp3", "wav", "ogg", "aac", "flac"],
  },
  {
    ext: "aiff",
    name: "AIFF",
    description:
      "AIFF (Audio Interchange File Format) is an uncompressed audio container developed by Apple, commonly used in professional music production and macOS workflows. Convert to MP3, WAV, FLAC, and other formats.",
    category: "audio",
    mimeTypes: ["audio/aiff", "audio/x-aiff"],
    targetFormats: ["mp3", "wav", "ogg", "aac", "flac", "opus"],
  },
  {
    ext: "aif",
    name: "AIF",
    description:
      "AIF is the classic Macintosh file extension for AIFF uncompressed audio. It is widely used in Logic Pro, GarageBand, and broadcast archives. Convert to MP3, WAV, AAC, and other formats.",
    category: "audio",
    mimeTypes: ["audio/aiff", "audio/x-aiff"],
    targetFormats: ["mp3", "wav", "ogg", "aac", "flac", "opus"],
  },
  {
    ext: "caf",
    name: "CAF",
    description:
      "CAF (Core Audio Format) is Apple's flexible audio container used on iOS and macOS for high-quality recordings and sound libraries. Convert to MP3, WAV, AAC, and other standard audio formats.",
    category: "audio",
    mimeTypes: ["audio/x-caf"],
    targetFormats: ["mp3", "wav", "ogg", "aac", "flac", "opus"],
  },
  {
    ext: "ac3",
    name: "AC3",
    description:
      "AC3 (Dolby Digital) is a lossy surround-sound audio codec used on DVDs, Blu-ray discs, and broadcast TV. Extract and convert to MP3, WAV, AAC, and other formats.",
    category: "audio",
    mimeTypes: ["audio/ac3"],
    targetFormats: ["mp3", "wav", "ogg", "aac", "flac", "opus"],
  },
  {
    ext: "amr",
    name: "AMR",
    description:
      "AMR (Adaptive Multi-Rate) is a speech-optimized audio codec used by mobile voice recorders and 3G phone systems. Convert recordings to MP3, WAV, AAC, and other formats.",
    category: "audio",
    mimeTypes: ["audio/amr"],
    targetFormats: ["mp3", "wav", "ogg", "aac", "flac", "opus"],
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // Video
  // ═══════════════════════════════════════════════════════════════════════════
  {
    ext: "mp4",
    name: "MP4",
    description:
      "MP4 (MPEG-4 Part 14) is the most widely used digital video container format, storing H.264/H.265 video and AAC audio for web, mobile, and broadcast delivery.",
    category: "video",
    mimeTypes: ["video/mp4"],
    targetFormats: videoTargets("mp4"),
  },
  {
    ext: "webm",
    name: "WebM",
    description:
      "WebM is an open, royalty-free media format designed for the web, typically using VP8/VP9/AV1 video and Vorbis/Opus audio.",
    category: "video",
    mimeTypes: ["video/webm"],
    targetFormats: videoTargets("webm"),
  },
  {
    ext: "avi",
    name: "AVI",
    description:
      "AVI (Audio Video Interleave) is a classic Microsoft multimedia container widely used for desktop video archives and editing intermediates.",
    category: "video",
    mimeTypes: ["video/x-msvideo"],
    targetFormats: videoTargets("avi"),
  },
  {
    ext: "mkv",
    name: "MKV",
    description:
      "MKV (Matroska Video) is a flexible open container that can hold multiple video, audio, and subtitle tracks in one file.",
    category: "video",
    mimeTypes: ["video/x-matroska"],
    targetFormats: videoTargets("mkv"),
  },
  {
    ext: "mov",
    name: "MOV",
    description:
      "MOV is Apple QuickTime's multimedia container, common in professional video production and iPhone camera recordings.",
    category: "video",
    mimeTypes: ["video/quicktime"],
    targetFormats: videoTargets("mov"),
  },
  {
    ext: "wmv",
    name: "WMV",
    description:
      "WMV (Windows Media Video) is Microsoft's video format family used for desktop playback and streaming on Windows platforms.",
    category: "video",
    mimeTypes: ["video/x-ms-wmv"],
    targetFormats: videoTargets("wmv"),
  },
  {
    ext: "flv",
    name: "FLV",
    description:
      "FLV (Flash Video) is a legacy streaming video format formerly used by Adobe Flash Player and older online video platforms.",
    category: "video",
    mimeTypes: ["video/x-flv"],
    targetFormats: videoTargets("flv"),
  },
  {
    ext: "m4v",
    name: "M4V",
    description:
      "M4V is an MP4-based video format popularized by Apple for iTunes and device video libraries.",
    category: "video",
    mimeTypes: ["video/x-m4v", "video/mp4"],
    targetFormats: videoTargets("m4v"),
  },
  {
    ext: "mpeg",
    name: "MPEG",
    description:
      "MPEG (MPEG-1/MPEG-2 Program Stream) is a classic digital video format used in DVDs, broadcast, and archival footage.",
    category: "video",
    mimeTypes: ["video/mpeg"],
    targetFormats: videoTargets("mpeg"),
  },
  {
    ext: "mpg",
    name: "MPG",
    description:
      "MPG is a common file extension for MPEG-1/MPEG-2 video streams used in older digital video workflows.",
    category: "video",
    mimeTypes: ["video/mpeg"],
    targetFormats: videoTargets("mpg"),
  },
  {
    ext: "3gp",
    name: "3GP",
    description:
      "3GP is a multimedia container designed for 3G mobile devices, storing compressed video and audio for low-bandwidth delivery.",
    category: "video",
    mimeTypes: ["video/3gpp"],
    targetFormats: videoTargets("3gp"),
  },
  {
    ext: "ogv",
    name: "OGV",
    description:
      "OGV is the Ogg container used for Theora (and related) video streams in open-source and web video contexts.",
    category: "video",
    mimeTypes: ["video/ogg"],
    targetFormats: videoTargets("ogv"),
  },
  {
    ext: "ts",
    name: "TS",
    description:
      "TS (MPEG Transport Stream) carries packetized audio/video commonly used in broadcast TV and HLS streaming segments.",
    category: "video",
    mimeTypes: ["video/mp2t"],
    targetFormats: videoTargets("ts"),
  },
  {
    ext: "m2ts",
    name: "M2TS",
    description:
      "M2TS is the Blu-ray and AVCHD container for MPEG-2 Transport Stream video. Convert to MP4, MKV, WebM, or extract audio to MP3.",
    category: "video",
    mimeTypes: ["video/mp2t"],
    targetFormats: videoTargets("m2ts"),
  },
  {
    ext: "mts",
    name: "MTS",
    description:
      "MTS is the file extension used by AVCHD camcorders for HD video in an MPEG Transport Stream wrapper. Convert to MP4, MOV, or extract audio.",
    category: "video",
    mimeTypes: ["video/mp2t"],
    targetFormats: videoTargets("mts"),
  },
  {
    ext: "vob",
    name: "VOB",
    description:
      "VOB (Video Object) is the MPEG-2 video container used on DVD discs, typically holding H.262 video and AC3 audio. Convert to MP4, MKV, or extract audio to MP3.",
    category: "video",
    mimeTypes: ["video/dvd", "video/mpeg"],
    targetFormats: videoTargets("vob"),
  },
  {
    ext: "asf",
    name: "ASF",
    description:
      "ASF (Advanced Systems Format) is Microsoft's streaming media container, commonly used for WMV and WMA content. Convert to MP4, WebM, or standard audio formats.",
    category: "video",
    mimeTypes: ["video/x-ms-asf", "application/vnd.ms-asf"],
    targetFormats: videoTargets("asf"),
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // Documents
  // ═══════════════════════════════════════════════════════════════════════════
  {
    ext: "adoc",
    name: "AsciiDoc",
    description:
      "AsciiDoc is a lightweight text-based markup language designed for authoring technical documentation, books, articles, and presentations in plain text files. It provides a richer feature set than Markdown, including built-in support for tables, cross-references, document includes, and complex layouts. AsciiDoc is widely used by technical publishers and open-source projects, and can be converted to HTML, PDF, EPUB, and DocBook.",
    category: "document",
    mimeTypes: ["text/asciidoc"],
    targetFormats: docNoSelf("adoc"),
  },
  {
    ext: "doc",
    name: "DOC",
    description:
      "DOC is the legacy binary file format used by Microsoft Word for the Office 97-2003 era. It stores document content, formatting, images, and metadata in a proprietary binary structure. Although superseded by the modern XML-based DOCX format, DOC remains common in older archives and is supported for import by virtually all modern word processors and office suites.",
    category: "document",
    mimeTypes: ["application/msword"],
    targetFormats: docNoSelf("doc", ["doc"]),
  },
  {
    ext: "docx",
    name: "DOCX",
    description:
      "DOCX is the default file format for Microsoft Word documents since Office 2007, built on the Open XML standard developed by Microsoft and standardized by ISO. It stores document content, formatting, images, tables, and metadata in a compressed ZIP archive containing XML files. DOCX is the dominant word processing format worldwide, supported by Microsoft Word, Google Docs, LibreOffice, and virtually all modern office software.",
    category: "document",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    targetFormats: docNoSelf("docx"),
  },
  {
    ext: "html",
    name: "HTML",
    description:
      "HTML (HyperText Markup Language) is the standard markup language for creating web pages and web applications, maintained by the W3C. It defines the structure and content of documents using elements and tags, working alongside CSS for visual styling and JavaScript for interactivity. HTML is rendered by web browsers into the visual pages users see, and is the universal output format for documents published on the internet.",
    category: "document",
    mimeTypes: ["text/html"],
    targetFormats: docNoSelf("html"),
  },
  {
    ext: "ipynb",
    name: "Jupyter Notebook",
    description:
      "Jupyter Notebook (IPYNB) is an interactive document format used by the Jupyter project for combining executable code, narrative text, visualizations, equations, and rich media in a single document. It is the standard tool in data science, machine learning research, and scientific computing for creating reproducible analyses and communicating results. IPYNB files store cells of code and Markdown in a JSON structure that can be run cell-by-cell in a live kernel.",
    category: "document",
    mimeTypes: ["application/x-ipynb+json"],
    targetFormats: docNoSelf("ipynb"),
  },
  {
    ext: "md",
    name: "Markdown",
    description:
      "Markdown is a lightweight plain-text markup language created by John Gruber in 2004 to make writing formatted content for the web as easy as possible. It uses minimal punctuation-based syntax to define headings, emphasis, links, images, lists, and code blocks that convert cleanly to HTML. Markdown is the dominant format for README files, software documentation, technical blogs, and static site generators across the entire software industry.",
    category: "document",
    mimeTypes: ["text/markdown", "text/x-markdown"],
    targetFormats: docNoSelf("md"),
  },
  {
    ext: "muse",
    name: "Muse",
    description:
      "Emacs Muse is a markup language and authoring system built into the GNU Emacs text editor for creating structured documents, journals, and websites from plain text. It supports hierarchical outlines, internal and external links, tables, and multiple export formats including HTML and PDF. Muse is primarily used by Emacs power users who prefer to write all content, notes, and documents within their editing environment.",
    category: "document",
    mimeTypes: ["text/x-muse"],
    targetFormats: docNoSelf("muse"),
  },
  {
    ext: "odt",
    name: "ODT",
    description:
      "ODT (OpenDocument Text) is an open standard document format developed by OASIS for word processing, used as the native format by LibreOffice Writer and Apache OpenOffice Writer. It stores document content, styles, images, and metadata as XML in a ZIP archive, ensuring full transparency and long-term accessibility without vendor lock-in. ODT is also supported for import and export by Microsoft Word and Google Docs.",
    category: "document",
    mimeTypes: ["application/vnd.oasis.opendocument.text"],
    targetFormats: docNoSelf("odt"),
  },
  {
    ext: "opml",
    name: "OPML",
    description:
      "OPML (Outline Processor Markup Language) is an XML-based format designed for exchanging hierarchical outline and list structures between applications. It is most commonly used to export and import RSS/Atom feed subscription lists between news readers and podcast apps. OPML also serves as a portable format for structured notes, project outlines, and hierarchically organized content in productivity tools.",
    category: "document",
    mimeTypes: ["text/x-opml"],
    targetFormats: docNoSelf("opml"),
  },
  {
    ext: "org",
    name: "Org",
    description:
      "Org-mode is a plain-text format used within GNU Emacs for organizing notes, managing tasks and projects, writing documents, and creating structured content. It supports rich headings, nested lists, tables, source code blocks, links, and a complete task-management system with priorities, deadlines, and agenda views. Org files can be exported directly to HTML, PDF, LaTeX, ODT, and other formats from within Emacs.",
    category: "document",
    mimeTypes: ["text/x-org"],
    targetFormats: docNoSelf("org"),
  },
  {
    ext: "pdf",
    name: "PDF",
    description:
      "PDF (Portable Document Format) was created by Adobe in 1992 and has become the worldwide standard for sharing documents with precisely fixed layouts. It preserves fonts, images, vector graphics, and formatting identically across every operating system, device, and printer. PDF supports digital signatures, encryption, interactive forms, and embedded multimedia, making it essential for official documents, contracts, reports, and professional publications.",
    category: "document",
    mimeTypes: ["application/pdf"],
    targetFormats: [...pdfOutputTargets],
  },
  {
    ext: "rst",
    name: "RST",
    description:
      "reStructuredText (RST) is a plain-text markup language widely used for technical documentation in the Python programming ecosystem. It is the default documentation format for Python projects and the native input format for the Sphinx documentation generator, which produces HTML, PDF, ePub, and man pages. RST supports complex cross-references, footnotes, directives, and extensions, making it well-suited for large, structured documentation projects.",
    category: "document",
    mimeTypes: ["text/x-rst"],
    targetFormats: docNoSelf("rst"),
  },
  {
    ext: "rtf",
    name: "RTF",
    description:
      "RTF (Rich Text Format) is a document interchange format developed by Microsoft in 1987 to allow formatted text to be shared across different word processors and operating systems. It encodes text formatting such as fonts, colors, bold, italic, and paragraph alignment using ASCII escape sequences, making it readable by virtually any word processor. RTF remains widely used as a compatibility format when the recipient's software is unknown.",
    category: "document",
    mimeTypes: ["application/rtf"],
    targetFormats: docNoSelf("rtf"),
  },
  {
    ext: "tex",
    name: "TeX",
    description:
      "TeX is a sophisticated typesetting system created by Donald Knuth for producing publication-quality documents, especially those containing complex mathematical notation. LaTeX, built as a macro layer on top of TeX, provides high-level document structuring commands and is the standard authoring format for academic papers in mathematics, physics, computer science, and engineering. TeX/LaTeX documents produce typographically precise output that surpasses word processors.",
    category: "document",
    mimeTypes: ["application/x-tex"],
    targetFormats: docNoSelf("tex"),
  },
  {
    ext: "textile",
    name: "Textile",
    description:
      "Textile is a lightweight markup language originally developed for the Textile CMS and later adopted by the Ruby on Rails community and various blogging platforms. It offers a simple, readable syntax for headings, emphasis, links, lists, tables, and code blocks that converts to clean HTML. While less widespread than Markdown today, Textile is still used in content management systems and project management tools like Redmine.",
    category: "document",
    mimeTypes: ["text/textile"],
    targetFormats: docNoSelf("textile"),
  },
  {
    ext: "txt",
    name: "TXT",
    description:
      "TXT (Plain Text) is the simplest possible file format, containing only unformatted characters encoded in ASCII or Unicode with no styling, images, or structural metadata. It is universally compatible with every operating system, programming language, text editor, and application that handles text. Plain text is used for source code, configuration files, README documents, log files, and any situation where maximum simplicity and portability are required.",
    category: "document",
    mimeTypes: ["text/plain"],
    targetFormats: docNoSelf("txt"),
  },
  {
    ext: "log",
    name: "LOG",
    description:
      "LOG files are plain-text application or server log output, one event per line or free-form text. Convert to PDF, HTML, Markdown, DOCX, and other document formats for sharing or archiving.",
    category: "document",
    mimeTypes: ["text/plain"],
    targetFormats: docNoSelf("log"),
  },
  {
    ext: "eml",
    name: "EML",
    description:
      "EML is a standardized file format for storing individual email messages, defined by the MIME standard (RFC 5322) and used by most email clients. It preserves the complete email including headers, plain-text body, HTML body, and file attachments exactly as they were transmitted. EML files are supported by Outlook, Thunderbird, Apple Mail, and are commonly used for email archiving, migration, and forensic analysis.",
    category: "document",
    mimeTypes: ["message/rfc822"],
    targetFormats: [
      "docx",
      "epub",
      "html",
      "json",
      "md",
      "odt",
      "pdf",
      "rst",
      "rtf",
      "txt",
    ],
  },
  {
    ext: "msg",
    name: "MSG",
    description:
      "MSG is Microsoft Outlook's proprietary format for saving individual email messages, meeting requests, contacts, and tasks as standalone files. Unlike the standard EML format, MSG files use Microsoft's Compound Document File Format and require Outlook or a compatibility library to fully decode. MSG files preserve all rich formatting, embedded images, attachments, and complete email metadata, and are widely used in enterprise email archiving and legal discovery.",
    category: "document",
    mimeTypes: ["application/vnd.ms-outlook"],
    targetFormats: [
      "docx",
      "epub",
      "html",
      "json",
      "md",
      "odt",
      "pdf",
      "rst",
      "rtf",
      "txt",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Data
  // ═══════════════════════════════════════════════════════════════════════════
  {
    ext: "csv",
    name: "CSV",
    description:
      "CSV (Comma-Separated Values) is a plain-text tabular data format that uses commas to delimit column values and line breaks to separate rows. It is one of the most universally supported data interchange formats, readable by any spreadsheet application, database, or programming language. CSV is ideal for exporting and importing data between different systems due to its simplicity, human readability, and near-universal compatibility.",
    category: "data",
    mimeTypes: ["text/csv"],
    targetFormats: [...dataNoSelf("csv"), "ics", "m3u", "m3u8"].sort(),
  },
  {
    ext: "dta",
    name: "DTA",
    description:
      "DTA is the native binary data file format for Stata, a statistical analysis package widely used in economics, epidemiology, and social science research. It stores complete datasets along with variable labels, value labels, missing value indicators, and display formats that preserve the full analytical context. DTA files can contain millions of observations and thousands of variables, making them suitable for large survey and panel datasets.",
    category: "data",
    mimeTypes: ["application/x-stata"],
    targetFormats: dataNoSelf("dta", ["fwf", "sav", "xls"]),
  },
  {
    ext: "env",
    name: "ENV",
    description:
      "ENV files store environment variable definitions used to configure software applications, services, and deployment pipelines across different environments. They contain simple key-value pairs in the format KEY=VALUE and are a cornerstone of twelve-factor app development and containerized deployments with Docker and Kubernetes. ENV files are typically excluded from version control to protect sensitive configuration data such as API keys and database credentials.",
    category: "data",
    mimeTypes: ["text/x-environment"],
    targetFormats: dataNoSelf("env"),
  },
  {
    ext: "feather",
    name: "Feather",
    description:
      "Feather is a fast, lightweight binary columnar data format jointly developed by the Apache Arrow and pandas teams for efficient data interchange between Python and R. It leverages Apache Arrow's in-memory columnar format to achieve extremely fast read and write speeds with good compression. Feather is optimized for performance rather than long-term archival and is ideal for sharing large data frames between data science tools in a pipeline.",
    category: "data",
    mimeTypes: ["application/x-feather"],
    targetFormats: dataNoSelf("feather"),
  },
  {
    ext: "fwf",
    name: "FWF",
    description:
      "FWF (Fixed-Width Format) is a plain-text data format where each column occupies a predetermined number of character positions in every row, with no delimiter characters between fields. It originated on mainframes and is still common in government data releases, financial industry feeds, and legacy enterprise system exports. FWF files require a separate schema or data dictionary to correctly parse the column boundaries, making them less self-describing than CSV.",
    category: "data",
    mimeTypes: ["text/x-fixed-width"],
    targetFormats: dataNoSelf("fwf"),
  },
  {
    ext: "ini",
    name: "INI",
    description:
      "INI is a simple, human-readable configuration file format that originated with early versions of Microsoft Windows. It organizes settings into named sections enclosed in square brackets, with key-value pairs defined below each section header. INI files are easy to read and edit by hand, making them a popular choice for application configuration across Windows, Linux, and cross-platform software projects.",
    category: "data",
    mimeTypes: ["text/x-ini"],
    targetFormats: dataNoSelf("ini"),
  },
  {
    ext: "json",
    name: "JSON",
    description:
      "JSON (JavaScript Object Notation) is a lightweight, human-readable data interchange format derived from JavaScript object literal syntax. It natively supports objects, arrays, strings, numbers, booleans, and null, allowing it to represent arbitrarily nested data structures. JSON has become the universal standard for REST API responses, configuration files, and data interchange on the web, with native parsing support in virtually every programming language.",
    category: "data",
    mimeTypes: ["application/json"],
    targetFormats: [...dataNoSelf("json"), "ics", "m3u", "m3u8"].sort(),
  },
  {
    ext: "geojson",
    name: "GeoJSON",
    description:
      "GeoJSON is an open standard for encoding geographic data structures as JSON. It represents points, lines, polygons, and feature collections with coordinates for maps and GIS tools. GeoJSON works well with web mapping libraries and converts cleanly to CSV or JSON tables for analysis.",
    category: "data",
    mimeTypes: ["application/geo+json", "application/json"],
    targetFormats: dataNoSelf("geojson"),
  },
  {
    ext: "jsonl",
    name: "JSONL",
    description:
      "JSONL (JSON Lines, also known as NDJSON) stores one complete, valid JSON object per line in a plain-text file. This line-by-line structure makes it ideal for streaming large datasets, log files, and machine learning training data, since each record can be processed independently without loading the entire file into memory. JSONL is increasingly standard in data engineering, LLM training pipelines, and high-throughput logging systems.",
    category: "data",
    mimeTypes: ["application/jsonl"],
    targetFormats: dataNoSelf("jsonl"),
  },
  {
    ext: "ndjson",
    name: "NDJSON",
    description:
      "NDJSON (Newline Delimited JSON) is an alias for JSON Lines — one JSON object per line, ideal for streaming datasets and LLM training exports. Convert to CSV, JSON, Parquet, XLSX, and other data formats.",
    category: "data",
    mimeTypes: ["application/x-ndjson", "application/jsonl"],
    targetFormats: dataNoSelf("ndjson", ["jsonl"]),
  },
  {
    ext: "ods",
    name: "ODS",
    description:
      "ODS (OpenDocument Spreadsheet) is the open standard spreadsheet format developed by OASIS, used natively by LibreOffice Calc and Apache OpenOffice Calc. It stores spreadsheet data, formulas, charts, and formatting in XML compressed within a ZIP archive, ensuring transparency and long-term accessibility. ODS is a fully open, non-proprietary alternative to Microsoft Excel's XLS and XLSX formats and is supported by Google Sheets.",
    category: "data",
    mimeTypes: ["application/vnd.oasis.opendocument.spreadsheet"],
    targetFormats: dataNoSelf("ods"),
  },
  {
    ext: "parquet",
    name: "Parquet",
    description:
      "Apache Parquet is an open-source binary columnar storage format designed for efficient analytical data processing across the big data ecosystem. Its columnar layout enables excellent compression ratios and fast query execution when only a subset of columns is needed. Parquet is the de facto standard format for data lakes and is natively supported by Apache Spark, Hadoop, Presto, Snowflake, and most modern data processing platforms.",
    category: "data",
    mimeTypes: ["application/x-parquet"],
    targetFormats: dataNoSelf("parquet"),
  },
  {
    ext: "sav",
    name: "SAV",
    description:
      "SAV is the binary data file format native to IBM SPSS Statistics, one of the most widely used statistical analysis packages in social science, healthcare, and market research. It stores datasets together with complete variable metadata including names, labels, value labels, missing value codes, and measurement scales. SAV files are essential for sharing reproducible SPSS analyses and are also readable by R, Python, and SAS through compatibility libraries.",
    category: "data",
    mimeTypes: ["application/x-spss-sav"],
    targetFormats: dataNoSelf("sav", ["dta", "fwf", "xls"]),
  },
  {
    ext: "sqlite",
    name: "SQLite",
    description:
      "SQLite is a self-contained, serverless, zero-configuration relational database engine that stores an entire database — including tables, indexes, views, and data — in a single cross-platform binary file. It is the most widely deployed database in the world, embedded in mobile apps, desktop software, browsers, and IoT devices. SQLite files can be queried with full SQL syntax using the SQLite library or countless compatible tools.",
    category: "data",
    mimeTypes: ["application/x-sqlite3"],
    targetFormats: dataNoSelf("sqlite"),
  },
  {
    ext: "toml",
    name: "TOML",
    description:
      "TOML (Tom's Obvious Minimal Language) is a configuration file format designed for maximum human readability with a precisely defined, unambiguous specification. It uses a clean syntax for strings, integers, floats, booleans, datetimes, arrays, and nested tables that maps directly to standard dictionary or hash-map data structures. TOML is the official configuration format for Rust's Cargo package manager and is gaining widespread adoption in modern software projects.",
    category: "data",
    mimeTypes: ["application/toml"],
    targetFormats: dataNoSelf("toml"),
  },
  {
    ext: "tsv",
    name: "TSV",
    description:
      "TSV (Tab-Separated Values) is a plain-text tabular data format that uses tab characters as column delimiters and newlines to separate rows, making it similar to CSV but avoiding issues when data values contain commas. It is well-supported by spreadsheet applications, relational databases, and scripting languages, and is commonly used for data exports from bioinformatics databases, genome browsers, and text-processing pipelines.",
    category: "data",
    mimeTypes: ["text/tab-separated-values"],
    targetFormats: dataNoSelf("tsv"),
  },
  {
    ext: "vcf",
    name: "VCF",
    description:
      "VCF (vCard Contact File) is the universal standard format for storing and exchanging personal contact information including names, phone numbers, email addresses, physical addresses, and photos. It is supported by virtually every smartphone, email client, address book application, and CRM system, making it the go-to format for transferring contacts between platforms. VCF files can store a single contact or a batch of multiple contacts in one file.",
    category: "data",
    mimeTypes: ["text/vcard"],
    targetFormats: ["csv", "html", "json", "tsv", "xml", "yaml"],
  },
  {
    ext: "xls",
    name: "XLS",
    description:
      "XLS is the legacy binary spreadsheet format used by Microsoft Excel from 1987 through the Office 2003 era, based on Microsoft's proprietary Binary Interchange File Format (BIFF). It stores worksheets, formulas, charts, and macros in a binary structure that requires Microsoft's format specification to parse correctly. XLS remains common in older enterprise systems and when compatibility with legacy versions of Excel is required.",
    category: "data",
    mimeTypes: ["application/vnd.ms-excel"],
    targetFormats: dataNoSelf("xls", ["dta", "fwf", "sav"]),
  },
  {
    ext: "xlsx",
    name: "XLSX",
    description:
      "XLSX is the default spreadsheet format for Microsoft Excel since Office 2007, built on the Open XML standard and standardized by ISO. It stores worksheets, formulas, charts, pivot tables, and formatting in a compressed ZIP archive of XML files, making it more compact and corruption-resistant than the older XLS format. XLSX is supported by Google Sheets, LibreOffice Calc, Apple Numbers, and virtually every modern data tool.",
    category: "data",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    targetFormats: dataNoSelf("xlsx", ["dta", "fwf", "sav", "xls"]),
  },
  {
    ext: "xml",
    name: "XML",
    description:
      "XML (eXtensible Markup Language) is a flexible, human-readable markup language defined by the W3C for structuring, storing, and transporting data across different systems. Unlike HTML, XML uses custom-defined tags chosen by the author to describe the semantic meaning of data, making it self-documenting and extensible. XML underpins numerous data formats, web services (SOAP), configuration standards, and document formats including SVG, DOCX, and RSS.",
    category: "data",
    mimeTypes: ["application/xml", "text/xml"],
    targetFormats: dataNoSelf("xml"),
  },
  {
    ext: "yaml",
    name: "YAML",
    description:
      "YAML (YAML Ain't Markup Language) is a human-friendly data serialization format designed to be more readable than JSON or XML for configuration files and structured data. It uses indentation and minimal punctuation to represent nested data structures, sequences, and mappings in a way that closely resembles natural language. YAML is the native configuration format for Kubernetes, Docker Compose, GitHub Actions, Ansible, and countless other modern developer tools.",
    category: "data",
    mimeTypes: ["application/x-yaml", "text/yaml"],
    targetFormats: dataNoSelf("yaml"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Archive
  // ═══════════════════════════════════════════════════════════════════════════
  {
    ext: "7z",
    name: "7Z",
    description:
      "7Z is a high-compression archive format associated with the free, open-source 7-Zip archiver. It uses the LZMA and LZMA2 compression algorithms to achieve significantly better compression ratios than ZIP and RAR, often reducing file sizes by 30-70% more than competing formats. 7Z supports AES-256 encryption, solid compression, multi-volume archives, and can handle files of virtually any size.",
    category: "archive",
    mimeTypes: ["application/x-7z-compressed"],
    targetFormats: archiveNoSelf("7z"),
  },
  {
    ext: "rar",
    name: "RAR",
    description:
      "RAR (Roshal Archive) is a proprietary archive format developed by Eugene Roshal that supports high-compression ratios, strong encryption, archive splitting across multiple volumes, and built-in recovery records for repairing damaged archives. It uses a specialized compression algorithm that often outperforms ZIP for many file types. RAR archives are widely used for distributing large software packages and are commonly encountered in file-sharing communities.",
    category: "archive",
    mimeTypes: ["application/vnd.rar", "application/x-rar-compressed"],
    targetFormats: archiveNoSelf("rar"),
  },
  {
    ext: "tar",
    name: "TAR",
    description:
      "TAR (Tape ARchive) is a Unix file archiving format that bundles multiple files and directories into a single file while preserving file permissions, ownership, timestamps, and symbolic links. Crucially, TAR performs no compression by itself and is almost always paired with a compression tool such as gzip, bzip2, or xz. TAR is the foundational packaging format for software distribution, backups, and data transfer throughout the Unix and Linux ecosystem.",
    category: "archive",
    mimeTypes: ["application/x-tar"],
    targetFormats: archiveNoSelf("tar"),
  },
  {
    ext: "tar.bz2",
    name: "TAR.BZ2",
    description:
      "TAR.BZ2 is a TAR archive compressed with the bzip2 algorithm, combining Unix-style file bundling with high-quality block-sorting compression. Bzip2 generally achieves better compression ratios than gzip, particularly for text-heavy content like source code, at the cost of somewhat slower processing. TAR.BZ2 files are a common distribution format for open-source software tarballs throughout the Linux and Unix ecosystem.",
    category: "archive",
    mimeTypes: ["application/x-bzip2", "application/x-tar-bz2"],
    targetFormats: archiveNoSelf("tar.bz2"),
  },
  {
    ext: "tar.gz",
    name: "TAR.GZ",
    description:
      "TAR.GZ (also known as TGZ) is a TAR archive compressed with the gzip algorithm, and is the most prevalent archive format in the Unix and Linux world. It offers a good balance between compression speed and ratio and is universally available on all Unix-like systems without additional tools. TAR.GZ is the standard format for distributing open-source software source code and is understood by virtually every developer and system administrator.",
    category: "archive",
    mimeTypes: ["application/gzip", "application/x-tar-gz"],
    targetFormats: archiveNoSelf("tar.gz"),
  },
  {
    ext: "tar.xz",
    name: "TAR.XZ",
    description:
      "TAR.XZ is a TAR archive compressed with the XZ compression algorithm, which uses LZMA2 to achieve excellent compression ratios that often surpass bzip2. It is the preferred distribution format for many major Linux distributions including Arch Linux and Fedora due to its superior space savings. The trade-off is slower compression speed compared to gzip, though decompression performance is reasonably fast on modern hardware.",
    category: "archive",
    mimeTypes: ["application/x-xz", "application/x-tar-xz"],
    targetFormats: archiveNoSelf("tar.xz"),
  },
  {
    ext: "tar.zst",
    name: "TAR.ZST",
    description:
      "TAR.ZST is a TAR archive compressed with the Zstandard (Zstd) algorithm, developed by Facebook to deliver the best balance of compression ratio and speed. Zstd matches or exceeds bzip2 compression ratios while compressing many times faster, making it excellent for both archival and real-time use cases. TAR.ZST is rapidly gaining adoption in modern Linux distributions, package managers, and developer toolchains as a superior alternative.",
    category: "archive",
    mimeTypes: ["application/zstd", "application/x-tar-zst"],
    targetFormats: archiveNoSelf("tar.zst"),
  },
  {
    ext: "zip",
    name: "ZIP",
    description:
      "ZIP is the most widely used archive format, invented in 1989 by Phil Katz, that compresses and packages multiple files into a single container using the DEFLATE algorithm. It supports individual file compression with optional password protection and is natively supported on Windows, macOS, and Linux without additional software. ZIP is the universal standard for distributing files, software installers, and document packages due to its ubiquitous support.",
    category: "archive",
    mimeTypes: ["application/zip", "application/x-zip-compressed"],
    targetFormats: archiveNoSelf("zip"),
  },
  {
    ext: "apk",
    name: "APK",
    description:
      "APK (Android Package) is a ZIP-based archive that bundles Android app code, resources, and manifests. Extract contents or repackage to ZIP, TAR, and other archive formats.",
    category: "archive",
    mimeTypes: ["application/vnd.android.package-archive"],
    targetFormats: archiveNoSelf("apk"),
  },
  {
    ext: "jar",
    name: "JAR",
    description:
      "JAR (Java Archive) is a ZIP-based package for Java classes, libraries, and resources. Extract or convert to ZIP, TAR, and other archive formats.",
    category: "archive",
    mimeTypes: ["application/java-archive"],
    targetFormats: archiveNoSelf("jar"),
  },
  {
    ext: "gz",
    name: "GZ",
    description:
      "GZ (Gzip) is a single-file compression format using the DEFLATE algorithm, the most common compression tool on Unix-like systems. It typically reduces text file sizes by 60-70% and is extremely fast to decompress, making it ideal for web content compression and log archiving. GZ is also the compression component of the widely-used TAR.GZ combined archive format that powers open-source software distribution.",
    category: "archive",
    mimeTypes: ["application/gzip"],
    targetFormats: archiveNoSelf("gz"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Ebook
  // ═══════════════════════════════════════════════════════════════════════════
  {
    ext: "cb7",
    name: "CB7",
    description:
      "CB7 is a comic book archive format that stores sequentially named comic page images inside a 7-Zip compressed container. It is part of the CB* family of formats (CBZ, CBR, CB7) used by comic book readers such as CDisplayEx and Comical. CB7 typically achieves better compression than CBZ (ZIP-based) or CBR (RAR-based), making it efficient for storing high-resolution comic scans.",
    category: "ebook",
    mimeTypes: ["application/x-cb7"],
    targetFormats: ebookNoSelf("cb7"),
  },
  {
    ext: "cbr",
    name: "CBR",
    description:
      "CBR (Comic Book RAR) is a comic book archive format that packages sequentially named page images inside a RAR compressed archive with the .cbr extension. It is one of the most widely used formats among digital comic collectors and is supported by popular e-reader apps like Moon+ Reader, ComicRack, and Chunky. CBR files are opened by comic readers that display the images in sequence, recreating the page-by-page reading experience.",
    category: "ebook",
    mimeTypes: ["application/x-cbr"],
    targetFormats: ebookNoSelf("cbr"),
  },
  {
    ext: "cbz",
    name: "CBZ",
    description:
      "CBZ (Comic Book ZIP) is a comic book archive format that packages page images in a standard ZIP archive with the .cbz extension, making it easy to create without specialized software. It is similar to CBR but uses the open ZIP format rather than the proprietary RAR format, improving compatibility with e-reader devices and applications. CBZ is supported by Kindle, Kobo, and most dedicated comic reader applications.",
    category: "ebook",
    mimeTypes: ["application/x-cbz"],
    targetFormats: ebookNoSelf("cbz"),
  },
  {
    ext: "epub",
    name: "EPUB",
    description:
      "EPUB (Electronic Publication) is the most widely adopted open standard ebook format, developed by the IDPF and now maintained by the W3C. It packages HTML, CSS, fonts, and images into a single ZIP-based container, allowing text to reflow and adapt to different screen sizes, font sizes, and user preferences. EPUB is supported by virtually all e-readers except Amazon Kindle devices, and is the preferred format for accessible, standards-compliant digital books.",
    category: "ebook",
    mimeTypes: ["application/epub+zip"],
    targetFormats: ebookNoSelf("epub"),
  },
  {
    ext: "fb2",
    name: "FB2",
    description:
      "FictionBook 2.0 (FB2) is an open XML-based ebook format particularly popular in Russia and Eastern Europe, where it became a dominant format for digital literature. It stores the entire book as structured XML with semantic markup for chapters, titles, annotations, author info, cover image, and metadata. FB2's clean single-file XML structure makes conversion to other ebook formats straightforward, and it is well-supported by e-reading software in Russian-speaking regions.",
    category: "ebook",
    mimeTypes: ["application/x-fb2"],
    targetFormats: ebookNoSelf("fb2"),
  },


  {
    ext: "azw3",
    name: "AZW3",
    description:
      "AZW3 (Kindle Format 8) is Amazon's modern ebook format. Conversion uses Calibre when available, with a built-in KF8 text extractor as fallback.",
    category: "ebook",
    mimeTypes: ["application/vnd.amazon.ebook"],
    targetFormats: ebookNoSelf("azw3"),
  },
  {
    ext: "mobi",
    name: "MOBI",
    description:
      "MOBI is the classic Mobipocket/Kindle ebook format. Conversion uses Calibre when available, with a built-in MOBI text extractor as fallback.",
    category: "ebook",
    mimeTypes: ["application/x-mobipocket-ebook"],
    targetFormats: ebookNoSelf("mobi"),
  },
  {
    ext: "lrf",
    name: "LRF",
    description:
      "LRF is Sony Reader's legacy ebook format. Conversion uses Calibre when available on the server.",
    category: "ebook",
    mimeTypes: ["application/x-lrf"],
    targetFormats: ebookNoSelf("lrf"),
  },
  {
    ext: "pdb",
    name: "PDB",
    description:
      "PDB Palm ebook containers. Conversion uses Calibre when available on the server.",
    category: "ebook",
    mimeTypes: ["application/x-pdb"],
    targetFormats: ebookNoSelf("pdb"),
  },
  {
    ext: "snb",
    name: "SNB",
    description:
      "SNB is the Shanda Bambook ebook format. Conversion uses Calibre when available on the server.",
    category: "ebook",
    mimeTypes: ["application/x-snb"],
    targetFormats: ebookNoSelf("snb"),
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // Presentation
  // ═══════════════════════════════════════════════════════════════════════════
  {
    ext: "key",
    name: "Keynote",
    description:
      "Keynote is Apple's presentation application, and .KEY files are its native format for storing slide presentations with animations, transitions, charts, and multimedia. Keynote files use a compressed package format built on Apple's proprietary schema and are optimized for the macOS and iOS ecosystem. Presentations can be exported to PowerPoint (PPTX), PDF, HTML, and video formats for sharing with users on other platforms.",
    category: "presentation",
    mimeTypes: ["application/x-iwork-keynote"],
    targetFormats: presNoSelf("key"),
  },
  {
    ext: "odp",
    name: "ODP",
    description:
      "ODP (OpenDocument Presentation) is the open standard presentation format developed by OASIS, used natively by LibreOffice Impress and Apache OpenOffice Impress. It stores slides, speaker notes, animations, media, and custom formatting in XML compressed within a ZIP archive, ensuring portability and long-term accessibility. ODP is a fully open, non-proprietary alternative to PowerPoint formats and supports bidirectional conversion with PPTX.",
    category: "presentation",
    mimeTypes: ["application/vnd.oasis.opendocument.presentation"],
    targetFormats: presNoSelf("odp"),
  },
  {
    ext: "pot",
    name: "POT",
    description:
      "POT is the legacy template file format for Microsoft PowerPoint 97-2003 presentations. It stores slide master layouts, color schemes, placeholder positions, font choices, and branded design elements that can be reused as a starting point for new presentations. POT templates enable organizations to maintain visual consistency across all presentations without recreating design elements from scratch.",
    category: "presentation",
    mimeTypes: ["application/vnd.ms-powerpoint.template"],
    targetFormats: presNoSelf("pot"),
  },
  {
    ext: "potx",
    name: "POTX",
    description:
      "POTX is the modern Open XML-based template format for Microsoft PowerPoint, introduced with Office 2007. It stores slide themes, master layouts, color palettes, fonts, and design elements in a compressed XML package that can be applied to new PPTX presentations. POTX templates are widely distributed for corporate branding, educational purposes, and professional presentation design.",
    category: "presentation",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.template",
    ],
    targetFormats: presNoSelf("potx"),
  },
  {
    ext: "pps",
    name: "PPS",
    description:
      "PPS (PowerPoint Show) is a legacy PowerPoint file for the Office 97-2003 era that opens directly in slideshow playback mode rather than the editing interface. Its content is identical to a PPT file but the file association triggers full-screen presentation mode immediately when opened. PPS files are convenient for distributing finalized presentations to audiences who should view but not edit them.",
    category: "presentation",
    mimeTypes: ["application/vnd.ms-powerpoint.slideshow"],
    targetFormats: presNoSelf("pps"),
  },
  {
    ext: "ppsx",
    name: "PPSX",
    description:
      "PPSX is the modern Open XML-based equivalent of the legacy PPS format, introduced with Office 2007. Like PPS, a PPSX file opens directly in slideshow mode, bypassing the editing interface, which is ideal for distributing polished presentations. PPSX uses the same compressed XML format as PPTX but with the presentation-mode-first file association behavior.",
    category: "presentation",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
    ],
    targetFormats: presNoSelf("ppsx"),
  },
  {
    ext: "ppt",
    name: "PPT",
    description:
      "PPT is the legacy binary presentation format used by Microsoft PowerPoint from 1987 through the Office 2003 era. It stores slides, animations, transitions, speaker notes, embedded media, and formatting in Microsoft's proprietary binary format. PPT files remain fully compatible with modern PowerPoint, LibreOffice Impress, and Google Slides, though PPTX is preferred for new work due to better interoperability.",
    category: "presentation",
    mimeTypes: ["application/vnd.ms-powerpoint"],
    targetFormats: presNoSelf("ppt"),
  },
  {
    ext: "pptm",
    name: "PPTM",
    description:
      "PPTM is a macro-enabled PowerPoint presentation format based on the Open XML standard, introduced with Office 2007. In addition to all standard PPTX content, it can contain VBA (Visual Basic for Applications) macros that automate actions within the presentation. PPTM files should be opened with caution as macros can execute code, and are typically kept for internal use rather than distributed externally.",
    category: "presentation",
    mimeTypes: ["application/vnd.ms-powerpoint.presentation.macroEnabled.12"],
    targetFormats: presNoSelf("pptm"),
  },
  {
    ext: "pptx",
    name: "PPTX",
    description:
      "PPTX is the default Microsoft PowerPoint presentation format since Office 2007, based on the Open XML standard and standardized by ISO/IEC. It stores slides, animations, transitions, speaker notes, embedded media, and themes in a compressed ZIP package of XML files. PPTX is the dominant presentation format in business and education worldwide, natively supported by Google Slides, LibreOffice Impress, Apple Keynote, and all modern presentation tools.",
    category: "presentation",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    targetFormats: presNoSelf("pptx"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Subtitle
  // ═══════════════════════════════════════════════════════════════════════════
  {
    ext: "ass",
    name: "ASS",
    description:
      "ASS (Advanced SubStation Alpha) is a feature-rich subtitle format supporting sophisticated text styling including custom fonts, colors, borders, shadows, precise on-screen positioning, and karaoke timing effects. It is the dominant format for anime fansubbing and professional subtitling where fine-grained typographic and positioning control is essential. ASS subtitles can include multiple simultaneous text layers and complex motion effects.",
    category: "subtitle",
    mimeTypes: ["text/x-ass"],
    targetFormats: subNoSelf("ass"),
  },
  {
    ext: "lrc",
    name: "LRC",
    description:
      "LRC is a plain-text lyrics format that timestamps each line of song lyrics for karaoke-style display. Players show the current lyric as the audio reaches each tag. LRC files are easy to edit and convert to common subtitle formats like SRT and VTT.",
    category: "subtitle",
    mimeTypes: ["application/x-lrc", "text/plain"],
    targetFormats: subNoSelf("lrc"),
  },
  {
    ext: "mpl",
    name: "MPL",
    description:
      "MPL2 is a simple subtitle format used primarily by the MPlayer and MPV media players on Linux systems. It stores subtitle timing in units of 1/10 second and subtitle text in a compact, line-based plain-text structure without formatting codes. MPL2 is lightweight and easy to generate programmatically, making it suitable for basic subtitling where advanced formatting is not required.",
    category: "subtitle",
    mimeTypes: ["text/x-mpl"],
    targetFormats: subNoSelf("mpl"),
  },
  {
    ext: "sbv",
    name: "SBV",
    description:
      "SBV (SubViewer) is YouTube's simple caption format: each cue is a start/end timestamp pair followed by caption text. It is plain text, easy to edit, and commonly used when downloading or uploading YouTube captions.",
    category: "subtitle",
    mimeTypes: ["text/x-svb", "text/plain"],
    targetFormats: subNoSelf("sbv"),
  },
  {
    ext: "srt",
    name: "SRT",
    description:
      "SRT (SubRip Subtitle) is the most widely used and compatible subtitle format on the internet, originating from the SubRip DVD ripping software. It stores subtitles as sequentially numbered blocks, each containing a start/end timestamp and one or more lines of display text. SRT files are plain text, easily editable with any text editor, and supported by virtually every media player, video editor, and streaming platform that handles subtitles.",
    category: "subtitle",
    mimeTypes: ["application/x-subrip", "text/srt"],
    targetFormats: subNoSelf("srt"),
  },
  {
    ext: "ssa",
    name: "SSA",
    description:
      "SSA (SubStation Alpha) is the predecessor to the more capable ASS format, offering more styling options than SRT while being simpler in structure than ASS. It supports custom fonts, colors, positioning, and basic animation effects, and was the standard subtitle format in anime fansubbing communities before ASS gained prominence. SSA and ASS files share a similar file structure and are often treated interchangeably by modern media players.",
    category: "subtitle",
    mimeTypes: ["text/x-ssa"],
    targetFormats: subNoSelf("ssa"),
  },
  {
    ext: "sub",
    name: "SUB",
    description:
      "SUB (MicroDVD Subtitle) is a subtitle format that stores timing as video frame numbers rather than absolute timestamps, making it intrinsically frame-rate dependent. Each subtitle entry uses curly-brace notation for frame numbers and supports basic inline formatting. SUB is a legacy format from the DVD ripping era that is still supported by major media players, though SRT and VTT have largely replaced it for new subtitle content.",
    category: "subtitle",
    mimeTypes: ["text/x-microdvd"],
    targetFormats: subNoSelf("sub"),
  },
  {
    ext: "vtt",
    name: "VTT",
    description:
      "VTT (WebVTT, Web Video Text Tracks) is the W3C-standard subtitle and caption format for HTML5 video, designed to work natively in web browsers without plugins. It supports text cues with precise timing, multiple text tracks, and CSS-based styling for rich caption presentation. VTT is the required format for closed captions on web video platforms, streaming services, and accessibility-compliant applications.",
    category: "subtitle",
    mimeTypes: ["text/vtt"],
    targetFormats: subNoSelf("vtt"),
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Font
  // ═══════════════════════════════════════════════════════════════════════════
  {
    ext: "otf",
    name: "OTF",
    description:
      "OTF (OpenType Font) is a scalable font format co-developed by Microsoft and Adobe as an evolution of TrueType that adds advanced typographic capabilities. It supports ligatures, alternate glyphs, contextual substitutions, small caps, old-style figures, and broad multilingual character coverage in a single cross-platform file. OTF is the professional standard for typefaces used in design, publishing, and operating systems worldwide.",
    category: "font",
    mimeTypes: ["font/otf", "font/otf-font"],
    targetFormats: ["woff2"],
  },
  {
    ext: "ttf",
    name: "TTF",
    description:
      "TTF (TrueType Font) is a scalable outline font format developed by Apple and Microsoft in the late 1980s as a rival to Adobe's PostScript Type 1 technology. TrueType fonts include both mathematical outlines and hinting instructions that ensure readable rendering at small screen sizes on low-resolution displays. TTF is the most universally supported font format across Windows, macOS, Linux, iOS, and Android, and forms the technical foundation of the modern OpenType format.",
    category: "font",
    mimeTypes: ["font/ttf", "font/truetype"],
    targetFormats: ["woff2"],
  },
  {
    ext: "woff",
    name: "WOFF",
    description:
      "WOFF (Web Open Font Format) is a font packaging format optimized for efficient web delivery, developed by the W3C and supported by all modern browsers. It wraps TrueType or OpenType font data with zlib compression and metadata, typically reducing font file sizes by around 40% compared to raw TTF or OTF. WOFF replaced direct TTF/OTF embedding as the preferred web font delivery format before WOFF2 took over.",
    category: "font",
    mimeTypes: ["font/woff"],
    targetFormats: ["woff2"],
  },
  {
    ext: "woff2",
    name: "WOFF2",
    description:
      "WOFF2 (Web Open Font Format 2) is the modern web font format that supersedes WOFF, achieving around 30% better compression using the Brotli algorithm. Smaller font files translate directly to faster page loads, better Core Web Vitals scores, and improved user experience on slower connections. WOFF2 is supported by all modern browsers and is the strongly recommended format for serving custom web fonts in production.",
    category: "font",
    mimeTypes: ["font/woff2"],
    targetFormats: ["ttf"],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Other
  // ═══════════════════════════════════════════════════════════════════════════
  {
    ext: "drawio",
    name: "DrawIO",
    description:
      "Draw.io (now Diagrams.net) is a free, open-source diagramming application, and its .drawio format stores diagrams as XML preserving all shapes, connectors, styles, and layer information. It supports flowcharts, network diagrams, UML, entity-relationship diagrams, org charts, and hundreds of other diagram types. Draw.io files integrate directly with Google Drive, Confluence, Jira, and VS Code, and can be exported to PNG, SVG, and PDF.",
    category: "other",
    mimeTypes: ["application/x-drawio"],
    targetFormats: ["html", "md", "pdf", "png", "svg", "txt"],
  },
  {
    ext: "ics",
    name: "ICS",
    description:
      "ICS (iCalendar) is the standard calendar exchange format used by Google Calendar, Apple Calendar, Outlook, and most scheduling apps. It stores events with titles, times, locations, and descriptions as plain text. ICS files are easy to share and convert to JSON or CSV for spreadsheets and apps.",
    category: "other",
    mimeTypes: ["text/calendar"],
    targetFormats: ["csv", "json", "md", "txt"],
  },
  {
    ext: "m3u",
    name: "M3U",
    description:
      "M3U is a plain-text playlist format listing media URLs or file paths, often with optional track titles. It is widely used by music players and IPTV apps. Convert M3U playlists to JSON or CSV for editing, or to M3U8 for HLS-style playlists.",
    category: "other",
    mimeTypes: ["audio/x-mpegurl", "application/vnd.apple.mpegurl"],
    targetFormats: ["csv", "json", "m3u8", "txt"],
  },
  {
    ext: "m3u8",
    name: "M3U8",
    description:
      "M3U8 is the UTF-8 variant of M3U commonly used for HLS streaming playlists. Like M3U, it is a lightweight text list of media entries and metadata tags. It converts cleanly to M3U, JSON, CSV, or plain text.",
    category: "other",
    mimeTypes: ["application/vnd.apple.mpegurl", "audio/mpegurl"],
    targetFormats: ["csv", "json", "m3u", "txt"],
  },
  {
    ext: "p7m",
    name: "P7M",
    description:
      "P7M is a file format based on CMS (Cryptographic Message Syntax, RFC 5652) used for storing digitally signed or encrypted documents. It wraps the original file — most commonly a PDF or XML — together with one or more cryptographic digital signatures that can be verified to confirm the document's authenticity and integrity. P7M is widely used across Europe for legally binding electronic signatures compliant with the eIDAS regulation, and is required by Italian public administrations for official document exchange.",
    category: "other",
    mimeTypes: ["application/pkcs7-mime", "application/x-pkcs7-mime"],
    targetFormats: ["html", "pdf", "txt"],
  },
];

export const formats: FormatInfo[] = allFormats;

export function getFormatByExt(ext: string): FormatInfo | undefined {
  return formats.find((f) => f.ext === ext.toLowerCase());
}

/** Whether the UI/API lists this source→target pair as supported. */
export function isConversionPairListed(
  sourceExt: string,
  targetExt: string,
): boolean {
  const src = getFormatByExt(sourceExt);
  const tgt = targetExt.toLowerCase().replace(/^\./, "");
  if (!src || !tgt || src.ext === tgt) return false;
  return src.targetFormats.includes(tgt);
}

export function getFormatsByCategory(category: FormatCategory): FormatInfo[] {
  return formats.filter((f) => f.category === category);
}

export function getTargetFormats(inputExt: string): FormatInfo[] {
  const inputFormat = getFormatByExt(inputExt);
  if (!inputFormat) return [];
  return inputFormat.targetFormats
    .map((ext) => getFormatByExt(ext))
    .filter(Boolean) as FormatInfo[];
}

export function getCategoryCount(): Record<FormatCategory, number> {
  const counts = {} as Record<FormatCategory, number>;
  for (const f of formats) {
    counts[f.category] = (counts[f.category] || 0) + 1;
  }
  return counts;
}

export function getTotalConversions(): number {
  return formats.reduce((acc, f) => acc + f.targetFormats.length, 0);
}

export function detectCategory(mimeType: string): FormatCategory {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/") && !mimeType.includes("x-fli")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("powerpoint") ||
    mimeType.includes("presentation") ||
    mimeType.includes("keynote") ||
    mimeType.includes("iwork-keynote") ||
    mimeType.includes("slides")
  )
    return "presentation";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("text/plain") ||
    mimeType.includes("markdown") ||
    mimeType.includes("html") ||
    mimeType.includes("rtf") ||
    mimeType.includes("asciidoc") ||
    mimeType.includes("x-ipynb") ||
    mimeType.includes("x-muse") ||
    mimeType.includes("opendocument.text") ||
    mimeType.includes("x-opml") ||
    mimeType.includes("x-org") ||
    mimeType.includes("x-rst") ||
    mimeType.includes("x-tex") ||
    mimeType.includes("textile") ||
    mimeType.includes("message") ||
    mimeType.includes("outlook")
  )
    return "document";
  if (
    mimeType.includes("json") ||
    mimeType.includes("csv") ||
    mimeType.includes("yaml") ||
    mimeType.includes("xml") ||
    mimeType.includes("toml") ||
    mimeType.includes("tsv") ||
    mimeType.includes("environment") ||
    mimeType.includes("x-ini") ||
    mimeType.includes("jsonl") ||
    mimeType.includes("feather") ||
    mimeType.includes("opendocument.spreadsheet") ||
    mimeType.includes("x-orc") ||
    mimeType.includes("x-parquet") ||
    mimeType.includes("sqlite") ||
    mimeType.includes("x-toon") ||
    mimeType.includes("spreadsheetml") ||
    mimeType.includes("vcard")
  )
    return "data";
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("gzip") ||
    mimeType.includes("archive") ||
    mimeType.includes("7z") ||
    mimeType.includes("rar") ||
    mimeType.includes("bzip2") ||
    mimeType.includes("xz") ||
    mimeType.includes("zstd")
  )
    return "archive";
  if (
    mimeType.includes("epub") ||
    mimeType.includes("ebook") ||
    mimeType.includes("amazon") ||
    mimeType.includes("cbz") ||
    mimeType.includes("fb2") ||
    mimeType.includes("lrf") ||
    mimeType.includes("mobipocket") ||
    mimeType.includes("x-pdb") ||
    mimeType.includes("x-snb")
  )
    return "ebook";
  if (
    mimeType.includes("subtitle") ||
    mimeType.includes("srt") ||
    mimeType.includes("vtt")
  )
    return "subtitle";
  if (
    mimeType.includes("font") ||
    mimeType.includes("woff") ||
    mimeType.includes("otf") ||
    mimeType.includes("ttf")
  )
    return "font";
  return "other";
}
