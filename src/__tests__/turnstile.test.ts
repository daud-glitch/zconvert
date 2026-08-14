import { describe, it, expect, afterEach, vi } from "vitest";
import {
  isTurnstileRequired,
  verifyTurnstileToken,
} from "@/lib/turnstile";

vi.mock("@/lib/turnstile-config", () => ({
  TURNSTILE_TEMPORARILY_DISABLED: false,
  isTurnstileBypassed: () => false,
}));

describe("turnstile", () => {
  const prev = process.env.TURNSTILE_SECRET_KEY;

  afterEach(() => {
    if (prev === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = prev;
    vi.unstubAllGlobals();
  });

  it("skips verification when secret is unset", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(isTurnstileRequired()).toBe(false);
    await expect(verifyTurnstileToken(undefined)).resolves.toEqual({ ok: true });
  });

  it("rejects empty token when secret is set", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    expect(isTurnstileRequired()).toBe(true);
    const res = await verifyTurnstileToken("");
    expect(res.ok).toBe(false);
  });

  it("accepts successful siteverify response", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      }),
    );
    await expect(verifyTurnstileToken("good-token", "1.2.3.4")).resolves.toEqual({
      ok: true,
    });
  });
});
