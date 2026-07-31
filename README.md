# zConvert — File Converter

Browser-based file conversion (Next.js + Prisma).

## Quick start

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Default upload limit on self-hosted servers: **100 MB** (`MAX_UPLOAD_SIZE_MB`).

## Verify before release

```bash
npm run verify
```

Runs TypeScript check, ESLint, and Vitest (including conversion smoke tests).

## Deploy notes

- Self-hosted: enable media via `NEXT_PUBLIC_MEDIA_ENABLED=1` (default when not on Vercel). Install ffmpeg, LibreOffice, Calibre as needed — see `.env.example`.
- Vercel + worker: see [docs/ORACLE_VERCEL_SETUP.md](docs/ORACLE_VERCEL_SETUP.md).
- Admin bootstrap: set `ADMIN_SETUP_SECRET`, then `POST /api/admin/setup`.
