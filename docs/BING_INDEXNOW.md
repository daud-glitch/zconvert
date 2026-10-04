# Bing Webmaster Tools + IndexNow setup

Google does not participate in IndexNow — it still relies solely on the
sitemap. Bing, Yandex and searxng do, and they typically index a submitted URL
**within 24–72 hours** instead of the 4–8 weeks Google needs.

## 1. Generate a key and set it on Heroku

Pick a random key of 8–128 hex characters:

```bash
python -c "import secrets; print(secrets.token_hex(16))"
```

Then, on your machine (requires `heroku login`):

```bash
heroku config:set INDEXNOW_KEY=<your-key> -a <your-app>
```

Both values must be set for the verification meta tag to be emitted:

```bash
heroku config:set \
  BING_SITE_VERIFICATION=<msvalidate.01 code from Bing> \
  NEXT_PUBLIC_BING_SITE_VERIFICATION=<same code> \
  -a <your-app>
```

`NEXT_PUBLIC_…` is required because the meta tag is rendered into the static
HTML; the plain `BING_SITE_VERIFICATION` variant is also honoured.

## 2. Redeploy

The key file is served by the app at
`/.well-known/indexnow/<INDEXNOW_KEY>.txt`. It only exists after a deploy, so
redeploy after setting the vars — Heroku's `heroku-postbuild` already fires an
IndexNow notification at the end of each build.

## 3. Verify

```bash
# Key file must return the key itself with HTTP 200
curl https://www.convertek.tech/.well-known/indexnow/<INDEXNOW_KEY>.txt

# The msvalidate meta tag must be in the homepage HTML
curl -s https://www.convertek.tech/ | grep -o 'msvalidate.01[^"]*'
```

Both must pass **before** you submit the site in Bing Webmaster Tools,
otherwise verification fails.

## 4. Submit to Bing Webmaster Tools

1. Go to <https://www.bing.com/webmasters> and add the site.
2. Choose **Import from GSC** — it copies your Google sitemap and verified
   properties in one step. This is the fastest route.
3. Otherwise use the **XML sitemap** method and submit
   `https://www.convertek.tech/sitemap.xml`.
4. Confirm `robots.txt` is detected; it already declares the sitemap.

## 5. Notify on demand

```bash
npm run indexnow              # reports, never fails the process
npm run indexnow -- --strict  # exit non-zero on failure (for CI)
```

This submits the full set: static routes, all format pages, and all
conversion-pair pages.

## Checking it is wired up

```bash
npm run preflight
```

Without the env vars this reports:

```
! [indexnow.key] INDEXNOW_KEY is not set — Bing and other IndexNow engines are never notified.
! [bing.verification] BING_SITE_VERIFICATION is not set — Bing Webmaster Tools cannot be verified.
```

## Troubleshooting

**Key file returns 404** — `INDEXNOW_KEY` is not set on the dyno, or the app
has not been redeployed since it was set.

**IndexNow responds 400/403** — the key file was not fetchable by Bing at
submission time. Confirm step 3, then re-run `npm run indexnow -- --strict`.

**Notifications only fire on deploy** — that is by design. `heroku-postbuild`
runs the script at the end of every build. To notify between deploys, run it
from the Heroku scheduler or a local machine.