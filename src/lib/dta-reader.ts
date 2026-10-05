/**
 * Stata `.dta` reader for releases 117-121 (the tagged XML-ish container).
 *
 * The `dta` npm package (v0.0.2) is unmaintained and throws internal
 * TypeErrors on two things real Stata files use:
 *
 *  - long strings (strL). A strL cell in the data section points at a record in
 *    the `<strls>` table, and a missing string has no record at all, so the
 *    package dereferences `undefined`.
 *  - categorical value labels. Its label pass walks `ws["!data"]`, an internal
 *    SheetJS field the installed xlsx build no longer produces.
 *
 * Both surfaced in production as `DTA Parse Error: Cannot read properties of
 * undefined`. This reader is used as a fallback so files that already convert
 * keep their exact current output.
 */

interface Cursor {
  b: Buffer;
  p: number;
  le: boolean;
}

// Stata marks missing numbers with values above these bounds.
const MISSING = {
  byte: 100,
  int: 32740,
  long: 2147483620,
  float: 1701e35,
  double: 8988e304,
} as const;

/** Storage widths of the fixed-width string fields, which grow in release 118. */
const W = {
  name: (release: number) => (release >= 118 ? 129 : 33),
  format: (release: number) => (release >= 118 ? 57 : 49),
  variableLabel: (release: number) => (release >= 118 ? 321 : 81),
};

function tag(c: Cursor, text: string): void {
  if (c.b.toString("latin1", c.p, c.p + text.length) !== text) {
    throw new Error(`expected ${text} at byte ${c.p}, found the DTA structure invalid`);
  }
  c.p += text.length;
}

function take(c: Cursor, n: number): Buffer {
  if (c.p + n > c.b.length) {
    throw new Error(`DTA file ended early at byte ${c.p}`);
  }
  const out = c.b.subarray(c.p, c.p + n);
  c.p += n;
  return out;
}

function u8(c: Cursor): number {
  return take(c, 1).readUInt8(0);
}
function u16(c: Cursor): number {
  const b = take(c, 2);
  return c.le ? b.readUInt16LE(0) : b.readUInt16BE(0);
}
function u32(c: Cursor): number {
  const b = take(c, 4);
  return c.le ? b.readUInt32LE(0) : b.readUInt32BE(0);
}
function u64(c: Cursor): number {
  const lo = u32(c);
  const hi = u32(c);
  return c.le ? lo + hi * 2 ** 32 : hi + lo * 2 ** 32;
}
function i8(c: Cursor): number | null {
  const v = c.b[c.p++];
  const signed = v > 127 ? v - 256 : v;
  return signed > MISSING.byte ? null : signed;
}
function i16(c: Cursor): number | null {
  const raw = c.le ? take(c, 2).readInt16LE(0) : take(c, 2).readInt16BE(0);
  return raw > MISSING.int ? null : raw;
}
function i32(c: Cursor): number | null {
  const raw = c.le ? take(c, 4).readInt32LE(0) : take(c, 4).readInt32BE(0);
  return raw > MISSING.long ? null : raw;
}
function f32(c: Cursor): number | null {
  const raw = c.le ? take(c, 4).readFloatLE(0) : take(c, 4).readFloatBE(0);
  return raw > MISSING.float ? null : raw;
}
function f64(c: Cursor): number | null {
  const raw = c.le ? take(c, 8).readDoubleLE(0) : take(c, 8).readDoubleBE(0);
  return raw > MISSING.double ? null : raw;
}

/** Read a padded field and cut it at its first NUL. */
function fixed(c: Cursor, width: number, encoding: BufferEncoding): string {
  const raw = take(c, width).toString(encoding);
  const nul = raw.indexOf("\0");
  return nul === -1 ? raw : raw.slice(0, nul);
}

/**
 * Read a `.dta` file into plain rows keyed by variable name.
 *
 * Categorical variables are returned as their value label ("A") when the file
 * defines one, otherwise the underlying number is kept.
 */
