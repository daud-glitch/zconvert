import { NextRequest, NextResponse } from "next/server";
import { getOptionalDb } from "@/lib/db";

/** Public CMS bundle for homepage: features, links, ads. */
export async function GET(request: NextRequest) {
  const prisma = getOptionalDb();
  if (!prisma) {
    return NextResponse.json({
      features: [],
      links: [],
      ads: [],
    });
  }

  try {
    const location = request.nextUrl.searchParams.get("location") || undefined;

    const [features, links, ads] = await Promise.all([
      prisma.featureCard.findMany({
        where: { enabled: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          icon: true,
          order: true,
        },
      }),
      prisma.link.findMany({
        where: { enabled: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          label: true,
          url: true,
          group: true,
          icon: true,
          order: true,
        },
      }),
      prisma.ad.findMany({
        where: {
          enabled: true,
          ...(location ? { location } : {}),
        },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          location: true,
          type: true,
          content: true,
          code: true,
          order: true,
        },
      }),
    ]);

    return NextResponse.json({ features, links, ads });
  } catch (error) {
    console.error("[api/cms]", error);
    return NextResponse.json({
      features: [],
      links: [],
      ads: [],
    });
  }
}
