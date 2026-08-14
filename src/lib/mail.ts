/**
 * Mailgun send helper (Heroku Mailgun addon).
 * Env: MAILGUN_API_KEY, MAILGUN_DOMAIN, optional MAILGUN_FROM / MAIL_FROM
 */
import { resolveSiteUrl } from "@/lib/seo";

/** Verified sender for password reset, contact relay, and other system mail. */
export const DEFAULT_MAIL_FROM = "Convertek <noreply@convertek.tech>";

/** Inbound address for contact form and user support messages. */
export const DEFAULT_SUPPORT_EMAIL = "support@convertek.tech";

function resolveMailgunDomain(): string | undefined {
  return (
    process.env.MAILGUN_SENDING_DOMAIN?.trim() ||
    process.env.MAILGUN_DOMAIN?.trim() ||
    process.env.MAILGUN_DOMAIN_NAME?.trim()
  );
}

function resolveMailgunEndpoint(domain: string): string {
  const custom = process.env.MAILGUN_API_BASE?.trim();
  if (custom) return custom;

  const host =
    process.env.MAILGUN_API_HOST?.trim() ||
    (process.env.MAILGUN_REGION?.trim().toLowerCase() === "eu"
      ? "api.eu.mailgun.net"
      : "api.mailgun.net");

  return `https://${host}/v3/${domain}/messages`;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  from?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey =
    process.env.MAILGUN_API_KEY?.trim() ||
    process.env.MAILGUN_APIKEY?.trim();
  const domain = resolveMailgunDomain();
  const from =
    input.from?.trim() ||
    process.env.MAILGUN_FROM?.trim() ||
    process.env.MAIL_FROM?.trim() ||
    DEFAULT_MAIL_FROM;

  if (!apiKey || !domain) {
    console.error("[mail] MAILGUN_API_KEY / MAILGUN_DOMAIN not configured");
    return { ok: false, error: "Email service is not configured" };
  }

  const body = new URLSearchParams();
  body.set("from", from);
  body.set("to", input.to);
  body.set("subject", input.subject);
  body.set("text", input.text);
  if (input.html) body.set("html", input.html);
  if (input.replyTo) body.set("h:Reply-To", input.replyTo);

  const endpoint = resolveMailgunEndpoint(domain);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[mail] Mailgun error", res.status, detail.slice(0, 300));
      return { ok: false, error: "Failed to send email" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[mail] send failed", err);
    return { ok: false, error: "Failed to send email" };
  }
}

export function publicSiteUrl(): string {
  // Same canonicalization as SEO so password-reset links never use legacy domains
  return resolveSiteUrl();
}
