import type { NextConfig } from "next";

/** Packages omitted from specific convert routes to stay under Vercel 250 MB / function. */
const COMMON_CONVERT_EXCLUDES = [
  "node_modules/ffprobe-static/**",
  "node_modules/ffmpeg-static/**",
  "node_modules/fluent-ffmpeg/**",
  "node_modules/@prisma/**",
  "node_modules/prisma/**",
  "node_modules/.prisma/**",
  "node_modules/typescript/**",
  "node_modules/@esbuild/**",
  "node_modules/webpack/**",
  "node_modules/.cache/**",
];

const IMAGE_ROUTE_EXCLUDES = [
  ...COMMON_CONVERT_EXCLUDES,
  "node_modules/xlsx/**",
  "node_modules/mammoth/**",
  "node_modules/sql.js/**",
  "node_modules/7zip-bin/**",
  "node_modules/7zip-min/**",
  "node_modules/hyparquet/**",
  "node_modules/hyparquet-writer/**",
  "node_modules/hyparquet-compressors/**",
  "node_modules/@lingo-reader/**",
  "node_modules/apache-arrow/**",
  "node_modules/sav-reader/**",
  "node_modules/dta/**",
  "node_modules/word-extractor/**",
  "node_modules/@kenjiuno/**",
  "node_modules/pptxgenjs/**",
  "node_modules/archiver/**",
  "node_modules/pdf-parse/**",
  "node_modules/@napi-rs/canvas/**",
  "node_modules/wawoff2/**",
];

const DATA_ROUTE_EXCLUDES = [
  ...COMMON_CONVERT_EXCLUDES,
  "node_modules/sharp/**",
  "node_modules/@img/**",
  "node_modules/ag-psd/**",
  "node_modules/7zip-bin/**",
  "node_modules/7zip-min/**",
  "node_modules/archiver/**",
  "node_modules/pdf-parse/**",
  "node_modules/@napi-rs/canvas/**",
  "node_modules/pptxgenjs/**",
  "node_modules/mammoth/**",
  "node_modules/wawoff2/**",
  "node_modules/ffmpeg-static/**",
  "node_modules/@lingo-reader/**",
];

const ARCHIVE_ROUTE_EXCLUDES = [
  ...COMMON_CONVERT_EXCLUDES,
  "node_modules/sharp/**",
  "node_modules/@img/**",
  "node_modules/ag-psd/**",
  "node_modules/mammoth/**",
  "node_modules/xlsx/**",
  "node_modules/sql.js/**",
  "node_modules/pdf-parse/**",
  "node_modules/@napi-rs/canvas/**",
  "node_modules/pptxgenjs/**",
  "node_modules/hyparquet/**",
  "node_modules/hyparquet-writer/**",
  "node_modules/hyparquet-compressors/**",
  "node_modules/@lingo-reader/**",
  "node_modules/apache-arrow/**",
  "node_modules/wawoff2/**",
];

const DOCUMENT_ROUTE_EXCLUDES = [
  ...COMMON_CONVERT_EXCLUDES,
  "node_modules/sharp/**",
  "node_modules/@img/**",
  "node_modules/ag-psd/**",
  "node_modules/7zip-bin/**",
  "node_modules/archiver/**",
  "node_modules/hyparquet/**",
  "node_modules/hyparquet-writer/**",
  "node_modules/hyparquet-compressors/**",
  "node_modules/@lingo-reader/**",
  "node_modules/apache-arrow/**",
  "node_modules/wawoff2/**",
  "node_modules/ffmpeg-static/**",
];

const vercelDeploy = Boolean(process.env.VERCEL);
const maxUploadMb = vercelDeploy ? "4" : process.env.MAX_UPLOAD_SIZE_MB || "100";

