// ════════════════════════════════════════════════════════════
// SHOP — Магазины товаров для собак
// ════════════════════════════════════════════════════════════

let _shopCart = []; // { product_id, name, price, image, quantity, attributes, business_id, business_name }
let _currentShop = null;
let _currentShopProducts = [];
let _currentProduct = null;
let _currentShopCategory = 'all';
let _shopBusinessSellerId = null; // user_id продавца текущего магазина
let _allShops = []; // Все магазины для фильтрации
let _currentShopFilter = 'all'; // Текущий фильтр магазинов по категориям

const SHOP_CATEGORIES = [
  { id: 'all',         label: 'Все',        emoji: '🛍️' },
  { id: 'food',        label: 'Корма',      emoji: '🍖' },
  { id: 'accessories', label: 'Аксессуары', emoji: '🦮' },
  { id: 'toys',        label: 'Игрушки',    emoji: '🎾' },
  { id: 'clothing',    label: 'Одежда',     emoji: '🧥' },
  { id: 'health',      label: 'Здоровье',   emoji: '💊' },
  { id: 'other',       label: 'Другое',     emoji: '📦' },
];

// ── Переключение вкладок каталога
function switchCatalogTab(tab) {
  const servPane = document.getElementById('catalog-pane-services');
  const shopPane = document.getElementById('catalog-pane-shops');
  const servBtn  = document.getElementById('catalog-tab-services');
  const shopBtn  = document.getElementById('catalog-tab-shops');
  if (!servPane || !shopPane) return;

  if (tab === 'services') {
    servPane.style.display = '';
    shopPane.style.display = 'none';
    if (servBtn) { servBtn.style.color = 'var(--primary)'; servBtn.style.borderBottom = '2.5px solid var(--primary)'; }
    if (shopBtn) { shopBtn.style.color = 'var(--text-secondary)'; shopBtn.style.borderBottom = '2.5px solid transparent'; }
  } else {
    servPane.style.display = 'none';
    shopPane.style.display = '';
    if (shopBtn) { shopBtn.style.color = 'var(--primary)'; shopBtn.style.borderBottom = '2.5px solid var(--primary)'; }
    if (servBtn) { servBtn.style.color = 'var(--text-secondary)'; servBtn.style.borderBottom = '2.5px solid transparent'; }
    // Всегда сбрасываем и перезагружаем список магазинов
    const list = document.getElementById('shops-list');
    if (list) list.innerHTML = '';
    loadShopsList();
  }
}

// ── Загрузка списка магазинов
async function loadShopsList() {
  const list = document.getElementById('shops-list');
  if (!list || !supabaseClient) return;

  list.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-secondary);"><div style="font-size:32px;margin-bottom:8px;">🛍️</div><div>Загружаем магазины...</div></div>';

  try {
    const { data, error } = await supabaseClient
      .from('businesses')
      .select('*, business_locations(address,is_main)')
      .eq('type', 'shop')
      .eq('is_approved', true)
      .order('rating', { ascending: false });

    if (error) throw error;

    _allShops = data || [];
    
    if (!_allShops.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:48px 20px;color:var(--text-secondary);">
          <div style="font-size:48px;margin-bottom:12px;">🏪</div>
          <div style="font-size:16px;font-weight:700;margin-bottom:6px;">Магазинов пока нет</div>
          <div style="font-size:13px;line-height:1.5;">Зарегистрируйте свой магазин<br>через раздел «Для бизнеса»</div>

  } catch(e) {
    console.error('loadShopsList error:', e);
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">Ошибка загрузки</div>';
  }
}