export function readDtaRows(input: Buffer): Record<string, unknown>[] {
  const c: Cursor = { b: input, p: 0, le: true };
  tag(c, "<stata_dta>");
  tag(c, "<header>");
  tag(c, "<release>");
  const release = Number(take(c, 3).toString("latin1"));
  tag(c, "</release>");
  if (![117, 118, 119, 120, 121].includes(release)) {
    throw new Error(`unsupported DTA release ${release}`);
  }
  tag(c, "<byteorder>");
  const order = take(c, 3).toString("latin1");
  tag(c, "</byteorder>");
  if (order !== "LSF" && order !== "MSF") {
    throw new Error(`unsupported DTA byte order ${order}`);
  }
  c.le = order === "LSF";
  const encoding: BufferEncoding = release >= 118 ? "utf8" : "latin1";

  tag(c, "<K>");
  const nvar = release === 119 || release >= 121 ? u32(c) : u16(c);
  tag(c, "</K>");
  tag(c, "<N>");
  const nobs = release === 117 ? u32(c) : u64(c);
  tag(c, "</N>");
  tag(c, "<label>");
  // 117 stores the dataset label length in one byte, 118+ in two.
  const labelLen = release >= 118 ? u16(c) : u8(c);
  if (labelLen > 0) take(c, labelLen);
  tag(c, "</label>");
  tag(c, "<timestamp>");
  take(c, u8(c));
  tag(c, "</timestamp>");
  tag(c, "</header>");

  tag(c, "<map>");
  take(c, 14 * 8);
  tag(c, "</map>");

  tag(c, "<variable_types>");
  const types: number[] = [];
  for (let i = 0; i < nvar; i++) types.push(u16(c));
  tag(c, "</variable_types>");

  tag(c, "<varnames>");
  const names: string[] = [];
  for (let i = 0; i < nvar; i++) {
    names.push(fixed(c, W.name(release), encoding));
  }
  tag(c, "</varnames>");

  tag(c, "<sortlist>");
  take(c, (2 * nvar + 2) * (release === 119 || release === 121 ? 2 : 1));
  tag(c, "</sortlist>");

  tag(c, "<formats>");
  for (let i = 0; i < nvar; i++) fixed(c, W.format(release), encoding);
  tag(c, "</formats>");

  tag(c, "<value_label_names>");
  const labelNames: string[] = [];
  for (let i = 0; i < nvar; i++) {
    labelNames.push(fixed(c, W.name(release), encoding));
  }
  tag(c, "</value_label_names>");

  tag(c, "<variable_labels>");
  take(c, W.variableLabel(release) * nvar);
  tag(c, "</variable_labels>");

  tag(c, "<characteristics>");
  while (c.b.toString("latin1", c.p, c.p + 4) === "<ch>") {
    c.p += 4;
    take(c, u32(c));
    tag(c, "</ch>");
  }
  tag(c, "</characteristics>");

  // ── data ────────────────────────────────────────────────────────────────
  tag(c, "<data>");
  const rows: Record<string, unknown>[] = [];
  const strlRefs: { row: number; col: number; v: number; o: number }[] = [];
  for (let r = 0; r < nobs; r++) {
    const row: Record<string, unknown> = {};
    for (let col = 0; col < nvar; col++) {
      const t = types[col];
      if (t >= 1 && t <= 2045) {
        row[names[col]] = fixed(c, t, encoding);
        continue;
      }
      switch (t) {
        case 65530:
          row[names[col]] = i8(c);
          break;
        case 65529:
          row[names[col]] = i16(c);
          break;
        case 65528:
          row[names[col]] = i32(c);
          break;
        case 65527:
          row[names[col]] = f32(c);
          break;
        case 65526:
          row[names[col]] = f64(c);
          break;
        case 32768: {
          // v (field index) and o (observation) identify a strL record.
          let v: number;
          let o: number;
          if (release === 117) {
            v = u32(c);
            o = u32(c);
          } else if (release === 118 || release === 120) {
            v = u16(c);
            o = u16(c) + u32(c) * 65536;
          } else {
            v = u16(c) + u8(c) * 65536;
            o = u8(c) + u32(c) * 256;
          }
          strlRefs.push({ row: r, col, v, o });
          row[names[col]] = "";
          break;
        }
        case 65525:
          // Zero-width placeholder; nothing to read.
          row[names[col]] = null;
          break;
        default:
          throw new Error(`unsupported DTA field type ${t} for ${names[col]}`);
      }
    }
    rows.push(row);
  }
  tag(c, "</data>");

  // ── strls ───────────────────────────────────────────────────────────────
  tag(c, "<strls>");
  const strings = new Map<string, string>();
  while (c.b.toString("latin1", c.p, c.p + 3) === "GSO") {
    c.p += 3;
    // Layout is GSO + v + o for every release (117 uses 32-bit o, 118+ 64-bit).
    const v = u32(c);
    const o = release === 117 ? u32(c) : u64(c);
    const type = u8(c);
    const len = u32(c);
    // 129 stores the string with its trailing NUL, 130 without it.
    const raw = take(c, len);
    const decoded = raw.toString(encoding);
    const value =
      type === 130 ? decoded.replace(/\0+$/, "") : decoded.replace(/\0$/, "");
    strings.set(`${o}:${v}`, value);
  }
  tag(c, "</strls>");
  for (const ref of strlRefs) {
    // A missing string is stored as 0:0 and has no record at all.
    rows[ref.row][names[ref.col]] = strings.get(`${ref.o}:${ref.v}`) ?? "";
  }

  // ── value_labels ────────────────────────────────────────────────────────
  tag(c, "<value_labels>");
  const labelSets = new Map<string, Map<number, string>>();
  while (c.b.toString("latin1", c.p, c.p + 5) === "<lbl>") {
    c.p += 5;
    // The record length is informational: the fields below are read directly.
    u32(c);
    const setName = fixed(c, W.name(release), "latin1");
    take(c, 3); // padding
    const n = u32(c);
    const txtlen = u32(c);
    const offsets: number[] = [];
    const values: number[] = [];
    for (let i = 0; i < n; i++) offsets.push(u32(c));
    for (let i = 0; i < n; i++) values.push(u32(c));
    const blob = take(c, txtlen).toString("latin1");
    const set = new Map<number, string>();
    for (let i = 0; i < n; i++) {
      const start = offsets[i];
      const stop = blob.indexOf("\0", start);
      set.set(values[i], blob.slice(start, stop === -1 ? undefined : stop));
    }
    labelSets.set(setName, set);
    tag(c, "</lbl>");
  }
  tag(c, "</value_labels>");
  for (let col = 0; col < nvar; col++) {
    const set = labelSets.get(labelNames[col]);
    if (!set) continue;
    for (const row of rows) {
      const value = row[names[col]];
      if (typeof value !== "number") continue;
      const label = set.get(value);
      if (label !== undefined) row[names[col]] = label;
    }
  }

  tag(c, "</stata_dta>");
  return rows;
}