const nextConfig: NextConfig = {
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  env: {
    NEXT_PUBLIC_MAX_UPLOAD_MB: process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || maxUploadMb,
    NEXT_PUBLIC_VERCEL: vercelDeploy ? "1" : "0",
    NEXT_PUBLIC_AUDIO_ENABLED: vercelDeploy ? "0" : "1",
    NEXT_PUBLIC_VIDEO_ENABLED: vercelDeploy ? "0" : "1",
    NEXT_PUBLIC_MEDIA_ENABLED: vercelDeploy ? "0" : "1",
    NEXT_PUBLIC_CONVERT_API_URL: process.env.NEXT_PUBLIC_CONVERT_API_URL || "",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
    NEXT_PUBLIC_GOOGLE_AUTH: process.env.NEXT_PUBLIC_GOOGLE_AUTH || "0",
  },
  typescript: {
    // Fail the build on type errors — do not ship with ignoreBuildErrors.
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,

  outputFileTracingExcludes: {
    "*": [
      "node_modules/ffprobe-static/**",
      "node_modules/@img/sharp-libvips-darwin*/**",
      "node_modules/@img/sharp-libvips-win32*/**",
      "node_modules/@img/sharp-darwin*/**",
      "node_modules/@img/sharp-win32*/**",
      "node_modules/prisma/libquery_engine-darwin*/**",
      "node_modules/prisma/libquery_engine-windows*/**",
      "node_modules/.prisma/client/libquery_engine-darwin*/**",
      "node_modules/.prisma/client/libquery_engine-windows*/**",
    ],
    "/api/convert/image": IMAGE_ROUTE_EXCLUDES,
    "/api/convert/data": DATA_ROUTE_EXCLUDES,
    "/api/convert/archive": ARCHIVE_ROUTE_EXCLUDES,
    "/api/convert/document": DOCUMENT_ROUTE_EXCLUDES,
    "/api/convert/other": [
      ...COMMON_CONVERT_EXCLUDES,
      "node_modules/pdf-parse/**",
      "node_modules/@napi-rs/canvas/**",
    ],
    "/api/convert": COMMON_CONVERT_EXCLUDES,
  },

  outputFileTracingIncludes: {
    "/api/convert/image": [
      "./node_modules/sharp/**",
      "./node_modules/@img/**",
      "./assets/fonts/**",
    ],
    "/api/convert/data": [
      "./node_modules/sql.js/dist/**",
      "./node_modules/xlsx/**",
      "./node_modules/hyparquet/**",
      "./node_modules/hyparquet-writer/**",
      "./node_modules/hyparquet-compressors/**",
      "./assets/fonts/**",
    ],
    "/api/convert/archive": ["./node_modules/7zip-bin/**"],
    "/api/convert/document": [
      "./node_modules/pdf-parse/**",
      "./node_modules/@napi-rs/canvas/**",
      "./assets/fonts/**",
    ],
    "/api/convert/other": [
      "./node_modules/@lingo-reader/mobi-parser/**",
      "./node_modules/@lingo-reader/shared/**",
      "./assets/fonts/**",
    ],
    "/api/pdf-split": [
      "./node_modules/pdf-parse/**",
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/sharp/**",
      "./node_modules/@img/**",
      "./assets/fonts/**",
    ],
  },

  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    "sharp",
    "pdf-lib",
    "pdf-parse",
    "pdf-parse/worker",
    "@napi-rs/canvas",
    "archiver",
    "jszip",
    "hyparquet",
    "hyparquet-writer",
    "hyparquet-compressors",
    "@lingo-reader/mobi-parser",
    "@lingo-reader/shared",
    "sql.js",
    "7zip-min",
    "7zip-bin",
    "apache-arrow",
    "sav-reader",
    "word-extractor",
    "@kenjiuno/msgreader",
    "node-forge",
    "dta",
    "ag-psd",
  ],

  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/icon.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/apple-touch-icon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/og-image.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/og-image.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/logo-mark.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
      {
        source: "/logo-mark.webp",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
      {
        source: "/logo-mark-fallback.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
      {
        source: "/icon-512.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=2592000",
          },
        ],
      },
      {
        source: "/api/convert/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.ALLOWED_ORIGIN || "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, X-File-Name, X-Target-Format, X-Quality, X-Width, X-Height, X-Upload-Id, X-Chunk-Index, X-Chunk-Total, X-Total-Size",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400",
          },
        ],
      },
      {
        source: "/api/formats",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.ALLOWED_ORIGIN || "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
      {
        source: "/api/bookmarks",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.ALLOWED_ORIGIN || "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  /**
   * Host canonicalization backup (middleware is primary).
   * Use 301 — Next `permanent: true` emits 308 + Refresh, which Google
   * Search Console reports as "Redirect error" on convertek.tech.
   * Exclude /api/* so chunk uploads are not redirected.
   */
  async redirects() {
    const toWww = (
      source: string,
      host: string,
    ): {
      source: string;
      has: { type: "host"; value: string }[];
      destination: string;
      statusCode: 301;
    } => ({
      source,
      has: [{ type: "host", value: host }],
      destination:
        source === "/"
          ? "https://www.convertek.tech/"
          : "https://www.convertek.tech/:path*",
      statusCode: 301,
    });

    const hosts = [
      "convertek.tech",
      "cloudconveter.tech",
      "www.cloudconveter.tech",
      "cloudconverter.tech",
      "www.cloudconverter.tech",
    ];

    return hosts.flatMap((host) => [
      toWww("/:path((?!api/).*)", host),
      toWww("/", host),
    ]);
  },
};

export default nextConfig;