// ── Открыть магазин
async function openShop(businessId) {
  if (!supabaseClient) return;
  try {
    const [{ data: biz }, { data: products }] = await Promise.all([
      supabaseClient.from('businesses').select('*, business_locations(address,is_main)').eq('id', businessId).single(),
      supabaseClient.from('shop_products').select('*').eq('business_id', businessId).eq('is_active', true).order('created_at', { ascending: false})
    ]);

    if (!biz) return;
    _currentShop = biz;
    _currentShopProducts = products || [];
    _shopBusinessSellerId = biz.user_id;
    _currentShopCategory = 'all';

    // Заполняем шапку
    document.getElementById('shop-name').textContent = biz.name;
    document.getElementById('shop-meta').textContent = `⭐ ${biz.rating} · ${(products||[]).length} товаров`;

    // Блок информации о магазине
    const infoEl = document.getElementById('shop-info-block');
    if (infoEl) {
      const locs = biz.business_locations || [];
      const addr = (locs.find(l => l.is_main) || locs[0])?.address || biz.address || '';
      const rows = [];
      
      if (biz.description) {
        rows.push(`<div style="font-size:13px;color:var(--text-secondary);line-height:1.6;padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:12px;">${biz.description}</div>`);
      }
      
      if (addr) {
        rows.push(`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
          <div style="width:36px;height:36px;border-radius:12px;background:rgba(74,144,217,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div style="font-size:13px;font-weight:600;line-height:1.4;">${addr}</div>
        </div>`);
      }
      
      if (biz.schedule) {
        rows.push(`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;">
          <div style="width:36px;height:36px;border-radius:12px;background:rgba(74,144,217,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div style="font-size:13px;font-weight:600;">${biz.schedule}</div>
        </div>`);
      }
      
      if (biz.phone) {
        rows.push(`<a href="tel:${biz.phone.replace(/[^\d+]/g,'')}" style="display:flex;align-items:center;gap:10px;padding:8px 0;text-decoration:none;color:inherit;">
          <div style="width:36px;height:36px;border-radius:12px;background:rgba(52,199,89,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2.5" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          </div>
          <div style="font-size:13px;font-weight:700;color:var(--primary);">${biz.phone}</div>
        </a>`);
      }
      
      if (biz.telegram) {
        rows.push(`<a href="https://t.me/${biz.telegram.replace('@','')}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:8px 0;text-decoration:none;color:inherit;">
          <div style="width:36px;height:36px;border-radius:12px;background:rgba(0,136,204,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0088CC"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.751-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.477-1.635.099-.002.321.023.465.141.121.099.155.232.171.326.016.094.036.308.02.475z"/></svg>
          </div>
          <div style="font-size:13px;font-weight:600;color:#0088CC;">@${biz.telegram.replace('@','')}</div>
        </a>`);
      }
      
      if (biz.website) {
        rows.push(`<a href="${biz.website.startsWith('http') ? biz.website : 'https://' + biz.website}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:8px 0;text-decoration:none;color:inherit;">
          <div style="width:36px;height:36px;border-radius:12px;background:rgba(74,144,217,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          </div>
          <div style="font-size:13px;font-weight:600;color:var(--primary);">Сайт</div>
        </a>`);
      }
      
      if (rows.length) {
        infoEl.innerHTML = rows.join('');
        infoEl.style.display = 'block';
      } else {
        infoEl.style.display = 'none';
      }
    }

    // Рендерим категории
    renderShopCategories();
    // Рендерим товары
    renderShopProducts();

    nav('shopView');
  } catch(e) {
    console.error('openShop error:', e);
  }
}

// ── Рендер категорий
function renderShopCategories() {
  const container = document.getElementById('shop-categories');
  if (!container) return;

  // Определяем какие категории реально есть в товарах
  const existing = new Set((_currentShopProducts || []).map(p => p.category));
  const cats = SHOP_CATEGORIES.filter(c => c.id === 'all' || existing.has(c.id));

  container.innerHTML = cats.map(cat => {
    const active = _currentShopCategory === cat.id;
    return `<button onclick="filterShopByCategory('${cat.id}')" style="
      flex-shrink:0;white-space:nowrap;
      background:${active ? 'var(--primary)' : 'var(--bg)'};
      color:${active ? 'white' : 'var(--text-primary)'};
      border:none;border-radius:20px;padding:7px 14px;
      font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
      ${cat.label}
    </button>`;
  }).join('');
}

// ── Фильтр по категории
function filterShopByCategory(catId) {
  _currentShopCategory = catId;
  renderShopCategories();
  renderShopProducts();
}

