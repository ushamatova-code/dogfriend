// ════════════════════════════════════════════════════════════
// SHOP — Магазины товаров для собак
// ════════════════════════════════════════════════════════════

let _shopCart = []; // { product_id, name, price, image, quantity, attributes, business_id, business_name }
let _currentShop = null;
let _currentShopProducts = [];
let _currentProduct = null;
let _currentShopCategory = 'all';
let _shopBusinessSellerId = null; // user_id продавца текущего магазина

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

    if (!data || !data.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:48px 20px;color:var(--text-secondary);">
          <div style="font-size:48px;margin-bottom:12px;">🏪</div>
          <div style="font-size:16px;font-weight:700;margin-bottom:6px;">Магазинов пока нет</div>
          <div style="font-size:13px;line-height:1.5;">Зарегистрируйте свой магазин<br>через раздел «Для бизнеса»</div>
        </div>`;
      return;
    }

    list.innerHTML = data.map(shop => {
      const locs = shop.business_locations || [];
      const addr = (locs.find(l => l.is_main) || locs[0])?.address || shop.address || '';
      const avatar = shop.cover_url
        ? `<img src="${shop.cover_url}" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:28px;background:linear-gradient(135deg,#EEF6FF,#DBEAFE);border-radius:16px;">🏪</div>`;

      return `
        <div onclick="openShop('${shop.id}')" style="background:var(--white);border-radius:18px;padding:14px;box-shadow:var(--shadow);cursor:pointer;display:flex;gap:12px;align-items:center;margin-bottom:10px;">
          <div style="width:60px;height:60px;flex-shrink:0;border-radius:16px;overflow:hidden;">${avatar}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${shop.name}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">⭐ ${shop.rating} · ${shop.description ? shop.description.substring(0,40)+'...' : 'Зоомагазин'}</div>
            ${addr ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:3px;">📍 ${addr}</div>` : ''}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </div>`;
    }).join('');

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
      supabaseClient.from('businesses').select('*').eq('id', businessId).single(),
      supabaseClient.from('shop_products').select('*').eq('business_id', businessId).eq('is_active', true).order('created_at', { ascending: false })
    ]);

    if (!biz) return;
    _currentShop = biz;
    _currentShopProducts = products || [];
    _shopBusinessSellerId = biz.user_id;
    _currentShopCategory = 'all';

    // Заполняем шапку
    document.getElementById('shop-name').textContent = biz.name;
    document.getElementById('shop-meta').textContent = `⭐ ${biz.rating} · ${(products||[]).length} товаров`;

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
      font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;
      display:flex;align-items:center;gap:5px;">
      ${cat.emoji} ${cat.label}
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
      ? `<img src="${p.images[0]}" style="width:100%;height:100%;object-fit:cover;">`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:36px;">${getCatEmoji(p.category)}</div>`;

    const discount = p.old_price
      ? `<span style="background:#FF3B30;color:white;font-size:10px;font-weight:800;padding:2px 6px;border-radius:6px;margin-left:6px;">-${Math.round((1 - p.price/p.old_price)*100)}%</span>`
      : '';

    return `
      <div onclick="openShopProduct('${p.id}')" style="background:var(--white);border-radius:16px;box-shadow:var(--shadow);cursor:pointer;overflow:hidden;">
        <div style="width:100%;height:140px;background:var(--bg);overflow:hidden;">${img}</div>
        <div style="padding:10px;">
          <div style="font-size:13px;font-weight:700;line-height:1.3;margin-bottom:6px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${p.name}</div>
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
            <span style="font-size:15px;font-weight:900;color:var(--primary);">${p.price.toLocaleString('ru')} ₽</span>
            ${p.old_price ? `<span style="font-size:11px;color:var(--text-secondary);text-decoration:line-through;">${p.old_price.toLocaleString('ru')} ₽</span>` : ''}
            ${discount}
          </div>
          ${!p.in_stock ? '<div style="font-size:11px;color:#FF3B30;font-weight:700;margin-top:4px;">Нет в наличии</div>' : ''}
          <button onclick="event.stopPropagation();quickAddToCart('${p.id}')" style="width:100%;margin-top:8px;background:var(--primary);color:white;border:none;border-radius:10px;padding:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">+ В корзину</button>
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
  imgEl.style.overflowX = 'hidden';

  if (product.images && product.images.length) {
    // Обёртка — горизонтальный скролл с snap
    imgEl.innerHTML = `
      <div id="product-gallery-wrap" style="display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;height:280px;" onscroll="updateGalleryDots(this)">
        ${product.images.map(src => `
          <div style="min-width:100%;height:280px;scroll-snap-align:start;flex-shrink:0;background:var(--bg);display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img src="${src}" style="width:100%;height:100%;object-fit:contain;">
          </div>`).join('')}
      </div>
      ${product.images.length > 1 ? `
      <div id="product-gallery-dots" style="display:flex;justify-content:center;gap:6px;padding:8px 0;">
        ${product.images.map((_,i) => `<div style="width:7px;height:7px;border-radius:50%;background:${i===0?'var(--primary)':'var(--border)'};transition:background 0.2s;"></div>`).join('')}
      </div>` : ''}`;
  } else {
    imgEl.innerHTML = `<div style="height:280px;display:flex;align-items:center;justify-content:center;font-size:64px;background:var(--bg);">${getCatEmoji(product.category)}</div>`;
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
      `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <span style="color:var(--text-secondary);">${key}</span>
        <span style="font-weight:700;">${val}</span>
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
      ? `<img src="${item.image}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;background:var(--bg);border-radius:12px;">🛍️</div>`;

    return `
      <div style="background:var(--white);border-radius:16px;padding:12px;box-shadow:var(--shadow);margin-bottom:10px;display:flex;gap:12px;align-items:center;">
        <div style="width:56px;height:56px;flex-shrink:0;">${img}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.name}</div>
          <div style="font-size:13px;color:var(--primary);font-weight:800;margin-top:2px;">${item.price.toLocaleString('ru')} ₽</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <button onclick="changeCartQty('${item.product_id}',-1)" style="width:30px;height:30px;border-radius:10px;background:var(--bg);border:none;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">−</button>
          <span style="font-size:15px;font-weight:800;min-width:20px;text-align:center;">${item.quantity}</span>
          <button onclick="changeCartQty('${item.product_id}',1)" style="width:30px;height:30px;border-radius:10px;background:var(--primary);border:none;font-size:18px;cursor:pointer;color:white;display:flex;align-items:center;justify-content:center;">+</button>
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
function sendCartToSeller() {
  if (!_shopCart.length) return;
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
function updateGalleryDots(el) {
  const index = Math.round(el.scrollLeft / el.offsetWidth);
  const dots = document.querySelectorAll('#product-gallery-dots div');
  dots.forEach((d, i) => {
    d.style.background = i === index ? 'var(--primary)' : 'var(--border)';
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
