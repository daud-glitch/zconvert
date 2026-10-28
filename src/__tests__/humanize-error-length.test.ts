/**
 * Error text length.
 *
 * Conversion failures are written to be actionable — the P7M one has to say
 * that the file is encrypted *and* what to ask the sender for. A 180-character
 * cap used to cut that message at "Ask the sen…", which is the one part that
 * told the user what to do. These pin the cap to something that fits a complete
 * explanation, and confirm it still refuses a runaway message.
 */
import { describe, expect, it } from "vitest";
import { humanizeConversionError } from "@/lib/upload-limits";
import { extractP7mContent } from "@/lib/p7m-reader";

/** The longest messages the converters actually produce, verbatim in spirit. */
const P7M_ENCRYPTED =
  "Cannot read this .p7m file: this file is encrypted (CMS enveloped-data). " +
  "Decrypting it needs the recipient's private key, so the signed document " +
  "cannot be read here. Ask the sender for the decrypted original.";

describe("humanizeConversionError length", () => {
  it("keeps the whole P7M encryption explanation", () => {
    const msg = humanizeConversionError(P7M_ENCRYPTED);
    expect(msg).toBe(P7M_ENCRYPTED);
    expect(msg).not.toMatch(/…$/);
    expect(msg).toMatch(/private key/);
    expect(msg).toMatch(/Ask the sender/);
  });

  it("keeps the real P7M error intact end to end", () => {
    // Build an enveloped-data file and humanize the error it raises.
    const tlv = (tag: number, v: Buffer) =>
      Buffer.concat([Buffer.from([tag, v.length]), v]);
    const seq = (...p: Buffer[]) => tlv(0x30, Buffer.concat(p));
    const oid = (...b: number[]) => tlv(0x06, Buffer.from(b));
    const enveloped = seq(
      oid(0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x03),
      tlv(0xa0, seq(tlv(0x02, Buffer.from([0])), tlv(0x31, Buffer.alloc(0)))),
    );

    let raw = "";
    try {
      extractP7mContent(enveloped);
    } catch (e) {
      raw = (e as Error).message;
    }
    expect(raw).toMatch(/encrypted/);

    const shown = humanizeConversionError(raw);
    expect(shown).toBe(raw);
    expect(shown.endsWith("…")).toBe(false);
  });

  it("still truncates a runaway message", () => {
    const huge = `Unexpected converter state: ${"x".repeat(5000)}`;
    const msg = humanizeConversionError(huge);
    expect(msg.length).toBeLessThanOrEqual(400);
    expect(msg.endsWith("…")).toBe(true);
  });
});
