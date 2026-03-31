// ════════════════════════════════════════════════════════════
// BUSINESS DASHBOARD + EDIT
// ════════════════════════════════════════════════════════════

let currentBiz = null; // текущий бизнес пользователя

// Поля для каждого типа
const BIZ_FIELDS = {
  trainer: {
    icon: '🐕',
    label: 'Кинолог / Тренер',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'ФИО / Название',      type: 'text',     placeholder: 'Иван Петров', required: true },
          { id: 'description', label: 'О себе',               type: 'textarea', placeholder: 'Опыт работы, специализация, подход...' },
          { id: 'address',     label: 'Район / Место занятий',type: 'text',     placeholder: 'Сокольники, Москва', required: true },
          { id: 'price_from',  label: 'Цена от',              type: 'text',     placeholder: '3 000 ₽' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',    label: 'Телефон',   type: 'tel',   placeholder: '+7 (999) 123-45-67', required: true },
          { id: 'email',    label: 'Email',     type: 'email', placeholder: 'trainer@mail.ru' },
          { id: 'telegram', label: 'Telegram',  type: 'text',  placeholder: '@username' },
          { id: 'website',  label: 'Сайт',      type: 'url',   placeholder: 'https://...' },
        ]
      },
      {
        title: '🎓 Специализация',
        fields: [
          { id: 'experience',   label: 'Опыт работы',           type: 'text',     placeholder: '5 лет' },
          { id: 'education',    label: 'Образование / сертификаты', type: 'textarea', placeholder: 'РКФ, МDSA...' },
          { id: 'dog_breeds',   label: 'Породы (специализация)', type: 'text',     placeholder: 'Все породы, МБС, лабрадор...' },
          { id: 'lesson_format',label: 'Формат занятий',         type: 'text',     placeholder: 'Индивидуально, группа, выезд' },
          { id: 'area',         label: 'Рабочая зона (км)',       type: 'text',     placeholder: '10 км от метро Сокольники' },
        ]
      },
      {
        title: '✅ Услуги',
        type: 'checkboxes',
        id: 'services',
        options: ['ОКД','Щенки (3-6 мес)','Послушание','Аджилити','Коррекция поведения','Социализация','Защитная служба','Норматив','Выезд на дом','Онлайн-консультация']
      },
      {
        title: '🕐 График работы',
        fields: [
          { id: 'schedule', label: 'Расписание', type: 'textarea', placeholder: 'Пн-Пт 10:00–19:00, Сб 10:00–15:00' },
        ]
      },
    ]
  },
  clinic: {
    icon: '🏥',
    label: 'Ветеринарная клиника',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'Название клиники', type: 'text',     placeholder: 'Ветклиника «Здоровый пёс»', required: true },
          { id: 'description', label: 'О клинике',        type: 'textarea', placeholder: 'Специализация, оборудование, опыт...' },
          { id: 'address',     label: 'Адрес',            type: 'text',     placeholder: 'ул. Ленина, 10, Москва', required: true },
          { id: 'price_from',  label: 'Приём от',         type: 'text',     placeholder: '1 500 ₽' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',     label: 'Телефон',        type: 'tel',   placeholder: '+7 (495) 123-45-67', required: true },
          { id: 'phone2',    label: 'Доп. телефон',   type: 'tel',   placeholder: '+7 (495) 765-43-21' },
          { id: 'email',     label: 'Email',          type: 'email', placeholder: 'info@vetclinic.ru' },
          { id: 'website',   label: 'Сайт',           type: 'url',   placeholder: 'https://...' },
          { id: 'telegram',  label: 'Telegram / WhatsApp', type: 'text', placeholder: '@vetclinic' },
        ]
      },
      {
        title: '🏥 Специализация',
        fields: [
          { id: 'experience',  label: 'Лет на рынке',        type: 'text',     placeholder: 'Работаем с 2015 года' },
          { id: 'doctors',     label: 'Кол-во врачей',       type: 'text',     placeholder: '8 специалистов' },
          { id: 'equipment',   label: 'Оборудование',        type: 'textarea', placeholder: 'УЗИ, рентген, анализаторы...' },
          { id: 'emergency',   label: 'Скорая помощь',       type: 'text',     placeholder: 'Круглосуточно / Нет' },
          { id: 'area',        label: 'Обслуживаемые районы',type: 'text',     placeholder: 'Сокольники, Преображенское...' },
        ]
      },
      {
        title: '✅ Услуги',
        type: 'checkboxes',
        id: 'services',
        options: ['Терапия','Хирургия','Стоматология','Вакцинация','Анализы','УЗИ','Рентген','Дерматология','Офтальмология','Онкология','Кардиология','Неврология','Чипирование','Кастрация / стерилизация','Скорая помощь 24/7']
      },
      {
        title: '🕐 График работы',
        fields: [
          { id: 'schedule', label: 'Расписание', type: 'textarea', placeholder: 'Пн-Пт 9:00–21:00\nСб-Вс 10:00–18:00' },
        ]
      },
    ]
  },
  cafe: {
    icon: '☕',
    label: 'Dog-friendly место',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'Название места',  type: 'text',     placeholder: 'Кафе «Рыжий пёс»', required: true },
          { id: 'description', label: 'Описание',        type: 'textarea', placeholder: 'Атмосфера, кухня, особенности...' },
          { id: 'address',     label: 'Адрес',           type: 'text',     placeholder: 'ул. Арбат, 25, Москва', required: true },
          { id: 'price_from',  label: 'Средний чек',     type: 'text',     placeholder: '800 ₽' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',    label: 'Телефон',             type: 'tel',   placeholder: '+7 (495) 123-45-67', required: true },
          { id: 'email',    label: 'Email',               type: 'email', placeholder: 'hello@cafe.ru' },
          { id: 'website',  label: 'Сайт / меню',         type: 'url',   placeholder: 'https://...' },
          { id: 'instagram',label: 'Instagram',           type: 'text',  placeholder: '@dogcafe_moscow' },
          { id: 'telegram', label: 'Telegram',            type: 'text',  placeholder: '@dogcafe' },
        ]
      },
      {
        title: '🐕 Условия для собак',
        fields: [
          { id: 'dog_policy',   label: 'Политика для собак', type: 'textarea', placeholder: 'Все породы, только на поводке, до 30 кг...' },
          { id: 'max_dog_size', label: 'Макс. размер собаки',type: 'text',     placeholder: 'Без ограничений / до 30 кг / только мелкие' },
          { id: 'dog_menu',     label: 'Меню для собак',     type: 'text',     placeholder: 'Лакомства, миски с водой, корм' },
          { id: 'area',         label: 'Зона для собак',     type: 'text',     placeholder: 'Терраса, весь зал, только улица' },
        ]
      },
      {
        title: '✅ Удобства',
        type: 'checkboxes',
        id: 'services',
        options: ['Веранда','Миски с водой','Лакомства в меню','Wi-Fi','Детская зона','Парковка','Доставка','Бронирование столов','Кальян','Живая музыка','Своя пивоварня','Специальное меню для собак']
      },
      {
        title: '🕐 График работы',
        fields: [
          { id: 'schedule', label: 'Расписание', type: 'textarea', placeholder: 'Ежедневно 10:00–23:00' },
        ]
      },
    ]
  },
  shop: {
    icon: '🛍️',
    label: 'Зоомагазин',
    sections: [
      {
        title: '📋 Основная информация',
        fields: [
          { id: 'name',        label: 'Название магазина', type: 'text',     placeholder: 'Зоомагазин "Лапки"', required: true },
          { id: 'description', label: 'О магазине',        type: 'textarea', placeholder: 'Что продаёте, особенности, ассортимент...' },
          { id: 'address',     label: 'Адрес',             type: 'text',     placeholder: 'Москва, ул. Ленина 10', required: true },
          { id: 'schedule',    label: 'Режим работы',      type: 'text',     placeholder: 'Пн-Вс 10:00–20:00' },
        ]
      },
      {
        title: '📞 Контакты',
        fields: [
          { id: 'phone',    label: 'Телефон',  type: 'tel',   placeholder: '+7 (999) 123-45-67', required: true },
          { id: 'email',    label: 'Email',    type: 'email', placeholder: 'shop@mail.ru' },
          { id: 'telegram', label: 'Telegram', type: 'text',  placeholder: '@username' },
          { id: 'website',  label: 'Сайт',     type: 'url',   placeholder: 'https://...' },
        ]
      },
      {
        title: '✅ Категории товаров',
        type: 'checkboxes',
        id: 'services',
        options: ['Корма','Игрушки','Одежда','Аксессуары','Поводки и ошейники','Витамины','Лакомства','Переноски','Лежанки','Гигиена']
      },
    ]
  }
};

