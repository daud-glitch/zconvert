/**
 * P7M / CMS (PKCS#7, RFC 5652) content extraction.
 *
 * Real-world `.p7m` files are produced by many different signers, and the
 * node-forge `pkcs7.messageFromAsn1` path this replaced only understood one of
 * them: a DER-encoded signedData whose encapsulated content forge happened to
 * decode into `msg.content`. Everything else parsed "successfully" but left
 * `content` undefined, so callers got the flat message "Could not extract
 * content from P7M signature" with no hint about why.
 *
 * The variants that actually occur, all handled here:
 *  - BER indefinite lengths (older Italian CAdES signers emit these, and
 *    `asn1.fromDer` rejects them outright);
 *  - PEM armour (`-----BEGIN PKCS7-----`) instead of raw DER;
 *  - S/MIME wrappers, where MIME headers precede a base64 body;
 *  - segmented (constructed) OCTET STRINGs holding the document;
 *  - nested CMS, where the encapsulated content is itself signedData;
 *  - and the two cases that genuinely cannot convert, enveloped/encrypted data
 *    and detached signatures, which now say so instead of failing vaguely.
 *
 * Walking the DER tree to reach `eContent` needs only a few dozen lines and no
 * dependency, so that is what this does.
 */

const CMS_DATA = "1.2.840.113549.1.7.1";
const CMS_SIGNED_DATA = "1.2.840.113549.1.7.2";
const CMS_ENVELOPED_DATA = "1.2.840.113549.1.7.3";
const CMS_SIGNED_AND_ENVELOPED = "1.2.840.113549.1.7.4";
const CMS_DIGESTED_DATA = "1.2.840.113549.1.7.5";
const CMS_ENCRYPTED_DATA = "1.2.840.113549.1.7.6";

const UNIVERSAL = 0;
const CONTEXT = 2;

const TAG_INTEGER = 2;
const TAG_OCTET_STRING = 4;
const TAG_OID = 6;
const TAG_SEQUENCE = 16;
const TAG_SET = 17;

type Tlv = {
  cls: number;
  constructed: boolean;
  num: number;
  /** Offset of the first content byte. */
  start: number;
  /** Offset one past the last content byte. */
  end: number;
  indefinite: boolean;
};

function fail(reason: string): never {
  throw new Error(`Cannot read this .p7m file: ${reason}`);
}

/**
 * Read one TLV at `pos`, supporting short, long and indefinite lengths.
 *
 * Indefinite length is BER-only and ends at a 00 00 end-of-contents marker, so
 * the end offset is found by walking the children rather than by arithmetic.
 */
function readTlv(buf: Buffer, pos: number): Tlv {
  if (pos + 2 > buf.length) fail("the ASN.1 structure is truncated.");

  const first = buf[pos];
  const cls = first >> 6;
  const constructed = (first & 0x20) !== 0;
  let num = first & 0x1f;
  let cursor = pos + 1;

  if (num === 0x1f) {
    // High tag number form: base-128, high bit set on all but the last byte.
    num = 0;
    let bytes = 0;
    for (;;) {
      if (cursor >= buf.length) fail("a type tag is truncated.");
      const b = buf[cursor++];
      num = num * 128 + (b & 0x7f);
      if (++bytes > 4) fail("a type tag is implausibly long.");
      if ((b & 0x80) === 0) break;
    }
  }

  if (cursor >= buf.length) fail("a length field is truncated.");
  const lenByte = buf[cursor++];

  if (lenByte === 0x80) {
    if (!constructed) fail("a primitive value uses an indefinite length.");
    const start = cursor;
    let scan = start;
    for (;;) {
      if (scan + 1 >= buf.length) fail("an indefinite-length value never ends.");
      if (buf[scan] === 0x00 && buf[scan + 1] === 0x00) {
        return {
          cls,
          constructed,
          num,
          start,
          end: scan,
          indefinite: true,
        };
      }
      scan = readTlv(buf, scan).end;
    }
  }

  if (lenByte < 0x80) {
    const end = cursor + lenByte;
    if (end > buf.length) fail("a value runs past the end of the file.");
    return { cls, constructed, num, start: cursor, end, indefinite: false };
  }

  const count = lenByte & 0x7f;
  if (count > 4) fail("a length field uses an unsupported size.");
  if (cursor + count > buf.length) fail("a length field is truncated.");
  let length = 0;
  for (let i = 0; i < count; i++) length = length * 256 + buf[cursor++];
  const end = cursor + length;
  if (end > buf.length) fail("a value runs past the end of the file.");
  return { cls, constructed, num, start: cursor, end, indefinite: false };
}

/** Iterate the direct children of a constructed value. */
function* children(buf: Buffer, of: Tlv): Generator<Tlv> {
  let pos = of.start;
  while (pos < of.end) {
    if (buf[pos] === 0x00 && buf[pos + 1] === 0x00 && of.indefinite) return;
    const child = readTlv(buf, pos);
    yield child;
    pos = child.end;
  }
}

