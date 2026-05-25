# DESIGN.md

## Product

zConvert is a browser-based file conversion application focused on fast, simple conversion flows across common file categories.

## UX Principles

- Keep the converter as the primary first-screen experience.
- Make upload, target format selection, conversion, and download obvious.
- Prefer compact, scannable controls over marketing-heavy layouts.
- Show clear errors when a conversion is unsupported or fails.
- Preserve accessibility for keyboard and screen-reader users.

## Visual Direction

- Use the existing Tailwind and shadcn-style component system.
- Keep UI primitives consistent with the current application.
- Avoid unrelated redesigns during feature or bug fixes.
- Keep responsive behavior stable across desktop and mobile.

## Implementation Boundaries

- UI components should not contain conversion business logic.
- Shared behavior belongs in existing library/helper modules.
- API responses should remain compatible with `API_CONTRACTS.md`.
- New conversion support should be added only when the backend can actually perform it.
