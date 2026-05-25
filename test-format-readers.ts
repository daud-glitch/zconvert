import { convertFile } from "./src/lib/converter";
import {
  readParquetRecords,
  writeParquetBuffer,
} from "./src/lib/format-readers";
import * as XLSX from "xlsx";

async function main() {
  const pq = await writeParquetBuffer([
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ]);
  const rows = await readParquetRecords(pq);
  console.log("parquet roundtrip", rows.length, rows[0]);

  const csv = Buffer.from("name,age\nAnn,20\n", "utf-8");
  const json = await convertFile(csv, "csv", "parquet");
  console.log("csv->parquet", json.length, json[0], json[1]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["name", "age"],
      ["Bob", 25],
    ]),
    "S1",
  );
  const sqlite = Buffer.from(
    XLSX.write(wb, { type: "buffer", bookType: "xlsx" }),
  );
  // quick doc: drawio xml
  const drawio = Buffer.from(
    '<mxfile><diagram><mxGraphModel><root><mxCell id="0"/><mxCell id="1" value="Hello Diagram"/></root></mxGraphModel></diagram></mxfile>',
  );
  const html = await convertFile(drawio, "drawio", "html");
  console.log(
    "drawio->html",
    html.toString("utf-8").includes("Hello") ? "PASS" : "FAIL",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
