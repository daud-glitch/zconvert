# REQUIREMENTS.md

## Functional Requirements

- Users can browse supported formats and conversion targets.
- Users can upload files or provide supported remote file URLs.
- Users can convert files through category-specific conversion routes.
- Users can download converted outputs.
- Authenticated users can access profile, history, and bookmarks.
- Admin users can manage formats, categories, pages, ads, settings, links, users, and analytics.

## API Requirements

- API responses must follow the success/error shapes documented in `API_CONTRACTS.md`.
- Protected routes must validate authentication and authorization.
- Inputs must be validated before processing.
- Unsupported conversions must return clear, predictable errors.

## Operational Requirements

- The app must build without TypeScript errors before production release.
- Automated tests should pass before release.
- Linting should run through the configured ESLint setup.
- Environment variables must be documented in `.env.example` and README material.

## Non-Goals

- Do not advertise conversions that cannot be completed by backend logic.
- Do not add heavy dependencies without a clear conversion or platform need.
- Do not rewrite existing modules without a specific bug or requirement.
