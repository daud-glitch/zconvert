import { CONSENT_STORAGE_KEY, EXTRA_EEA_TIMEZONES } from "@/lib/consent";

/**
 * Google AdSense wiring.
 *
 * AdSense site review needs its loader on every page, so the tag is rendered
 * into <head> by the root layout rather than waiting for a consent click. What
 * consent still controls is *personalisation*: until a visitor allows
 * advertising, the page-level non-personalised flag is set on `adsbygoogle`
 * before the loader runs. Without that, the review snippet and the EEA opt-in
 * notice would contradict each other.
 */

export const ADSENSE_PUBLISHER_ID = "pub-1501827698606542";
export const ADSENSE_CLIENT = `ca-${ADSENSE_PUBLISHER_ID}`;
export const ADSENSE_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

/**
 * Inline ES5 bootstrap, executed before the AdSense loader.
 *
 * It cannot import anything at runtime, so the storage key and EEA timezone
 * list are embedded from the same constants `lib/consent.ts` uses. Must never
 * throw: a broken snippet here would take the page's ad slot down with it.
 */
export function adsConsentBootstrapScript(
  storageKey: string = CONSENT_STORAGE_KEY,
  eeaTimeZones: readonly string[] = EXTRA_EEA_TIMEZONES,
): string {
  return `(function(){try{
var d=null;
try{var raw=window.localStorage.getItem(${JSON.stringify(storageKey)});if(raw){d=JSON.parse(raw);}}catch(e){}
var tz="";
try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){}
var eea=${JSON.stringify(eeaTimeZones)}.indexOf(tz)>-1||tz.indexOf("Europe/")===0;
var ads=d&&d.version===1&&typeof d.ads==="boolean"?d.ads:!eea;
var q=window.adsbygoogle=window.adsbygoogle||[];
q.requestNonPersonalizedAds=ads?0:1;
}catch(e){}})();`;
}
