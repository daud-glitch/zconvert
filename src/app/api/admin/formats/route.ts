import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const formats = await prisma.format.findMany({ include: { category: true } });
  return NextResponse.json(formats);
}

export async function POST(req: Request) {
  const data = await req.json();
  const format = await prisma.format.create({ data });
  return NextResponse.json(format);
}

export async function PUT(req: Request) {
  const data = await req.json();
  const { id, ...rest } = data;
  const format = await prisma.format.update({ where: { id }, data: rest });
  return NextResponse.json(format);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  await prisma.format.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
