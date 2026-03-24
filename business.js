let selectedBusinessType = '';
let loadedBusinesses = []; // Бизнесы из БД
let _businessCoverFile = null; // Файл обложки для загрузки

// Загрузка бизнесов из Supabase
async function loadBusinesses(type = null) {
  if (!supabaseClient) return [];
  try {
    let query = supabaseClient.from('businesses').select('*').eq('is_approved', true);
    if (type) query = query.eq('type', type);
    const { data, error } = await query.order('rating', { ascending: false });
    if (error) throw error;
    loadedBusinesses = data || [];
    return loadedBusinesses;
  } catch(e) {
    console.error('Load businesses error:', e);
    return [];
  }
}

// HTML для аватарки/обложки бизнеса в карточках каталога
function businessAvatarHtml(b, size = 54) {
  if (b.cover_url) {
    return `<div style="width:${size}px;height:${size}px;border-radius:14px;overflow:hidden;flex-shrink:0;">` +
      `<img src="${b.cover_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='${b.name.substring(0,2).toUpperCase()}'"></div>`;
  }
  const icons = { trainer: '🐕', clinic: '🏥', cafe: '☕' };
  const grads = { trainer: 'linear-gradient(135deg,#4A90D9,#7B5EA7)', clinic: 'linear-gradient(135deg,#F0FFF4,#C6F6D5)', cafe: 'linear-gradient(135deg,#FFF5E6,#FFD9A0)' };
  return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.33)}px;background:${grads[b.type] || grads.trainer};">${b.name.substring(0,2).toUpperCase()}</div>`;
}

// Обработка выбора обложки бизнеса
function handleBusinessCoverSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('❌ Выберите изображение', '#FF3B30'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('❌ Макс. размер 5 МБ', '#FF3B30'); return; }
  _businessCoverFile = file;
  // Показываем превью
  const preview = document.getElementById('bf-cover-preview');
  if (preview) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:120px;object-fit:cover;border-radius:12px;">`;
    };
    reader.readAsDataURL(file);
  }
  showToast('✅ Обложка выбрана');
}

