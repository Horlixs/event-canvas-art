/**
 * Vercel Serverless Function — Dynamic OG tags for /dp/:slug
 *
 * Instead of a JS redirect, this function fetches the SPA's index.html
 * from the static CDN and injects dynamic OG meta tags into the <head>.
 *
 * - Crawlers (WhatsApp, Twitter, Facebook) see the OG meta tags
 * - Browsers get the full SPA with scripts that render normally
 * - No redirect loops, single request
 */

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req: any, res: any) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  if (!slug) return res.redirect('/');

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'dummy-io.vercel.app';
  const origin = `${proto}://${host}`;
  const ogUrl = `${origin}/dp/${slug}`;

  let ogTitle = 'Dummy.io | Edit custom Dummies';
  let ogDescription = 'Create and customize personalized DPs with Dummy.io';
  let ogImage = '';

  // ── Fetch template from Supabase REST API ──
  const sbUrl = process.env.VITE_SUPABASE_URL;
  const sbKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (sbUrl && sbKey) {
    try {
      let row = await fetchTemplate(sbUrl, sbKey, 'slug', slug);
      if (!row) row = await fetchTemplate(sbUrl, sbKey, 'custom_slug', slug);

      if (row) {
        ogTitle = `${row.name} | Dummy.io`;
        ogDescription = `Generate your personalized "${row.name}" DP on Dummy.io — customize and download instantly.`;
        const img = row.background_image || '';
        const ogImageParams = new URLSearchParams({
          title: row.name,
          description: 'Generate your personalized DP on Dummy.io',
          mode: 'template',
        });
        if (img && img.startsWith('http')) {
          ogImageParams.set('bg', img);
        }
        ogImage = `${origin}/api/og-image?${ogImageParams.toString()}`;
      }
    } catch (e) {
      console.error('[og] Supabase fetch failed:', e);
    }
  }

  // ── Fetch the SPA's index.html from CDN and inject OG tags ──
  try {
    const spaRes = await fetch(`${origin}/index.html`);
    if (!spaRes.ok) throw new Error(`Failed to fetch index.html: ${spaRes.status}`);
    let html = await spaRes.text();

    // Strip any existing generic OG / Twitter tags from index.html
    html = html.replace(/<meta\s+property="og:[^"]*"[^>]*\/?>/gi, '');
    html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*\/?>/gi, '');

    // Update <title>
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(ogTitle)}</title>`);

    // Build OG tag block
    const imageTags = ogImage
      ? `<meta property="og:image" content="${esc(ogImage)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:image" content="${esc(ogImage)}" />`
      : '';

    const ogBlock = `
    <!-- Dynamic OG tags (injected by serverless function) -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${esc(ogUrl)}" />
    <meta property="og:title" content="${esc(ogTitle)}" />
    <meta property="og:description" content="${esc(ogDescription)}" />
    ${imageTags}
    <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${esc(ogTitle)}" />
    <meta name="twitter:description" content="${esc(ogDescription)}" />
  `;

    html = html.replace('</head>', ogBlock + '</head>');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch (fetchErr) {
    console.error('[og] Failed to fetch or inject into index.html:', fetchErr);
    // Fallback: return a redirect to the SPA
    res.writeHead(302, { Location: `/dp/${encodeURIComponent(slug)}#og` });
    return res.end();
  }
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
