// Vercel Edge Middleware — перехватывает запросы с ?product=, ?shop=, ?spec=
// Для ботов (Telegram, WhatsApp и т.д.) отдаёт динамические OG-теги
// Для обычных пользователей пропускает дальше (к index.html)

const SUPABASE_URL = 'https://nxrztljcxphkdfbfubba.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cnp0bGpjeHBoa2RmYmZ1YmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDkzNzQsImV4cCI6MjA4ODYyNTM3NH0.nCunfVYOwBKAMbbuDu4zTQ0tZhjNoWk680VFSWPwuUk';
const APP_URL = 'https://dogfriend.vercel.app';
const DEFAULT_IMAGE = APP_URL + '/icon-512.png';

function isBot(ua) {
  if (!ua) return false;
  const bots = [
    'telegrambot', 'whatsapp', 'facebookexternalhit', 'facebot',
    'twitterbot', 'linkedinbot', 'slackbot', 'discordbot',
    'pinterest', 'applebot', 'vkshare', 'skypeuripreview',
    'iframely', 'embedly'
  ];
  const lower = ua.toLowerCase();
  return bots.some(b => lower.includes(b));
}

async function supabaseGet(table, query) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  try {
    const resp = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data && data.length ? data[0] : null;
  } catch(e) {
    return null;
  }
}

function ogHtml({ title, description, image, url }) {
  const t = (title || 'Dogly').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const d = (description || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const img = image || DEFAULT_IMAGE;

  return `<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="UTF-8">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${img}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:site_name" content="Dogly">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
<title>${t}</title>
</head><body></body></html>`;
}

export default async function middleware(req) {
  const { nextUrl } = req;
  const ua = req.headers.get('user-agent') || '';

  const productId = nextUrl.searchParams.get('product');
  const shopId = nextUrl.searchParams.get('shop');
  const specId = nextUrl.searchParams.get('spec');

  // Нет deeplink параметров — пропускаем
  if (!productId && !shopId && !specId) {
    return;
  }

  // Не бот — пропускаем, SPA обработает
  if (!isBot(ua)) {
    return;
  }

  // Бот — подгружаем данные и отдаём OG-теги
  const pageUrl = nextUrl.toString();
  let title = 'Dogly — всё для владельцев собак';
  let description = 'Кинологи, магазины, ветклиники и события для собак';
  let image = DEFAULT_IMAGE;

  try {
    if (productId) {
      const product = await supabaseGet('shop_products', `id=eq.${productId}&select=name,price,images,description,business_id`);
      if (product) {
        const priceText = product.price ? product.price.toLocaleString('ru') + ' ₽' : '';
        title = product.name + (priceText ? ' — ' + priceText : '');
        description = product.description || 'Товар на Dogly';
        if (product.images && product.images.length) image = product.images[0];
        if (product.business_id) {
          const biz = await supabaseGet('businesses', `id=eq.${product.business_id}&select=name`);
          if (biz) description = biz.name + ' · ' + description;
        }
      }
    } else if (shopId) {
      const shop = await supabaseGet('businesses', `id=eq.${shopId}&select=name,description,cover_url`);
      if (shop) {
        title = shop.name + ' — магазин на Dogly';
        description = shop.description || 'Магазин товаров для собак';
        if (shop.cover_url) image = shop.cover_url;
      }
    } else if (specId) {
      const spec = await supabaseGet('businesses', `id=eq.${specId}&select=name,description,type,cover_url,price_from`);
      if (spec) {
        const types = { trainer: 'Кинолог', grooming: 'Груминг', clinic: 'Ветклиника', cafe: 'Dog-friendly место', shop: 'Магазин' };
        const typeLabel = types[spec.type] || 'Специалист';
        title = spec.name + ' — ' + typeLabel + ' на Dogly';
        description = spec.description || typeLabel;
        if (spec.cover_url) image = spec.cover_url;
      }
    }
  } catch(e) { /* fallback defaults */ }

  const html = ogHtml({ title, description, image, url: pageUrl });

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=300' }
  });
}

export const config = {
  matcher: '/'
};