// Загрузка обложки бизнеса в Supabase Storage
async function uploadBusinessCover(businessId) {
  if (!_businessCoverFile || !supabaseClient) return null;
  try {
    const compressed = await compressImage(_businessCoverFile, 800, 0.8);
    const ext = _businessCoverFile.name.split('.').pop() || 'jpg';
    const filePath = `covers/${businessId}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('avatars')
      .upload(filePath, compressed, { upsert: true, contentType: compressed.type });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseClient.storage
      .from('avatars')
      .getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl + '?t=' + Date.now();

    // Сохраняем URL обложки в запись бизнеса
    await supabaseClient.from('businesses').update({ cover_url: publicUrl }).eq('id', businessId);

    _businessCoverFile = null;
    return publicUrl;
  } catch(e) {
    console.error('❌ Cover upload error:', e);
    return null;
  }
}

// Рендер каталога кинологов (загружаем из БД)
async function renderCatalogTrainers() {
  const businesses = await loadBusinesses('trainer');
  const list = document.getElementById('catalog-trainers-list');
  if (!list) return;
  
  if (businesses.length === 0) {
    list.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-secondary);">Пока нет кинологов. Станьте первым!</p>';
    return;
  }
  
  list.innerHTML = businesses.map(b => `
    <div class="scard" onclick='openBusinessProfile("${b.id}")'>
      ${businessAvatarHtml(b, 54)}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
          <div style="font-weight:800;font-size:15px;">${b.name}</div>
          <span class="tag tag-b">✓ Dogly</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">⭐ ${b.rating} · ${b.reviews_count || 0} отзывов</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">📍 ${b.address}</div>
        ${b.services && b.services.length ? `<div style="display:flex;gap:4px;flex-wrap:wrap;">${b.services.map(s => `<span class="tag tag-b" style="font-size:11px;">${s}</span>`).join('')}</div>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-weight:800;font-size:14px;color:var(--primary);">${b.price_from || 'от 3000 ₽'}</div>
      </div>
    </div>
  `).join('');
}

// Рендер клиник (загружаем из БД)
async function renderHealthClinics() {
  const businesses = await loadBusinesses('clinic');
  const list = document.getElementById('health-list');
  if (!list) return;
  
  if (businesses.length === 0) {
    list.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-secondary);">Пока нет клиник. Добавьте свою!</p>';
    return;
  }
  
  list.innerHTML = businesses.map(b => `
    <div class="scard" onclick='openBusinessProfile("${b.id}")' style="margin:0 16px 12px;">
      ${businessAvatarHtml(b, 54)}
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
          <div style="font-weight:800;font-size:15px;">${b.name}</div>
          <span class="tag tag-g">Проверено</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">⭐ ${b.rating} · ${b.reviews_count || 0} отзывов</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">📍 ${b.address}</div>
        ${b.services && b.services.length ? `<div style="display:flex;gap:4px;flex-wrap:wrap;">${b.services.map(s => `<span class="tag tag-b" style="font-size:11px;">${s}</span>`).join('')}</div>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-weight:800;font-size:14px;color:var(--primary);">${b.price_from || 'от 2500 ₽'}</div>
      </div>
    </div>
  `).join('');
}

// Рендер кафе (загружаем из БД)
async function renderCafes() {
  const businesses = await loadBusinesses('cafe');
  const list = document.getElementById('places-list');
  if (!list) return;
  
  if (businesses.length === 0) {
    list.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-secondary);">Пока нет кафе. Добавьте своё!</p>';
    return;
  }
  
  list.innerHTML = businesses.map(b => `
    <div class="pc" onclick='openBusinessProfile("${b.id}")' style="margin:0 16px 12px;">
      <div class="pc-img" style="${b.cover_url ? '' : 'background:linear-gradient(135deg,#FFF5E6,#FFD9A0);display:flex;align-items:center;justify-content:center;font-size:40px;'}overflow:hidden;">
        ${b.cover_url ? `<img src="${b.cover_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='☕'">` : '☕'}
      </div>
      <div style="flex:1;padding:12px;">
        <div style="font-weight:800;font-size:15px;margin-bottom:4px;">${b.name}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">📍 ${b.address}</div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">⭐ ${b.rating} · ${b.reviews_count || 0} отзывов</div>
        ${b.services && b.services.length ? `<div style="display:flex;gap:4px;flex-wrap:wrap;">${b.services.map(s => `<span class="tag tag-b" style="font-size:11px;">${s}</span>`).join('')}</div>` : ''}
      </div>
    </div>
  `).join('');
}

async function openBusinessProfile(id) {
  let b = loadedBusinesses.find(x => x.id === id);

  if (!b) {
    try {
      const { data, error } = await supabaseClient.from('businesses').select('*').eq('id', id).single();
      if (error) throw error;
      b = data;
      if (b) loadedBusinesses.push(b);
    } catch(e) {
      console.error('Failed to load business:', e);
      return;
    }
  }
  if (!b) return;

  currentSpecId = b.user_id;

  const typeIcons = { trainer: '🐕', clinic: '🏥', cafe: '☕' };
  const typeLabels = { trainer: 'Кинолог / Тренер', clinic: 'Ветеринарная клиника', cafe: 'Dog-friendly место' };

  // Шапка
  document.getElementById('spec-topbar-name').textContent = b.name;
  const av = document.getElementById('spec-avatar');
  if (b.cover_url) {
    av.innerHTML = `<img src="${b.cover_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='${b.name.substring(0,2).toUpperCase()}'">`;
    av.style.padding = '0';
    av.style.overflow = 'hidden';
    av.style.background = 'none';
  } else {
    av.innerHTML = '';
    av.textContent = b.name.substring(0,2).toUpperCase();
    av.style.background = 'linear-gradient(135deg,#4A90D9,#7B5EA7)';
  }
  document.getElementById('spec-name').textContent = b.name;
  document.getElementById('spec-badge').className = 'tag tag-b';
  document.getElementById('spec-badge').textContent = typeLabels[b.type] || '✓ Dogly';
  document.getElementById('spec-rating').textContent = `⭐ ${b.rating}`;

  // Опыт/стаж — из реальных данных
  const expText = b.experience || (b.type === 'clinic' ? (b.doctors ? b.doctors + ' врачей' : 'Клиника') : '');
  document.getElementById('spec-exp').textContent = expText || '';

  document.getElementById('spec-location').textContent = `📍 ${b.address}`;
  document.getElementById('spec-bio').textContent = b.description || 'Профессиональные услуги для вашего питомца';

  // Теги услуг
  if (b.services && b.services.length) {
    document.getElementById('spec-tags').innerHTML = b.services.map(t => `<span class="tag tag-b">${t}</span>`).join('');
  } else {
    document.getElementById('spec-tags').innerHTML = '';
  }

  // Блок услуг и цен
  const svcList = b.services && b.services.length
    ? b.services.map((s, i) => ({ name: s, desc: 'Профессионально', price: b.price_from || 'По запросу', sel: i === 0 }))
    : [{ name: 'Консультация', desc: 'Свяжитесь для уточнения', price: b.price_from || 'По запросу', sel: true }];

  document.getElementById('spec-services').innerHTML = svcList.map((sv, i) => `
    <div class="pr ${sv.sel ? 'sel' : ''}" onclick="selectSvc(${i+1})" id="svc${i+1}">
      <div><div class="pr-n">${sv.name}</div><div style="font-size:12px;color:var(--text-secondary);">${sv.desc}</div></div>
      <div class="pr-v">${sv.price}</div>
    </div>`).join('');

  // Блок "О нас" — дополнительная информация из всех полей
  let infoHtml = '';

  // Контакты
  const contacts = [];
  if (b.phone)     contacts.push(`<a href="tel:${b.phone.replace(/[^\d+]/g,'')}" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;"><div style="width:36px;height:36px;border-radius:10px;background:rgba(52,199,89,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></div><div><div style="font-size:12px;color:var(--text-secondary);">Телефон</div><div style="font-weight:700;color:var(--primary);">${b.phone}</div></div></a>`);
  if (b.phone2)    contacts.push(`<a href="tel:${b.phone2.replace(/[^\d+]/g,'')}" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;"><div style="width:36px;height:36px;border-radius:10px;background:rgba(52,199,89,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg></div><div><div style="font-size:12px;color:var(--text-secondary);">Доп. телефон</div><div style="font-weight:700;color:var(--primary);">${b.phone2}</div></div></a>`);
  if (b.telegram)  contacts.push(`<a href="https://t.me/${b.telegram.replace('@','')}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;"><div style="width:36px;height:36px;border-radius:10px;background:rgba(74,144,217,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A90D9" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div><div><div style="font-size:12px;color:var(--text-secondary);">Telegram</div><div style="font-weight:700;color:var(--primary);">${b.telegram}</div></div></a>`);
  if (b.instagram) contacts.push(`<a href="https://instagram.com/${b.instagram.replace('@','')}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;"><div style="width:36px;height:36px;border-radius:10px;background:rgba(233,30,99,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E91E63" stroke-width="2" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></div><div><div style="font-size:12px;color:var(--text-secondary);">Instagram</div><div style="font-weight:700;color:var(--primary);">${b.instagram}</div></div></a>`);
  if (b.website)   contacts.push(`<a href="${b.website.startsWith('http')?b.website:'https://'+b.website}" target="_blank" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;"><div style="width:36px;height:36px;border-radius:10px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></div><div><div style="font-size:12px;color:var(--text-secondary);">Сайт</div><div style="font-weight:700;color:var(--primary);">${b.website}</div></div></a>`);
  if (b.email)     contacts.push(`<a href="mailto:${b.email}" style="display:flex;align-items:center;gap:10px;padding:10px 0;text-decoration:none;color:inherit;"><div style="width:36px;height:36px;border-radius:10px;background:rgba(245,166,35,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F5A623" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div><div><div style="font-size:12px;color:var(--text-secondary);">Email</div><div style="font-weight:700;color:var(--primary);">${b.email}</div></div></a>`);

  if (contacts.length) {
    infoHtml += `<div class="card" style="margin-top:12px;"><h3 style="margin-bottom:8px;">📞 Контакты</h3>${contacts.join('')}</div>`;
  }

  // Тип-специфичная информация
  if (b.type === 'trainer') {
    const rows = [];
    if (b.experience)    rows.push(['🏅 Опыт', b.experience]);
    if (b.education)     rows.push(['🎓 Образование', b.education]);
    if (b.dog_breeds)    rows.push(['🐕 Породы', b.dog_breeds]);
    if (b.lesson_format) rows.push(['📋 Формат занятий', b.lesson_format]);
    if (b.area)          rows.push(['📍 Рабочая зона', b.area]);
    if (b.schedule)      rows.push(['🕐 Расписание', b.schedule]);
    if (rows.length) {
      infoHtml += `<div class="card"><h3 style="margin-bottom:12px;">🐕 О кинологе</h3>` +
        rows.map(([label, val]) => `<div style="margin-bottom:10px;"><div style="font-size:12px;color:var(--text-secondary);font-weight:600;">${label}</div><div style="font-size:14px;font-weight:600;margin-top:2px;">${val}</div></div>`).join('') +
        `</div>`;
    }
  }

  if (b.type === 'clinic') {
    const rows = [];
    if (b.experience) rows.push(['📅 На рынке', b.experience]);
    if (b.doctors)    rows.push(['👨‍⚕️ Врачи', b.doctors]);
    if (b.equipment)  rows.push(['🔬 Оборудование', b.equipment]);
    if (b.emergency)  rows.push(['🚑 Скорая помощь', b.emergency]);
    if (b.area)       rows.push(['📍 Районы', b.area]);
    if (b.schedule)   rows.push(['🕐 Расписание', b.schedule]);
    if (rows.length) {
      infoHtml += `<div class="card"><h3 style="margin-bottom:12px;">🏥 О клинике</h3>` +
        rows.map(([label, val]) => `<div style="margin-bottom:10px;"><div style="font-size:12px;color:var(--text-secondary);font-weight:600;">${label}</div><div style="font-size:14px;font-weight:600;margin-top:2px;">${val}</div></div>`).join('') +
        `</div>`;
    }
  }

  if (b.type === 'cafe') {
    const rows = [];
    if (b.dog_policy)    rows.push(['🐕 Политика для собак', b.dog_policy]);
    if (b.max_dog_size)  rows.push(['📏 Макс. размер', b.max_dog_size]);
    if (b.dog_menu)      rows.push(['🦴 Меню для собак', b.dog_menu]);
    if (b.area)          rows.push(['🏡 Зона', b.area]);
    if (b.schedule)      rows.push(['🕐 Часы работы', b.schedule]);
    if (rows.length) {
      infoHtml += `<div class="card"><h3 style="margin-bottom:12px;">☕ О заведении</h3>` +
        rows.map(([label, val]) => `<div style="margin-bottom:10px;"><div style="font-size:12px;color:var(--text-secondary);font-weight:600;">${label}</div><div style="font-size:14px;font-weight:600;margin-top:2px;">${val}</div></div>`).join('') +
        `</div>`;
    }
  }

  // Вставляем доп. инфо перед гарантиями (в конец tc-spec-overview)
  const overviewEl = document.getElementById('tc-spec-overview');
  // Находим карточку "О себе" и вставляем доп. блоки после неё
  const existingExtra = document.getElementById('spec-extra-info');
  if (existingExtra) existingExtra.remove();
  if (infoHtml) {
    const extraDiv = document.createElement('div');
    extraDiv.id = 'spec-extra-info';
    extraDiv.innerHTML = infoHtml;
    // Вставляем после карточки услуг (третья .card в overview)
    const cards = overviewEl.querySelectorAll('.card');
    if (cards.length >= 2) {
      cards[1].insertAdjacentElement('afterend', extraDiv);
    } else {
      overviewEl.insertAdjacentElement('afterbegin', extraDiv);
    }
  }

  // Отзывы — показываем загрузку, реальные подтянутся через патч
  document.getElementById('spec-reviews-block').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
      <div style="font-size:40px;font-weight:900;font-family:'Nunito',sans-serif;color:var(--primary);">${b.rating}</div>
      <div><div class="stars">${'⭐'.repeat(Math.round(b.rating))}</div><div style="font-size:13px;color:var(--text-secondary);">${b.reviews_count || 0} отзывов</div></div>
    </div>
    <p style="font-size:13px;color:var(--text-secondary);padding-top:14px;border-top:1px solid var(--border);text-align:center;">⏳ Загружаем отзывы...</p>`;

  nav('specialist');
  
  // Загружаем акции бизнеса и вставляем после "О себе"
  loadBusinessPromos(b);
}

async function loadBusinessPromos(b) {
  if (!supabaseClient) return;
  try {
    const { data: promos } = await supabaseClient
      .from('promotions')
      .select('*')
      .eq('business_id', b.id)
      .eq('is_active', true);
    
    if (!promos || !promos.length) return;
    
    // Удаляем старый блок если есть
    const old = document.getElementById('spec-promos-block');
    if (old) old.remove();
    
    const promoDiv = document.createElement('div');
    promoDiv.id = 'spec-promos-block';
    promoDiv.innerHTML = `<div class="card" style="margin-top:12px;border:1.5px solid rgba(46,125,50,0.15);background:linear-gradient(135deg,rgba(232,245,233,0.5),rgba(200,230,201,0.3));">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" stroke-width="2" stroke-linecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
        <h3 style="margin:0;">Акции и скидки</h3>
      </div>
      ${promos.map(p => `
        <div style="padding:12px;background:var(--white);border-radius:12px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div style="font-weight:700;font-size:14px;">${p.title}</div>
            ${p.discount_percent ? `<div style="background:#2E7D32;color:white;border-radius:8px;padding:2px 8px;font-size:13px;font-weight:800;flex-shrink:0;">-${p.discount_percent}%</div>` : ''}
          </div>
          ${p.description ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;">${p.description}</div>` : ''}
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${p.promo_code ? `<span style="font-family:monospace;font-weight:800;font-size:14px;color:#2E7D32;background:rgba(46,125,50,0.08);padding:4px 10px;border-radius:8px;">${p.promo_code}</span>` : ''}
            ${p.valid_until ? `<span style="font-size:12px;color:var(--text-secondary);">до ${p.valid_until}</span>` : ''}
          </div>
        </div>
      `).join('')}
      <button class="btn btn-p" style="margin-top:4px;background:#2E7D32;" onclick="openPrivateChat(currentSpecId)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" style="margin-right:8px;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        Получить скидку
      </button>
    </div>`;
    
    // Вставляем после первой карточки (О себе)
    const overviewEl = document.getElementById('tc-spec-overview');
    const firstCard = overviewEl?.querySelector('.card');
    if (firstCard) {
      firstCard.insertAdjacentElement('afterend', promoDiv);
    }
  } catch(e) {
    console.error('Load business promos error:', e);
  }
}

function selectBusinessType(type) {
  selectedBusinessType = type;
  _businessCoverFile = null;
  const titles = {trainer:'Анкета кинолога',clinic:'Анкета клиники',cafe:'Анкета кафе'};
  const services = {
    trainer:['ОКД','Щенки','Послушание','Аджилити','Коррекция поведения'],
    clinic:['Терапия','Хирургия','Стоматология','Вакцинация','Анализы'],
    cafe:['Веранда','Миски','Лакомства','Wi-Fi','Детская зона']
  };
  document.getElementById('bf-title').textContent = titles[type];
  
  // Добавляем поле обложки если его нет
  let coverBlock = document.getElementById('bf-cover-block');
  if (!coverBlock) {
    coverBlock = document.createElement('div');
    coverBlock.id = 'bf-cover-block';
    coverBlock.style.cssText = 'margin-bottom:12px;';
    coverBlock.innerHTML = `
      <div style="font-size:13px;font-weight:600;margin-bottom:8px;">📷 Обложка (фото бизнеса)</div>
      <div id="bf-cover-preview" style="margin-bottom:8px;"></div>
      <label style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;background:var(--bg);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;">
        📸 Выбрать фото
        <input type="file" accept="image/*" onchange="handleBusinessCoverSelect(event)" style="display:none;">
      </label>
    `;
    const formArea = document.getElementById('bf-services');
    if (formArea && formArea.parentElement) {
      formArea.parentElement.insertBefore(coverBlock, formArea);
    }
  } else {
    document.getElementById('bf-cover-preview').innerHTML = '';
  }
  
  const servDiv = document.getElementById('bf-services');
  servDiv.innerHTML = '<div style="font-size:13px;font-weight:600;margin-bottom:8px;">Выберите услуги:</div>';
  services[type].forEach(s => {
    servDiv.innerHTML += `<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><input type="checkbox" value="${s}" style="width:18px;height:18px;"><span style="font-size:14px;">${s}</span></label>`;
  });
  nav('businessForm');
}

async function submitBusiness() {
  if (!currentUser) {alert('Войдите в аккаунт');return;}
  const name = document.getElementById('bf-name').value.trim();
  const about = document.getElementById('bf-about').value.trim();
  const address = document.getElementById('bf-address').value.trim();
  const phone = document.getElementById('bf-phone').value.trim();
  const email = document.getElementById('bf-email').value.trim();
  const price = document.getElementById('bf-price').value.trim();
  if (!name || !address || !phone) {alert('Заполните все обязательные поля');return;}
  const checks = document.querySelectorAll('#bf-services input[type="checkbox"]:checked');
  const services = Array.from(checks).map(c => c.value);
  try {
    showToast('⏳ Отправка анкеты...', '#4A90D9');

    // Геокодирование адреса — определяем координаты
    let location_lat = null, location_lng = null;
    try {
      const geoResp = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address + ', Россия') + '&limit=1');
      const geoData = await geoResp.json();
      if (geoData && geoData[0]) {
        location_lat = parseFloat(geoData[0].lat);
        location_lng = parseFloat(geoData[0].lon);
        console.log('📍 Geocoded:', address, '→', location_lat, location_lng);
      }
    } catch(geoErr) {
      console.warn('Geocoding failed:', geoErr);
    }

    const {data, error} = await supabaseClient.from('businesses').insert({
      user_id: currentUser.id,
      type: selectedBusinessType,
      name: name,
      description: about,
      address: address,
      phone: phone,
      email: email,
      price_from: price,
      services: services,
      location_lat: location_lat,
      location_lng: location_lng,
      is_approved: false
    }).select().single();
    if (error) throw error;
    
    // Загружаем обложку если выбрана
    if (_businessCoverFile && data && data.id) {
      await uploadBusinessCover(data.id);
    }
    
    nav('businessPending');
  } catch(e) {
    console.error('Submit business error:',e);
    alert('Ошибка отправки. Попробуйте позже.');
  }
}

// ════════════════════════════════════════════════════════════
// HOME — Лучшие специалисты (карусель с аватарками)
// ════════════════════════════════════════════════════════════
async function renderHomeSpecialists() {
  const row = document.getElementById('home-specialists-row');
  if (!row || !supabaseClient) return;
  
  try {
    const { data, error } = await supabaseClient
      .from('businesses')
      .select('*')
      .eq('is_approved', true)
      .eq('type', 'trainer')
      .order('rating', { ascending: false })
      .limit(8);
    if (error) throw error;
    
    if (!data || data.length === 0) {
      row.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-secondary);font-size:13px;width:100%;">Пока нет кинологов</div>';
      return;
    }
    
    row.innerHTML = data.map(b => {
      const initials = b.name ? b.name.substring(0,2).toUpperCase() : '??';
      const avatarHtml = b.cover_url 
        ? `<img src="${b.cover_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='${initials}'">`
        : initials;
      
      return `
        <div onclick='openBusinessProfile("${b.id}")' style="display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;flex-shrink:0;width:85px;">
          <div style="position:relative;">
            <div class="avatar" style="width:60px;height:60px;font-size:18px;border:2.5px solid var(--white);box-shadow:0 2px 10px rgba(0,0,0,0.08);">${avatarHtml}</div>
            <div style="position:absolute;bottom:-1px;right:-1px;width:18px;height:18px;background:var(--primary);border-radius:50%;border:2px solid var(--white);display:flex;align-items:center;justify-content:center;">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div style="text-align:center;width:100%;">
            <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.name}</div>
            <div style="font-size:11px;color:var(--text-secondary);">Кинолог</div>
            <div style="font-size:11px;color:var(--secondary);font-weight:700;">⭐ ${b.rating}</div>
            <div style="font-size:11px;color:var(--primary);font-weight:700;">${b.price_from || ''}</div>
          </div>
        </div>`;
    }).join('');
  } catch(e) {
    console.error('renderHomeSpecialists error:', e);
  }
}
