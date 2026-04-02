// ============================================================
// PLACES.JS — Geolocation, map, places, discounts
// Depends on: globals.js
// ============================================================

// userLat, userLng, userLocationName объявлены в globals.js

async function geocodeAddress(address) {
  try {
    const resp = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address + ', Россия') + '&limit=1');
    const data = await resp.json();
    if (data && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch(e) { console.warn('Geocode error:', e); }
  return null;
}

function getUserLocation() {
  return new Promise(async (resolve) => {
    // 1. Пробуем из кэша (свежий — до 1 часа)
    const cached = localStorage.getItem('df_user_location');
    if (cached) {
      try {
        const loc = JSON.parse(cached);
        if (loc.lat && loc.lng && (Date.now() - loc.ts) < 3600000) {
          userLat = loc.lat; userLng = loc.lng; userLocationName = loc.name || '';
          updateGeoUI();
          resolve({lat: loc.lat, lng: loc.lng});
          return;
        }
      } catch(e) {}
    }

    // 2. Пробуем район из профиля (приоритет — в РФ GPS часто не работает)
    const profile = JSON.parse(localStorage.getItem('df_profile') || '{}');
    const district = profile.district || localStorage.getItem('df_user_geo') || '';
    
    if (district) {
      const coords = await geocodeAddress(district);
      if (coords) {
        userLat = coords.lat;
        userLng = coords.lng;
        userLocationName = district;
        localStorage.setItem('df_user_location', JSON.stringify({
          lat: userLat, lng: userLng, ts: Date.now(), name: userLocationName
        }));
        updateGeoUI();
        resolve(coords);
        return;
      }
    }

    // 3. Пробуем GPS (может не сработать в Москве)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          userLat = pos.coords.latitude;
          userLng = pos.coords.longitude;
          // Обратное геокодирование
          try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}&zoom=14&addressdetails=1`);
            const data = await resp.json();
            const a = data.address || {};
            userLocationName = a.suburb || a.city_district || a.town || a.city || '';
          } catch(e) {}
          localStorage.setItem('df_user_location', JSON.stringify({
            lat: userLat, lng: userLng, ts: Date.now(), name: userLocationName
          }));
          updateGeoUI();
          resolve({lat: userLat, lng: userLng});
        },
        () => {
          // GPS не сработал — показываем подсказку
          updateGeoUI();
          resolve(null);
        },
        { timeout: 5000, maximumAge: 300000 }
      );
    } else {
      updateGeoUI();
      resolve(null);
    }
  });
}

function updateGeoUI() {
  const geoDisplay = document.getElementById('home-geo-display');
  if (geoDisplay) {
    if (userLocationName) {
      geoDisplay.textContent = userLocationName;
    } else {
      geoDisplay.textContent = 'Укажите район →';
    }
  }
  updateDistrictChatLabel();
}

// Расстояние между двумя точками (км)
function calcDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 999;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDist(km) {
  if (km < 1) return Math.round(km * 1000) + ' м';
  return km.toFixed(1) + ' км';
}

// Инициализация геолокации при старте
getUserLocation();

// ════════════════════════════════════════════════════════════
// PLACES — загрузка из Supabase + карта
// (только кафе, клиники и подобные места — НЕ кинологи)
// ════════════════════════════════════════════════════════════
let _placesFilter = 'Все';
let _currentPlace = null;
let _loadedPlaces = [];
let _placesMap = null;
let _placesMapMarkers = [];

const PLACE_TYPE_MAP = { 
  cafe: 'Кафе',
  clinic: 'Клиника', 
  park: 'Парк',
  groomer: 'Грумер',
  playground: 'Площадка'
};
const PLACE_ICON_MAP = { 
  cafe: '☕',
  clinic: '🏥', 
  park: '🌳',
  groomer: '✂️',
  playground: '🎪'
};
const PLACE_GRAD_MAP = {
  cafe: 'linear-gradient(135deg,#FF9800,#FFD54F)',
  clinic: 'linear-gradient(135deg,#4CAF50,#009688)',
  park: 'linear-gradient(135deg,#8BC34A,#4CAF50)',
  groomer: 'linear-gradient(135deg,#9C27B0,#E1BEE7)',
  playground: 'linear-gradient(135deg,#FF5722,#FF9800)'
};

function filterPlaces(val, el) {
  _placesFilter = val;
  document.querySelectorAll('#dogmap .chips .chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  renderPlaces();
}

async function renderPlaces() {
  if (!supabaseClient) return;
  const list = document.getElementById('places-list');
  if (!list) return;

  // Показываем загрузку СРАЗУ
  list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);"><div style="font-size:32px;margin-bottom:8px;">📍</div><div>Загружаем места...</div></div>';

  // Дожидаемся геолокации если ещё нет
  if (!userLat) await getUserLocation();

  try {
    // Загружаем места: кафе, клиники, парки, грумеры, площадки (НЕ кинологов — они в каталоге, НЕ магазины — они отдельно)
    const { data, error } = await supabaseClient
      .from('businesses')
      .select('*, business_locations(location_lat, location_lng, address, is_main)')
      .eq('is_approved', true)
      .in('type', ['cafe', 'clinic', 'park', 'groomer', 'playground'])
      .order('rating', { ascending: false });
    if (error) throw error;

    let businesses = data || [];

    // Фильтр по типу через чипсы
    if (_placesFilter !== 'Все') {
      const typeMap = { 
        'Кафе': 'cafe', 
        'Клиники': 'clinic',
        'Парки': 'park',
        'Грумеры': 'groomer',
        'Площадки': 'playground'
      };
      const t = typeMap[_placesFilter];
      if (t) {
        businesses = businesses.filter(b => b.type === t);
      } else {
        // Если категория не найдена — показываем пустой список
        businesses = [];
      }
    }

    // Считаем расстояние — берём минимальное среди всех локаций бизнеса
    businesses = businesses.map(b => {
      const locs = b.business_locations || [];
      let minDist = calcDistance(userLat, userLng, b.location_lat, b.location_lng);
      locs.forEach(l => {
        if (l.location_lat && l.location_lng) {
          const d = calcDistance(userLat, userLng, l.location_lat, l.location_lng);
          if (d < minDist) minDist = d;
        }
      });
      return { ...b, _dist: minDist };
    }).sort((a, b) => a._dist - b._dist);

    _loadedPlaces = businesses;

    // Инициализируем реальную карту
    initPlacesMap(businesses);

    if (businesses.length === 0) {
      list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">📍 Пока нет мест рядом.<br>Бизнесы могут добавить себя через раздел «Для бизнеса»</div>';
      return;
    }

    list.innerHTML = businesses.map(b => `
      <div class="card" style="cursor:pointer;margin:0 16px 10px;display:flex;gap:12px;align-items:center;" onclick='openPlaceModal("${b.id}")'>
        <div style="width:50px;height:50px;background:${PLACE_GRAD_MAP[b.type] || PLACE_GRAD_MAP.cafe};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;overflow:hidden;">
          ${b.cover_url ? `<img src="${b.cover_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.textContent='${PLACE_ICON_MAP[b.type]||'📍'}'">` : (PLACE_ICON_MAP[b.type] || '📍')}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:800;font-size:15px;">${b.name}</div>
          <div style="font-size:12px;color:var(--text-secondary);">${PLACE_TYPE_MAP[b.type] || b.type} · ⭐ ${b.rating}</div>
          <div style="font-size:12px;color:var(--text-secondary);">📍 ${b.address}${b._dist < 100 ? ' · ' + formatDist(b._dist) : ''}</div>
        </div>
      </div>
    `).join('');
  } catch(e) {
    console.error('renderPlaces error:', e);
    list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">Ошибка загрузки</div>';
  }
}

function initPlacesMap(businesses) {
  const loading = document.getElementById('dogmap-map-loading');
  const mapEl = document.getElementById('dogmap-leaflet');
  if (!mapEl) return;

  // Убираем заглушку
  if (loading) loading.style.display = 'none';

  // Центр карты — позиция пользователя или Москва по умолчанию
  const centerLat = userLat || 55.7558;
  const centerLng = userLng || 37.6176;
  const zoom = userLat ? 13 : 10;

  // Уничтожаем старую карту если была
  if (_placesMap) {
    _placesMap.remove();
    _placesMap = null;
  }

  if (!window.L) {
    if (loading) { loading.style.display = 'flex'; loading.innerHTML = '<div style="text-align:center;font-size:13px;color:#666;">Карта недоступна</div>'; }
    return;
  }

  _placesMap = L.map('dogmap-leaflet', { zoomControl: false, attributionControl: false }).setView([centerLat, centerLng], zoom);

  // Тайлы OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(_placesMap);

  // Маркер пользователя
  if (userLat && userLng) {
    const userIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;background:#4A90D9;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [14, 14], iconAnchor: [7, 7], className: ''
    });
    L.marker([userLat, userLng], { icon: userIcon }).addTo(_placesMap).bindPopup('Вы здесь');
  }

  // Маркеры бизнесов
  _placesMapMarkers = [];
  businesses.forEach(b => {
    // Берём координаты — из основной локации или из business_locations
    const locs = b.business_locations || [];
    const mainLoc = locs.find(l => l.is_main) || locs[0];
    const lat = mainLoc?.location_lat || b.location_lat;
    const lng = mainLoc?.location_lng || b.location_lng;
    
    // Если нет координат — пропускаем
    if (!lat || !lng) {
      console.warn(`У бизнеса ${b.name} нет координат, пропускаем на карте`);
      return;
    }

    const emoji = PLACE_ICON_MAP[b.type] || '📍';
    const markerIcon = L.divIcon({
      html: `<div style="width:36px;height:36px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.2);border:2px solid #4A90D9;">${emoji}</div>`,
      iconSize: [36, 36], iconAnchor: [18, 18], className: ''
    });

    const marker = L.marker([lat, lng], { icon: markerIcon })
      .addTo(_placesMap)
      .bindPopup(`<div style="font-weight:700;font-size:13px;">${b.name}</div><div style="font-size:11px;color:#666;">${mainLoc?.address || b.address || ''}</div>`);

    marker.on('click', () => openPlaceModal(b.id));
    _placesMapMarkers.push(marker);
  });

  // Подгоняем карту под все маркеры если их несколько
  if (_placesMapMarkers.length > 1) {
    const group = L.featureGroup(_placesMapMarkers);
    _placesMap.fitBounds(group.getBounds().pad(0.2));
  }

  // Принудительно перерисовываем (нужно если карта была скрыта)
  setTimeout(() => { if (_placesMap) _placesMap.invalidateSize(); }, 100);
}

function openPlaceModal(id) {
  // Открываем полный профиль бизнеса
  if (typeof openBusinessProfile === 'function') {
    openBusinessProfile(id);
    return;
  }
  // Fallback — старая модалка
  _currentPlace = _loadedPlaces.find(x => x.id === id);
  const b = _currentPlace;
  const dist = b._dist < 100 ? formatDist(b._dist) : '';
  const services = b.services || [];

  document.getElementById('m-place-body').innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
      <div style="width:56px;height:56px;background:${PLACE_GRAD_MAP[b.type] || '#4A90D9'};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;overflow:hidden;">
        ${b.cover_url ? `<img src="${b.cover_url}" style="width:100%;height:100%;object-fit:cover;">` : (PLACE_ICON_MAP[b.type] || '📍')}
      </div>
      <div>
        <div style="font-size:18px;font-weight:800;">${b.name}</div>
        <div style="font-size:13px;color:var(--text-secondary);">${PLACE_TYPE_MAP[b.type] || b.type} · ⭐ ${b.rating}</div>
      </div>
    </div>
    ${b.description ? `<div style="font-size:14px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px;">${b.description}</div>` : ''}
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
      <div style="font-size:14px;">📍 ${b.address}${dist ? ' · ' + dist : ''}</div>
      ${b.schedule ? `<div style="font-size:14px;">🕐 ${b.schedule}</div>` : ''}
      ${b.phone ? `<div style="font-size:14px;"><a href="tel:${b.phone}" style="color:var(--primary);text-decoration:none;font-weight:700;">${b.phone}</a></div>` : ''}
    </div>
    ${services.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">${services.map(t=>`<span class="tag tag-b">${t}</span>`).join('')}</div>` : ''}
  `;
  openModal('m-place');
}

function openYandexMap() {
  if (!_currentPlace) return;
  const addr = encodeURIComponent(_currentPlace.address || _currentPlace.name);
  window.open('https://yandex.ru/maps/?text=' + addr, '_blank');
}

// ════════════════════════════════════════════════════════════
// DISCOUNTS — загрузка из Supabase (таблица promotions)
// ════════════════════════════════════════════════════════════
let _discFilter = 'Все';
let _currentDisc = null;
let _loadedPromotions = [];

function filterDiscounts(val, el) {
  _discFilter = val;
  document.querySelectorAll('#discounts .chips .chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  renderDiscounts();
}

async function renderDiscounts() {
  const list = document.getElementById('discounts-list');
  if (!list) return;

  // Дожидаемся геолокации если ещё нет
  if (!userLat) await getUserLocation();

  // Обновляем плашку с локацией
  const locBanner = document.getElementById('discounts-location-banner');
  if (locBanner) {
    locBanner.innerHTML = `
      <div style="font-size:32px;"><svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='#34C759' stroke-width='2'><path d='M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z'/><line x1='7' y1='7' x2='7.01' y2='7'/></svg></div>
      <div>
        <div style="font-size:15px;font-weight:800;">Скидки рядом с вами</div>
        <div style="font-size:12px;opacity:0.85;margin-top:2px;">${userLocationName || 'Определяем местоположение...'}</div>
      </div>
    `;
  }

  if (!supabaseClient) {
    list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">Загрузка...</div>';
    return;
  }

  try {
    // Загружаем промоакции с данными бизнеса
    const { data, error } = await supabaseClient
      .from('promotions')
      .select('*, businesses(name, address, type, location_lat, location_lng, cover_url, rating)')
      .eq('is_active', true);

    if (error) throw error;

    let promos = (data || []).map(p => ({
      ...p,
      biz: p.businesses,
      _dist: p.businesses ? calcDistance(userLat, userLng, p.businesses.location_lat, p.businesses.location_lng) : 999
    })).sort((a, b) => a._dist - b._dist);

    // Фильтр по категории
    if (_discFilter !== 'Все') {
      promos = promos.filter(p => p.category === _discFilter);
    }

    _loadedPromotions = promos;

    if (promos.length === 0) {
      list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">🎁 Пока нет акций рядом.<br>Бизнесы могут добавить скидки в своём профиле</div>';
      return;
    }

    list.innerHTML = promos.map(p => {
      const biz = p.biz || {};
      const icon = PLACE_ICON_MAP[biz.type] || '🎁';
      const grad = PLACE_GRAD_MAP[biz.type] || 'linear-gradient(135deg,#4A90D9,#7B5EA7)';
      const dist = p._dist < 100 ? ' · ' + formatDist(p._dist) : '';
      return `
        <div class="card" style="cursor:pointer;margin-bottom:10px;" onclick="openDiscountModal('${p.id}')">
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="width:52px;height:52px;background:${grad};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${icon}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                <div style="font-weight:800;font-size:15px;">${biz.name || 'Партнёр'}</div>
                ${p.discount_percent ? `<div style="background:var(--secondary);color:white;border-radius:10px;padding:4px 10px;font-size:14px;font-weight:900;flex-shrink:0;">-${p.discount_percent}%</div>` : ''}
              </div>
              <div style="font-size:13px;color:var(--text-secondary);margin:4px 0;">${p.title}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
                ${p.promo_code ? `<span class="tag tag-b" style="font-size:11px;letter-spacing:1px;">${p.promo_code}</span>` : ''}
                <span style="font-size:11px;color:var(--text-secondary);">📍 ${(biz.address || '').substring(0, 30)}${dist}</span>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  } catch(e) {
    console.error('renderDiscounts error:', e);
    list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">Ошибка загрузки</div>';
  }
}

