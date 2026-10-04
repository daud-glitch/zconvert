/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { GET } from "@/app/.well-known/indexnow/[key]/route";

type Ctx = { params: Promise<{ key: string }> };

async function call(key: string) {
  return (await GET({} as never, {
    params: Promise.resolve({ key }),
  } as Ctx)) as Response;
}

describe("IndexNow key file", () => {
  let prev: string | undefined;

  beforeEach(() => {
    prev = process.env.INDEXNOW_KEY;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.INDEXNOW_KEY;
    else process.env.INDEXNOW_KEY = prev;
  });

  it("serves the configured key at its well-known path", async () => {
    process.env.INDEXNOW_KEY = "abc123def456";
    const res = await call("abc123def456.txt");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("abc123def456");
  });

  it("rejects any other key", async () => {
    process.env.INDEXNOW_KEY = "abc123def456";
    const res = await call("not-the-key.txt");
    expect(res.status).toBe(404);
  });

  it("does not reflect arbitrary input back", async () => {
    process.env.INDEXNOW_KEY = "abc123def456";
    const res = await call("../../etc/passwd");
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("passwd");
  });

  it("404s when no key is configured", async () => {
    delete process.env.INDEXNOW_KEY;
    const res = await call("anything.txt");
    expect(res.status).toBe(404);
  });
});