import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const items = await prisma.link.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const data = await req.json();
  const item = await prisma.link.create({ data: {
    label: data.label,
    url: data.path,
    group: data.location,
    enabled: data.active ?? true,
    order: data.order ?? 0,
  }});
  return NextResponse.json(item);
}

export async function PUT(req: Request) {
  const data = await req.json();
  const { id, ...rest } = data;
  const item = await prisma.link.update({
    where: { id },
    data: {
      label: rest.label,
      url: rest.path,
      group: rest.location,
      enabled: rest.active ?? true,
    }
  });
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  await prisma.link.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
