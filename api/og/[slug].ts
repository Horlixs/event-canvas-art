import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req: any, res: any) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;

  if (!slug) {
    res.redirect('/');
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  let ogTitle = 'Dummy.io | Edit custom Dummies';
  let ogDescription = 'Edit your dummy pictures with our Dummy editor. Upload your templates and generate customized Images from any Template.';
  let ogImage = '';
  const ogUrl = `https://dummyio.vercel.app/dp/${slug}`;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Try slug first
      let { data } = await supabase
        .from('templates')
        .select('name, background_image')
        .eq('slug', slug)
        .maybeSingle();

      // Try custom_slug
      if (!data) {
        ({ data } = await supabase
          .from('templates')
          .select('name, background_image')
          .eq('custom_slug' as any, slug)
          .maybeSingle());
      }

      if (data) {
        ogTitle = `${data.name} | Dummy.io`;
        ogDescription = `Generate your personalized ${data.name} DP on Dummy.io`;
        ogImage = data.background_image || '';
      }
    } catch (e) {
      console.error('OG function: Supabase error', e);
    }
  }

  // Try to read the built index.html and inject OG tags
  let html: string;
  try {
    html = readFileSync(join(process.cwd(), 'dist', 'index.html'), 'utf-8');
  } catch {
    try {
      html = readFileSync(join(__dirname, '..', '..', 'dist', 'index.html'), 'utf-8');
    } catch {
      // Fallback: minimal HTML page with OG tags + redirect
      const ogTags = buildOgTags(ogTitle, ogDescription, ogImage, ogUrl);
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(ogTitle)}</title>
  ${ogTags}
  <meta http-equiv="refresh" content="0; url=/dp/${escapeHtml(slug)}?_spa=1" />
</head>
<body>
  <p>Loading...</p>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(html);
    }
  }

  // Remove existing static OG tags from the template HTML
  html = html.replace(/<meta\s+property="og:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');
  html = html.replace(/<meta\s+name="twitter:[^"]*"\s+content="[^"]*"\s*\/?>/gi, '');

  // Build and inject dynamic OG tags
  const ogTags = buildOgTags(ogTitle, ogDescription, ogImage, ogUrl);

  // Update the page title
  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(ogTitle)}</title>`);
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, 
    `<meta name="description" content="${escapeHtml(ogDescription)}" />`);

  // Inject OG tags before </head>
  html = html.replace('</head>', `  ${ogTags}\n  </head>`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(html);
}

function buildOgTags(title: string, description: string, image: string, url: string): string {
  const tags = [
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:type" content="website" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : '',
    image ? `<meta property="og:image:width" content="1200" />` : '',
    image ? `<meta property="og:image:height" content="630" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : '',
  ].filter(Boolean);

  return tags.join('\n  ');
}
