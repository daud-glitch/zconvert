import { getOptionalDb } from "@/lib/db";

export type DonationSettings = {
  kofiUrl: string | null;
  paypalUrl: string | null;
  buyMeACoffeeUrl: string | null;
  contactEmail: string;
};

const DEFAULT_EMAIL = "contact@convertek.tech";

function cleanUrl(raw: string | undefined | null): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function cleanEmail(raw: string | undefined | null): string {
  const v = (raw || "").trim().toLowerCase();
  if (!v || !v.includes("@")) return DEFAULT_EMAIL;
  return v;
}

/** Public donation links from Admin → Settings (donations category). */
export async function getDonationSettings(): Promise<DonationSettings> {
  const prisma = getOptionalDb();
  if (!prisma) {
    return {
      kofiUrl: null,
      paypalUrl: null,
      buyMeACoffeeUrl: null,
      contactEmail: DEFAULT_EMAIL,
    };
  }

  try {
    const rows = await prisma.appSettings.findMany({
      where: {
        key: {
          in: [
            "donate_kofi_url",
            "donate_paypal_url",
            "donate_buymeacoffee_url",
            "donate_contact_email",
          ],
        },
      },
      select: { key: true, value: true },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      kofiUrl: cleanUrl(map.donate_kofi_url),
      paypalUrl: cleanUrl(map.donate_paypal_url),
      buyMeACoffeeUrl: cleanUrl(map.donate_buymeacoffee_url),
      contactEmail: cleanEmail(map.donate_contact_email),
    };
  } catch {
    return {
      kofiUrl: null,
      paypalUrl: null,
      buyMeACoffeeUrl: null,
      contactEmail: DEFAULT_EMAIL,
    };
  }
}