// ── Рендер товаров
function renderShopProducts() {
  const grid = document.getElementById('shop-products-grid');
  if (!grid) return;

  let products = _currentShopProducts || [];
  if (_currentShopCategory !== 'all') {
    products = products.filter(p => p.category === _currentShopCategory);
  }

  if (!products.length) {
    grid.innerHTML = '<div style="grid-column:span 2;text-align:center;padding:40px 20px;color:var(--text-secondary);">Товаров нет</div>';
    return;
  }

  grid.innerHTML = products.map(p => {
    const img = (p.images && p.images[0])
      ? `<img src="${p.images[0]}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;background:linear-gradient(135deg,#f5f5f5,#e8e8e8);\\'>${getCatEmoji(p.category)}</div>'">`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;background:linear-gradient(135deg,#f5f5f5,#e8e8e8);">${getCatEmoji(p.category)}</div>`;

    const discountBadge = p.old_price
      ? `<div style="position:absolute;top:8px;right:8px;background:#FF3B30;color:white;font-size:11px;font-weight:800;padding:4px 8px;border-radius:12px;box-shadow:0 2px 8px rgba(255,59,48,0.3);">-${Math.round((1 - p.price/p.old_price)*100)}%</div>`
      : '';

    return `
      <div onclick="openShopProduct('${p.id}')" style="background:var(--white);border-radius:18px;box-shadow:0 2px 12px rgba(0,0,0,0.08);cursor:pointer;overflow:hidden;transition:transform 0.2s,box-shadow 0.2s;position:relative;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 12px rgba(0,0,0,0.08)'">
        <div style="width:100%;aspect-ratio:4/3;background:var(--bg);overflow:hidden;position:relative;">
          ${img}
          ${discountBadge}
        </div>
        <div style="padding:12px;">
          <div style="font-size:14px;font-weight:700;line-height:1.4;margin-bottom:8px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;min-height:38px;">${p.name}</div>
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
            <span style="font-size:17px;font-weight:900;color:var(--primary);">${p.price.toLocaleString('ru')} ₽</span>
            ${p.old_price ? `<span style="font-size:12px;color:var(--text-secondary);text-decoration:line-through;">${p.old_price.toLocaleString('ru')} ₽</span>` : ''}
          </div>
          ${!p.in_stock 
            ? '<div style="font-size:12px;color:#FF3B30;font-weight:700;padding:6px 10px;background:#FFF5F5;border-radius:10px;text-align:center;margin-bottom:8px;">Нет в наличии</div>' 
            : '<div style="font-size:12px;color:#34C759;font-weight:700;padding:6px 10px;background:#F0FFF4;border-radius:10px;text-align:center;margin-bottom:8px;">✓ В наличии</div>'
          }
          <button onclick="event.stopPropagation();quickAddToCart('${p.id}')" style="width:100%;background:linear-gradient(135deg,var(--primary),#6B5CE7);color:white;border:none;border-radius:12px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(74,144,217,0.3);transition:transform 0.1s;" ${!p.in_stock ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform=''" onmouseleave="this.style.transform=''">🛒 В корзину</button>
        </div>
      </div>`;
  }).join('');
}

// ── Открыть карточку товара
function openShopProduct(productId) {
  const product = _currentShopProducts.find(p => p.id === productId);
  if (!product) return;
  _currentProduct = product;

  // Фото
  const imgEl = document.getElementById('product-images');
  imgEl.style.display = 'block';
  imgEl.style.overflow = 'hidden';

  if (product.images && product.images.length) {
    const W = imgEl.offsetWidth || window.innerWidth;
    const H = Math.round(W * 0.75); // 4:3 aspect ratio
    imgEl.style.height = H + 'px';
    imgEl.style.position = 'relative';

    imgEl.innerHTML = `
      <div id="pgw" style="display:flex;width:${W * product.images.length}px;height:${H}px;transition:transform 0.3s ease;" data-index="0" data-w="${W}" data-count="${product.images.length}">
        ${product.images.map(src => `
          <div style="width:${W}px;height:${H}px;flex-shrink:0;background:#f5f5f5;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">
          </div>`).join('')}
      </div>
      ${product.images.length > 1 ? `
      <div id="product-gallery-dots" style="position:absolute;bottom:8px;left:0;right:0;display:flex;justify-content:center;gap:6px;">
        ${product.images.map((_,i) => `<div style="width:7px;height:7px;border-radius:50%;background:${i===0?'white':'rgba(255,255,255,0.5)'};box-shadow:0 1px 3px rgba(0,0,0,0.3);transition:background 0.2s;"></div>`).join('')}
      </div>
      <button onclick="slideGallery(-1)" style="position:absolute;left:8px;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.3);border:none;color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">‹</button>
      <button onclick="slideGallery(1)" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.3);border:none;color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">›</button>` : ''}`;
  } else {
    const W = imgEl.offsetWidth || window.innerWidth;
    const H = Math.round(W * 0.75);
    imgEl.style.height = H + 'px';
    imgEl.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:64px;background:#f5f5f5;">${getCatEmoji(product.category)}</div>`;
  }

  // Название
  document.getElementById('product-name').textContent = product.name;

  // Цена
  document.getElementById('product-price').textContent = product.price.toLocaleString('ru') + ' ₽';
  const oldPriceEl = document.getElementById('product-old-price');
  const discEl = document.getElementById('product-discount-badge');
  if (product.old_price) {
    oldPriceEl.textContent = product.old_price.toLocaleString('ru') + ' ₽';
    oldPriceEl.style.display = '';
    discEl.textContent = `-${Math.round((1 - product.price/product.old_price)*100)}%`;
    discEl.style.display = '';
  } else {
    oldPriceEl.style.display = 'none';
    discEl.style.display = 'none';
  }

  // Наличие
  const stockEl = document.getElementById('product-stock-badge');
  if (product.in_stock) {
    stockEl.textContent = '✓ В наличии';
    stockEl.style.background = 'rgba(52,199,89,0.1)';
    stockEl.style.color = '#34C759';
  } else {
    stockEl.textContent = '✗ Нет в наличии';
    stockEl.style.background = 'rgba(255,59,48,0.1)';
    stockEl.style.color = '#FF3B30';
  }

  // Описание
  const descEl = document.getElementById('product-description');
  descEl.textContent = product.description || '';
  descEl.style.display = product.description ? '' : 'none';

  // Характеристики (attributes — JSONB)
  const attrBlock = document.getElementById('product-attributes-block');
  const attrEl = document.getElementById('product-attributes');
  if (product.attributes && Object.keys(product.attributes).length) {
    attrEl.innerHTML = Object.entries(product.attributes).map(([key, val]) =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--bg);border-radius:12px;font-size:14px;margin-bottom:8px;">
        <span style="color:var(--text-secondary);font-weight:600;">${key}</span>
        <span style="font-weight:800;color:var(--text-primary);">${val}</span>
      </div>`
    ).join('');
    attrBlock.style.display = '';
  } else {
    attrBlock.style.display = 'none';
  }

  // Кнопка
  const addBtn = document.getElementById('product-add-btn');
  if (!product.in_stock) {
    addBtn.disabled = true;
    addBtn.style.opacity = '0.5';
    addBtn.textContent = 'Нет в наличии';
  } else {
    addBtn.disabled = false;
    addBtn.style.opacity = '1';
    addBtn.textContent = '🛒 В корзину';
  }

  updateCartBadges();
  nav('shopProduct');
}

// ── Добавить в корзину из карточки товара
function addToShopCart() {
  if (!_currentProduct || !_currentProduct.in_stock) return;
  _addProductToCart(_currentProduct);
  if (typeof showToast === 'function') showToast('✅ Добавлено в корзину', '#34C759');
}

// ── Быстрое добавление из списка
function quickAddToCart(productId) {
  const p = _currentShopProducts.find(x => x.id === productId);
  if (!p || !p.in_stock) return;
  _addProductToCart(p);
  if (typeof showToast === 'function') showToast('✅ ' + p.name.substring(0,30), '#34C759');
}

function _addProductToCart(product) {
  const existing = _shopCart.find(i => i.product_id === product.id);
  if (existing) {
    existing.quantity++;
  } else {
    _shopCart.push({
      product_id: product.id,
      business_id: _currentShop?.id || product.business_id,
      business_name: _currentShop?.name || 'Магазин',
      seller_user_id: _shopBusinessSellerId,
      name: product.name,
      price: product.price,
      image: (product.images && product.images[0]) || null,
      quantity: 1,
    });
  }
  saveShopCart();
  updateCartBadges();
}

// ── Обновить бейджи корзины
function updateCartBadges() {
  const total = _shopCart.reduce((s, i) => s + i.quantity, 0);
  ['shop-cart-badge', 'product-cart-badge'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (total > 0) {
      el.textContent = total;
      el.style.display = 'flex';
    } else {
      el.style.display = 'none';
    }
  });
}

// ── Рендер корзины
function renderShopCart() {
  const itemsEl = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  const totalEl = document.getElementById('cart-total');
  if (!itemsEl) return;

  if (!_shopCart.length) {
    itemsEl.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
        <div style="font-size:52px;margin-bottom:12px;">🛒</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:6px;">Корзина пуста</div>
        <div style="font-size:13px;">Добавьте товары из магазина</div>
      </div>`;
    if (footer) footer.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = _shopCart.map(item => {
    const img = item.image
      ? `<img src="${item.image}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;background:linear-gradient(135deg,#f5f5f5,#e8e8e8);border-radius:14px;">🛍️</div>`;

    return `
      <div style="background:var(--white);border-radius:18px;padding:14px;box-shadow:0 2px 12px rgba(0,0,0,0.08);margin-bottom:12px;display:flex;gap:14px;align-items:center;">
        <div style="width:72px;height:72px;flex-shrink:0;overflow:hidden;">${img}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:700;line-height:1.3;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.name}</div>
          <div style="font-size:17px;color:var(--primary);font-weight:900;">${item.price.toLocaleString('ru')} ₽</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
          <button onclick="changeCartQty('${item.product_id}',-1)" style="width:34px;height:34px;border-radius:50%;background:var(--bg);border:none;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-weight:700;transition:all 0.2s;" onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='var(--bg)'">−</button>
          <span style="font-size:16px;font-weight:800;min-width:24px;text-align:center;">${item.quantity}</span>
          <button onclick="changeCartQty('${item.product_id}',1)" style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#6B5CE7);border:none;font-size:20px;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 2px 8px rgba(74,144,217,0.3);transition:all 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''">+</button>
        </div>
      </div>`;
  }).join('');

  const total = _shopCart.reduce((s, i) => s + i.price * i.quantity, 0);
  if (totalEl) totalEl.textContent = total.toLocaleString('ru') + ' ₽';
  if (footer) footer.style.display = '';
}

// ── Изменить количество
function changeCartQty(productId, delta) {
  const idx = _shopCart.findIndex(i => i.product_id === productId);
  if (idx === -1) return;
  _shopCart[idx].quantity += delta;
  if (_shopCart[idx].quantity <= 0) _shopCart.splice(idx, 1);
  saveShopCart();
  updateCartBadges();
  renderShopCart();
}

// ── Написать продавцу с содержимым корзины
async function sendCartToSeller() {
  if (!_shopCart.length) return;
  if (!currentUser && typeof supabaseClient !== 'undefined' && supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) { window.currentUser = session.user; currentUser = session.user; }
  }
  if (!currentUser) { if (typeof showToast === 'function') showToast('Войдите в аккаунт'); return; }

  // Формируем сообщение
  const lines = _shopCart.map(i => `• ${i.name} × ${i.quantity} = ${(i.price * i.quantity).toLocaleString('ru')} ₽`);
  const total = _shopCart.reduce((s, i) => s + i.price * i.quantity, 0);
  const msg = `🛒 Хочу заказать:\n${lines.join('\n')}\n\nИтого: ${total.toLocaleString('ru')} ₽`;

  // Открываем чат с продавцом
  const sellerId = _shopCart[0]?.seller_user_id;
  if (!sellerId) { if (typeof showToast === 'function') showToast('Не удалось найти продавца'); return; }

  // Устанавливаем текст в поле ввода и открываем чат
  if (typeof openPrivateChatWith === 'function') {
    openPrivateChatWith(sellerId, _shopCart[0].business_name, msg);
  } else {
    // fallback — просто открываем чат
    currentPrivateChatId = sellerId;
    nav('privateChat');
    setTimeout(() => {
      const input = document.getElementById('pc-input');
      if (input) { input.value = msg; input.focus(); }
    }, 300);
  }
}

