/**
 * P7M content extraction.
 *
 * Production reported "Could not extract content from P7M signature" for a
 * signed PDF. The old path handed the file to node-forge's pkcs7 parser, which
 * only fills in `content` for a DER signedData whose encapsulated content it
 * happens to decode; everything else parsed "fine" and then threw the same
 * contentless error. These fixtures cover the encodings real signers emit.
 *
 * The DER builders below are deliberately literal — each fixture is the exact
 * byte layout a signer produces, so a regression names the encoding that broke.
 */
import { describe, expect, it } from "vitest";
import { extractP7mContent } from "@/lib/p7m-reader";
import { convertFile } from "@/lib/converter";

// ─── DER builders ──────────────────────────────────────────────────────────

function length(n: number): Buffer {
  if (n < 0x80) return Buffer.from([n]);
  if (n < 0x100) return Buffer.from([0x81, n]);
  if (n < 0x10000) return Buffer.from([0x82, n >> 8, n & 0xff]);
  return Buffer.from([0x83, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]);
}

const tlv = (tag: number, value: Buffer) =>
  Buffer.concat([Buffer.from([tag]), length(value.length), value]);

/** BER indefinite length: content, then a 00 00 end-of-contents marker. */
const tlvIndefinite = (tag: number, ...parts: Buffer[]) =>
  Buffer.concat([Buffer.from([tag, 0x80]), ...parts, Buffer.from([0, 0])]);

const seq = (...parts: Buffer[]) => tlv(0x30, Buffer.concat(parts));
const seqIndefinite = (...parts: Buffer[]) => tlvIndefinite(0x30, ...parts);
const set = () => tlv(0x31, Buffer.alloc(0));
const octet = (value: Buffer) => tlv(0x04, value);
/** Constructed OCTET STRING: the document split across primitives. */
const segmentedOctet = (...parts: Buffer[]) =>
  tlv(0x24, Buffer.concat(parts.map(octet)));
const integer = (n: number) => tlv(0x02, Buffer.from([n]));
const oid = (...bytes: number[]) => tlv(0x06, Buffer.from(bytes));
const explicit0 = (inner: Buffer) => tlv(0xa0, inner);

const OID_DATA = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x01];
const OID_SIGNED_DATA = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02];
const OID_ENVELOPED_DATA = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x03];
const OID_DIGESTED_DATA = [0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x05];

const PAYLOAD = Buffer.from("Signed document body\nwith two lines\n");

/** encapContentInfo with the document inline. */
const encap = (content: Buffer) => seq(oid(...OID_DATA), explicit0(content));

/** A signedData skeleton: version, digestAlgorithms, content, signerInfos. */
const signedData = (encapInfo: Buffer) =>
  seq(integer(1), set(), encapInfo, set());

const contentInfo = (typeOid: number[], content: Buffer) =>
  seq(oid(...typeOid), explicit0(content));

const signedFile = (content: Buffer) =>
  contentInfo(OID_SIGNED_DATA, signedData(encap(content)));

const pem = (der: Buffer) => {
  const body = der
    .toString("base64")
    .replace(/(.{64})/g, "$1\n")
    .trim();
  return Buffer.from(
    `-----BEGIN PKCS7-----\n${body}\n-----END PKCS7-----\n`,
    "ascii",
  );
};

