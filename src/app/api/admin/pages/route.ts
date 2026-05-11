import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const items = await prisma.page.findMany();
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const data = await req.json();
  const item = await prisma.page.create({ data });
  return NextResponse.json(item);
}

export async function PUT(req: Request) {
  const data = await req.json();
  const { id, ...rest } = data;
  const item = await prisma.page.update({ where: { id }, data: rest });
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  await prisma.page.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
