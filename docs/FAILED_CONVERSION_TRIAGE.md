# Failed conversion triage — 90-day export (2026-10-04)

Source: `convertek-failed-conversions-detail-90d-2026-10-04.csv` (~90 rows).

The export spans 90 days, so it mixes failures that have **already been fixed** by
earlier deploys with ones that are still live. Each group below was reproduced
locally before being classified.

---

## Fixed in this batch

| Failures | Problem | Fix |
|---|---|---|
| 5 | `icns -> svg/png` — "ICNS has no embedded PNG" | `decodeIcns` only accepted PNG payloads. Real macOS icons store JPEG (`ic07`/`ic08`) or JPEG 2000. All three are now accepted, largest wins. |
| 5 | `ico -> *` — "Invalid BMP data in icon" | An `.ico` payload is a bare `BITMAPINFOHEADER` with **no `BM` signature**, so it was routed to the `.BMP` reader and rejected. Added `decodeDibToRgba`, which handles the missing file header, the doubled height (colour bits + AND mask), palettes, 16-bit BI_BITFIELDS and 1/4/8/16/24/32 bpp. |
| 1 | `jpg -> avif` — "too large for the HEIF format" | AVIF now retries once at 8192px when HEIF rejects the pixel area, instead of failing. |
| — | `pdf -> tsv`, `docx -> tsv` (6) | **Already fixed** before this batch — reproduced as passing. |

### The severe one: ICNS denial of service

`decodeIcns` advanced its cursor with `pos += len` where `len` was read straight
from the file. A chunk declaring a length below 8 — including zero — left the
cursor in place and **looped forever**.

This was not merely a failed conversion. Each hung request occupies a
`CONVERT_MAX_CONCURRENT` slot (5) until the dyno times out, so five uploads were
enough to stop the site serving any conversion at all. A malformed or truncated
`.icns` was enough to trigger it.

The loop now bails on any chunk that cannot make progress, and the regression
test asserts both the error **and** that it returns in under five seconds.

---

## Fixed later — `mpo -> jpg`: "premature end of JPEG image"

The earlier "already fixed" note for `mpo` was wrong: it had been reproduced with
two plain JPEGs concatenated. Real MPO files also carry an **MPF APP2 index** and
frequently an **EXIF thumbnail** (APP1), and both contain their own `FFD8…FFD9`
pair. `decodeMpoFirstJpeg` searched for the first `FFD8` and then the first
`FFD9`, so it cut the primary image short at the thumbnail (or inside the MPF
index) and handed libjpeg a truncated segment list — the exact production error.

Frame extraction now walks the JPEG marker structure instead of byte pairs, and
uses the MPF index for the frame boundary when one is present. Fixtures cover a
two-frame MPO, one with an EXIF thumbnail, and a single-frame `.mpo`.

---

## Fixed later — `dta -> csv`: strL and categorical value labels

**DTA (Stata): ~8 failures.** The `dta` npm package is `v0.0.2` and unmaintained.
It throws an internal `TypeError` on two features real Stata files use:

- **strL fields** (strings over ~2045 chars) → `Cannot read properties of undefined (reading '1')`
- **categorical value labels** → `Cannot read properties of undefined (reading 'length')`

The first turned out to be broader than "a missing value dereferences undefined":
the package cannot resolve *any* strL cell, because the pointer it looks up is
keyed differently from the one it stores. The second is not a data problem at
all — its label pass walks `ws["!data"]`, a SheetJS internal the installed xlsx
build no longer produces, so **every** file with a value label failed.

`src/lib/dta-reader.ts` is a self-contained 117–121 reader that handles strL,
value labels and missing values. `readDtaRecords` still calls the package first
and only falls back to the new reader when it throws, so every file that already
converted keeps its exact current output. Expected values for all sixteen
fixtures were cross-checked against pandas' `read_stata`.

The `dta -> *` failures reading **"Not a DTA file"** are *not* a bug: the upload
was not a Stata file, and the message is correct.

---

## Environment — server configuration, not code

| Failures | Needs |
|---|---|
| ~10 | `mp4 -> mp3`, `mp3 -> ogg` — "Audio codec mp3 is not available": the bundled ffmpeg has no MP3 encoder. Requires an ffmpeg build with `libmp3lame`. |
| 5 | `zip -> rar` — "RAR packaging is not available": RAR creation needs a proprietary WinRAR/rar CLI (`RAR_BIN`). |
| 3 | `md -> doc` — requires LibreOffice (`SOFFICE_BIN`). |
| 2 | `azw3/mobi -> md` — requires Calibre (`CALIBRE_EBOOK_CONVERT_BIN`). |
| 4 | `heic -> *` — needs libheif in the sharp build. |
| 5 | `feather/parquet -> *` — compressed batches need ZSTD/Brotli codecs. |
| 5 | `rar -> *` — "7-zip exited with code 2": corrupt or password-protected RAR. **Config is fine**; unrar is present. |

Each of these currently returns a clear, actionable message. `npm run preflight`
reports the missing tools as warnings.

---

## Not bugs — correct behaviour on invalid input

These are the largest single group and none of them should be "fixed":

- **`sav -> *` (~20)** — "not a valid SPSS statistics (.sav) dataset". `.sav` is
  overwhelmingly used for game saves, not SPSS. The message already says so.
- **`json -> *` (7)** — malformed JSON. The parser reports the exact byte offset.
- **`tar -> *` (2)** — corrupt or truncated tar. Message is accurate.

---

## Summary

- **Real code bugs: 11 rows**, including one denial-of-service. All fixed.
- **Real code bugs: ~12 more rows** (`mpo`, `dta`) found after this export was
  written, also fixed — see the two sections above.
- **Already fixed by earlier deploys: 10 rows** — no action, verified passing.
- **Environment/config: ~34 rows** — need server packages, not code.
- **User input: ~35 rows** — working as intended.