// ── Вспомогательные
function slideGallery(dir) {
  const wrap = document.getElementById('pgw');
  if (!wrap) return;
  const count = parseInt(wrap.dataset.count);
  const w = parseInt(wrap.dataset.w);
  let idx = parseInt(wrap.dataset.index) + dir;
  if (idx < 0) idx = 0;
  if (idx >= count) idx = count - 1;
  wrap.dataset.index = idx;
  wrap.style.transform = `translateX(-${idx * w}px)`;
  const dots = document.querySelectorAll('#product-gallery-dots div');
  dots.forEach((d, i) => {
    d.style.background = i === idx ? 'white' : 'rgba(255,255,255,0.5)';
  });
}

function getCatEmoji(cat) {
  const map = { food:'🍖', accessories:'🦮', toys:'🎾', clothing:'🧥', health:'💊', other:'📦' };
  return map[cat] || '🛍️';
}

function saveShopCart() {
  try { localStorage.setItem('df_shop_cart', JSON.stringify(_shopCart)); } catch(e) {}
}

function loadShopCart() {
  try {
    const s = localStorage.getItem('df_shop_cart');
    if (s) _shopCart = JSON.parse(s);
    updateCartBadges();
  } catch(e) {}
}

// Инициализация при загрузке
loadShopCart();

