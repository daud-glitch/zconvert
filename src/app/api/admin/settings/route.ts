import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Whitelist of allowed keys and their types
const SETTINGS_SCHEMA = {
  "allow_guest_conversions": "boolean",
  "default_quality": "number",
  "max_file_size_mb": "number",
  "allow_custom_formats": "boolean",
  "analytics_enabled": "boolean",
  "email_from_address": "string",
  "brand_name": "string",
  "primary_color": "string",
};

const SETTINGS_DESCRIPTIONS = {
  "allow_guest_conversions": "Allow conversions without requiring user login",
  "default_quality": "Default conversion quality (1-100)",
  "max_file_size_mb": "Maximum allowed file size in megabytes",
  "allow_custom_formats": "Allow users to request custom format conversions",
  "analytics_enabled": "Enable anonymous analytics collection",
  "email_from_address": "Email address used for system notifications",
  "brand_name": "Brand name displayed in the UI",
  "primary_color": "Primary color in hex format (e.g. #3b82f6)",
};

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const settings = await db.appSettings.findMany({
      orderBy: { category: "asc" },
    });
    return NextResponse.json({ data: settings, schema: SETTINGS_SCHEMA, descriptions: SETTINGS_DESCRIPTIONS });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const { key, value } = await request.json();

    // Validate key
    if (!key) {
      return NextResponse.json({ error: "Missing required field: key" }, { status: 400 });
    }
    if (!SETTINGS_SCHEMA.hasOwnProperty(key)) {
      return NextResponse.json(
        { error: `Setting key '${key}' is not whitelisted. Allowed keys: ${Object.keys(SETTINGS_SCHEMA).join(", ")}` },
        { status: 400 },
      );
    }

    // Validate value type
    const expectedType = SETTINGS_SCHEMA[key as keyof typeof SETTINGS_SCHEMA];
    
    switch (expectedType) {
      case "boolean":
        if (typeof value !== "boolean") {
          return NextResponse.json(
            { error: `Invalid value for setting '${key}'. Expected boolean, got ${typeof value}.` },
            { status: 400 },
          );
        }
        break;
      case "number":
        if (isNaN(parseFloat(value || "NaN")) || typeof value === "boolean") {
          return NextResponse.json(
            { error: `Invalid value for setting '${key}'. Expected number, got ${typeof value}.` },
            { status: 400 },
          );
        }
        break;
      case "string":
        if (typeof value !== "string") {
          return NextResponse.json(
            { error: `Invalid value for setting '${key}'. Expected string, got ${typeof value}.` },
            { status: 400 },
          );
        }
        // Specific validation for string values if needed
        if (key === "primary_color" && value && !/^#[0-9a-fA-F]{3,6}$/.test(value)) {
          return NextResponse.json(
            { error: "Invalid hex color format. Use format: #RRGGBB" },
            { status: 400 },
          );
        }
        break;
    }

    // For number types stored as strings, convert to number before saving
    const normalizedValue = expectedType === "number" ? parseFloat(value) : value;

    const setting = await db.appSettings.upsert({
      where: { key },
      update: { value: String(normalizedValue) },
      create: { key, value: String(normalizedValue), type: expectedType },
    });

    return NextResponse.json({ data: setting });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) 
      return NextResponse.json({ error: "key required" }, { status: 400 });
    
    // Security: Block deletion of certain keys
    if (key === "brand_name" || key === "email_from_address") {
      return NextResponse.json(
        { error: `Deletion of setting '${key}' is not permitted.` },
        { status: 403 },
      );
    }

    await db.appSettings.delete({ where: { key } });
    return NextResponse.json({ success: true });
  } catch {
    // If key not found, return silent success to avoid errors
    return NextResponse.json({ success: true, error: null });
  }
}