let selectedBusinessType = '';
let loadedBusinesses = []; // Бизнесы из БД

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
      <div class="avatar" style="width:54px;height:54px;font-size:18px;background:linear-gradient(135deg,#4A90D9,#7B5EA7);">${b.name.substring(0,2).toUpperCase()}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
          <div style="font-weight:800;font-size:15px;">${b.name}</div>
          <span class="tag tag-b">✓ DogFriend</span>
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
      <div class="avatar" style="width:54px;height:54px;font-size:18px;background:linear-gradient(135deg,#F0FFF4,#C6F6D5);">🏥</div>
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
      <div class="pc-img" style="background:linear-gradient(135deg,#FFF5E6,#FFD9A0);display:flex;align-items:center;justify-content:center;font-size:40px;">☕</div>
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
  av.textContent = b.name.substring(0,2).toUpperCase();
  av.style.background = 'linear-gradient(135deg,#4A90D9,#7B5EA7)';
  document.getElementById('spec-name').textContent = b.name;
  document.getElementById('spec-badge').className = 'tag tag-b';
  document.getElementById('spec-badge').textContent = typeLabels[b.type] || '✓ DogFriend';
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
  const titles = {trainer:'Анкета кинолога',clinic:'Анкета клиники',cafe:'Анкета кафе'};
  const services = {
    trainer:['ОКД','Щенки','Послушание','Аджилити','Коррекция поведения'],
    clinic:['Терапия','Хирургия','Стоматология','Вакцинация','Анализы'],
    cafe:['Веранда','Миски','Лакомства','Wi-Fi','Детская зона']
  };
  document.getElementById('bf-title').textContent = titles[type];
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
    const {error} = await supabaseClient.from('businesses').insert({
      user_id: currentUser.id,
      type: selectedBusinessType,
      name: name,
      description: about,
      address: address,
      phone: phone,
      email: email,
      price_from: price,
      services: services,
      is_approved: false
    });
    if (error) throw error;
    nav('businessPending');
  } catch(e) {
    console.error('Submit business error:',e);
    alert('Ошибка отправки. Попробуйте позже.');
  }
}