describe("P7M signedData", () => {
  it("extracts the document from a plain DER signature", () => {
    expect(signedFile(octet(PAYLOAD)).length).toBeGreaterThan(0);
    expect(extractP7mContent(signedFile(octet(PAYLOAD)))).toEqual(PAYLOAD);
  });

  it("extracts the document from BER indefinite lengths", () => {
    // Older CAdES signers emit this; asn1.fromDer rejects it outright.
    const ber = seqIndefinite(
      oid(...OID_SIGNED_DATA),
      tlvIndefinite(
        0xa0,
        seqIndefinite(
          integer(1),
          set(),
          seqIndefinite(oid(...OID_DATA), explicit0(tlvIndefinite(0xa0, octet(PAYLOAD)))),
          set(),
        ),
      ),
    );
    expect(extractP7mContent(ber)).toEqual(PAYLOAD);
  });

  it("extracts the document from PEM armour", () => {
    expect(extractP7mContent(pem(signedFile(octet(PAYLOAD))))).toEqual(PAYLOAD);
  });

  it("extracts the document from an S/MIME wrapper", () => {
    const body = signedFile(octet(PAYLOAD)).toString("base64").replace(/(.{76})/g, "$1\r\n");
    const smime = Buffer.from(
      "MIME-Version: 1.0\r\n" +
        'Content-Type: application/pkcs7-mime; name="smime.p7m"\r\n' +
        "Content-Transfer-Encoding: base64\r\n" +
        "Content-Disposition: attachment; filename=smime.p7m\r\n" +
        "\r\n" +
        body,
      "ascii",
    );
    expect(extractP7mContent(smime)).toEqual(PAYLOAD);
  });

  it("reads an IMPLICIT octet string, which some signers emit", () => {
    // [0] primitive instead of [0] EXPLICIT { OCTET STRING }.
    const implicit = seq(
      oid(...OID_SIGNED_DATA),
      tlv(0xa0, seq(integer(1), set(), seq(oid(...OID_DATA), tlv(0x80, PAYLOAD)), set())),
    );
    expect(extractP7mContent(implicit)).toEqual(PAYLOAD);
  });

  it("extracts the document from a bare base64 file", () => {
    const bare = Buffer.from(signedFile(octet(PAYLOAD)).toString("base64"), "ascii");
    expect(extractP7mContent(bare)).toEqual(PAYLOAD);
  });

  it("reassembles a segmented OCTET STRING", () => {
    const half = Math.floor(PAYLOAD.length / 2);
    const split = segmentedOctet(PAYLOAD.subarray(0, half), PAYLOAD.subarray(half));
    expect(extractP7mContent(signedFile(split))).toEqual(PAYLOAD);
  });

  it("unwraps a signature nested inside another signature", () => {
    // Double-wrapped CAdES: eContentType is signedData, not data.
    // eContent is an OCTET STRING whose bytes are themselves a signature.
    const nested = signedFile(octet(PAYLOAD));
    const outer = seq(
      oid(...OID_SIGNED_DATA),
      explicit0(
        seq(integer(1), set(), seq(oid(...OID_SIGNED_DATA), explicit0(octet(nested))), set()),
      ),
    );
    expect(extractP7mContent(outer)).toEqual(PAYLOAD);
  });

  it("converts a signed text document to TXT end to end", async () => {
    const out = await convertFile(signedFile(octet(PAYLOAD)), "p7m", "txt");
    expect(out.toString("utf-8")).toBe(PAYLOAD.toString("utf-8"));
  });
});

describe("P7M it cannot read", () => {
  it("names encryption as the blocker instead of failing vaguely", () => {
    const enveloped = contentInfo(
      OID_ENVELOPED_DATA,
      seq(integer(0), set(), seq(oid(...OID_DATA), seq(oid(42, 134, 72, 134, 247, 13, 1, 5, 8), octet(Buffer.from([1, 2, 3]))))),
    );
    expect(() => extractP7mContent(enveloped)).toThrow(
      /encrypted[\s\S]*private key/i,
    );
  });

  it("names a detached signature", () => {
    // encapContentInfo with no [0] — the document is a separate file.
    const detached = contentInfo(
      OID_SIGNED_DATA,
      signedData(seq(oid(...OID_DATA))),
    );
    expect(() => extractP7mContent(detached)).toThrow(/detached signature/i);
  });

  it("names digest-only content", () => {
    const digested = contentInfo(OID_DIGESTED_DATA, seq(integer(0), set()));
    expect(() => extractP7mContent(digested)).toThrow(/digest/i);
  });

  it("rejects a file that is not ASN.1 at all", () => {
    expect(() => extractP7mContent(Buffer.from("just a text file\n"))).toThrow(
      /Cannot read this \.p7m file/,
    );
  });

  it("rejects an empty file", () => {
    expect(() => extractP7mContent(Buffer.alloc(0))).toThrow(/empty/);
  });

  it("rejects a truncated structure without crashing", () => {
    const truncated = signedFile(octet(PAYLOAD)).subarray(0, 20);
    expect(() => extractP7mContent(truncated)).toThrow(/Cannot read this \.p7m file/);
  });
});
