import Link from "next/link";
import { BrandMark } from "@/components/common/BrandMark";
import { BrandTitle } from "@/components/common/BrandTitle";
import { CookieSettingsButton } from "@/components/consent/CookieConsent";

const FOOTER_LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Converter" },
  { href: "/conversions", label: "All Formats" },
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/changelog", label: "Changelog" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

/**
 * Site-wide footer for the content pages (conversion pairs, format pages,
 * directory, 404).
 *
 * AdSense reviews require the policy pages — Privacy Policy and Terms — to be
 * reachable from every page, not just the homepage. The pair pages, which make
 * up almost the whole index, had no footer at all before this.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <BrandMark className="h-7 w-7" rounded="rounded-lg" />
              <BrandTitle className="text-lg font-bold tracking-tight text-foreground" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Free online file converter for images, PDF, documents, audio,
              video, data and more. Mixed batches, no watermarks, and files
              that stay in your browser.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-2"
          >
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground transition-colors hover:text-emerald-500"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Convertek. All rights reserved. By
          using this site you agree to our{" "}
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          .
          <CookieSettingsButton className="ml-2 underline decoration-dotted underline-offset-2" />
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