// Загрузить бизнес пользователя и показать кнопку в профиле
let userBusinesses = [];

async function checkUserBusiness() {
  if (!supabaseClient || !currentUser) {
    console.log('checkUserBusiness: waiting for supabase/user...');
    return;
  }
  try {
    console.log('Checking business for user:', currentUser.id);
    const { data, error } = await supabaseClient
      .from('businesses')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    console.log('Business query result:', JSON.stringify(data), error);

    if (error) { console.error('checkUserBusiness error:', error); return; }

    if (data && data.length > 0) {
      userBusinesses = data;
      currentBiz = data[0];
      const row = document.getElementById('biz-mgmt-row');
      if (row) { row.style.display = 'flex'; console.log('Business button shown, found:', data.length); }
    } else {
      console.log('No businesses found for user:', currentUser.id);
    }
  } catch(e) {
    console.error('checkUserBusiness exception:', e);
  }
}

function renderBizDashboard(biz) {
  currentBiz = biz;
  const cfg = BIZ_FIELDS[biz.type];
  const typeIcons = { trainer: '🐕', clinic: '🏥', cafe: '☕' };
  const typeLabels = { trainer: 'Кинолог / Тренер', clinic: 'Ветеринарная клиника', cafe: 'Dog-friendly место' };

  document.getElementById('biz-dash-title').textContent = '💼 Мой бизнес';

  const status = biz.is_approved
    ? '<span class="tag tag-g">✓ Опубликовано</span>'
    : '<span class="tag tag-o">⏳ На модерации</span>';

  // Переключатель если несколько бизнесов
  let switcherHtml = '';
  if (userBusinesses.length > 1) {
    switcherHtml = `<div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:16px;">` +
      userBusinesses.map((b, i) => {
        const icon = typeIcons[b.type] || '💼';
        const active = b.id === biz.id;
        return `<div onclick="renderBizDashboard(userBusinesses[${i}])" style="flex-shrink:0;display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:12px;border:2px solid ${active ? 'var(--primary)' : 'var(--border)'};background:${active ? 'rgba(74,144,217,0.08)' : 'var(--white)'};cursor:pointer;font-size:13px;font-weight:700;color:${active ? 'var(--primary)' : 'var(--text-secondary)'};">
          <span>${icon}</span><span style="max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${b.name}</span>
        </div>`;
      }).join('') + `</div>`;
  }

  let html = switcherHtml;

  // Карточка бизнеса
  html += `<div style="background:linear-gradient(135deg,var(--primary),#6BB8F0);border-radius:var(--radius);padding:20px;color:white;margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;">
      <div style="width:60px;height:60px;background:rgba(255,255,255,0.2);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px;overflow:hidden;">
        ${biz.cover_url ? `<img src="${biz.cover_url}" style="width:100%;height:100%;object-fit:cover;">` : (typeIcons[biz.type] || '💼')}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:18px;font-weight:800;margin-bottom:2px;">${biz.name}</div>
        <div style="font-size:13px;opacity:0.85;">${typeLabels[biz.type] || ''}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">${status}<span style="font-size:13px;opacity:0.8;">⭐ ${biz.rating || '5.0'} · ${biz.reviews_count || 0} отзывов</span></div>
  </div>`;

  // Статистика
  const msgCount = Object.values(privateChats).reduce((sum, msgs) => sum + msgs.length, 0);
  html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
    <div style="background:var(--white);border-radius:14px;padding:14px;text-align:center;box-shadow:var(--shadow);">
      <div style="font-size:24px;font-weight:900;font-family:'Nunito',sans-serif;color:var(--primary);">0</div>
      <div style="font-size:11px;color:var(--text-secondary);font-weight:600;">Просмотры</div>
    </div>
    <div style="background:var(--white);border-radius:14px;padding:14px;text-align:center;box-shadow:var(--shadow);">
      <div style="font-size:24px;font-weight:900;font-family:'Nunito',sans-serif;color:var(--primary);">${msgCount}</div>
      <div style="font-size:11px;color:var(--text-secondary);font-weight:600;">Сообщений</div>
    </div>
    <div style="background:var(--white);border-radius:14px;padding:14px;text-align:center;box-shadow:var(--shadow);">
      <div style="font-size:24px;font-weight:900;font-family:'Nunito',sans-serif;color:var(--primary);">0</div>
      <div style="font-size:11px;color:var(--text-secondary);font-weight:600;">Записей</div>
    </div>
  </div>`;

  // Детали по секциям
  if (cfg) {
    cfg.sections.forEach(sec => {
      html += `<div style="background:var(--white);border-radius:var(--radius);padding:16px;margin-bottom:12px;box-shadow:var(--shadow);">
        <div style="font-size:15px;font-weight:800;margin-bottom:12px;">${sec.title}</div>`;
      if (sec.type === 'checkboxes') {
        const vals = biz[sec.id] || [];
        html += vals.length
          ? `<div style="display:flex;flex-wrap:wrap;gap:6px;">${vals.map(v => `<span class="tag tag-b">${v}</span>`).join('')}</div>`
          : `<div style="color:var(--text-secondary);font-size:13px;">Не указано — нажмите ✏️ Изменить</div>`;
      } else {
        sec.fields.forEach(f => {
          const val = biz[f.id] || '';
          html += `<div style="margin-bottom:8px;">
            <div style="font-size:12px;color:var(--text-secondary);font-weight:600;margin-bottom:2px;">${f.label}</div>
            <div style="font-size:14px;font-weight:600;color:${val ? 'var(--text-primary)' : 'var(--border)'};">${val || '—'}</div>
          </div>`;
        });
      }
      html += `</div>`;
    });
  }

  // Добавляем блок товаров для магазинов
  if (biz.type === 'shop') {
    html += renderBizDashboardShop(biz);
  }

  document.getElementById('biz-dash-content').innerHTML = html;
  renderBizPromos(biz);

  // Загружаем товары для магазинов
  if (biz.type === 'shop') {
    loadBizProducts(biz.id);
  }
}

async function renderBizPromos(biz) {
  const container = document.getElementById('biz-dash-content');
  if (!container || !supabaseClient) return;
  const { data: promos } = await supabaseClient.from('promotions').select('*').eq('business_id', biz.id).order('created_at', { ascending: false });
  let h = `<div style="background:var(--white);border-radius:var(--radius);padding:16px;margin-bottom:12px;box-shadow:var(--shadow);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div style="font-size:15px;font-weight:800;">Мои акции</div>
      <button class="btn btn-p" style="width:auto;height:34px;padding:0 14px;font-size:12px;border-radius:10px;" onclick="openCreatePromo()">+ Создать</button>
    </div>`;
  if (promos && promos.length) {
    h += promos.map(p => `<div style="padding:12px 0;border-top:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div><div style="font-weight:700;font-size:14px;">${p.title}</div><div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${p.discount_percent?'-'+p.discount_percent+'%':''} ${p.promo_code?'· Код: '+p.promo_code:''} ${p.valid_until?'· До '+p.valid_until:''}</div></div>
        <span class="tag ${p.is_active?'tag-g':'tag-o'}" style="font-size:11px;">${p.is_active?'Активна':'Выкл'}</span>
      </div>
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button class="btn btn-sm btn-g" onclick="toggleMyPromo('${p.id}',${!p.is_active})">${p.is_active?'Выключить':'Включить'}</button>
        <button class="btn btn-sm" style="background:rgba(208,2,27,0.08);color:var(--error);border-radius:10px;" onclick="deleteMyPromo('${p.id}')">Удалить</button>
      </div></div>`).join('');
  } else { h += '<div style="text-align:center;padding:16px;color:var(--text-secondary);font-size:13px;">Нет акций. Создайте первую!</div>'; }
  h += '</div>';
  container.insertAdjacentHTML('beforeend', h);
}
async function toggleMyPromo(id,active){await supabaseClient.from('promotions').update({is_active:active}).eq('id',id);showToast(active?'Включена':'Выключена');renderBizDashboard(currentBiz)}
async function deleteMyPromo(id){if(!confirm('Удалить акцию?'))return;await supabaseClient.from('promotions').delete().eq('id',id);showToast('Удалена');renderBizDashboard(currentBiz)}
function openCreatePromo(){
  if(!currentBiz)return;
  let m=document.getElementById('m-create-promo');
  if(!m){m=document.createElement('div');m.className='modal-ov';m.id='m-create-promo';m.onclick=()=>closeModal('m-create-promo');
  m.innerHTML=`<div class="modal" onclick="event.stopPropagation()" style="max-height:90%;overflow-y:auto;"><div class="mhandle"></div><div id="m-promo-body"></div></div>`;
  document.querySelector('.phone-shell').appendChild(m);}
  document.getElementById('m-promo-body').innerHTML=`
    <h3 style="margin-bottom:16px;">Новая акция</h3>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px;">
      <div><label class="lbl">Название *</label><input class="input" id="promo-title" placeholder="Скидка 20% на первое занятие"></div>
      <div><label class="lbl">Описание</label><textarea class="input" id="promo-desc" placeholder="Подробности..." style="min-height:60px;padding:12px;"></textarea></div>
      <div style="display:flex;gap:10px;"><div style="flex:1;"><label class="lbl">Скидка %</label><input class="input" id="promo-pct" type="number" placeholder="20"></div><div style="flex:1;"><label class="lbl">Промокод</label><input class="input" id="promo-code" placeholder="DOGLY20" style="text-transform:uppercase;"></div></div>
      <div><label class="lbl">Категория</label><select class="input" id="promo-cat" style="padding:0 12px;"><option value="">Выберите</option><option value="Груминг">Груминг</option><option value="Питание">Питание</option><option value="Аксессуары">Аксессуары</option><option value="Ветеринар">Ветеринар</option><option value="Кафе">Кафе</option><option value="Другое">Другое</option></select></div>
      <div><label class="lbl">Действует до</label><input class="input" id="promo-until" placeholder="31 декабря 2026"></div>
    </div>
    <button class="btn btn-p" onclick="submitPromo()" style="margin-bottom:8px;">Создать акцию</button>
    <button class="btn btn-g" onclick="closeModal('m-create-promo')">Отмена</button>`;
  openModal('m-create-promo');
}
async function submitPromo(){
  if(!currentBiz||!supabaseClient)return;
  const t=document.getElementById('promo-title').value.trim();if(!t){showToast('Введите название');return}
  try{const{error}=await supabaseClient.from('promotions').insert({business_id:currentBiz.id,title:t,description:document.getElementById('promo-desc').value.trim(),discount_percent:parseInt(document.getElementById('promo-pct').value)||null,promo_code:(document.getElementById('promo-code').value.trim().toUpperCase())||null,category:document.getElementById('promo-cat').value||null,valid_until:document.getElementById('promo-until').value.trim()||null,is_active:true});
  if(error)throw error;closeModal('m-create-promo');showToast('Акция создана!','#34C759');renderBizDashboard(currentBiz)}catch(e){showToast('Ошибка: '+(e.message||''))}
}

function openBusinessDashboard() {
  if (!userBusinesses.length) { showToast('Бизнес не найден'); return; }
  renderBizDashboard(userBusinesses[0]);
  nav('bizDashboard');
}

async function openBizEdit() {
  if (!currentBiz) return;
  const cfg = BIZ_FIELDS[currentBiz.type];
  if (!cfg) return;
  document.getElementById('biz-edit-title').textContent = 'Редактировать: ' + currentBiz.name;

  // Загружаем текущие адреса из business_locations
  let existingLocs = [];
  try {
    const { data: locs } = await supabaseClient
      .from('business_locations')
      .select('*')
      .eq('business_id', currentBiz.id)
      .order('is_main', { ascending: false });
    existingLocs = locs || [];
  } catch(e) {}

  let html = '';
  
  // Блок загрузки обложки
  html += `<div style="margin-bottom:20px;">
    <div style="font-size:15px;font-weight:800;margin-bottom:12px;padding-top:16px;border-top:2px solid var(--border);">📷 Обложка бизнеса</div>
    <div id="biz-cover-preview" style="margin-bottom:8px;">
      ${currentBiz.cover_url ? `<img src="${currentBiz.cover_url}" style="width:100%;height:120px;object-fit:cover;border-radius:12px;">` : '<div style="background:var(--bg);border-radius:12px;padding:20px;text-align:center;color:var(--text-secondary);font-size:13px;">Нет обложки</div>'}
    </div>
    <label style="display:inline-flex;align-items:center;gap:8px;padding:10px 16px;background:var(--bg);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;">
      📸 Выбрать фото
      <input type="file" accept="image/*" onchange="handleBusinessCoverSelect(event); document.getElementById('biz-cover-preview').innerHTML='<div style=\\'padding:12px;text-align:center;color:var(--primary);font-weight:700;\\'>✅ Фото выбрано</div>'" style="display:none;">
    </label>
  </div>`;

  cfg.sections.forEach(sec => {
    html += `<div style="margin-bottom:20px;">
      <div style="font-size:15px;font-weight:800;margin-bottom:12px;padding-top:16px;border-top:2px solid var(--border);">${sec.title}</div>`;

    if (sec.type === 'checkboxes') {
      const vals = currentBiz[sec.id] || [];
      html += `<div style="display:flex;flex-wrap:wrap;gap:8px;" id="biz-edit-checks-${sec.id}">`;
      sec.options.forEach(opt => {
        const checked = vals.includes(opt);
        html += `<label style="display:flex;align-items:center;gap:6px;background:${checked ? 'rgba(74,144,217,0.1)' : 'var(--bg)'};border:2px solid ${checked ? 'var(--primary)' : 'var(--border)'};border-radius:10px;padding:6px 12px;cursor:pointer;transition:all 0.15s;" onclick="toggleBizCheck(this,'${sec.id}')">
          <input type="checkbox" value="${opt}" ${checked ? 'checked' : ''} style="display:none;">
          <span style="font-size:13px;font-weight:600;">${opt}</span>
        </label>`;
      });
      html += `</div>`;
    } else {
      sec.fields.forEach(f => {
        // Поле address — заменяем на динамический список адресов
        if (f.id === 'address') {
          const addrRows = existingLocs.length
            ? existingLocs.map((loc, i) => `
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;" id="biz-addr-row-${i}">
                <input type="text" class="input biz-addr-input" value="${loc.address || ''}" placeholder="Город, улица, дом — например: Москва, ул. Ленина 10" style="flex:1;margin-bottom:0;">
                ${i > 0 ? `<button type="button" onclick="this.parentElement.remove()" style="width:44px;height:44px;background:var(--bg);border:1.5px solid var(--border);border-radius:12px;cursor:pointer;font-size:20px;color:var(--text-secondary);flex-shrink:0;">×</button>` : ''}
              </div>`).join('')
            : `<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
                <input type="text" class="input biz-addr-input" value="${currentBiz.address || ''}" placeholder="Город, улица, дом — например: Москва, ул. Ленина 10" style="flex:1;margin-bottom:0;">
              </div>`;

          html += `<div style="margin-bottom:12px;">
            <label class="lbl">${f.label}${f.required ? ' *' : ''}</label>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">Укажите полный адрес с городом</div>
            <div id="biz-addresses-list">${addrRows}</div>
            <button type="button" onclick="addBizAddressRow()" style="background:none;border:1.5px dashed var(--border);border-radius:12px;padding:10px 16px;font-size:13px;font-weight:600;color:var(--primary);cursor:pointer;width:100%;margin-top:4px;">+ Добавить адрес</button>
          </div>`;
        } else {
          const val = currentBiz[f.id] || '';
          if (f.type === 'textarea') {
            html += `<div style="margin-bottom:12px;"><label class="lbl">${f.label}${f.required ? ' *' : ''}</label><textarea class="input" id="biz-f-${f.id}" placeholder="${f.placeholder}" style="min-height:72px;padding:12px;resize:none;">${val}</textarea></div>`;
          } else {
            html += `<div style="margin-bottom:12px;"><label class="lbl">${f.label}${f.required ? ' *' : ''}</label><input class="input" id="biz-f-${f.id}" type="${f.type}" placeholder="${f.placeholder}" value="${val.replace(/"/g, '&quot;')}"></div>`;
          }
        }
      });
    }
    html += `</div>`;
  });

  document.getElementById('biz-edit-form').innerHTML = html;
  nav('bizEdit');
}

