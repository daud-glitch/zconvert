/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { convertFile } from "@/lib/converter";

const SAMPLE = `<?xml version="1.0"?>
<mxfile host="app.diagrams.net">
  <diagram id="d1" name="Page-1">
    <mxGraphModel>
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        <mxCell id="2" value="Start" style="rounded=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
          <mxGeometry x="40" y="40" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="3" value="End" style="rounded=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">
          <mxGeometry x="40" y="160" width="120" height="60" as="geometry"/>
        </mxCell>
        <mxCell id="4" style="edgeStyle=orthogonalEdgeStyle;strokeColor=#666666;" edge="1" parent="1" source="2" target="3">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

describe("DrawIO conversion", () => {
  it("converts DrawIO XML to PNG", async () => {
    const out = await convertFile(Buffer.from(SAMPLE, "utf-8"), "drawio", "png");
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBeGreaterThan(100);
    expect(meta.height).toBeGreaterThan(100);
  }, 30_000);

  it("converts DrawIO XML to SVG with shapes", async () => {
    const out = await convertFile(Buffer.from(SAMPLE, "utf-8"), "drawio", "svg");
    const svg = out.toString("utf-8");
    expect(svg).toContain("<svg");
    expect(svg).toContain("Start");
    expect(svg).toContain("<rect");
  }, 15_000);
});