function openDiscountModal(id) {
  _currentDisc = _loadedPromotions.find(x => x.id === id);
  if (!_currentDisc) return;
  const p = _currentDisc;
  const biz = p.biz || {};
  const initials = (biz.name || 'XX').substring(0,2).toUpperCase();

  document.getElementById('m-discount-body').innerHTML = `
    <!-- Discount badge -->
    ${p.discount_percent ? `
    <div style="background:linear-gradient(135deg,#2E7D32,#43A047);border-radius:16px;padding:20px;text-align:center;margin-bottom:16px;color:white;">
      <div style="font-size:14px;font-weight:600;opacity:0.85;margin-bottom:4px;">Скидка</div>
      <div style="font-size:42px;font-weight:900;font-family:'Nunito',sans-serif;">-${p.discount_percent}%</div>
    </div>` : ''}
    
    <!-- Title & description -->
    <div style="font-size:17px;font-weight:800;margin-bottom:6px;">${p.title}</div>
    ${p.description ? `<div style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px;">${p.description}</div>` : '<div style="height:8px;"></div>'}
    
    <!-- Promo code -->
    ${p.promo_code ? `
    <div style="background:var(--bg);border-radius:14px;padding:16px;text-align:center;margin-bottom:14px;cursor:pointer;" onclick="copyPromoCode()">
      <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">Промокод (нажмите чтобы скопировать)</div>
      <div style="font-size:24px;font-weight:900;font-family:'Nunito',sans-serif;color:var(--primary);letter-spacing:3px;">${p.promo_code}</div>
    </div>` : ''}
    
    <!-- Business info -->
    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bg);border-radius:14px;margin-bottom:14px;cursor:pointer;" onclick="closeModal('m-discount');if('${p.business_id}')openBusinessProfile('${p.business_id}')">
      <div class="avatar" style="width:44px;height:44px;font-size:16px;flex-shrink:0;${biz.cover_url ? 'overflow:hidden;padding:0;background:none;' : ''}">
        ${biz.cover_url ? `<img src="${biz.cover_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : initials}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:14px;">${biz.name || 'Партнёр'}</div>
        ${biz.address ? `<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${biz.address}</div>` : ''}
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>
    
    ${p.valid_until ? `<div style="font-size:13px;color:var(--text-secondary);text-align:center;margin-bottom:14px;">Действует до ${p.valid_until}</div>` : ''}
    
    <!-- Action button -->
    <button class="btn btn-p" style="margin-bottom:8px;" onclick="closeModal('m-discount');contactBizFromPromo()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" style="margin-right:8px;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      Получить скидку
    </button>
  `;
  openModal('m-discount');
}

function contactBizFromPromo() {
  if (!_currentDisc) return;
  const biz = _currentDisc.biz;
  if (!biz) return;
  // Ищем business в loadedBusinesses чтобы получить user_id
  if (typeof openBusinessProfile === 'function') {
    // Загружаем бизнес и открываем чат
    if (supabaseClient) {
      supabaseClient.from('businesses').select('user_id,name').eq('id', _currentDisc.business_id).single()
        .then(({ data }) => {
          if (data && data.user_id) {
            openChatWithUser(data.user_id, data.name || biz.name || 'Бизнес', (data.name || 'BZ').substring(0,2).toUpperCase());
          } else {
            showToast('Не удалось найти контакт бизнеса');
          }
        });
    }
  }
}

function copyPromoCode() {
  if (!_currentDisc || !_currentDisc.promo_code) return;
  navigator.clipboard.writeText(_currentDisc.promo_code)
    .then(()=>showToast('Промокод ' + _currentDisc.promo_code + ' скопирован!','#7ED321'))