function asArray(buf: Buffer, of: Tlv): Tlv[] {
  return [...children(buf, of)];
}

function expectTag(buf: Buffer, tlv: Tlv, num: number, what: string): void {
  if (tlv.cls !== UNIVERSAL || tlv.num !== num) fail(`expected ${what}.`);
}

function decodeOid(buf: Buffer, tlv: Tlv): string {
  expectTag(buf, tlv, TAG_OID, "an object identifier");
  const parts: number[] = [];
  let value = 0;
  for (let i = tlv.start; i < tlv.end; i++) {
    const b = buf[i];
    value = value * 128 + (b & 0x7f);
    if ((b & 0x80) === 0) {
      parts.push(value);
      value = 0;
    }
  }
  if (parts.length === 0) fail("an object identifier is empty.");
  const first = parts[0];
  const head = first < 40 ? [0, first] : first < 80 ? [1, first - 40] : [2, first - 80];
  return [...head, ...parts.slice(1)].join(".");
}

/**
 * Collect an OCTET STRING, concatenating the segments of a constructed one.
 *
 * BER allows the document to be split across several primitives; signers that
 * streamed a large PDF produce exactly that.
 */
function octetStringBytes(buf: Buffer, tlv: Tlv): Buffer {
  // A primitive [0] is the OCTET STRING with its tag replaced (IMPLICIT form).
  if (!tlv.constructed && tlv.cls === CONTEXT && tlv.num === 0) {
    return buf.subarray(tlv.start, tlv.end);
  }
  if (!tlv.constructed) {
    expectTag(buf, tlv, TAG_OCTET_STRING, "an OCTET STRING");
    return buf.subarray(tlv.start, tlv.end);
  }
  const parts: Buffer[] = [];
  for (const child of children(buf, tlv)) {
    if (child.cls === UNIVERSAL && child.num === TAG_OCTET_STRING) {
      parts.push(octetStringBytes(buf, child));
    }
  }
  if (parts.length === 0) fail("a segmented OCTET STRING has no segments.");
  return Buffer.concat(parts);
}

// ─── Container normalisation ───────────────────────────────────────────────

const BEGIN_ARMOUR = /-----BEGIN [^-]*-----/;

/** Base64 with line breaks and optional trailing junk, decoded leniently. */
function decodeBase64Loose(text: string): Buffer | null {
  const cleaned = text.replace(/[^A-Za-z0-9+/=]/g, "");
  if (cleaned.length < 24) return null;
  const bytes = Buffer.from(cleaned, "base64");
  return bytes.length ? bytes : null;
}

const looksLikeDer = (b: Buffer) =>
  b.length > 2 && (b[0] === 0x30 || b[0] === 0x31);

/**
 * Strip PEM armour, S/MIME headers and base64 transport, so the caller always
 * sees raw DER/BER.
 */
export function normaliseP7mContainer(input: Buffer): Buffer {
  let buf = input;

  // Windows signers sometimes prepend a UTF-8 BOM to the armour.
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    buf = buf.subarray(3);
  }

  if (looksLikeDer(buf)) return buf;

  const text = buf.toString("latin1");
  const armoured = BEGIN_ARMOUR.exec(text);
  if (armoured) {
    const body = text.slice(armoured.index + armoured[0].length);
    const end = body.search(/-----END [^-]*-----/);
    const decoded = decodeBase64Loose(end === -1 ? body : body.slice(0, end));
    if (decoded && looksLikeDer(decoded)) return decoded;
    fail("the PEM armour does not contain base64 PKCS#7 data.");
  }

  // S/MIME: headers, a blank line, then the (usually base64) body.
  const headerEnd = text.search(/\r?\n\r?\n/);
  const headers = headerEnd === -1 ? "" : text.slice(0, headerEnd).toLowerCase();
  if (headerEnd !== -1 && /^(content-type|content-transfer-encoding|mime-version):/m.test(headers)) {
    const body = text.slice(headerEnd).replace(/^\r?\n\r?\n/, "");
    const decoded = decodeBase64Loose(body);
    if (decoded && looksLikeDer(decoded)) return decoded;
    fail("the S/MIME body is not base64 PKCS#7 data.");
  }

  // Last resort: a bare base64 file with no headers at all.
  const decoded = decodeBase64Loose(text);
  if (decoded && looksLikeDer(decoded)) return decoded;

  fail(
    `${buf[0] === undefined ? "the file is empty" : `it starts with byte 0x${buf[0].toString(16).padStart(2, "0")}`}, not with an ASN.1 sequence. Is it really a signed .p7m file?`,
  );
}

// ─── CMS walking ───────────────────────────────────────────────────────────

type ContentInfo = { oid: string; value: Tlv | null };