// Патчим nav — при переходе на shopCart рендерим содержимое
const _origNavShop = window.nav;
window.nav = function(id) {
  _origNavShop(id);
  if (id === 'shopCart') renderShopCart();
  if (id === 'catalog') {
    // Всегда возвращаемся на вкладку специалистов и сбрасываем состояние магазинов
    const servPane = document.getElementById('catalog-pane-services');
    const shopPane = document.getElementById('catalog-pane-shops');
    const servBtn  = document.getElementById('catalog-tab-services');
    const shopBtn  = document.getElementById('catalog-tab-shops');
    if (servPane) servPane.style.display = '';
    if (shopPane) { shopPane.style.display = 'none'; }
    if (servBtn) { servBtn.style.color = 'var(--primary)'; servBtn.style.borderBottom = '2.5px solid var(--primary)'; }
    if (shopBtn) { shopBtn.style.color = 'var(--text-secondary)'; shopBtn.style.borderBottom = '2.5px solid transparent'; }
    // Сбрасываем список магазинов чтобы при следующем открытии загрузился заново
    const list = document.getElementById('shops-list');
    if (list) list.innerHTML = '';
  }
};

// ════════════════════════════════════════════════════════════
// IMAGE CROPPER — для загрузки логотипов магазинов
// ════════════════════════════════════════════════════════════