function addBizAddressRow() {
  const list = document.getElementById('biz-addresses-list');
  if (!list) return;
  const count = list.querySelectorAll('.biz-addr-input').length;
  if (count >= 10) { showToast('Максимум 10 адресов'); return; }
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
  row.innerHTML = `
    <input type="text" class="input biz-addr-input" placeholder="Город, улица, дом — например: Москва, ул. Ленина 10" style="flex:1;margin-bottom:0;">
    <button type="button" onclick="this.parentElement.remove()" style="width:44px;height:44px;background:var(--bg);border:1.5px solid var(--border);border-radius:12px;cursor:pointer;font-size:20px;color:var(--text-secondary);flex-shrink:0;">×</button>`;
  list.appendChild(row);
  row.querySelector('.biz-addr-input').focus();
}

function toggleBizCheck(label, fieldId) {
  const input = label.querySelector('input');
  input.checked = !input.checked;
  if (input.checked) {
    label.style.background = 'rgba(74,144,217,0.1)';
    label.style.borderColor = 'var(--primary)';
  } else {
    label.style.background = 'var(--bg)';
    label.style.borderColor = 'var(--border)';
  }
}

async function saveBizEdit() {
  if (!currentBiz || !supabaseClient) return;
  const cfg = BIZ_FIELDS[currentBiz.type];
  if (!cfg) return;

  // Собираем адреса из динамических полей
  const addrInputs = document.querySelectorAll('.biz-addr-input');
  const addresses = Array.from(addrInputs).map(i => i.value.trim()).filter(Boolean);

  // Собираем все значения из формы
  const formData = {};
  cfg.sections.forEach(sec => {
    if (sec.type === 'checkboxes') {
      const container = document.getElementById('biz-edit-checks-' + sec.id);
      if (container) {
        formData[sec.id] = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
      }
    } else {
      sec.fields.forEach(f => {
        if (f.id === 'address') {
          // Берём первый адрес для основного поля
          formData[f.id] = addresses[0] || '';
        } else {
          const el = document.getElementById('biz-f-' + f.id);
          if (el) formData[f.id] = el.value.trim();
        }
      });
    }
  });

  // Валидация обязательных
  const allFields = cfg.sections.flatMap(s => s.fields || []);
  for (const f of allFields) {
    if (f.required && f.id === 'address' && !addresses.length) {
      showToast('❌ Укажите хотя бы один адрес');
      return;
    } else if (f.required && f.id !== 'address' && !formData[f.id]) {
      showToast('❌ Заполните: ' + f.label);
      return;
    }
  }

  // Колонки которые точно есть в таблице businesses
  const KNOWN_COLUMNS = [
    'name', 'description', 'address', 'phone', 'phone2', 'email', 'website',
    'price_from', 'services', 'telegram', 'instagram',
    'area', 'schedule', 'experience', 'education', 'dog_breeds', 'lesson_format',
    'doctors', 'equipment', 'emergency', 'dog_policy', 'max_dog_size', 'dog_menu',
    'cover_url'
  ];

  // Разделяем поля: известные идут прямо, остальные игнорируем
  const dbUpdate = {};

  Object.entries(formData).forEach(([key, val]) => {
    if (KNOWN_COLUMNS.includes(key)) {
      dbUpdate[key] = val;
    }
  });

  console.log('Saving biz, dbUpdate keys:', Object.keys(dbUpdate));

  try {
    let updatePayload = { ...dbUpdate, updated_at: new Date().toISOString() };

    let { error } = await supabaseClient
      .from('businesses')
      .update(updatePayload)
      .eq('id', currentBiz.id);

    if (error) throw error;

    // Загружаем обложку если была выбрана
    if (_businessCoverFile) {
      const coverUrl = await uploadBusinessCover(currentBiz.id);
      if (coverUrl) currentBiz.cover_url = coverUrl;
    }

    // Сохраняем адреса в business_locations
    if (addresses.length > 0) {
      // Удаляем старые и вставляем новые
      await supabaseClient.from('business_locations').delete().eq('business_id', currentBiz.id);

      const locRows = await Promise.all(addresses.map(async (addr, i) => {
        let lat = null, lng = null;
        try {
          const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(addr) + '&limit=1');
          const d = await r.json();
          if (d && d[0]) { lat = parseFloat(d[0].lat); lng = parseFloat(d[0].lon); }
        } catch(e) {}
        return { business_id: currentBiz.id, address: addr, is_main: i === 0, location_lat: lat, location_lng: lng };
      }));
      await supabaseClient.from('business_locations').insert(locRows);

      // Обновляем координаты основного адреса в businesses
      const mainLoc = locRows[0];
      if (mainLoc.location_lat) {
        await supabaseClient.from('businesses').update({
          location_lat: mainLoc.location_lat,
          location_lng: mainLoc.location_lng
        }).eq('id', currentBiz.id);
      }
    }

    // Обновляем локальный объект
    Object.assign(currentBiz, formData);

    // Обновляем в массиве userBusinesses
    const idx = userBusinesses.findIndex(b => b.id === currentBiz.id);
    if (idx !== -1) userBusinesses[idx] = { ...currentBiz };

    showToast('✅ Изменения сохранены!', '#7ED321');
    back();
    setTimeout(() => renderBizDashboard(currentBiz), 300);
  } catch(e) {
    console.error('Save biz final error:', e);
    showToast('❌ ' + (e.message || 'Ошибка сохранения'));
  }
}

