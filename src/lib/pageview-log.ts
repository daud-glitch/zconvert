import { getOptionalDb } from "@/lib/db";
import { hashIp } from "@/lib/format-catalog";
import {
  resolveTrafficSource,
  sanitizePath,
} from "@/lib/traffic-source";

export type PageViewInput = {
  path: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
};

function utcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function isAnalyticsEnabled(): Promise<boolean> {
  const prisma = getOptionalDb();
  if (!prisma) return false;
  try {
    const row = await prisma.appSettings.findUnique({
      where: { key: "analytics_enabled" },
    });
    if (!row) return true;
    const v = String(row.value).toLowerCase().trim();
    return v !== "false" && v !== "0" && v !== "off" && v !== "no";
  } catch {
    return true;
  }
}

/** Persist anonymized page view + bump DailyStats.pageViews. */
export async function logPageView(input: PageViewInput): Promise<boolean> {
  if (!(await isAnalyticsEnabled())) return false;
  const prisma = getOptionalDb();
  if (!prisma) return false;

  const path = sanitizePath(input.path);
  // Skip admin and noise paths
  if (
    path.startsWith("/api/") ||
    path.startsWith("/system/") ||
    path.startsWith("/core/system/") ||
    path.startsWith("/_next")
  ) {
    return false;
  }

  const referrer = input.referrer ? String(input.referrer).slice(0, 1000) : null;
  const utmSource = input.utmSource
    ? String(input.utmSource).slice(0, 100)
    : null;
  const utmMedium = input.utmMedium
    ? String(input.utmMedium).slice(0, 100)
    : null;
  const utmCampaign = input.utmCampaign
    ? String(input.utmCampaign).slice(0, 150)
    : null;
  const source = resolveTrafficSource({
    referrer,
    utmSource,
    utmMedium,
  });

  try {
    await prisma.pageView.create({
      data: {
        path,
        referrer,
        source,
        utmSource,
        utmMedium,
        utmCampaign,
        userAgent: input.userAgent
          ? String(input.userAgent).slice(0, 500)
          : null,
        userId: input.userId || null,
        ipHash: hashIp(input.ipAddress),
      },
    });

    try {
      const day = utcDay();
      await prisma.dailyStats.upsert({
        where: { date: day },
        create: {
          date: day,
          conversions: 0,
          users: 0,
          pageViews: 1,
          storageUsed: BigInt(0),
        },
        update: {
          pageViews: { increment: 1 },
        },
      });
    } catch {
      // non-fatal
    }

    return true;
  } catch (err) {
    console.error("[analytics] page view log failed:", err);
    return false;
  }
}
