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
  },
  typescript: {
    ignoreBuildErrors: true,
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
      "./assets/fonts/**",
    ],
    "/api/convert/archive": ["./node_modules/7zip-bin/**"],
    "/api/convert/document": [
      "./node_modules/pdf-parse/**",
      "./node_modules/@napi-rs/canvas/**",
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
};

export default nextConfig;
