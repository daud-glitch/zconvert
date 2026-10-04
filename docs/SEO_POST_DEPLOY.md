# Post-deploy SEO checklist — convertek.tech

Deployment window: after the indexation fixes ship. Do these in order.

## 1. Verify on production before touching Search Console

```bash
# Sitemap must contain zero /conversions/<a>-to-<b> URLs
curl -s https://www.convertek.tech/sitemap.xml \
  | grep -c '<loc>'                                   # expect ~2523
curl -s https://www.convertek.tech/sitemap.xml \
  | grep -o '<loc>[^<]*</loc>' | grep -cE '/conversions/[a-z0-9.]+-to-'   # expect 0

# Legacy shapes must 301/308 to the canonical root pair page
curl -sI https://www.convertek.tech/conversions/png-to-jpg  | grep -i location
curl -sI "https://www.convertek.tech/?from=png&to=jpg"     | grep -i location

# Canonical pair page must be indexable and self-canonical
curl -s https://www.convertek.tech/png-to-jpg \
  | grep -E 'name="robots"|rel="canonical"' | head -2
```

If any of these disagree with the expectation above, **stop** — do not submit the
sitemap until production matches dev.

## 2. Search Console — sitemaps

1. **Sitemaps → `/sitemap.xml` → Resubmit.** (Already submitted; the content
   changed, so the resubmit forces a re-read.)
2. Confirm Google reports **2,523 URLs discovered** and no "Errors" row.
3. **URL Inspection** on a sample of 10 root pair pages (mix of image, audio,
   document, data pairs). Each must report:
   - *Google-selected canonical* = the same URL you inspected
   - *Page is indexed* = yes
   - *Crawled - currently not indexed* = absent
4. **URL Inspection** on one former noindex URL, e.g.
   `https://www.convertek.tech/conversions/png-to-jpg`. Expect: *"Page with
   redirect"* and *"Google-selected canonical: https://www.convertek.tech/png-to-jpg"*.
   That is the correct end state — not an error.

## 3. Search Console — the six reports, expected movement

| Report | Before | Expected after | Notes |
|---|---|---|---|
| Excluded by 'noindex' | 808 | ~0 | Root cause fixed; these were the sitemap's own URLs |
| Discovered - not indexed | 1,543 | falls over 2–6 weeks | Crawl budget frees up once noindex pages stop competing |
| Alternate w/ proper canonical | 1,244 | ~0 | `?from=&to=` now 301s instead of duplicating `/` |
| Not found (404) | 60 | ~58 → 0 | `/conversions/x-to-y` 404s now redirect |
| Crawled - not indexed | 64 | ~10 | Remaining: font/manifest noise, now robots-blocked |
| Page with redirect | 29 | ~29,500 | **Increase is expected and good** — redirects are now explicit |

A jump in "Page with redirect" is the fix working, not a regression. Do not
"fix" it back.

## 4. Re-crawl the 60 known 404 URLs

Search Console → **URL Inspection** → paste each of these (or spot-check) after
deploy. They were real traffic that hit 404:

```
/tiff-to-tif      /csv-to-yml      /png-to-tif       /jpg-to-tif
/png-to-yml       /json-to-yml     /sav-to-yml       /xml-to-yml
/ini-to-yml       /dib-to-tif      /avif-to-tif      /eps-to-tif
```

If a pair is genuinely unsupported (`tiff-to-tif` — same format both sides), a
404 is correct. If it *should* work, add the pair to `TOP_PAIRS` in
`src/lib/conversion-pairs.ts` instead of hand-redirecting.

## 5. Bing Webmaster Tools

Import `https://www.convertek.tech/sitemap.xml` and submit the same URLs. Bing
indexes faster than Google and will show movement within days, giving early
signal that the redirects are correct.

## 6. Monitoring cadence

- **Days 1–3:** confirm no crawl errors appear (Search Console → Pages).
- **Week 1:** check "Discovered - not indexed" is trending down.
- **Weeks 2–4:** check index coverage ratio in **Pages → Indexed vs. not indexed**.
  Target: indexed count climbing past today's 2.1K toward ~2.5K.
- **Week 6:** compare impressions. Expect growth to lag indexing by 2–4 weeks.
- **Ongoing:** run `npm test` in CI — `src/__tests__/sitemap.test.ts` fails the
  build if anyone reintroduces noindex URLs into the sitemap.

## 7. Rollback trigger

If organic traffic drops >20% week-over-week for two consecutive weeks after
deploy, the likely cause is a redirect mapping to a wrong target. Check
`/conversions/png-to-jpg → /png-to-jpg` in URL Inspection and revert
`src/app/conversions/[format]/page.tsx` while investigating. Note the
`Last updated` date on the changelog will need a new entry either way.
