# IMPLEMENTATION.md

## Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn-style UI primitives
- Prisma
- Vitest

## Project Shape

- `src/app` contains pages and API route handlers.
- `src/components` contains reusable and feature-specific UI.
- `src/lib` contains shared app logic, conversion helpers, auth helpers, and utilities.
- `prisma` contains the database schema and seed scripts.
- `docs` contains generated or deployment-specific supporting documentation.

## Conversion Flow

1. The UI collects the source file or URL and target format.
2. The frontend calls the appropriate conversion API route.
3. API handlers validate input, limits, and supported formats.
4. Conversion logic runs through shared library helpers.
5. The route returns either the converted file or a structured error.

## Verification

Before completing changes:

- Run unit tests.
- Run TypeScript checks.
- Run lint checks.
- Confirm touched routes/components still match existing response and UI patterns.

## Maintenance Notes

- Keep conversion support data aligned with actual converter capabilities.
- Keep deployment limits explicit, especially for Vercel upload and bundle limits.
- Keep docs synchronized when architecture or setup changes.
