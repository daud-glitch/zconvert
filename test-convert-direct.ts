const { convertFile } = require("./src/lib/converter.ts");

// Since converter.ts uses ESM imports, let's test via direct Node execution with tsx
async function runTests() {
  const results = [];
  const log = (src, dst, result) => {
    const status = result.ok ? "PASS" : "FAIL";
    const detail = result.ok ? `${result.size} bytes` : result.error;
    console.log(`${status.padEnd(5)} | ${(src + " -> " + dst).padEnd(22)} | ${detail}`);
    results.push({ src, dst, status, detail });
  };

  const test = async (input, inputExt, outputExt) => {
    try {
      const result = await convertFile(Buffer.from(input), inputExt, outputExt);
      return { ok: true, size: result.length };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  };

  const samplePng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  const sampleJson = JSON.stringify([{ name: "Alice", age: 30, city: "NYC" }, { name: "Bob", age: 25, city: "LA" }], null, 2);
  const sampleCsv = "name,age,city\nAlice,30,NYC\nBob,25,LA\n";
  const sampleMd = "# Hello World\n\nThis is a **test** document.\n\n## Section 2\n\nSome content here.\n";
  const sampleHtml = "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1><p>World</p></body></html>";
  const sampleTxt = "This is plain text.\nLine 2.\nLine 3.";
  const sampleYaml = "name: Alice\nage: 30\ncity: NYC\n";
  const sampleXml = '<?xml version="1.0"?><root><person><name>Alice</name><age>30</age></person></root>';
  const sampleToml = 'title = "Test"\n[owner]\nname = "Alice"\n';
  const sampleIni = "[section1]\nkey1=value1\nkey2=value2\n";
  const sampleEnv = "DB_HOST=localhost\nDB_PORT=5432\n";
  const sampleSrt = "1\n00:00:01,000 --> 00:00:04,000\nHello World\n\n2\n00:00:05,000 --> 00:00:08,000\nSecond line\n";
  const sampleTsv = "name\tage\tcity\nAlice\t30\tNYC\n";
  const sampleJsonl = '{"name":"Alice","age":30}\n{"name":"Bob","age":25}\n';

  console.log("=".repeat(55));
  console.log("DIRECT CONVERTER TEST");
  console.log("=".repeat(55));

  // IMAGE
  console.log("\n--- IMAGE ---");
  for (const fmt of ["jpg", "webp", "avif", "bmp", "gif", "tiff", "ico", "pdf"]) {
    log("png", fmt, await test(samplePng, "png", fmt));
  }

  // DOCUMENT
  console.log("\n--- DOCUMENT ---");
  for (const fmt of ["html", "pdf", "txt", "docx", "odt", "rtf", "tex", "epub"]) {
    log("md", fmt, await test(sampleMd, "md", fmt));
  }
  for (const fmt of ["md", "pdf", "txt", "docx"]) {
    log("html", fmt, await test(sampleHtml, "html", fmt));
  }
  for (const fmt of ["html", "pdf", "md", "docx"]) {
    log("txt", fmt, await test(sampleTxt, "txt", fmt));
  }

  // DATA
  console.log("\n--- DATA ---");
  for (const fmt of ["csv", "yaml", "xml", "toml", "xlsx", "tsv", "html"]) {
    log("json", fmt, await test(sampleJson, "json", fmt));
  }
  for (const fmt of ["json", "yaml", "xlsx", "tsv", "xml"]) {
    log("csv", fmt, await test(sampleCsv, "csv", fmt));
  }
  for (const fmt of ["json", "csv", "xml"]) {
    log("yaml", fmt, await test(sampleYaml, "yaml", fmt));
  }
  for (const fmt of ["json", "csv", "yaml"]) {
    log("xml", fmt, await test(sampleXml, "xml", fmt));
  }
  log("toml", "json", await test(sampleToml, "toml", "json"));
  log("toml", "yaml", await test(sampleToml, "toml", "yaml"));
  log("ini", "json", await test(sampleIni, "ini", "json"));
  log("ini", "yaml", await test(sampleIni, "ini", "yaml"));
  log("env", "json", await test(sampleEnv, "env", "json"));
  log("env", "yaml", await test(sampleEnv, "env", "yaml"));
  log("tsv", "json", await test(sampleTsv, "tsv", "json"));
  log("jsonl", "csv", await test(sampleJsonl, "jsonl", "csv"));

  // SUBTITLE
  console.log("\n--- SUBTITLE ---");
  for (const fmt of ["vtt", "ass", "ssa", "sub", "mpl"]) {
    log("srt", fmt, await test(sampleSrt, "srt", fmt));
  }

  // AUDIO (test routing only - actual conversion needs real audio file)
  console.log("\n--- AUDIO (routing check) ---");
  const fakeAudio = Buffer.from("fake audio data for routing test");
  for (const fmt of ["wav", "ogg", "flac"]) {
    log("mp3", fmt, await test(fakeAudio, "mp3", fmt));
  }

  // SUMMARY
  console.log("\n" + "=".repeat(55));
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`TOTAL: ${results.length} | PASS: ${passed} | FAIL: ${failed}`);
  if (failed > 0) {
    console.log("\nFAILED:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`  ${r.src} -> ${r.dst}: ${r.detail}`);
    });
  }
  console.log("=".repeat(55));
}

runTests().catch(e => console.error("Fatal:", e));
