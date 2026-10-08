import type { Metadata } from "next";
import HomeClient from "@/components/pages/HomeClient";

// Dedicated admin route SEO constants (freebuffDocs-freebuff / Convertek identity kept conservative).
const ADMIN_TITLE = "Admin Dashboard";
const ADMIN_SUBTITLE = "Convertek";
const ADMIN_DESC = "Manage your Convertek instance: formats, users, analytics, settings, and support.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tab?: string | string[] }>;
}): Promise<Metadata> {
  const merged = await params;
  const tab = Array.isArray(merged.tab) ? merged.tab[0] : merged.tab ?? "overview";
  return {
    title: `${ADMIN_TITLE} · ${ADMIN_SUBTITLE}`,
    description: ADMIN_DESC,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${ADMIN_TITLE} · ${ADMIN_SUBTITLE}`,
      description: ADMIN_DESC,
      type: "website",
      siteName: "Convertek",
    },
    twitter: {
      card: "summary_large_image",
      title: `${ADMIN_TITLE} · ${ADMIN_SUBTITLE}`,
      description: ADMIN_DESC,
    },
    alternates: { canonical: "/admin" },
  };
}

export default function AdminPage() {
  return <HomeClient defaultView="admin" extraQuery={{ tab: "overview" }} />;
}