let _cropperInstance = null;
let _cropperCallback = null;

// Открыть кроппер
function openImageCropper(file, callback, aspectRatio = 1) {
  if (!file || !file.type.startsWith('image/')) {
    if (typeof showToast === 'function') showToast('Выберите изображение', '#FF3B30');
    return;
  }
  
  _cropperCallback = callback;
  
  // Создаём модалку кроппера если её нет
  let modal = document.getElementById('image-cropper-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'image-cropper-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:10000;display:flex;flex-direction:column;';
    modal.innerHTML = `
      <div style="padding:20px;display:flex;justify-content:space-between;align-items:center;color:white;">
        <h3 style="font-size:18px;font-weight:800;">Обрезать изображение</h3>
        <button onclick="closeCropper()" style="background:none;border:none;color:white;font-size:28px;cursor:pointer;width:40px;height:40px;">×</button>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden;">
        <img id="cropper-image" style="max-width:100%;max-height:100%;">
      </div>
      <div style="padding:20px;display:flex;gap:10px;">
        <button onclick="closeCropper()" style="flex:1;padding:14px;background:#666;color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;">Отмена</button>
        <button onclick="applyCrop()" style="flex:1;padding:14px;background:linear-gradient(135deg,var(--primary),#6B5CE7);color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;">Готово</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  modal.style.display = 'flex';
  
  const img = document.getElementById('cropper-image');
  const reader = new FileReader();
  
  reader.onload = (e) => {
    img.src = e.target.result;
    
    // Уничтожаем старый кроппер если был
    if (_cropperInstance) {
      _cropperInstance.destroy();
    }
    
    // Инициализируем Cropper.js (используем встроенный в браузер или подключаем CDN)
    if (typeof Cropper !== 'undefined') {
      _cropperInstance = new Cropper(img, {
        aspectRatio: aspectRatio,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
      });
    } else {
      // Fallback без кроппера - просто возвращаем оригинал
      console.warn('Cropper.js не загружен, используем оригинальное изображение');
    }
  };
  
  reader.readAsDataURL(file);
}

// Применить обрезку
async function applyCrop() {
  if (!_cropperInstance || !_cropperCallback) {
    closeCropper();
    return;
  }
  
  try {
    // Получаем обрезанное изображение
    const canvas = _cropperInstance.getCroppedCanvas({
      width: 512,
      height: 512,
      imageSmoothingQuality: 'high'
    });
    
    // Конвертируем в blob
    canvas.toBlob((blob) => {
      if (blob && _cropperCallback) {
        _cropperCallback(blob);
      }
      closeCropper();
    }, 'image/jpeg', 0.9);
    
  } catch(e) {
    console.error('Crop error:', e);
    closeCropper();
  }
}

// Закрыть кроппер
function closeCropper() {
  const modal = document.getElementById('image-cropper-modal');
  if (modal) modal.style.display = 'none';
  
  if (_cropperInstance) {
    _cropperInstance.destroy();
    _cropperInstance = null;
  }
  
  _cropperCallback = null;
}

// Экспортируем функции
window.openImageCropper = openImageCropper;
window.applyCrop = applyCrop;
window.closeCropper = closeCropper;

// Рендер категорий магазинов
function renderShopCategories() {
  const container = document.getElementById('shops-categories-row');
  if (!container) return;
  
  // Собираем уникальные категории из services всех магазинов
  const categoryCounts = {};
  _allShops.forEach(shop => {
    const services = shop.services || [];
    services.forEach(s => {
      categoryCounts[s] = (categoryCounts[s] || 0) + 1;
    });
  });
  
  // Маппинг ID категорий на названия
  const categoryLabels = {
    food: 'Корма',
    accessories: 'Аксессуары',
    toys: 'Игрушки',
    clothing: 'Одежда',
    health: 'Здоровье',
    grooming: 'Груминг',
    other: 'Другое'
  };
  
  const categories = [{ id: 'all', label: 'Все', count: _allShops.length }];
  Object.keys(categoryCounts).forEach(catId => {
    if (categoryLabels[catId]) {
      categories.push({
        id: catId,
        label: categoryLabels[catId],
        count: categoryCounts[catId]
      });
    }
  });
  
  container.innerHTML = categories.map(cat => {
    const isActive = _currentShopFilter === cat.id;
    return `<div onclick="filterShopsByCategory('${cat.id}')" style="
      padding:10px 18px;
      border-radius:16px;
      background:${isActive ? 'linear-gradient(135deg,var(--primary),var(--primary-dark))' : 'var(--white)'};
      color:${isActive ? 'white' : 'var(--text-primary)'};
      font-size:14px;
      font-weight:700;
      cursor:pointer;
      white-space:nowrap;
      box-shadow:${isActive ? '0 4px 12px rgba(74,144,217,0.3)' : '0 2px 8px rgba(0,0,0,0.06)'};
      transition:all 0.2s;
      border:${isActive ? 'none' : '1px solid rgba(0,0,0,0.04)'};
    ">${cat.label} ${cat.count > 0 ? `<span style="opacity:0.8;">(${cat.count})</span>` : ''}</div>`;
  }).join('');
}

