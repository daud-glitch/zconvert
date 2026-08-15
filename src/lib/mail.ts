/**
 * Outbound mail via Titan Email SMTP.
 * Env: SMTP_USER, SMTP_PASS (mailbox login). Optional SMTP_HOST / SMTP_PORT.
 */
import nodemailer from "nodemailer";
import { resolveSiteUrl } from "@/lib/seo";

/** Public website mailbox — used as SMTP login + From for system mail. */
export const DEFAULT_CONTACT_EMAIL = "contact@convertek.tech";

/** Inbox for contact-form messages and user support. */
export const DEFAULT_SUPPORT_EMAIL = "support@convertek.tech";

export const DEFAULT_MAIL_FROM = `Convertek <${DEFAULT_CONTACT_EMAIL}>`;

function smtpUser(): string | undefined {
  return (
    process.env.SMTP_USER?.trim() ||
    process.env.SMTP_USERNAME?.trim() ||
    process.env.MAIL_USER?.trim()
  );
}

function smtpPass(): string | undefined {
  return (
    process.env.SMTP_PASS?.trim() ||
    process.env.SMTP_PASSWORD?.trim() ||
    process.env.MAIL_PASS?.trim()
  );
}

function smtpPort(): number {
  const raw = Number(process.env.SMTP_PORT?.trim() || "465");
  return Number.isFinite(raw) && raw > 0 ? raw : 465;
}

function smtpSecure(port: number): boolean {
  const flag = process.env.SMTP_SECURE?.trim().toLowerCase();
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return port === 465;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  from?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const user = smtpUser();
  const pass = smtpPass();
  const host = process.env.SMTP_HOST?.trim() || "smtp.titan.email";
  const port = smtpPort();
  const from =
    input.from?.trim() ||
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    (user ? `Convertek <${user}>` : DEFAULT_MAIL_FROM);

  if (!user || !pass) {
    console.error("[mail] SMTP_USER / SMTP_PASS not configured");
    return { ok: false, error: "Email service is not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: smtpSecure(port),
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
    });
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
