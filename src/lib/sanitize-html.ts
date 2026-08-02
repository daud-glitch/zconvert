/**
 * Lightweight HTML sanitizer for CMS/ad content (no heavy DOMPurify dep).
 * Strips scripts, event handlers, and dangerous URLs.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== "string") return "";

  let html = dirty;

  // Remove dangerous elements entirely
  html = html.replace(
    /<\s*(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select)(\s[^>]*)?>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  html = html.replace(
    /<\s*(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select)(\s[^>]*)?\/?\s*>/gi,
    "",
  );

  // Remove inline event handlers
  html = html.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Neutralize javascript:/data: in href/src
  html = html.replace(
    /\s(href|src|xlink:href)\s*=\s*(["'])\s*(javascript:|data:text\/html)[\s\S]*?\2/gi,
    ' $1="#"',
  );
  html = html.replace(
    /\s(href|src|xlink:href)\s*=\s*(javascript:|data:text\/html)[^\s>]*/gi,
    ' href="#"',
  );

  return html;
}

/** Escape plain text for safe HTML insertion. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
