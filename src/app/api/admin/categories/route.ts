import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const data = await req.json();
  const category = await prisma.category.create({ data });
  return NextResponse.json(category);
}

export async function PUT(req: Request) {
  const data = await req.json();
  const { id, ...rest } = data;
  const category = await prisma.category.update({ where: { id }, data: rest });
  return NextResponse.json(category);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
