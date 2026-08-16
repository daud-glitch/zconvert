const { getAllConversionPairSlugs } = require('../src/lib/conversion-pairs.ts');
const { formats } = require('../src/lib/formats.ts');
const { SITE_URL } = require('../src/lib/seo.ts');
const https = require('https');

const INDEXNOW_KEY = process.env.INDEXNOW_KEY || ""; // Environment variable for security
const INDEXNOW_API_KEY_FILENAME = `${INDEXNOW_KEY}.txt`;
const HOST = SITE_URL.replace(/^https?:\/\//, ''); // e.g., www.convertek.tech

async function notifyIndexNow() {
  if (!INDEXNOW_KEY) {
    console.warn("INDEXNOW_KEY not set. Skipping IndexNow notification.");
    return;
  }

  const urls = [];

  // Add static routes
  urls.push(`${SITE_URL}/`);
  urls.push(`${SITE_URL}/conversions`);
  urls.push(`${SITE_URL}/about`);
  urls.push(`${SITE_URL}/contact`);
  urls.push(`${SITE_URL}/privacy`);
  urls.push(`${SITE_URL}/terms`);

  // Add format pages
  formats.forEach(f => urls.push(`${SITE_URL}/conversions/${f.ext}`));

  // Add all conversion pair pages
  getAllConversionPairSlugs().forEach(slug => urls.push(`${SITE_URL}/${slug}`));

  console.log(`Notifying IndexNow for ${urls.length} URLs...`);

  const reqBody = JSON.stringify({
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/.well-known/indexnow/${INDEXNOW_API_KEY_FILENAME}`,
    urlList: urls,
  });

  const reqOptions = {
    hostname: 'api.indexnow.org',
    path: '/indexnow',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(reqBody),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(reqOptions, (res) => {
      console.log(`IndexNow status: ${res.statusCode} ${res.statusMessage}`);
      if (res.statusCode === 200) {
        console.log("IndexNow notification successful.");
        resolve(true);
      } else {
        let responseBody = '';
        res.on('data', (chunk) => responseBody += chunk);
        res.on('end', () => {
          console.error("IndexNow notification failed:", responseBody);
          reject(new Error(`IndexNow failed with status ${res.statusCode}`));
        });
      }
    });

    req.on('error', (e) => {
      console.error("IndexNow request error:", e.message);
      reject(e);
    });

    req.write(reqBody);
    req.end();
  });
}

notifyIndexNow().catch((e) => {
  console.error("Error during IndexNow process:", e);
  // Don't exit with error, build should still pass
});
