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

  document.getElementById('biz-dash-content').innerHTML = html;
}

function openBusinessDashboard() {
  if (!userBusinesses.length) { showToast('Бизнес не найден'); return; }
  renderBizDashboard(userBusinesses[0]);
  nav('bizDashboard');
}

function openBizEdit() {
  if (!currentBiz) return;
  const cfg = BIZ_FIELDS[currentBiz.type];
  if (!cfg) return;
  document.getElementById('biz-edit-title').textContent = 'Редактировать: ' + currentBiz.name;

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
        const val = currentBiz[f.id] || '';
        if (f.type === 'textarea') {
          html += `<div style="margin-bottom:12px;"><label class="lbl">${f.label}${f.required ? ' *' : ''}</label><textarea class="input" id="biz-f-${f.id}" placeholder="${f.placeholder}" style="min-height:72px;padding:12px;resize:none;">${val}</textarea></div>`;
        } else {
          html += `<div style="margin-bottom:12px;"><label class="lbl">${f.label}${f.required ? ' *' : ''}</label><input class="input" id="biz-f-${f.id}" type="${f.type}" placeholder="${f.placeholder}" value="${val.replace(/"/g, '&quot;')}"></div>`;
        }
      });
    }
    html += `</div>`;
  });

  document.getElementById('biz-edit-form').innerHTML = html;
  nav('bizEdit');
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
        const el = document.getElementById('biz-f-' + f.id);
        if (el) formData[f.id] = el.value.trim();
      });
    }
  });

  // Валидация обязательных
  const allFields = cfg.sections.flatMap(s => s.fields || []);
  for (const f of allFields) {
    if (f.required && !formData[f.id]) {
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