// Вызываем после авторизации
// Проверяем бизнес при каждом заходе в профиль и при первом home
// Используем небольшой delay чтобы currentUser точно был установлен
(function patchCheckAuth() {
  const origNav = window.nav;
  window.nav = function(id) {
    origNav(id);
    if (id === 'home' || id === 'profile') {
      // Небольшой delay — currentUser может ещё не быть установлен
      setTimeout(() => {
        if (currentUser) checkUserBusiness();
      }, 300);
    }
  };
})();

// ════════════════════════════════════════════════════════════
// SHOP PRODUCTS — Управление товарами для магазинов
// ════════════════════════════════════════════════════════════

let _shopProducts = [];
let _editingProductId = null;

// Показываем раздел товаров только для магазинов
function renderBizDashboardShop(biz) {
  if (biz.type !== 'shop') return '';
  return `
    <div style="margin-top:20px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div style="font-size:16px;font-weight:800;">🛍️ Товары</div>
        <button onclick="openAddProduct()" class="btn btn-sm btn-p" style="height:36px;padding:0 14px;font-size:13px;border-radius:12px;">+ Добавить</button>
      </div>
      <div id="biz-products-list"></div>
    </div>`;
}

async function loadBizProducts(businessId) {
  if (!supabaseClient) return;
  try {
    const { data } = await supabaseClient
      .from('shop_products')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    _shopProducts = data || [];
    renderBizProducts();
  } catch(e) { console.error('loadBizProducts:', e); }
}