// Фильтр магазинов по категории
function filterShopsByCategory(categoryId) {
  _currentShopFilter = categoryId;
  renderShopCategories();
  renderShopsList();
}

// Рендер списка магазинов (с учётом фильтра)
function renderShopsList() {
  const list = document.getElementById('shops-list');
  if (!list) return;
  
  let filtered = _allShops;
  if (_currentShopFilter !== 'all') {
    filtered = _allShops.filter(shop => {
      const services = shop.services || [];
      return services.includes(_currentShopFilter);
    });
  }
  
  if (!filtered.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-secondary);">
      <div style="font-size:32px;margin-bottom:8px;">🔍</div>
      <div>Магазинов в этой категории нет</div>
    </div>`;
    return;
  }
  
  list.innerHTML = filtered.map(shop => {
    const locs = shop.business_locations || [];
    const addr = (locs.find(l => l.is_main) || locs[0])?.address || shop.address || '';
    const avatar = shop.cover_url
      ? `<img src="${shop.cover_url}" style="width:100%;height:100%;object-fit:contain;border-radius:18px;background:white;padding:8px;">`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;background:linear-gradient(135deg,#EEF6FF,#DBEAFE);border-radius:18px;">🏪</div>`;

    return `
      <div onclick="openShop('${shop.id}')" style="background:var(--white);border-radius:20px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,0.08);cursor:pointer;display:flex;gap:14px;align-items:center;margin-bottom:12px;transition:transform 0.2s,box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 12px rgba(0,0,0,0.08)'">
        <div style="width:72px;height:72px;flex-shrink:0;border-radius:18px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);background:white;">${avatar}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:16px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:4px;">${shop.name}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">⭐ ${shop.rating} · ${shop.description ? shop.description.substring(0,40)+'...' : 'Зоомагазин'}</div>
          ${addr ? `<div style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>${addr.length > 35 ? addr.substring(0, 35) + '...' : addr}</div>` : ''}
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;
  }).join('');
}

window.filterShopsByCategory = filterShopsByCategory;

