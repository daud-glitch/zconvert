import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const status: {
    timestamp: string;
    status: string;
    environment: string | undefined;
    database?: string;
    db_error?: string;
  } = {
    timestamp: new Date().toISOString(),
    status: "ok",
    environment: process.env.NODE_ENV,
  };

  try {
    // Check DB connection
    await db.$queryRaw`SELECT 1`;
    status.database = "connected";
  } catch (err) {
    status.database = "disconnected";
    status.db_error = err instanceof Error ? err.message : String(err);
    status.status = "error";
  }

  return NextResponse.json(status, {
    status: status.status === "ok" ? 200 : 500,
  });
}