function renderBizProducts() {
  const el = document.getElementById('biz-products-list');
  if (!el) return;
  if (!_shopProducts.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;background:var(--bg);border-radius:14px;">Товаров пока нет.<br>Нажмите «+ Добавить» чтобы добавить первый.</div>';
    return;
  }
  el.innerHTML = _shopProducts.map(p => {
    const img = (p.images && p.images[0]) ? `<img src="${p.images[0]}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">` : '<div style="font-size:20px;display:flex;align-items:center;justify-content:center;height:100%;background:var(--bg);border-radius:10px;">🛍️</div>';
    return `
      <div style="background:var(--white);border-radius:14px;padding:12px;box-shadow:var(--shadow);margin-bottom:8px;display:flex;gap:10px;align-items:center;">
        <div style="width:48px;height:48px;flex-shrink:0;">${img}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</div>
          <div style="font-size:13px;color:var(--primary);font-weight:700;">${p.price.toLocaleString('ru')} ₽</div>
          <div style="font-size:11px;color:${p.in_stock ? '#34C759' : '#FF3B30'};font-weight:600;">${p.in_stock ? '✓ В наличии' : '✗ Нет в наличии'}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <button onclick="openEditProduct('${p.id}')" style="background:var(--bg);border:none;border-radius:10px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;color:var(--primary);">Ред.</button>
          <button onclick="deleteProduct('${p.id}')" style="background:rgba(255,59,48,0.08);border:none;border-radius:10px;padding:6px 10px;font-size:12px;font-weight:700;cursor:pointer;color:#FF3B30;">Удал.</button>
        </div>
      </div>`;
  }).join('');
}

