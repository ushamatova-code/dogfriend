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
  if (b.phone)     contacts.push(`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);"><span style="font-size:18px;">📞</span><div><div style="font-size:12px;color:var(--text-secondary);">Телефон</div><div style="font-weight:700;">${b.phone}</div></div></div>`);
  if (b.phone2)    contacts.push(`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);"><span style="font-size:18px;">📞</span><div><div style="font-size:12px;color:var(--text-secondary);">Доп. телефон</div><div style="font-weight:700;">${b.phone2}</div></div></div>`);
  if (b.telegram)  contacts.push(`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);"><span style="font-size:18px;">✈️</span><div><div style="font-size:12px;color:var(--text-secondary);">Telegram</div><div style="font-weight:700;">${b.telegram}</div></div></div>`);
  if (b.instagram) contacts.push(`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);"><span style="font-size:18px;">📸</span><div><div style="font-size:12px;color:var(--text-secondary);">Instagram</div><div style="font-weight:700;">${b.instagram}</div></div></div>`);
  if (b.website)   contacts.push(`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;"><span style="font-size:18px;">🌐</span><div><div style="font-size:12px;color:var(--text-secondary);">Сайт</div><div style="font-weight:700;color:var(--primary);">${b.website}</div></div></div>`);
  if (b.email)     contacts.push(`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);"><span style="font-size:18px;">✉️</span><div><div style="font-size:12px;color:var(--text-secondary);">Email</div><div style="font-weight:700;">${b.email}</div></div></div>`);

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
      .order('rating', { ascending: false })
      .limit(8);
    if (error) throw error;
    
    if (!data || data.length === 0) {
      row.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;width:100%;">Пока нет специалистов</div>';
      return;
    }
    
    const typeLabels = { trainer: 'Кинолог', clinic: 'Клиника', cafe: 'Кафе' };
    
    row.innerHTML = data.map(b => {
      const initials = b.name ? b.name.substring(0,2).toUpperCase() : '??';
      const avatarHtml = b.cover_url 
        ? `<img src="${b.cover_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='${initials}'">`
        : initials;
      
      return `
        <div onclick='openBusinessProfile("${b.id}")' style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;flex-shrink:0;width:100px;">
          <div style="position:relative;">
            <div class="avatar" style="width:72px;height:72px;font-size:22px;border:3px solid var(--white);box-shadow:0 3px 14px rgba(0,0,0,0.1);">${avatarHtml}</div>
            <div style="position:absolute;bottom:0;right:0;width:20px;height:20px;background:var(--primary);border-radius:50%;border:2.5px solid var(--white);display:flex;align-items:center;justify-content:center;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div style="text-align:center;width:100%;">
            <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.name}</div>
            <div style="font-size:11px;color:var(--text-secondary);">${typeLabels[b.type] || b.type}</div>
            <div style="font-size:12px;color:var(--secondary);font-weight:700;margin-top:2px;">⭐ ${b.rating}</div>
            <div style="font-size:12px;color:var(--primary);font-weight:700;">${b.price_from || ''}</div>
          </div>
        </div>`;
    }).join('');
  } catch(e) {
    console.error('renderHomeSpecialists error:', e);
    row.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;">Ошибка загрузки</div>';
  }
}
