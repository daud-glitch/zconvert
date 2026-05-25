import { NextRequest } from "next/server";

async function main() {
  const { GET } = await import("../src/app/api/formats/route");
  const req = new NextRequest("http://localhost:3000/api/formats");
  const res = await GET(req);
  const text = await res.text();
  console.log("status", res.status);
  console.log("content-type", res.headers.get("content-type"));
  console.log("body preview:", text.slice(0, 400));
}

main().catch((e) => {
  console.error("FAILED", e);
  process.exit(1);
});
