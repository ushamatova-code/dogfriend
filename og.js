const SUPABASE_URL = 'https://nxrztljcxphkdfbfubba.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cnp0bGpjeHBoa2RmYmZ1YmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDkzNzQsImV4cCI6MjA4ODYyNTM3NH0.nCunfVYOwBKAMbbuDu4zTQ0tZhjNoWk680VFSWPwuUk';
const APP_URL = 'https://dogfriend.vercel.app';
const DEFAULT_IMAGE = APP_URL + '/icon-512.png';

async function supabaseGet(table, query) {
  try {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data && data.length ? data[0] : null;
  } catch(e) { return null; }
}

function esc(s) { return (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

export default async function handler(req) {
  const url = new URL(req.url);
  const productId = url.searchParams.get('product');
  const shopId = url.searchParams.get('shop');
  const specId = url.searchParams.get('spec');

  // Формируем URL для пользователя (SPA с параметрами)
  const spaUrl = `${APP_URL}/?${url.searchParams.toString()}`;

  let title = 'Dogly — всё для владельцев собак';
  let description = 'Кинологи, магазины, ветклиники и события для собак';
  let image = DEFAULT_IMAGE;

  try {
    if (productId) {
      const p = await supabaseGet('shop_products', `id=eq.${productId}&select=name,price,images,description,business_id`);
      if (p) {
        title = p.name + (p.price ? ' — ' + Number(p.price).toLocaleString('ru') + ' ₽' : '');
        description = p.description || 'Товар на Dogly';
        if (p.images && p.images.length && p.images[0]) image = p.images[0];
        if (p.business_id) {
          const b = await supabaseGet('businesses', `id=eq.${p.business_id}&select=name`);
          if (b) description = b.name + ' · ' + description;
        }
      }
    } else if (shopId) {
      const s = await supabaseGet('businesses', `id=eq.${shopId}&select=name,description,cover_url`);
      if (s) {
        title = s.name + ' — магазин на Dogly';
        description = s.description || 'Магазин товаров для собак';
        if (s.cover_url) image = s.cover_url;
      }
    } else if (specId) {
      const s = await supabaseGet('businesses', `id=eq.${specId}&select=name,description,type,cover_url,price_from`);
      if (s) {
        const types = { trainer:'Кинолог', grooming:'Груминг', clinic:'Ветклиника', cafe:'Dog-friendly место', shop:'Магазин' };
        title = s.name + ' — ' + (types[s.type] || 'Специалист') + ' на Dogly';
        description = s.description || (types[s.type] || 'Специалист');
        if (s.cover_url) image = s.cover_url;
      }
    }
  } catch(e) {}

  const html = `<!DOCTYPE html><html lang="ru"><head>
<meta charset="UTF-8">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(spaUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Dogly">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<title>${esc(title)}</title>
<meta http-equiv="refresh" content="0;url=${esc(spaUrl)}">
</head><body><p>Перенаправление...</p></body></html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=300' }
  });
}

export const config = { runtime: 'edge' };
