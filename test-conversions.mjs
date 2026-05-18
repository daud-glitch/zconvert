const API_URL = "http://localhost:3000/api/convert";

async function testConversion(fileName, fileContent, targetFormat, contentType = "application/octet-stream") {
  const formData = new FormData();
  const blob = new Blob([fileContent], { type: contentType });
  formData.append("file", blob, fileName);
  formData.append("targetFormat", targetFormat);

  try {
    const res = await fetch(API_URL, { method: "POST", body: formData });
    if (!res.ok) {
      let errMsg = `${res.status}`;
      try { const d = await res.json(); errMsg = d.error || errMsg; } catch {}
      return { ok: false, error: errMsg };
    }
    const buf = await res.arrayBuffer();
    return { ok: true, size: buf.byteLength };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function runTests() {
  const results = [];
  const log = (src, dst, result) => {
    const status = result.ok ? "PASS" : "FAIL";
    const detail = result.ok ? `${result.size} bytes` : result.error;
    const line = `${status.padEnd(5)} | ${src.padEnd(12)} -> ${dst.padEnd(8)} | ${detail}`;
    console.log(line);
    results.push({ src, dst, status, detail });
  };

  // Sample test files
  const samplePng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  const sampleJson = JSON.stringify([{ name: "Alice", age: 30, city: "NYC" }, { name: "Bob", age: 25, city: "LA" }], null, 2);
  const sampleCsv = "name,age,city\nAlice,30,NYC\nBob,25,LA\n";
  const sampleMd = "# Hello World\n\nThis is a **test** document.\n\n## Section 2\n\nSome content here.\n\n- Item 1\n- Item 2\n";
  const sampleHtml = "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1><p>World paragraph</p></body></html>";
  const sampleTxt = "This is a plain text file.\nLine 2.\nLine 3 with data.";
  const sampleYaml = "name: Alice\nage: 30\ncity: NYC\nitems:\n  - one\n  - two\n";
  const sampleXml = '<?xml version="1.0"?><root><person><name>Alice</name><age>30</age></person></root>';
  const sampleToml = 'title = "Test"\n[owner]\nname = "Alice"\nage = 30\n';
  const sampleIni = "[section1]\nkey1=value1\nkey2=value2\n[section2]\nfoo=bar\n";
  const sampleEnv = "DB_HOST=localhost\nDB_PORT=5432\nDB_NAME=mydb\n";
  const sampleSrt = "1\n00:00:01,000 --> 00:00:04,000\nHello World\n\n2\n00:00:05,000 --> 00:00:08,000\nSecond subtitle\n";
  const sampleTsv = "name\tage\tcity\nAlice\t30\tNYC\nBob\t25\tLA\n";
  const sampleJsonl = '{"name":"Alice","age":30}\n{"name":"Bob","age":25}\n';

  console.log("=".repeat(60));
  console.log("CONVERSION TEST SUITE");
  console.log("=".repeat(60));

  // ── IMAGE ──
  console.log("\n--- IMAGE CONVERSIONS ---");
  for (const fmt of ["jpg", "webp", "avif", "bmp", "gif", "tiff", "ico", "pdf"]) {
    log("png", fmt, await testConversion("test.png", samplePng, fmt, "image/png"));
  }

  // ── DOCUMENT ──
  console.log("\n--- DOCUMENT CONVERSIONS ---");
  for (const fmt of ["html", "pdf", "txt", "docx", "odt", "rtf", "tex", "epub"]) {
    log("md", fmt, await testConversion("test.md", sampleMd, fmt, "text/markdown"));
  }
  for (const fmt of ["md", "pdf", "txt", "docx"]) {
    log("html", fmt, await testConversion("test.html", sampleHtml, fmt, "text/html"));
  }
  for (const fmt of ["html", "pdf", "md", "docx"]) {
    log("txt", fmt, await testConversion("test.txt", sampleTxt, fmt, "text/plain"));
  }

  // ── DATA ──
  console.log("\n--- DATA CONVERSIONS ---");
  for (const fmt of ["csv", "yaml", "xml", "toml", "xlsx", "tsv", "html"]) {
    log("json", fmt, await testConversion("test.json", sampleJson, fmt, "application/json"));
  }
  for (const fmt of ["json", "yaml", "xlsx", "tsv", "xml"]) {
    log("csv", fmt, await testConversion("test.csv", sampleCsv, fmt, "text/csv"));
  }
  for (const fmt of ["json", "csv", "xml"]) {
    log("yaml", fmt, await testConversion("test.yaml", sampleYaml, fmt, "application/x-yaml"));
  }
  for (const fmt of ["json", "csv", "yaml"]) {
    log("xml", fmt, await testConversion("test.xml", sampleXml, fmt, "application/xml"));
  }
  for (const fmt of ["json", "yaml"]) {
    log("toml", fmt, await testConversion("test.toml", sampleToml, fmt, "application/toml"));
  }
  for (const fmt of ["json", "yaml"]) {
    log("ini", fmt, await testConversion("test.ini", sampleIni, fmt, "text/x-ini"));
  }
  for (const fmt of ["json", "yaml"]) {
    log("env", fmt, await testConversion("test.env", sampleEnv, fmt, "text/x-environment"));
  }
  log("tsv", "json", await testConversion("test.tsv", sampleTsv, "json", "text/tab-separated-values"));
  log("jsonl", "csv", await testConversion("test.jsonl", sampleJsonl, "csv", "application/jsonl"));

  // ── SUBTITLE ──
  console.log("\n--- SUBTITLE CONVERSIONS ---");
  for (const fmt of ["vtt", "ass", "ssa", "sub", "mpl"]) {
    log("srt", fmt, await testConversion("test.srt", sampleSrt, fmt, "text/srt"));
  }

  // ── SUMMARY ──
  console.log("\n" + "=".repeat(60));
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`TOTAL: ${results.length} | PASS: ${passed} | FAIL: ${failed}`);
  
  if (failed > 0) {
    console.log("\nFAILED CONVERSIONS:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`  ${r.src} -> ${r.dst}: ${r.detail}`);
    });
  }
  console.log("=".repeat(60));
}

runTests();