function openAddProduct() {
  _editingProductId = null;
  showProductModal();
}

function openEditProduct(productId) {
  _editingProductId = productId;
  const p = _shopProducts.find(x => x.id === productId);
  if (!p) return;
  showProductModal(p);
}

// Хранилище фото для текущего товара
let _productPhotoFiles = []; // File объекты
let _productPhotoUrls = [];  // уже загруженные URL

function showProductModal(product = null) {
  const isEdit = !!product;
  _productPhotoFiles = [];
  _productPhotoUrls = product?.images ? [...product.images] : [];

  const CATS = [
    {id:'food', label:'🍖 Корма'},
    {id:'accessories', label:'🦮 Аксессуары'},
    {id:'toys', label:'🎾 Игрушки'},
    {id:'clothing', label:'🧥 Одежда'},
    {id:'health', label:'💊 Здоровье'},
    {id:'other', label:'📦 Другое'},
  ];

  const catOptions = CATS.map(c =>
    `<option value="${c.id.split(' ')[0]}" ${product?.category === c.id.split(' ')[0] ? 'selected' : ''}>${c.label}</option>`
  ).join('');

  // Существующие характеристики
  const existingAttrs = product?.attributes ? Object.entries(product.attributes) : [];

  const modal = document.createElement('div');
  modal.id = 'product-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-end;backdrop-filter:blur(6px);';
  modal.innerHTML = `
    <div style="background:var(--white);border-radius:24px 24px 0 0;width:100%;max-height:92vh;overflow-y:auto;padding:20px 16px;">
      <div style="width:36px;height:4px;background:var(--border);border-radius:2px;margin:0 auto 18px;"></div>
      <div style="font-size:18px;font-weight:900;margin-bottom:20px;">${isEdit ? 'Редактировать товар' : 'Новый товар'}</div>

      <!-- ФОТО -->
      <div style="margin-bottom:18px;">
        <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:8px;">Фотографии товара (до 5 штук)</div>
        <div id="pf-photos-row" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;"></div>
        <label style="display:flex;align-items:center;gap:8px;background:var(--bg);border:1.5px dashed var(--border);border-radius:14px;padding:12px 16px;cursor:pointer;font-size:14px;font-weight:600;color:var(--primary);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Добавить фото
          <input type="file" id="pf-photo-input" accept="image/*" multiple style="display:none;" onchange="handleProductPhotos(this)">
        </label>
      </div>

      <!-- НАЗВАНИЕ -->
      <div style="margin-bottom:12px;">
        <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:6px;">Название *</div>
        <input id="pf-name" class="input" value="${product?.name || ''}" placeholder="Например: Ошейник кожаный, размер M">
      </div>

      <!-- ЦЕНА -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:6px;">Цена ₽ *</div>
          <input id="pf-price" class="input" type="number" value="${product?.price || ''}" placeholder="1 500">
        </div>
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:6px;">Старая цена ₽</div>
          <input id="pf-old-price" class="input" type="number" value="${product?.old_price || ''}" placeholder="2 000">
        </div>
      </div>

      <!-- КАТЕГОРИЯ -->
      <div style="margin-bottom:12px;">
        <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:6px;">Категория *</div>
        <select id="pf-category" class="input" style="appearance:none;">${catOptions}</select>
      </div>

      <!-- ОПИСАНИЕ -->
      <div style="margin-bottom:12px;">
        <div style="font-size:13px;font-weight:700;color:var(--text-secondary);margin-bottom:6px;">Описание товара</div>
        <textarea id="pf-description" class="input" style="min-height:80px;resize:none;" placeholder="Расскажите о товаре — состав, особенности, для кого подходит...">${product?.description || ''}</textarea>
      </div>

      <!-- ХАРАКТЕРИСТИКИ -->
      <div style="margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:13px;font-weight:700;color:var(--text-secondary);">Характеристики</div>
          <button onclick="addAttrRow()" style="background:none;border:none;color:var(--primary);font-size:13px;font-weight:700;cursor:pointer;padding:4px 8px;">+ Добавить</button>
        </div>
        <div id="pf-attrs-list" style="display:flex;flex-direction:column;gap:8px;">
          ${existingAttrs.map(([k,v], i) => `
            <div style="display:flex;gap:8px;align-items:center;" id="attr-row-${i}">
              <input class="input pf-attr-key" value="${k}" placeholder="Параметр (напр. Вес)" style="flex:1;margin-bottom:0;">
              <input class="input pf-attr-val" value="${v}" placeholder="Значение (напр. 2 кг)" style="flex:1;margin-bottom:0;">
              <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:20px;padding:0 4px;flex-shrink:0;">×</button>
            </div>`).join('')}
        </div>
        <div style="font-size:11px;color:var(--text-secondary);margin-top:6px;">Например: Вес → 2 кг, Порода → Мелкие, Возраст → Взрослые</div>
      </div>

      <!-- НАЛИЧИЕ -->
      <div style="margin-bottom:20px;background:var(--bg);border-radius:14px;padding:14px;">
        <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;">
          <div>
            <div style="font-size:14px;font-weight:700;">Товар в наличии</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">Покупатели смогут его заказать</div>
          </div>
          <input type="checkbox" id="pf-in-stock" ${(!product || product.in_stock) ? 'checked' : ''} style="width:22px;height:22px;">
        </label>
      </div>

      <!-- КНОПКИ -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding-bottom:env(safe-area-inset-bottom,0px);">
        <button onclick="closeProductModal()" style="height:52px;background:var(--bg);border:none;border-radius:16px;font-size:15px;font-weight:700;cursor:pointer;">Отмена</button>
        <button onclick="saveProduct()" id="pf-save-btn" style="height:52px;background:var(--primary);color:white;border:none;border-radius:16px;font-size:15px;font-weight:700;cursor:pointer;">Сохранить</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) closeProductModal(); });
  renderProductPhotosRow();
}

function renderProductPhotosRow() {
  const row = document.getElementById('pf-photos-row');
  if (!row) return;
  const all = [..._productPhotoUrls.map(u => ({type:'url', src:u})), ..._productPhotoFiles.map(f => ({type:'file', src:URL.createObjectURL(f), file:f}))];
  if (!all.length) { row.innerHTML = ''; return; }
  row.innerHTML = all.map((item, i) => `
    <div style="position:relative;width:72px;height:72px;border-radius:12px;overflow:hidden;flex-shrink:0;">
      <img src="${item.src}" style="width:100%;height:100%;object-fit:cover;">
      <button onclick="removeProductPhoto(${i},'${item.type}')" style="position:absolute;top:2px;right:2px;width:20px;height:20px;background:rgba(0,0,0,0.6);border:none;border-radius:50%;color:white;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;">×</button>
    </div>`).join('');
}

function removeProductPhoto(index, type) {
  const urlCount = _productPhotoUrls.length;
  if (index < urlCount) {
    _productPhotoUrls.splice(index, 1);
  } else {
    _productPhotoFiles.splice(index - urlCount, 1);
  }
  renderProductPhotosRow();
}

function handleProductPhotos(input) {
  const files = Array.from(input.files);
  const total = _productPhotoUrls.length + _productPhotoFiles.length + files.length;
  if (total > 5) {
    showToast('Максимум 5 фотографий');
    const allowed = 5 - _productPhotoUrls.length - _productPhotoFiles.length;
    _productPhotoFiles.push(...files.slice(0, allowed));
  } else {
    _productPhotoFiles.push(...files);
  }
  input.value = '';
  renderProductPhotosRow();
}

function addAttrRow() {
  const list = document.getElementById('pf-attrs-list');
  if (!list) return;
  const id = 'attr-row-' + Date.now();
  const row = document.createElement('div');
  row.id = id;
  row.style.cssText = 'display:flex;gap:8px;align-items:center;';
  row.innerHTML = `
    <input class="input pf-attr-key" placeholder="Параметр" style="flex:1;margin-bottom:0;">
    <input class="input pf-attr-val" placeholder="Значение" style="flex:1;margin-bottom:0;">
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:20px;padding:0 4px;flex-shrink:0;">×</button>`;
  list.appendChild(row);
  row.querySelector('.pf-attr-key').focus();
}

