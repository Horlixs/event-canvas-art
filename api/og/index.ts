/**
 * Vercel Serverless Function — Dynamic OG tags for the homepage (/)
 *
 * Serves the hero section preview image as og:image.
 * Real browsers get redirected to the SPA immediately.
 * Social crawlers see the OG meta tags.
 */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req: any, res: any) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'dummy-io.vercel.app';
  const origin = `${proto}://${host}`;

  const ogTitle = 'Dummy.io | Edit custom Dummies';
  const ogDescription = 'Transform your template into a viral movement. One frame, infinite personalized updates, zero friction.';
  const ogImage = `${origin}/og-hero.svg`;
  const ogUrl = origin;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(ogTitle)}</title>
  <meta name="description" content="${esc(ogDescription)}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${esc(ogUrl)}" />
  <meta property="og:title" content="${esc(ogTitle)}" />
  <meta property="og:description" content="${esc(ogDescription)}" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(ogTitle)}" />
  <meta name="twitter:description" content="${esc(ogDescription)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />

  <!-- Redirect real browsers to the SPA -->
  <script>location.replace("/?_spa=1")</script>
  <noscript><meta http-equiv="refresh" content="0;url=/?_spa=1" /></noscript>
</head>
<body></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
