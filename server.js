const express = require('express');
const next = require('next');
const url = require('url');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // Force HTTPS and www
  server.use((req, res, next) => {
    const host = req.headers.host;
    const protocol = req.protocol;

    if (dev) {
      return next();
    }

    // Redirect http to https
    if (protocol === 'http' || req.headers['x-forwarded-proto'] === 'http') {
      return res.redirect(301, `https://${host}${req.url}`);
    }

    // Redirect apex domain to www
    if (host === 'convertek.tech') {
      return res.redirect(301, `https://www.convertek.tech${req.url}`);
    }

    next();
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const port = process.env.PORT || 3000;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
