import { NextResponse } from "next/server";
import { formats, categoryMeta, type FormatCategory } from "@/lib/formats";

const functionalStatusMap: Record<FormatCategory, "functional" | "partial"> = {
  image: "functional",
  data: "functional",
  document: "functional",
  subtitle: "functional",
  ebook: "functional",
  font: "functional",
  audio: "functional",
  archive: "functional",
  presentation: "functional",
  other: "functional",
};

export async function GET() {
  const categoryKeys = Object.keys(categoryMeta) as FormatCategory[];

  const categories = categoryKeys.map((key) => {
    const meta = categoryMeta[key];
    const categoryFormats = formats.filter((f) => f.category === key);
    const formatCount = categoryFormats.length;
    const pairCount = categoryFormats.reduce(
      (sum, f) => sum + f.targetFormats.length,
      0,
    );

    return {
      category: key,
      label: meta.label,
      color: meta.bgColor,
      formatCount,
      pairCount,
      status: functionalStatusMap[key],
    };
  });

  const totalFormats = formats.length;
  const totalPairs = formats.reduce(
    (sum, f) => sum + f.targetFormats.length,
    0,
  );
  const functionalCategories = categories.filter(
    (c) => c.status === "functional",
  ).length;
  const partialCategories = categories.filter(
    (c) => c.status === "partial",
  ).length;

  return NextResponse.json({
    categories,
    totalFormats,
    totalPairs,
    functionalCategories,
    partialCategories,
  });
}