function parseContentInfo(buf: Buffer): ContentInfo {
  const root = readTlv(buf, 0);
  expectTag(buf, root, TAG_SEQUENCE, "a CMS ContentInfo sequence");
  const [oidTlv, wrapper] = asArray(buf, root);
  if (!oidTlv) fail("the ContentInfo has no content type.");
  // The payload sits inside the [0] EXPLICIT wrapper; a malformed file may
  // omit the wrapper, in which case the raw element is all we have.
  const value = wrapper ? (explicitInner(buf, wrapper) ?? wrapper) : null;
  return { oid: decodeOid(buf, oidTlv), value };
}

/**
 * The [0] EXPLICIT wrapper's single inner value.
 *
 * A few signers emit the field IMPLICIT instead (a primitive [0] that is the
 * OCTET STRING itself); then the wrapper is the value.
 */
function explicitInner(buf: Buffer, wrapper: Tlv): Tlv | null {
  if (wrapper.cls !== CONTEXT || wrapper.num !== 0) return null;
  if (!wrapper.constructed) return wrapper;
  const inner = asArray(buf, wrapper)[0];
  return inner ?? null;
}

/** `encapContentInfo` = SEQUENCE { eContentType OID, [0] EXPLICIT OCTET STRING } */
function signedDataContent(buf: Buffer, signedData: Tlv): { oid: string; value: Tlv } {
  const parts = asArray(buf, signedData);
  const encap = parts[2];
  if (!encap) fail("the signedData structure has no encapsulated content.");
  expectTag(buf, encap, TAG_SEQUENCE, "an encapsulated content sequence");

  const [typeTlv, explicitTlv] = asArray(buf, encap);
  if (!typeTlv) fail("the encapsulated content has no content type.");
  const oid = decodeOid(buf, typeTlv);

  if (!explicitTlv) {
    fail(
      "this is a detached signature. It carries the signature only, and the signed document is a separate file.",
    );
  }
  const inner = explicitInner(buf, explicitTlv);
  if (!inner) fail("the encapsulated content is malformed.");
  return { oid, value: inner };
}

function oidName(oid: string): string {
  switch (oid) {
    case CMS_SIGNED_DATA:
      return "signed-data";
    case CMS_ENVELOPED_DATA:
      return "enveloped-data";
    case CMS_SIGNED_AND_ENVELOPED:
      return "signed-and-enveloped-data";
    case CMS_ENCRYPTED_DATA:
      return "encrypted-data";
    case CMS_DIGESTED_DATA:
      return "digested-data";
    case CMS_DATA:
      return "data";
    default:
      return oid;
  }
}

/**
 * Follow the CMS envelope until the actual document bytes appear.
 *
 * Nested envelopes are real: a `.p7m` may hold a CAdES signature that wraps
 * another signedData, and S/MIME can wrap a message in a second layer.
 */
function unwrap(buf: Buffer, depth = 0): Buffer {
  if (depth > 4) fail("the CMS envelopes are nested too deeply to unwrap.");

  const { oid, value } = parseContentInfo(buf);

  switch (oid) {
    case CMS_DATA: {
      if (!value) fail("the CMS data structure has no content.");
      return octetStringBytes(buf, value);
    }
    case CMS_SIGNED_DATA: {
      if (!value) fail("the signedData structure is empty.");
      expectTag(buf, value, TAG_SEQUENCE, "a signedData sequence");
      const enveloped = signedDataContent(buf, value);
      const payload = octetStringBytes(buf, enveloped.value);
      // The content can itself be another CMS structure (nested signature).
      if (isKnownEnvelope(enveloped.oid) && enveloped.oid !== CMS_DATA) {
        return unwrap(payload, depth + 1);
      }
      return payload;
    }
    case CMS_ENVELOPED_DATA:
    case CMS_SIGNED_AND_ENVELOPED:
    case CMS_ENCRYPTED_DATA:
      fail(
        `this file is encrypted (CMS ${oidName(oid)}). Decrypting it needs the recipient's private key, so the signed document cannot be read here. Ask the sender for the decrypted original.`,
      );
    case CMS_DIGESTED_DATA:
      fail(
        "this file contains only a message digest, not the signed document, so there is nothing to convert.",
      );
    default:
      fail(
        `its content type ${oid} is not a CMS signature. Supported: signed-data (.p7m/.p7s).`,
      );
  }
}

function isKnownEnvelope(oid: string): boolean {
  return [
    CMS_DATA,
    CMS_SIGNED_DATA,
    CMS_ENVELOPED_DATA,
    CMS_SIGNED_AND_ENVELOPED,
    CMS_ENCRYPTED_DATA,
    CMS_DIGESTED_DATA,
  ].includes(oid);
}

/**
 * Extract the document wrapped inside a `.p7m` signature.
 *
 * Throws with a message that names the actual blocker (encrypted, detached,
 * digest-only, not CMS at all) rather than a generic extraction failure.
 */
export function extractP7mContent(input: Buffer): Buffer {
  return unwrap(normaliseP7mContainer(input));
}
