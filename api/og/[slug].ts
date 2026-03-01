/**
 * Vercel Serverless Function — Dynamic OG tags for /dp/:slug
 *
 * Uses raw fetch against the Supabase REST API (zero npm imports)
 * so there are no bundling issues in Vercel's serverless runtime.
 *
 * For real browsers the page loads and immediately redirects to the
 * SPA version. Social crawlers (WhatsApp, Twitter, Facebook, etc.)
 * don't execute JS, so they see the OG meta tags in the <head>.
 */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req: any, res: any) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  if (!slug) return res.redirect('/');

  // Detect the host so the OG url is always correct regardless of domain
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'dummy-io.vercel.app';
  const origin = `${proto}://${host}`;
  const ogUrl = `${origin}/dp/${slug}`;

  let ogTitle = 'Dummy.io | Edit custom Dummies';
  let ogDescription = 'Edit your dummy pictures with our Dummy editor.';
  let ogImage = '';

  // ── Fetch template from Supabase REST API (no SDK import needed) ──
  const sbUrl = process.env.VITE_SUPABASE_URL;
  const sbKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (sbUrl && sbKey) {
    try {
      // Try primary slug
      let row = await fetchTemplate(sbUrl, sbKey, 'slug', slug);
      // Fallback: try custom_slug
      if (!row) row = await fetchTemplate(sbUrl, sbKey, 'custom_slug', slug);

      if (row) {
        ogTitle = `${row.name} | Dummy.io`;
        ogDescription = `Generate your personalized "${row.name}" DP on Dummy.io`;
        // Only use the image if it's an actual URL (not a data URI)
        const img = row.background_image || '';
        if (img && img.startsWith('http')) {
          ogImage = img;
        }
      }
    } catch (e) {
      console.error('[og] Supabase fetch failed:', e);
    }
  }

  // ── Build self-contained HTML ──
  const imageTags = ogImage
    ? `<meta property="og:image" content="${esc(ogImage)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:image" content="${esc(ogImage)}" />`
    : '';

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
  ${imageTags}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}" />
  <meta name="twitter:title" content="${esc(ogTitle)}" />
  <meta name="twitter:description" content="${esc(ogDescription)}" />

  <!-- Redirect real browsers to the SPA (crawlers ignore JS) -->
  <script>location.replace("/dp/${esc(slug)}?_spa=1")</script>
  <noscript><meta http-equiv="refresh" content="0;url=/dp/${esc(slug)}?_spa=1" /></noscript>
</head>
<body></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}

/** Lightweight Supabase REST fetch — no SDK required */
async function fetchTemplate(
  sbUrl: string,
  sbKey: string,
  column: string,
  value: string,
): Promise<{ name: string; background_image: string | null } | null> {
  const url = `${sbUrl}/rest/v1/templates?select=name,background_image&${column}=eq.${encodeURIComponent(value)}&limit=1`;
  const resp = await fetch(url, {
    headers: {
      apikey: sbKey,
      Authorization: `Bearer ${sbKey}`,
    },
  });
  if (!resp.ok) return null;
  const rows = await resp.json();
  return rows?.[0] ?? null;
}
