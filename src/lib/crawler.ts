/** Client-side heuristic — skip non-essential fetches during Googlebot rendering. */
export function isLikelyCrawler(): boolean {
  if (typeof navigator === "undefined") return false;
  return /bot|crawler|spider|slurp|bingpreview|googlebot|bingbot|yandex|baidu/i.test(
    navigator.userAgent || "",
  );
}
