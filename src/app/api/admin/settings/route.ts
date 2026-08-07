import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Whitelist of allowed keys and their types
const SETTINGS_SCHEMA = {
  allow_guest_conversions: "boolean",
  default_quality: "number",
  max_file_size_mb: "number",
  allow_custom_formats: "boolean",
  analytics_enabled: "boolean",
  email_from_address: "string",
  brand_name: "string",
  primary_color: "string",
} as const;

type SettingKey = keyof typeof SETTINGS_SCHEMA;

const SETTINGS_DESCRIPTIONS: Record<SettingKey, string> = {
  allow_guest_conversions:
    "Allow conversions without requiring user login",
  default_quality: "Default conversion quality (1-100)",
  max_file_size_mb: "Maximum allowed file size in megabytes",
  allow_custom_formats: "Allow users to request custom format conversions",
  analytics_enabled:
    "Collect anonymous page views and traffic sources for Admin → Analytics",
  email_from_address: "Email address used for system notifications",
  brand_name: "Brand name displayed in the UI",
  primary_color: "Primary color in hex format (e.g. #3b82f6)",
};

const SETTINGS_CATEGORIES: Record<SettingKey, string> = {
  allow_guest_conversions: "general",
  default_quality: "conversion",
  max_file_size_mb: "conversion",
  allow_custom_formats: "conversion",
  analytics_enabled: "analytics",
  email_from_address: "general",
  brand_name: "general",
  primary_color: "general",
};

const DEFAULT_VALUES: Record<SettingKey, string> = {
  allow_guest_conversions: "true",
  default_quality: "85",
  max_file_size_mb: "100",
  allow_custom_formats: "true",
  analytics_enabled: "true",
  email_from_address: "noreply@convertek.tech",
  brand_name: "Convertek",
  primary_color: "#10b981",
};

function parseBoolInput(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.toLowerCase().trim();
    if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
    if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  }
  return null;
}

/** Ensure whitelisted keys exist so Settings UI is never empty. */
async function ensureDefaultSettings() {
  for (const key of Object.keys(SETTINGS_SCHEMA) as SettingKey[]) {
    try {
      await db.appSettings.upsert({
        where: { key },
        update: {},
        create: {
          key,
          value: DEFAULT_VALUES[key],
          type: SETTINGS_SCHEMA[key],
          category: SETTINGS_CATEGORIES[key],
        },
      });
    } catch {
      // ignore individual seed failures
    }
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    await ensureDefaultSettings();
    const settings = await db.appSettings.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    // Prefer whitelist order for managed keys
    const managed = (Object.keys(SETTINGS_SCHEMA) as SettingKey[]).map(
      (key) => {
        const row = settings.find((s) => s.key === key);
        return {
          key,
          value: row?.value ?? DEFAULT_VALUES[key],
          type: SETTINGS_SCHEMA[key],
          category: SETTINGS_CATEGORIES[key],
          description: SETTINGS_DESCRIPTIONS[key],
          id: row?.id ?? null,
        };
      },
    );

    const extras = settings.filter(
      (s) => !(s.key in SETTINGS_SCHEMA),
    );

    return NextResponse.json({
      data: managed,
      extras: extras.map((s) => ({
        key: s.key,
        value: s.value,
        type: s.type,
        category: s.category,
        description: null,
        id: s.id,
      })),
      schema: SETTINGS_SCHEMA,
      descriptions: SETTINGS_DESCRIPTIONS,
      defaults: DEFAULT_VALUES,
    });
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
    const body = await request.json();
    const key = body.key as string;
    let value = body.value as unknown;

    if (!key) {
      return NextResponse.json(
        { error: "Missing required field: key" },
        { status: 400 },
      );
    }
    if (!(key in SETTINGS_SCHEMA)) {
      return NextResponse.json(
        {
          error: `Setting key '${key}' is not whitelisted. Allowed keys: ${Object.keys(SETTINGS_SCHEMA).join(", ")}`,
        },
        { status: 400 },
      );
    }

    const settingKey = key as SettingKey;
    const expectedType = SETTINGS_SCHEMA[settingKey];

    switch (expectedType) {
      case "boolean": {
        const parsed = parseBoolInput(value);
        if (parsed === null) {
          return NextResponse.json(
            {
              error: `Invalid value for '${key}'. Expected boolean (true/false).`,
            },
            { status: 400 },
          );
        }
        value = parsed;
        break;
      }
      case "number": {
        const n =
          typeof value === "number" ? value : parseFloat(String(value));
        if (!Number.isFinite(n)) {
          return NextResponse.json(
            { error: `Invalid value for '${key}'. Expected number.` },
            { status: 400 },
          );
        }
        if (key === "default_quality" && (n < 1 || n > 100)) {
          return NextResponse.json(
            { error: "default_quality must be between 1 and 100" },
            { status: 400 },
          );
        }
        if (key === "max_file_size_mb" && (n < 1 || n > 2048)) {
          return NextResponse.json(
            { error: "max_file_size_mb must be between 1 and 2048" },
            { status: 400 },
          );
        }
        value = n;
        break;
      }
      case "string": {
        if (typeof value !== "string") {
          return NextResponse.json(
            { error: `Invalid value for '${key}'. Expected string.` },
            { status: 400 },
          );
        }
        if (
          key === "primary_color" &&
          value &&
          !/^#[0-9a-fA-F]{3,6}$/.test(value)
        ) {
          return NextResponse.json(
            { error: "Invalid hex color format. Use format: #RRGGBB" },
            { status: 400 },
          );
        }
        break;
      }
    }

    const setting = await db.appSettings.upsert({
      where: { key },
      update: {
        value: String(value),
        type: expectedType,
        category: SETTINGS_CATEGORIES[settingKey],
      },
      create: {
        key,
        value: String(value),
        type: expectedType,
        category: SETTINGS_CATEGORIES[settingKey],
      },
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

    // Whitelisted managed settings can be reset to defaults, not deleted
    if (key in SETTINGS_SCHEMA) {
      const settingKey = key as SettingKey;
      const setting = await db.appSettings.upsert({
        where: { key },
        update: { value: DEFAULT_VALUES[settingKey] },
        create: {
          key,
          value: DEFAULT_VALUES[settingKey],
          type: SETTINGS_SCHEMA[settingKey],
          category: SETTINGS_CATEGORIES[settingKey],
        },
      });
      return NextResponse.json({
        success: true,
        reset: true,
        data: setting,
      });
    }

    if (key === "brand_name" || key === "email_from_address") {
      return NextResponse.json(
        { error: `Deletion of setting '${key}' is not permitted.` },
        { status: 403 },
      );
    }

    await db.appSettings.delete({ where: { key } }).catch(() => undefined);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true, error: null });
  }
}