function closeProductModal() {
  const m = document.getElementById('product-modal');
  if (m) m.remove();
  _productPhotoFiles = [];
  _productPhotoUrls = [];
}

async function uploadProductPhotos(businessId, productId) {
  const uploaded = [..._productPhotoUrls];
  for (const file of _productPhotoFiles) {
    try {
      const ext = file.name.split('.').pop();
      const path = `products/${businessId}/${productId}/${Date.now()}.${ext}`;
      const { error } = await supabaseClient.storage.from('products').upload(path, file, { upsert: true });
      if (!error) {
        const { data: pub } = supabaseClient.storage.from('products').getPublicUrl(path);
        if (pub?.publicUrl) uploaded.push(pub.publicUrl);
      }
    } catch(e) { console.error('upload photo error:', e); }
  }
  return uploaded;
}

async function saveProduct() {
  if (!supabaseClient || !currentBiz) return;
  const name = document.getElementById('pf-name')?.value.trim();
  const price = parseInt(document.getElementById('pf-price')?.value);
  const oldPrice = parseInt(document.getElementById('pf-old-price')?.value) || null;
  const category = document.getElementById('pf-category')?.value;
  const description = document.getElementById('pf-description')?.value.trim();
  const inStock = document.getElementById('pf-in-stock')?.checked;

  if (!name) { showToast('❌ Укажите название товара'); return; }
  if (!price || price <= 0) { showToast('❌ Укажите цену'); return; }
  if (!category) { showToast('❌ Выберите категорию'); return; }

  // Собираем характеристики из строк ключ-значение
  const attrKeys = document.querySelectorAll('.pf-attr-key');
  const attrVals = document.querySelectorAll('.pf-attr-val');
  let attributes = null;
  if (attrKeys.length) {
    const obj = {};
    attrKeys.forEach((k, i) => {
      const key = k.value.trim();
      const val = attrVals[i]?.value.trim();
      if (key && val) obj[key] = val;
    });
    if (Object.keys(obj).length) attributes = obj;
  }

  const saveBtn = document.getElementById('pf-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Сохраняем...'; }

  try {
    let productId = _editingProductId;

    // Сначала создаём/обновляем товар без фото
    const payload = { name, price, old_price: oldPrice, category, description: description || null, attributes, in_stock: inStock, business_id: currentBiz.id, images: _productPhotoUrls };

    if (productId) {
      await supabaseClient.from('shop_products').update(payload).eq('id', productId);
    } else {
      const { data, error } = await supabaseClient.from('shop_products').insert(payload).select().single();
      if (error) throw error;
      productId = data.id;
    }

    // Загружаем новые фото и обновляем images
    if (_productPhotoFiles.length > 0) {
      const allImages = await uploadProductPhotos(currentBiz.id, productId);
      await supabaseClient.from('shop_products').update({ images: allImages }).eq('id', productId);
    }

    showToast('✅ Товар сохранён', '#34C759');
    closeProductModal();
    await loadBizProducts(currentBiz.id);
  } catch(e) {
    console.error('saveProduct:', e);
    showToast('❌ ' + (e.message || 'Ошибка сохранения'));
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Сохранить'; }
  }
}

async function deleteProduct(productId) {
  if (!confirm('Удалить товар?')) return;
  try {
    await supabaseClient.from('shop_products').delete().eq('id', productId);
    showToast('Удалено');
    await loadBizProducts(currentBiz.id);
  } catch(e) { showToast('❌ Ошибка'); }
}
