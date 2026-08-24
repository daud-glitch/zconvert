const http = require("http");
const next = require("next");
const { parse } = require("url");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const CANONICAL_HOST = "www.convertek.tech";

function normalizeHost(raw) {
  if (!raw) return "";
  return String(raw).split(",")[0].trim().toLowerCase().split(":")[0];
}

function forwardedProto(req) {
  const raw = req.headers["x-forwarded-proto"] || "http";
  return String(raw).split(",")[0].trim().toLowerCase();
}

function shouldForceCanonicalHost(host) {
  if (!host || host === CANONICAL_HOST) return false;
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
    return false;
  }
  if (host.endsWith(".herokuapp.com")) return false;
  if (host === "convertek.tech" || host.endsWith(".convertek.tech")) return true;
  if (host === "cloudconveter.tech" || host.endsWith(".cloudconveter.tech")) {
    return true;
  }
  if (host === "cloudconverter.tech" || host.endsWith(".cloudconverter.tech")) {
    return true;
  }
  return false;
}

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    const path = req.url || "/";

    if (!dev && path !== "/api" && !path.startsWith("/api/")) {
      const host = normalizeHost(
        req.headers["x-forwarded-host"] || req.headers.host,
      );
      const proto = forwardedProto(req);
      const needsHost = shouldForceCanonicalHost(host);
      const needsHttps = proto === "http";

      if (
        (needsHost || needsHttps) &&
        !(proto === "https" && host === CANONICAL_HOST)
      ) {
        res.writeHead(301, {
          Location: `https://${CANONICAL_HOST}${path}`,
          "Cache-Control": "public, max-age=0, must-revalidate",
        });
        res.end();
        return;
      }
    }

    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const port = process.env.PORT || 3000;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
