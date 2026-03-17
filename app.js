// ============================================================
// NAVIGATION
// ============================================================
const histStack = [];

function nav(id) {
  const curr = document.querySelector('.screen.active');
  const next = document.getElementById(id);
  if (!next || curr === next) return;
  
  // Сбрасываем currentPrivateChatId когда уходим с экрана личного чата
  if (curr && curr.id === 'privateChat' && id !== 'privateChat') {
    console.log('🔄 Closing private chat, resetting currentPrivateChatId');
    currentPrivateChatId = null;
  }
  
  // Загружаем бизнесы при открытии экранов
  if (id === 'catalog') {
    renderCatalogTrainers();
  } else if (id === 'health') {
    renderHealthClinics();
  } else if (id === 'dogmap') {
    renderCafes();
  }
  
  histStack.push(curr.id);
  curr.classList.remove('active');
  curr.style.display = 'none';
  next.classList.add('active');
  // chatConv uses position:fixed flex
  next.style.display = 'flex';
}

function back() {
  if (histStack.length === 0) { nav('home'); return; }
  const prevId = histStack.pop();
  const curr = document.querySelector('.screen.active');
  const prev = document.getElementById(prevId);
  if (!prev) { nav('home'); return; }
  
  // Сбрасываем currentPrivateChatId когда уходим с экрана личного чата назад
  if (curr && curr.id === 'privateChat' && prevId !== 'privateChat') {
    console.log('🔄 Going back from private chat, resetting currentPrivateChatId');
    currentPrivateChatId = null;
  }
  
  curr.classList.remove('active');
  curr.style.display = 'none';
  prev.classList.add('active');
  prev.style.display = 'flex';
}

// Fix: scroll messages up when keyboard appears on iOS/Android
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const chatConv = document.getElementById('chatConv');
    if (chatConv && chatConv.classList.contains('active')) {
      scrollChatBottom();
    }
  });
}

// ============================================================
// MODALS
// ============================================================
function openModal(id) { const el = document.getElementById(id); if (el) el.classList.add('open'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('open'); }

// ============================================================
// TABS
// ============================================================
function switchTab(group, name, clickedEl) {
  clickedEl.closest('.tabs').querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('[id^="tc-'+group+'-"]').forEach(tc => tc.classList.remove('on'));
  clickedEl.classList.add('on');
  const tc = document.getElementById('tc-'+group+'-'+name);
  if (tc) tc.classList.add('on');
}

function selectSvc(n) {
  [1,2,3].forEach(i => { const el = document.getElementById('svc'+i); if (el) el.classList.toggle('sel', i === n); });
}
function selectPay(type) {
  document.getElementById('pf').classList.toggle('sel', type === 'full');
  document.getElementById('ps').classList.toggle('sel', type === 'split');
}
function pickDay(el) {
  el.closest('.cal-g').querySelectorAll('.cal-d').forEach(d => d.classList.remove('sel'));
  el.classList.add('sel');
}

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', function() {
    this.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
    this.classList.add('on');
  });
});

// ============================================================
// AVATAR (Supabase Storage)
// ============================================================
async function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Валидация
  if (!file.type.startsWith('image/')) { showToast('❌ Выберите изображение', '#FF3B30'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('❌ Макс. размер 5 МБ', '#FF3B30'); return; }

  // Сжимаем перед загрузкой
  const compressed = await compressImage(file, 512, 0.8);

  // Если есть Supabase и пользователь авторизован — загружаем в Storage
  if (supabaseClient && currentUser) {
    try {
      showToast('⏳ Загрузка аватарки...', '#4A90D9');
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `avatars/${currentUser.id}.${ext}`;

      // Загружаем файл (перезаписываем если существует)
      const { error: uploadError } = await supabaseClient.storage
        .from('avatars')
        .upload(filePath, compressed, { upsert: true, contentType: compressed.type });
      if (uploadError) throw uploadError;

      // Получаем публичный URL
      const { data: urlData } = supabaseClient.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl + '?t=' + Date.now(); // cache-bust

      // Сохраняем URL в профиль
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .upsert({ id: currentUser.id, avatar_url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (updateError) console.error('❌ Avatar URL save error:', updateError);

      // Обновляем UI и кэш
      applyAvatar(publicUrl);
      localStorage.setItem('df_avatar', publicUrl);
      if (currentUserProfile) currentUserProfile.avatar_url = publicUrl;
      showToast('✅ Аватарка обновлена!', '#34C759');
    } catch(e) {
      console.error('❌ Avatar upload error:', e);
      showToast('❌ Ошибка загрузки', '#FF3B30');
      // Fallback — сохраняем локально как base64
      const reader = new FileReader();
      reader.onload = (ev) => { localStorage.setItem('df_avatar', ev.target.result); applyAvatar(ev.target.result); };
      reader.readAsDataURL(file);
    }
  } else {
    // Нет Supabase — локальный fallback
    const reader = new FileReader();
    reader.onload = (ev) => { localStorage.setItem('df_avatar', ev.target.result); applyAvatar(ev.target.result); };
    reader.readAsDataURL(file);
  }
}

// Сжатие изображения на клиенте (для аватарок и обложек)
function compressImage(file, maxSize = 512, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } }
      else { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
}

function applyAvatar(url) {
  const img = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='👤'">`;
  ['prof-avatar','home-avatar','ep-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.innerHTML = img; el.style.padding = '0'; }
  });
}

// Получить URL аватарки другого пользователя (с кэшем)
const _avatarCache = {};
async function getUserAvatarUrl(userId) {
  if (_avatarCache[userId]) return _avatarCache[userId];
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('avatar_url, name')
      .eq('id', userId)
      .single();
    if (error || !data || !data.avatar_url) return null;
    _avatarCache[userId] = data.avatar_url;
    return data.avatar_url;
  } catch(e) { return null; }
}

// Генерирует HTML для аватарки пользователя (используется в чатах, списках и т.д.)
function userAvatarHtml(avatarUrl, initials, grad, size = 36) {
  if (avatarUrl) {
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex-shrink:0;">` +
      `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='${initials}'"></div>`;
  }
  return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.36)}px;background:${grad||'var(--primary)'};flex-shrink:0;">${initials}</div>`;
}

// ============================================================
// PROFILE
// ============================================================
function getInitials(name) {
  if (!name) return '👤';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0,2).toUpperCase();
}

// ============================================================
// LOGIN FUNCTION
// ============================================================

// ============================================================
function loadProfile() {
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  
  // Аватарка: приоритет — Supabase URL из профиля, затем localStorage
  const avatarUrl = (currentUserProfile && currentUserProfile.avatar_url) || localStorage.getItem('df_avatar');
  if (avatarUrl) setTimeout(() => applyAvatar(avatarUrl), 50);
  
  const name = p.name || 'Гость';
  const initials = p.name ? getInitials(p.name) : '👤';
  const homeName = document.getElementById('home-name');
  const homeAvatar = document.getElementById('home-avatar');
  if (homeName) homeName.textContent = name;
  if (homeAvatar) homeAvatar.textContent = initials;
  const profName = document.getElementById('prof-name');
  const profAvatar = document.getElementById('prof-avatar');
  if (profName) profName.textContent = name;
  if (profAvatar) profAvatar.textContent = initials;
  
  // Обновляем гео на главном экране
  const geoDisplay = document.getElementById('home-geo-display');
  if (geoDisplay) {
    const geo = p.district || 'Москва, Сокольники';
    geoDisplay.textContent = geo;
  }
}

function loadProfileForm() {
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  document.getElementById('ep-name').value = p.name || '';
  document.getElementById('ep-district').value = p.district || '';
  document.getElementById('ep-dogname').value = p.dogname || '';
  document.getElementById('ep-dogbreed').value = p.dogbreed || '';
  document.getElementById('ep-dogage').value = p.dogage || '';
  const av = document.getElementById('ep-avatar');
  if (av) av.textContent = p.name ? getInitials(p.name) : '👤';
}

async function saveProfile() {
  const p = {
    name: document.getElementById('ep-name').value.trim(),
    district: document.getElementById('ep-district').value.trim(),
    dogname: document.getElementById('ep-dogname').value.trim(),
    dogbreed: document.getElementById('ep-dogbreed').value.trim(),
    dogage: document.getElementById('ep-dogage').value.trim(),
  };
  
  // Сохраняем локально
  localStorage.setItem('df_profile', JSON.stringify(p));
  localStorage.setItem('df_user_geo', p.district);
  
  // Сохраняем в Supabase (используем существующую таблицу profiles)
  if (supabaseClient && currentUser) {
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .upsert({
          id: currentUser.id,
          user_id: currentUser.id,
          name: p.name,
          district: p.district,
          dogname: p.dogname,
          dog_breed: p.dogbreed,
          dog_age: p.dogage,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
      
      if (error) {
        console.error('❌ Failed to save profile to Supabase:', error);
      } else {
        console.log('✅ Profile saved to Supabase');
      }
    } catch(e) {
      console.error('❌ Error saving profile:', e);
    }
  }
  
  loadProfile();
  back();
  setTimeout(() => {
    const toast = document.createElement('div');
    toast.textContent = '✅ Профиль сохранён!';
    toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#1A1A1A;color:white;padding:10px 20px;border-radius:20px;font-size:14px;font-weight:700;z-index:9999;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }, 200);
}

window.addEventListener('load', () => {
  loadProfile();
  requestNotificationPermission();
  const splash = document.getElementById('splash');
  splash.classList.add('active');
  splash.style.display = 'flex';
  
  // Ждём инициализации — checkAuth сама обработает любой случай
  setTimeout(() => checkAuth(), 2500);
});

// ============================================================
// DATA — SPECIALISTS (кинологи)
// ============================================================
const SPECIALISTS = [
  {
    id:1, name:'Иван Петров', initials:'ИП', grad:'linear-gradient(135deg,#4A90D9,#7B5EA7)',
    badge:'🏅 Проверен', badgeType:'tag-b', rating:'⭐ 4.9', reviews:127, exp:'5 лет опыта',
    location:'📍 Сокольники, 2.3 км', price:'от 3 000 ₽', insurance:true,
    tags:['Щенки','ОКД','Аджилити'],
    bio:'Сертифицированный кинолог РКФ, специализируюсь на социализации щенков и базовом послушании. Работаю с собаками любых пород, особенно с крупными и гиперактивными. Провёл более 500 занятий.',
    services:[
      {name:'Групповое занятие', desc:'60 мин • до 8 собак', price:'3 000 ₽'},
      {name:'Индивидуальное', desc:'90 мин • только вы', price:'5 000 ₽'},
      {name:'Пакет 10 занятий ⭐', desc:'Экономия 3 000 ₽', price:'27 000 ₽', sel:true},
    ],
    reviewList:[
      {name:'Людмила П.', av:'ЛП', grad:'linear-gradient(135deg,#E91E63,#FF9800)', stars:'⭐⭐⭐⭐⭐', text:'Иван — профессионал! Наш бигль теперь не тянет поводок и выполняет все команды.'},
      {name:'Кирилл А.', av:'КА', grad:'linear-gradient(135deg,#9C27B0,#3F51B5)', stars:'⭐⭐⭐⭐⭐', text:'Взяли пакет 10 занятий — отличный результат за 2 месяца! Собака стала совсем другой.'},
    ],
    availDays:[4,5,6,7,10,11,13,14,17,18,20,21],
  },
  {
    id:2, name:'Мария Соколова', initials:'МС', grad:'linear-gradient(135deg,#E91E63,#FF9800)',
    badge:'🏅 Проверена', badgeType:'tag-b', rating:'⭐ 4.8', reviews:89, exp:'7 лет опыта',
    location:'📍 Преображенское, 1.5 км', price:'от 2 500 ₽', insurance:true,
    tags:['Щенки','Поведение','Коррекция'],
    bio:'Специалист по коррекции нежелательного поведения и работе с агрессией. Учёба в Европейской академии зоопсихологии (Австрия). Помогла более 300 семьям наладить отношения с питомцем.',
    services:[
      {name:'Консультация онлайн', desc:'30 мин • разбор видео', price:'1 500 ₽'},
      {name:'Выездное занятие', desc:'90 мин • у вас дома', price:'4 500 ₽'},
      {name:'Курс коррекции ⭐', desc:'8 занятий • скидка 20%', price:'20 000 ₽', sel:true},
    ],
    reviewList:[
      {name:'Оксана В.', av:'ОВ', grad:'linear-gradient(135deg,#00BCD4,#3F51B5)', stars:'⭐⭐⭐⭐⭐', text:'Мария помогла с агрессией нашего ротвейлера. Теперь он спокойно ходит в парк!'},
      {name:'Павел М.', av:'ПМ', grad:'linear-gradient(135deg,#FF5722,#FF9800)', stars:'⭐⭐⭐⭐', text:'Хороший специалист, результат появился уже после 3-го занятия. Рекомендую.'},
    ],
    availDays:[3,5,7,10,12,14,17,19,21,24,26],
  },
  {
    id:3, name:'Алексей Волков', initials:'АВ', grad:'linear-gradient(135deg,#00BCD4,#3F51B5)',
    badge:'🥇 Эксперт', badgeType:'tag-o', rating:'⭐ 5.0', reviews:203, exp:'12 лет опыта',
    location:'📍 Измайлово, 3.8 км', price:'от 4 000 ₽', insurance:true,
    tags:['Аджилити','Шутцхунд','ОКД','IPO'],
    bio:'Мастер спорта по IPO, судья международной категории по аджилити. Тренировал сборную России на чемпионате Европы 2022. Принимаю только мотивированных хозяев, готовых работать регулярно.',
    services:[
      {name:'Индивидуальный тренинг', desc:'60 мин • серьёзная работа', price:'4 000 ₽'},
      {name:'Подготовка к соревнованиям', desc:'90 мин • видеоанализ', price:'7 000 ₽'},
      {name:'Сезонная программа ⭐', desc:'3 месяца • 24 занятия', price:'60 000 ₽', sel:true},
    ],
    reviewList:[
      {name:'Дмитрий Р.', av:'ДР', grad:'linear-gradient(135deg,#4A90D9,#7B5EA7)', stars:'⭐⭐⭐⭐⭐', text:'Алексей вывел нашу малинуа на уровень кандидата в мастера спорта. Невероятный тренер!'},
      {name:'Светлана К.', av:'СК', grad:'linear-gradient(135deg,#9C27B0,#E91E63)', stars:'⭐⭐⭐⭐⭐', text:'Приехала из Питера специально заниматься у Алексея. Оно того стоило — золото на региональных.'},
    ],
    availDays:[4,6,11,13,18,20,25,27],
  },
  {
    id:4, name:'Елена Козлова', initials:'ЕК', grad:'linear-gradient(135deg,#9C27B0,#E91E63)',
    badge:'🏅 Проверена', badgeType:'tag-b', rating:'⭐ 4.7', reviews:67, exp:'4 года опыта',
    location:'📍 Сокольники, 0.9 км', price:'от 3 500 ₽', insurance:false,
    tags:['Поведение','Страхи','Реабилитация'],
    bio:'Зоопсихолог, специализируюсь на страхах, фобиях и стрессе у собак. Работаю методами позитивного подкрепления без принуждения. Кандидат биологических наук, автор книги «Тревожная собака».',
    services:[
      {name:'Первичная диагностика', desc:'60 мин • анализ поведения', price:'3 500 ₽'},
      {name:'Программа «Без страха»', desc:'6 занятий • мягкий подход', price:'18 000 ₽'},
      {name:'Онлайн-сопровождение ⭐', desc:'месяц • чат + 2 сессии', price:'8 000 ₽', sel:true},
    ],
    reviewList:[
      {name:'Анна Б.', av:'АБ', grad:'linear-gradient(135deg,#FF5722,#FF9800)', stars:'⭐⭐⭐⭐⭐', text:'Елена помогла нашей собаке преодолеть страх грозы и петард. Теперь не прячется!'},
      {name:'Игорь С.', av:'ИС', grad:'linear-gradient(135deg,#00BCD4,#4CAF50)', stars:'⭐⭐⭐⭐', text:'Профессиональный подход, никакого насилия над животным. Виден реальный прогресс.'},
    ],
    availDays:[3,4,6,10,11,13,17,18,20,24,25,27],
  },
  {
    id:5, name:'Дмитрий Орлов', initials:'ДО', grad:'linear-gradient(135deg,#FF5722,#FF9800)',
    badge:'🏅 Проверен', badgeType:'tag-b', rating:'⭐ 4.9', reviews:145, exp:'9 лет опыта',
    location:'📍 ВДНХ, 4.2 км', price:'от 2 000 ₽', insurance:true,
    tags:['Групповые','ОКД','Норматив'],
    bio:'Провожу групповые занятия для собак всех пород и возрастов. Мои группы — это ещё и клуб общения для хозяев. Обучение в игровой форме, результат гарантирован уже через месяц.',
    services:[
      {name:'Группа выходного дня', desc:'90 мин • суббота', price:'2 000 ₽'},
      {name:'Группа по будням', desc:'60 мин • пн/ср/пт', price:'1 500 ₽'},
      {name:'Абонемент на месяц ⭐', desc:'8 занятий • выгода 30%', price:'9 000 ₽', sel:true},
    ],
    reviewList:[
      {name:'Наталья В.', av:'НВ', grad:'linear-gradient(135deg,#4A90D9,#00BCD4)', stars:'⭐⭐⭐⭐⭐', text:'Ходим с лабрадором уже 4 месяца. Атмосфера классная, хозяева все подружились!'},
      {name:'Роман Ф.', av:'РФ', grad:'linear-gradient(135deg,#E91E63,#FF5722)', stars:'⭐⭐⭐⭐⭐', text:'Дмитрий знает как заинтересовать собаку. Наш хаски стал слушаться с первого слова.'},
    ],
    availDays:[5,6,12,13,19,20,26,27],
  },
  {
    id:6, name:'Наталья Романова', initials:'НР', grad:'linear-gradient(135deg,#4CAF50,#009688)',
    badge:'🏅 Проверена', badgeType:'tag-b', rating:'⭐ 4.8', reviews:52, exp:'6 лет опыта',
    location:'📍 Митино, 6.1 км', price:'от 2 800 ₽', insurance:true,
    tags:['Щенки','Социализация','Первые шаги'],
    bio:'Специалист по социализации щенков от 8 недель. Мой «Щенячий детсад» посетили более 200 щенков. Закладываю правильные паттерны поведения с первых дней в новом доме.',
    services:[
      {name:'Щенячий детсад (день)', desc:'6 часов • пн-пт', price:'2 800 ₽'},
      {name:'Урок социализации', desc:'60 мин • в группе щенков', price:'2 000 ₽'},
      {name:'Старт-пакет ⭐', desc:'5 уроков + консультация', price:'12 000 ₽', sel:true},
    ],
    reviewList:[
      {name:'Алина П.', av:'АП', grad:'linear-gradient(135deg,#FF9800,#E91E63)', stars:'⭐⭐⭐⭐⭐', text:'Наталья — волшебница! Щенок за месяц стал уверенным и общительным псом.'},
      {name:'Вася Т.', av:'ВТ', grad:'linear-gradient(135deg,#3F51B5,#9C27B0)', stars:'⭐⭐⭐⭐⭐', text:'Детсад для щенков — это лучшее что мы сделали. Советую всем новым хозяевам.'},
    ],
    availDays:[3,4,5,6,7,10,11,12,13,14,17,18,19,20,21],
  },
];

// ============================================================
// DATA — HEALTH (ветеринары + клиники)
// ============================================================
const HEALTH_DATA = [
  // КЛИНИКИ
  {
    type:'clinic', id:'c1',
    name:'Биоконтроль', icon:'🔬', grad:'linear-gradient(135deg,#D0021B,#9C27B0)',
    subtitle:'Онкологический центр', addr:'ул. Академика Опарина, 4 (Коньково)', dist:'7.2 км',
    rating:'⭐ 4.9', hours:'Пн–Вс 9:00–21:00', tags:['Онкология','Химиотерапия','МРТ','Хирургия'],
    desc:'Ведущий онкологический центр для животных в России. Специализируются исключительно на онкологии, имеют собственный МРТ и линейный ускоритель для лучевой терапии.',
    price:'от 3 500 ₽', spec:'Онкология',
  },
  {
    type:'clinic', id:'c2',
    name:'Зоовет', icon:'🏥', grad:'linear-gradient(135deg,#4A90D9,#00BCD4)',
    subtitle:'Международный ветцентр', addr:'Варшавское ш., 125 стр.1 (Чертаново)', dist:'9.4 км',
    rating:'⭐ 4.7', hours:'Круглосуточно', tags:['МРТ','Стационар','Скорая','Хирургия','УЗИ'],
    desc:'Более 400 000 спасённых животных за 15 лет работы. Собственный учебный центр, стажировки в европейских клиниках. Полный спектр от терапии до трансплантологии.',
    price:'от 2 400 ₽', spec:'Клиника',
  },
  {
    type:'clinic', id:'c3',
    name:'Белый Клык', icon:'🦷', grad:'linear-gradient(135deg,#3F51B5,#9C27B0)',
    subtitle:'Стоматология и хирургия', addr:'ул. Молодёжная, 18 (Кунцево)', dist:'11.3 км',
    rating:'⭐ 4.8', hours:'Пн–Сб 9:00–20:00', tags:['Стоматология','Хирургия','Ортопедия'],
    desc:'Специализированная клиника ветеринарной стоматологии и ортопедии. Единственная в Москве клиника с собственным зуботехническим кабинетом для животных.',
    price:'от 2 000 ₽', spec:'Стоматология',
  },
  {
    type:'clinic', id:'c4',
    name:'Статус-Вет', icon:'🏨', grad:'linear-gradient(135deg,#FF5722,#FF9800)',
    subtitle:'Сеть клиник 24/7', addr:'ул. Профсоюзная, 58к4 (Академическая)', dist:'8.1 км',
    rating:'⭐ 4.8', hours:'Круглосуточно', tags:['Круглосуточно','Скорая','Зоогостиница','Вакцинация'],
    desc:'Сетевая клиника с 12 отделениями по Москве. Современное оборудование, квалифицированные специалисты, зоогостиница и круглосуточная скорая ветпомощь.',
    price:'от 1 800 ₽', spec:'Клиника',
  },
  {
    type:'clinic', id:'c5',
    name:'Медвет', icon:'🩺', grad:'linear-gradient(135deg,#4CAF50,#009688)',
    subtitle:'Многопрофильный центр', addr:'ул. Героев Панфиловцев, 24 (Митино)', dist:'13.5 км',
    rating:'⭐ 4.9', hours:'Пн–Вс 8:00–22:00', tags:['Кардиология','Неврология','Эндоскопия','УЗИ'],
    desc:'Один из лучших многопрофильных центров Москвы. Кардиология, неврология, офтальмология — уникальные специалисты в каждом направлении. Собственная лаборатория.',
    price:'от 2 800 ₽', spec:'Клиника',
  },
  // СПЕЦИАЛИСТЫ
  {
    type:'vet', id:'v1',
    name:'Анна Белова', initials:'АБ', grad:'linear-gradient(135deg,#D0021B,#FF5252)',
    spec:'Онколог-ветеринар', badge:'🏅 Проверена', badgeType:'tag-b',
    rating:'⭐ 5.0', reviews:94, exp:'12 лет опыта', dist:'📍 Сокольники, 1.2 км',
    price:'от 4 500 ₽', tags:['Онкология','УЗИ','Биопсия'],
    bio:'Онколог высшей категории, стажировка в Онкоклинике Тьерри Мильяра (Франция). Специализируется на опухолях мягких тканей и кожи.',
    specType:'Онколог',
  },
  {
    type:'vet', id:'v2',
    name:'Павел Орлов', initials:'ПО', grad:'linear-gradient(135deg,#E91E63,#9C27B0)',
    spec:'Кардиолог', badge:'🥇 Эксперт', badgeType:'tag-o',
    rating:'⭐ 4.9', reviews:78, exp:'8 лет опыта', dist:'📍 Арбат, 5.3 км',
    price:'от 5 000 ₽', tags:['ЭхоКГ','ЭКГ','Аритмия'],
    bio:'Единственный в России ветеринарный кардиолог с сертификатом ECVIM (Европейский диплом). Консультирует клиники по всей России.',
    specType:'Кардиолог',
  },
  {
    type:'vet', id:'v3',
    name:'Светлана Новикова', initials:'СН', grad:'linear-gradient(135deg,#00BCD4,#3F51B5)',
    spec:'Невролог', badge:'🏅 Проверена', badgeType:'tag-b',
    rating:'⭐ 4.8', reviews:61, exp:'10 лет опыта', dist:'📍 Митино, 12 км',
    price:'от 3 800 ₽', tags:['МРТ','Эпилепсия','Миелопатия'],
    bio:'Ветеринарный невролог, специализация — эпилепсия, дископатии, нейрохирургия. Проводит операции на позвоночнике при грыжах дисков.',
    specType:'Невролог',
  },
  {
    type:'vet', id:'v4',
    name:'Тимур Захаров', initials:'ТЗ', grad:'linear-gradient(135deg,#FF9800,#FF5722)',
    spec:'Хирург-ортопед', badge:'🥇 Эксперт', badgeType:'tag-o',
    rating:'⭐ 5.0', reviews:112, exp:'15 лет опыта', dist:'📍 Коньково, 8.5 км',
    price:'от 6 000 ₽', tags:['Ортопедия','Артроскопия','ТПЛ'],
    bio:'Ведущий ветеринарный ортопед страны. Специализируется на разрывах крестообразных связок у крупных пород и дисплазии тазобедренного сустава.',
    specType:'Хирург',
  },
  {
    type:'vet', id:'v5',
    name:'Ирина Смирнова', initials:'ИС', grad:'linear-gradient(135deg,#9C27B0,#673AB7)',
    spec:'Дерматолог', badge:'🏅 Проверена', badgeType:'tag-b',
    rating:'⭐ 4.7', reviews:83, exp:'7 лет опыта', dist:'📍 Хамовники, 4.8 км',
    price:'от 3 200 ₽', tags:['Аллергия','Атопия','Анализы кожи'],
    bio:'Ветеринарный дерматолог с европейской специализацией. Лечит хронические аллергии, атопический дерматит, аутоиммунные заболевания кожи.',
    specType:'Терапевт',
  },
  {
    type:'vet', id:'v6',
    name:'Борис Крылов', initials:'БК', grad:'linear-gradient(135deg,#00BCD4,#4CAF50)',
    spec:'Офтальмолог', badge:'🏅 Проверен', badgeType:'tag-b',
    rating:'⭐ 4.9', reviews:55, exp:'9 лет опыта', dist:'📍 Академическая, 9.2 км',
    price:'от 3 500 ₽', tags:['Катаракта','Глаукома','Операции'],
    bio:'Ветеринарный офтальмолог, выполняет операции по удалению катаракты с имплантацией искусственного хрусталика. Принимает со всей России.',
    specType:'Терапевт',
  },
];

let catalogFilter = 'Все';
let healthFilter = 'Все';
let currentSpecId = null;
let currentPrivateChatId = null;  // ID специалиста для приватного чата
let privateChats = {};  // {specialistId: [{text, sender, time}, ...]}

// Сохраняем в localStorage только личные чаты, event-чаты туда не пишем никогда
function savePrivateChatsToStorage() {
  const toSave = {};
  Object.keys(privateChats).forEach(k => {
    if (!k.startsWith('event_')) toSave[k] = privateChats[k];
  });
  localStorage.setItem('private_chats', JSON.stringify(toSave));
}
let unreadCount = parseInt(localStorage.getItem('unread_count') || '0');
let unreadChats = JSON.parse(localStorage.getItem('unread_chats') || '{}');

// ============================================================
// NOTIFICATION FUNCTIONS
// ============================================================
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function playNotificationSound() {
  // Создаем звук уведомления с помощью Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch(e) {
    // Если Web Audio не поддерживается, игнорируем
  }
}

function showBrowserNotification(title, options = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '🐕',
      badge: '🐾',
      ...options
    });
  }
}

function addUnreadMessage(chatId) {
  if (!unreadChats[chatId]) {
    unreadChats[chatId] = 0;
  }
  unreadChats[chatId]++;
  unreadCount++;
  
  // Сохраняем в localStorage
  localStorage.setItem('unread_chats', JSON.stringify(unreadChats));
  localStorage.setItem('unread_count', unreadCount.toString());
  
  updateUnreadBadge();
  renderPrivateChats(); // Обновляем список чтобы показать бейдж
}

function clearUnreadMessages(chatId) {
  if (unreadChats[chatId]) {
    unreadCount -= unreadChats[chatId];
    unreadChats[chatId] = 0;
    delete unreadChats[chatId];
    
    // Сохраняем в localStorage
    localStorage.setItem('unread_chats', JSON.stringify(unreadChats));
    localStorage.setItem('unread_count', Math.max(0, unreadCount).toString());
  }
  updateUnreadBadge();
  renderPrivateChats(); // Обновляем список чтобы убрать бейдж
}

function updateUnreadBadge() {
  const badge = document.getElementById('chat-nav-badge');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }
  
  // Обновляем badge в PWA
  if ('setAppBadge' in navigator) {
    if (unreadCount > 0) {
      navigator.setAppBadge(unreadCount).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }
}

// ============================================================
// RENDER — CATALOG
// ============================================================
// ============================================================
// GEOLOCATION FUNCTIONS
// ============================================================
function detectGeo() {
  const input = document.getElementById('ep-district');
  if (!input) return;
  input.placeholder = '⏳ Определение геолокации...';
  input.disabled = true;
  
  if (!navigator.geolocation) {
    input.placeholder = 'Выберите или введите район';
    input.disabled = false;
    alert('❌ Браузер не поддерживает геолокацию');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      reverseGeocode(lat, lng, input);
    },
    (error) => {
      input.placeholder = 'Выберите или введите район';
      input.disabled = false;
      let msg = '❌ Не удалось определить геолокацию';
      if (error.code === 1) msg = '❌ Разрешение отклонено';
      if (error.code === 2) msg = '❌ Позиция недоступна';
      if (error.code === 3) msg = '❌ Время ожидания истекло';
      alert(msg);
    }
  );
}

function reverseGeocode(lat, lng, input) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      let geoName = '';
      if (data.address) {
        geoName = data.address.neighbourhood || 
                  data.address.suburb || 
                  data.address.city_district || 
                  data.address.district || 
                  data.address.city || 
                  data.address.town || '';
      }
      if (!geoName) {
        geoName = data.name || 'Неизвестное место';
      }
      input.value = geoName;
      input.placeholder = 'Выберите или введите район';
      input.disabled = false;
    })
    .catch(error => {
      console.error('Ошибка Nominatim:', error);
      input.placeholder = 'Выберите или введите район';
      input.disabled = false;
      alert('⚠️ Ошибка при определении района');
    });
}

// ============================================================
function renderCatalog() {
  const search = (document.getElementById('catalog-search')?.value || '').toLowerCase();
  const list = document.getElementById('catalog-list');
  if (!list) return;
  const filtered = SPECIALISTS.filter(s => {
    const matchFilter = catalogFilter === 'Все' || s.tags.includes(catalogFilter);
    const matchSearch = !search || s.name.toLowerCase().includes(search) || s.tags.join(' ').toLowerCase().includes(search);
    return matchFilter && matchSearch;
  });
  list.innerHTML = filtered.map(s => `
    <div class="scard" onclick="openSpecialist(${s.id})">
      <div class="avatar" style="width:56px;height:56px;font-size:22px;background:${s.grad};">${s.initials}</div>
      <div style="flex:1;">
        <div class="scard-name">${s.name}</div>
        <div class="scard-meta"><span class="tag ${s.badgeType}">${s.badge}</span><span class="stars">${s.rating}</span><span style="font-size:12px;color:var(--text-secondary);">(${s.reviews})</span></div>
        <div style="font-size:13px;color:var(--text-secondary);">${s.location} • ${s.tags.slice(0,2).join(', ')}</div>
        <div style="display:flex;gap:8px;margin-top:6px;">
          <span class="scard-price">${s.price}</span>
          ${s.insurance ? '<span class="tag tag-g" style="font-size:11px;">🛡️ Страховка</span>' : ''}
        </div>
      </div>
    </div>
  `).join('') || '<div style="padding:40px;text-align:center;color:var(--text-secondary);">Никого не найдено</div>';
}

function filterCatalog(val, el) {
  catalogFilter = val;
  document.querySelectorAll('#catalog-chips .chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  renderCatalog();
}

// ============================================================
// OPEN SPECIALIST — fill dynamic screen
// ============================================================
function openSpecialist(id) {
  const s = SPECIALISTS.find(x => x.id === id);
  if (!s) return;
  currentSpecId = id;

  document.getElementById('spec-topbar-name').textContent = s.name;
  const av = document.getElementById('spec-avatar');
  av.textContent = s.initials; av.style.background = s.grad;
  document.getElementById('spec-name').textContent = s.name;
  document.getElementById('spec-badge').className = 'tag ' + s.badgeType;
  document.getElementById('spec-badge').textContent = s.badge + ' Dogly';
  document.getElementById('spec-rating').textContent = s.rating;
  document.getElementById('spec-exp').textContent = s.exp;
  document.getElementById('spec-location').textContent = s.location;
  document.getElementById('spec-bio').textContent = s.bio;
  document.getElementById('spec-tags').innerHTML = s.tags.map(t => `<span class="tag tag-b">${t}</span>`).join('');

  // Services
  document.getElementById('spec-services').innerHTML = s.services.map((sv,i) => `
    <div class="pr ${sv.sel?'sel':''}" onclick="selectSvc(${i+1})" id="svc${i+1}">
      <div><div class="pr-n">${sv.name}</div><div style="font-size:12px;color:var(--text-secondary);">${sv.desc}</div></div>
      <div class="pr-v">${sv.price}</div>
    </div>
  `).join('');

  const mainPrice = s.services.find(sv=>sv.sel)?.price || s.services[0].price;
  document.getElementById('pay-full-desc').textContent = mainPrice + ' сразу';
  document.getElementById('pay-split-desc').textContent = '4 платежа без переплат';

  // Reviews
  const rb = document.getElementById('spec-reviews-block');
  const ratingNum = s.rating.replace('⭐ ','');
  rb.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
      <div style="font-size:40px;font-weight:900;font-family:'Nunito',sans-serif;color:var(--primary);">${ratingNum}</div>
      <div><div class="stars">${'⭐'.repeat(Math.round(parseFloat(ratingNum)))}</div><div style="font-size:13px;color:var(--text-secondary);">${s.reviews} отзывов</div></div>
    </div>
    <div style="border-top:1px solid var(--border);padding-top:14px;display:flex;flex-direction:column;gap:14px;">
      ${s.reviewList.map(r => `
        <div style="display:flex;gap:12px;">
          <div class="avatar" style="width:36px;height:36px;font-size:13px;background:${r.grad};">${r.av}</div>
          <div><div style="font-size:14px;font-weight:700;">${r.name}</div><div class="stars" style="font-size:12px;">${r.stars}</div><div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">${r.text}</div></div>
        </div>
      `).join('')}
    </div>`;

  // Calendar
  const calEl = document.getElementById('spec-calendar');
  const days = ['','','','','','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31'];
  calEl.innerHTML = days.map((d,i) => {
    if (!d) return `<div class="cal-d dis"></div>`;
    const n = parseInt(d);
    if (n === 6) return `<div class="cal-d today">${d}</div>`;
    if (s.availDays.includes(n)) return `<div class="cal-d avail" onclick="pickDay(this)">${d}</div>`;
    return `<div class="cal-d dis">${d}</div>`;
  }).join('');

  // Reset tabs
  document.querySelectorAll('#specialist .tab').forEach((t,i) => t.classList.toggle('on', i===0));
  document.querySelectorAll('#specialist .tc').forEach((tc,i) => tc.classList.toggle('on', i===0));

  nav('specialist');
}

// ============================================================
// RENDER — HEALTH
// ============================================================
function renderHealth() {
  const list = document.getElementById('health-list');
  if (!list) return;
  const filtered = HEALTH_DATA.filter(h => {
    const matchFilter = healthFilter === 'Все' ? true : 
      (healthFilter === 'Клиника' ? h.type === 'clinic' : h.type === 'vet' && h.specType === healthFilter);
    return matchFilter;
  });

  // Section headers
  const clinics = filtered.filter(h => h.type === 'clinic');
  const vets = filtered.filter(h => h.type === 'vet');

  let html = '';
  if (vets.length) {
    html += `<div class="sec-hd"><div class="sec-t">👨‍⚕️ Специалисты</div></div>`;
    html += vets.map(v => `
      <div class="scard" onclick="openSpecialistHealth('${v.id}')">
        <div class="avatar" style="width:56px;height:56px;font-size:22px;background:${v.grad};">${v.initials}</div>
        <div style="flex:1;">
          <div class="scard-name">${v.name}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">${v.spec}</div>
          <div class="scard-meta"><span class="tag ${v.badgeType}">${v.badge}</span><span class="stars">${v.rating}</span><span style="font-size:12px;color:var(--text-secondary);">(${v.reviews})</span></div>
          <div style="font-size:13px;color:var(--text-secondary);">${v.dist} • ${v.exp}</div>
          <div class="scard-price">${v.price}</div>
        </div>
      </div>
    `).join('');
  }
  if (clinics.length) {
    html += `<div class="sec-hd"><div class="sec-t">🏥 Клиники Москвы</div></div>`;
    html += clinics.map(c => `
      <div class="card" style="display:flex;gap:12px;cursor:pointer;margin-bottom:10px;" onclick="openClinicModal('${c.id}')">
        <div style="width:54px;height:54px;background:${c.grad};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${c.icon}</div>
        <div style="flex:1;">
          <div style="font-weight:800;font-size:15px;">${c.name}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">${c.subtitle}</div>
          <div style="font-size:13px;color:var(--text-secondary);">📍 ${c.addr}</div>
          <div style="font-size:13px;color:var(--text-secondary);">🕐 ${c.hours} • ${c.rating}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
            ${c.tags.map(t=>`<span class="tag tag-b" style="font-size:11px;">${t}</span>`).join('')}
          </div>
        </div>
      </div>
    `).join('');
  }
  list.innerHTML = html || '<div style="padding:40px;text-align:center;color:var(--text-secondary);">Ничего не найдено</div>';
}

function filterHealth(val, el) {
  healthFilter = val;
  document.querySelectorAll('#health-chips .chip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  renderHealth();
}

function openSpecialistHealth(id) {
  const v = HEALTH_DATA.find(x => x.id === id);
  if (!v) return;
  // Show vet detail via modal
  openClinicModal(id);
}

// Clinic/vet detail modal
// ============================================================
// EMERGENCY FUNCTIONS
// ============================================================
function openEmergency() {
  // Подтягиваем данные из профиля
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  const phone = localStorage.getItem('df_phone') || '+7 (495) 123-45-67';
  const name = p.name || 'Не указано';
  const petname = p.dogname || 'Не указано';
  
  // Показываем информацию из профиля (только для чтения)
  document.getElementById('em-display-name').textContent = name;
  document.getElementById('em-display-pet').textContent = petname;
  
  // Показываем номер телефона
  document.getElementById('em-phone').textContent = phone;
  
  // Заполняем адрес (можно редактировать)
  document.getElementById('em-address').value = p.district || '';
  document.getElementById('em-problem').value = '';
  
  openModal('m-emergency');
}

function submitEmergency() {
  const address = document.getElementById('em-address').value.trim();
  const problem = document.getElementById('em-problem').value.trim();
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  const name = p.name || 'Не указано';
  const petname = p.dogname || 'Не указано';
  
  if (!address || !problem) {
    alert('❌ Пожалуйста, заполните адрес и описание проблемы');
    return;
  }
  
  // В реальности здесь можно вызвать реальный номер
  // window.location.href = 'tel:+74951234567';
  alert('☎️ Сейчас вас свяжут с оператором\n\n' +
    'Ваши данные:\n' +
    `Владелец: ${name}\n` +
    `Питомец: ${petname}\n` +
    `Адрес: ${address}\n` +
    `Проблема: ${problem}`);
  closeModal('m-emergency');
}

function sendEmergencyRequest() {
  const address = document.getElementById('em-address').value.trim();
  const problem = document.getElementById('em-problem').value.trim();
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  const name = p.name || 'Не указано';
  const petname = p.dogname || 'Не указано';
  
  if (!address || !problem) {
    alert('❌ Пожалуйста, заполните адрес и описание проблемы');
    return;
  }
  
  // Сохраняем заявку (в реальности отправляется на сервер)
  const request = {
    id: Date.now(),
    name,
    address,
    petname,
    problem,
    timestamp: new Date().toLocaleString('ru-RU'),
    status: 'new'
  };
  
  // Сохраняем в localStorage для примера
  let requests = JSON.parse(localStorage.getItem('emergency_requests') || '[]');
  requests.push(request);
  localStorage.setItem('emergency_requests', JSON.stringify(requests));
  
  alert('✅ Ваша заявка отправлена!\n\n' +
    'Оператор свяжется с вами в ближайшее время.\n\n' +
    `Время отправки: ${request.timestamp}`);
  
  closeModal('m-emergency');
}

// ============================================================
function openClinicModal(id) {
  const item = HEALTH_DATA.find(x => x.id === id);
  if (!item) return;
  const m = document.getElementById('m-clinic');
  let html = '';
  if (item.type === 'clinic') {
    html = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
        <div style="width:56px;height:56px;background:${item.grad};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;">${item.icon}</div>
        <div><div style="font-size:18px;font-weight:800;">${item.name}</div><div style="font-size:13px;color:var(--text-secondary);">${item.subtitle}</div></div>
      </div>
      <div style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px;">${item.desc}</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        <div style="font-size:14px;">📍 ${item.addr}</div>
        <div style="font-size:14px;">🕐 ${item.hours}</div>
        <div style="font-size:14px;">${item.rating} • ${item.dist}</div>
        <div style="font-size:14px;font-weight:700;color:var(--primary);">${item.price}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
        ${item.tags.map(t=>`<span class="tag tag-b">${t}</span>`).join('')}
      </div>`;
  } else {
    html = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
        <div class="avatar" style="width:56px;height:56px;font-size:22px;background:${item.grad};">${item.initials}</div>
        <div><div style="font-size:18px;font-weight:800;">${item.name}</div><div style="font-size:13px;color:var(--text-secondary);">${item.spec}</div></div>
      </div>
      <div style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin-bottom:14px;">${item.bio}</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
        <div style="font-size:14px;">${item.dist} • ${item.exp}</div>
        <div style="font-size:14px;">${item.rating} (${item.reviews} отзывов)</div>
        <div style="font-size:14px;font-weight:700;color:var(--primary);">${item.price}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;">
        ${item.tags.map(t=>`<span class="tag tag-b">${t}</span>`).join('')}
      </div>`;
  }
  document.getElementById('m-clinic-body').innerHTML = html;
  openModal('m-clinic');
}

// ============================================================
// PRIVATE CHAT — правильная архитектура пользователь ↔ пользователь
// chatId = userId собеседника
// Ably канал = "dm__" + sorted(myId, theirId) — одинаковый с обеих сторон
// ============================================================

let contactBook = {}; // { userId: {name, initials, grad} }

function loadContactBook() {
  try { contactBook = JSON.parse(localStorage.getItem('df_contacts') || '{}'); } catch(e) { contactBook = {}; }
}

// Открыть чат с реальным пользователем
function openChatWithUser(theirUserId, theirName, theirInitials, theirGrad) {
  const myUserId = currentUser?.id || userId;
  console.log('👤 openChatWithUser: theirUserId=', theirUserId, 'myUserId=', myUserId);
  if (!theirUserId || theirUserId === myUserId) return;
  currentPrivateChatId = theirUserId;
  console.log('✅ Set currentPrivateChatId =', currentPrivateChatId);

  // Запомним контакт
  contactBook[theirUserId] = { name: theirName, initials: theirInitials || theirName.slice(0,2).toUpperCase(), grad: theirGrad || 'linear-gradient(135deg,#4A90D9,#7B5EA7)' };
  localStorage.setItem('df_contacts', JSON.stringify(contactBook));

  if (!privateChats[theirUserId]) privateChats[theirUserId] = [];

  const av = document.getElementById('pc-avatar');
  av.textContent = contactBook[theirUserId].initials;
  av.style.background = contactBook[theirUserId].grad;
  document.getElementById('pc-name').textContent = theirName;
  document.getElementById('pc-online').textContent = '🟢 онлайн';

  renderPrivateChatMessages(theirUserId);
  loadPrivateChatFromServer(theirUserId);
  subscribeToPrivateChat(theirUserId);
  clearUnreadMessages(theirUserId);
  nav('privateChat');
}

// Открыть чат со специалистом (кнопка 💬 на карточке)
function openPrivateChat(specId) {
  console.log('💬 openPrivateChat called with specId:', specId);
  // Сначала ищем в бизнесах из БД
  const business = loadedBusinesses.find(b => b.user_id === specId);
  if (business) {
    console.log('✅ Found business:', business.name || business.business_name, 'user_id:', business.user_id);
    const initials = business.name || business.business_name.substring(0,2).toUpperCase();
    openChatWithUser(specId, business.name || business.business_name, initials, 'linear-gradient(135deg,#4A90D9,#7B5EA7)');
    return;
  }
  
  // Если не нашли, ищем в старых специалистах (хардкод)
  const spec = SPECIALISTS.find(s => s.id === specId);
  if (!spec) return;
  openChatWithUser('spec_' + specId, spec.name, spec.initials, spec.grad);
}

// Подписка на Supabase Realtime DM-канал
function subscribeToPrivateChat(theirId) {
  if (!supabaseClient) {
    setTimeout(() => subscribeToPrivateChat(theirId), 500);
    return;
  }

  // Канал одинаковый с обеих сторон — sorted IDs
  const roomId = [currentUser?.id || userId, String(theirId)].sort().join('__');
  const channelName = 'dogfriend-dm-' + roomId;

  if (supabasePrivateChannels[channelName]) {
    console.log('✅ Already subscribed to:', channelName);
    return; // уже подписаны
  }

  console.log('🔵 Subscribing to private chat:', channelName, 'for user:', theirId);

  const channel = supabaseClient.channel(channelName, {
    config: { broadcast: { self: false } }
  });

  channel.on('broadcast', { event: 'message' }, (payload) => {
    console.log('📩 Private message received:', payload);
    const data = payload.payload;
    // Игнорируем свои (уже отображены локально)
    const myUserId = currentUser?.id || userId;
    if (data.senderId === myUserId) return;

    const chatId = data.senderId; // сообщение от него — ключ = его userId
    if (!privateChats[chatId]) privateChats[chatId] = [];
    
    // Проверяем дубликаты
    const isDuplicate = privateChats[chatId].some(m => 
      m.text === data.text && m.time === data.time && m.senderId === data.senderId
    );
    
    if (isDuplicate) {
      console.log('⚠️ Duplicate message, skipping');
      return;
    }
    
    privateChats[chatId].push({
      text: data.text,
      sender: 'other',
      time: data.time,
      senderName: data.senderName,
      senderId: data.senderId,
      created_at: new Date().toISOString(),
    });
    savePrivateChatsToStorage();

    // Запоминаем контакт если не знаем
    if (!contactBook[chatId]) {
      contactBook[chatId] = { name: data.senderName, initials: data.senderName.slice(0,2).toUpperCase(), grad: 'linear-gradient(135deg,#4A90D9,#7B5EA7)' };
      localStorage.setItem('df_contacts', JSON.stringify(contactBook));
    }

    if (currentPrivateChatId !== chatId) {
      console.log('📢 Showing notification for chat:', chatId);
      addUnreadMessage(chatId);
      playNotificationSound();
      showInAppNotification('💬 ' + data.senderName, data.text);
      showBrowserNotification('Новое от ' + data.senderName, { body: data.text.substring(0, 80) });
      sendPushToUser(data.senderId, { title: '💬 ' + data.senderName, message: data.text.substring(0, 100), url: '/', chatId: chatId, type: 'message' });
    } else {
      renderPrivateChatMessages(chatId);
    }
    renderPrivateChats();
  }).subscribe((status) => {
    console.log('📡 Private channel subscribe status:', status, 'for', channelName);
    if (status === 'SUBSCRIBED') {
      console.log('✅ Successfully subscribed to private chat:', channelName);
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error('❌ Failed to subscribe to private chat:', channelName, status);
    }
  });

  supabasePrivateChannels[channelName] = channel;
}

function loadPrivateChatHistory(chatId) {
  if (!privateChats[chatId]) privateChats[chatId] = [];
  renderPrivateChatMessages(chatId);
}

function renderPrivateChatMessages(chatId) {
  const messages = privateChats[chatId] || [];
  const container = document.getElementById('pc-messages');
  const myName = (JSON.parse(localStorage.getItem('df_profile') || '{}')).name || 'Я';

  if (messages.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-secondary);font-size:14px;">Напишите первое сообщение 👋</div>';
    return;
  }

  container.innerHTML = messages.map(msg => {
    const isMine = msg.sender === 'user';
    return `<div style="display:flex;justify-content:${isMine ? 'flex-end' : 'flex-start'};">
      <div style="max-width:75%;background:${isMine ? 'var(--primary)' : 'var(--white)'};color:${isMine ? 'white' : 'var(--text-primary)'};padding:10px 14px;border-radius:${isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};word-wrap:break-word;font-size:14px;box-shadow:var(--shadow);">
        ${!isMine ? `<div style="font-size:11px;font-weight:700;color:var(--primary);margin-bottom:4px;">${escHtml(msg.senderName || '')}</div>` : ''}
        ${escHtml(msg.text)}
        <div style="font-size:11px;${isMine ? 'color:rgba(255,255,255,0.7)' : 'color:var(--text-secondary)'};margin-top:4px;text-align:right;">${msg.time}</div>
      </div>
    </div>`;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function sendPrivateMessage() {
  const input = document.getElementById('pc-input');
  const text = input.value.trim();
  if (!text || !currentPrivateChatId) return;

  const chatId = currentPrivateChatId;
  const isEventChat = String(chatId).startsWith('event_');
  const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const myProfile = JSON.parse(localStorage.getItem('df_profile') || '{}');
  const myName = myProfile.name || 'Гость';
  const myUserId = currentUser?.id || userId;

  if (!privateChats[chatId]) privateChats[chatId] = [];

  // Добавляем своё сообщение локально сразу (оптимистично)
  const newMsg = { text, sender: 'user', time, senderName: myName, senderId: myUserId, created_at: new Date().toISOString() };
  privateChats[chatId].push(newMsg);

  // Для личных чатов — кэшируем в localStorage
  if (!isEventChat) {
    savePrivateChatsToStorage();
  }

  input.value = '';
  input.style.height = 'auto';
  renderPrivateChatMessages(chatId);
  renderPrivateChats();

  // Сохраняем в БД (savePrivateMsgToServer уже содержит broadcast)
  // Для event-чатов roomId = chatId, для личных = sorted join
  savePrivateMsgToServer(chatId, text, time);

  // Для личных чатов — дополнительный broadcast через свой канал
  if (!isEventChat && supabaseClient) {
    const roomId = [myUserId, String(chatId)].sort().join('__');
    const channelName = 'dogfriend-dm-' + roomId;
    let channel = supabasePrivateChannels[channelName];
    if (!channel) {
      channel = supabaseClient.channel(channelName, { config: { broadcast: { self: false } } });
      channel.subscribe();
      supabasePrivateChannels[channelName] = channel;
    }
    channel.send({
      type: 'broadcast', event: 'message',
      payload: { text, senderName: myName, senderId: myUserId, time }
    });
  }
}

// Нажатие Enter в поле приватного чата
document.addEventListener('DOMContentLoaded', () => {
  const pcInput = document.getElementById('pc-input');
  if (pcInput) {
    pcInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrivateMessage(); }
    });
  }
});

function openUserProfile(nick) {
  // nick — имя из общего чата, msgData содержит senderId
  // Вызываем с данными из сообщения
  const msgData = _lastClickedUser || {};
  const theirUserId = msgData.senderId || nick;
  const theirName = msgData.senderName || nick;
  const colors = ['#4A90D9','#E91E63','#9C27B0','#00BCD4','#FF5722','#4CAF50'];
  const color = colors[nick.charCodeAt(0) % colors.length];
  const initials = nick.slice(0,2).toUpperCase();

  let modal = document.getElementById('m-user-profile');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'm-user-profile';
    modal.className = 'modal-ov';
    modal.onclick = function(e) { if (e.target === this) closeModal('m-user-profile'); };
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="modal" onclick="event.stopPropagation()" style="max-height:80%;overflow-y:auto;">
    <div class="mhandle"></div>
    <div style="text-align:center;padding:20px;">
      <div class="avatar" style="width:72px;height:72px;font-size:28px;margin:0 auto 12px;background:linear-gradient(135deg,${color},${color}99);">${initials}</div>
      <h2 style="margin-bottom:4px;">${escHtml(theirName)}</h2>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">👤 Участник сообщества</div>
      <button class="btn btn-p" style="margin-bottom:10px;" onclick="openChatWithUser('${escHtml(theirUserId)}','${escHtml(theirName)}','${initials}','linear-gradient(135deg,${color},${color}99)');closeModal('m-user-profile')">💬 Написать</button>
      <button class="btn btn-g" onclick="closeModal('m-user-profile')">Закрыть</button>
    </div>
  </div>`;
  openModal('m-user-profile');
}

let _lastClickedUser = null;

function startPrivateChatWithUser(nick) {
  // Если есть _lastClickedUser с senderId — используем его (Supabase UUID)
  const msgData = _lastClickedUser || {};
  const theirUserId = msgData.senderId || nick;
  const theirName = msgData.senderName || nick;
  openChatWithUser(theirUserId, theirName, theirName.slice(0,2).toUpperCase(), 'linear-gradient(135deg,#4A90D9,#7B5EA7)');
}

// Удалить чат только локально (БД не трогаем — собеседник ничего не теряет)
function deleteLocalChat(chatId) {
  // Чаты событий нельзя удалить — история хранится в БД и восстановится
  // Просто убираем из локального списка, при следующем открытии загрузится снова
  const isEventChat = String(chatId).startsWith('event_');

  delete privateChats[chatId];
  savePrivateChatsToStorage();

  if (unreadChats[chatId]) {
    unreadCount -= unreadChats[chatId];
    delete unreadChats[chatId];
    localStorage.setItem('unread_chats', JSON.stringify(unreadChats));
    updateChatBadge();
  }

  // Отписываемся от Realtime канала
  const myUserId = currentUser?.id || userId;
  const roomId = isEventChat ? String(chatId) : getRoomId(myUserId, String(chatId));
  const channelName = 'dogfriend-dm-' + roomId;
  if (supabasePrivateChannels[channelName]) {
    supabasePrivateChannels[channelName].unsubscribe();
    delete supabasePrivateChannels[channelName];
  }

  renderPrivateChats();
}

function renderPrivateChats() {
  const list = document.getElementById('private-chats-list');
  const noChats = document.getElementById('no-private-chats');
  // Личные чаты: только непустые из памяти
  // Event-чаты: берём из contactBook (они могут быть пустыми в памяти до загрузки БД)
  const eventKeys = Object.keys(contactBook).filter(k => k.startsWith('event_'));
  const personalKeys = Object.keys(privateChats).filter(k => !k.startsWith('event_') && privateChats[k].length > 0);
  const keys = [...new Set([...personalKeys, ...eventKeys])];

  if (!keys.length) {
    list.innerHTML = '';
    if (noChats) noChats.style.display = 'block';
    return;
  }
  if (noChats) noChats.style.display = 'none';

  keys.sort((a, b) => {
    const aMsgs = privateChats[a] || [];
    const bMsgs = privateChats[b] || [];
    const aLast = aMsgs[aMsgs.length - 1];
    const bLast = bMsgs[bMsgs.length - 1];
    // Используем created_at (ISO дата) если есть, иначе dbId, иначе порядок добавления
    const aDate = aLast?.created_at || '';
    const bDate = bLast?.created_at || '';
    if (aDate && bDate) return bDate.localeCompare(aDate);
    // Если есть dbId (из Supabase) — чем больше, тем новее
    const aDbId = aLast?.dbId || 0;
    const bDbId = bLast?.dbId || 0;
    if (aDbId || bDbId) return bDbId - aDbId;
    // Fallback: чаты с сообщениями выше пустых
    return bMsgs.length - aMsgs.length;
  });

  list.innerHTML = keys.map(id => {
    const msgs = privateChats[id] || [];
    const last = msgs[msgs.length - 1];
    const contact = contactBook[id] || { name: id, initials: id.slice(0,2).toUpperCase(), grad: 'linear-gradient(135deg,#4A90D9,#7B5EA7)' };
    const unread = unreadChats[id] || 0;
    const safeId = escHtml(id);
    const safeName = escHtml(contact.name);
    const safeInitials = escHtml(contact.initials);
    const safeGrad = escHtml(contact.grad);
    return `
    <div style="position:relative;overflow:hidden;" id="ci-wrap-${safeId}">
      <div style="position:absolute;right:0;top:0;bottom:0;width:80px;background:#FF3B30;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px;cursor:pointer;" onclick="deleteLocalChat('${safeId}')">
        <span style="font-size:18px;">🗑️</span>
        <span style="color:white;font-size:11px;font-weight:700;">Удалить</span>
      </div>
      <div class="ci" id="ci-row-${safeId}" style="gap:14px;position:relative;background:var(--white);transform:translateX(0);transition:transform 0.25s ease;will-change:transform;">
        <div class="avatar" style="width:52px;height:52px;font-size:20px;background:${contact.grad};flex-shrink:0;">${contact.initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-weight:800;font-size:15px;">${safeName}</span>
            <span style="font-size:11px;color:var(--text-secondary);">${last?.time || ''}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${escHtml(last?.text || '')}</span>
            ${unread ? `<span class="badge">${unread}</span>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  // Свайп влево = показать кнопку удаления
  keys.forEach(id => {
    const row = document.getElementById('ci-row-' + id);
    if (!row) return;
    let startX = 0, curX = 0, dragging = false, open = false;

    row.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX; curX = startX; dragging = true;
    }, { passive: true });

    row.addEventListener('touchmove', e => {
      if (!dragging) return;
      curX = e.touches[0].clientX;
      const diff = startX - curX;
      row.style.transition = 'none';
      if (diff > 0) {
        row.style.transform = 'translateX(-' + Math.min(diff, 80) + 'px)';
      } else if (open) {
        row.style.transform = 'translateX(-' + Math.max(0, 80 + diff) + 'px)';
      }
    }, { passive: true });

    row.addEventListener('touchend', () => {
      dragging = false;
      const diff = startX - curX;
      row.style.transition = 'transform 0.25s ease';
      if (diff > 40) { row.style.transform = 'translateX(-80px)'; open = true; }
      else { row.style.transform = 'translateX(0)'; open = false; }
    });

    // Клик по ряду — открыть чат (но сначала закрыть свайп если открыт)
    row.addEventListener('click', e => {
      if (open) {
        e.stopPropagation();
        row.style.transform = 'translateX(0)';
        open = false;
        return;
      }
      if (id.startsWith('event_')) {
        // Event-чат: восстанавливаем из contactBook и открываем через правильный путь
        const evContact = contactBook[id];
        if (evContact) {
          const evId = id.replace('event_', '');
          // Создаём минимальный объект события чтобы передать в openEventGroupChat
          openEventGroupChat({ id: evId, title: evContact.name.replace('📅 ', '') });
        }
      } else {
        const contact = contactBook[id] || { name: id, initials: id.slice(0,2).toUpperCase(), grad: 'linear-gradient(135deg,#4A90D9,#7B5EA7)' };
        openChatWithUser(id, contact.name, contact.initials, contact.grad);
      }
    });
  });
}

function loadPrivateChatsFromStorage() {
  loadContactBook();
  try { privateChats = JSON.parse(localStorage.getItem('private_chats') || '{}'); } catch(e) { privateChats = {}; }

  // Удаляем event-чаты из localStorage — они всегда грузятся из БД
  // чтобы устаревший кэш не показывался вместо актуальной истории
  Object.keys(privateChats).forEach(key => {
    if (key.startsWith('event_')) delete privateChats[key];
  });

  renderPrivateChats();
  // Event-чаты грузятся из БД после инициализации Supabase (см. initSupabase)
}

// Вызывается из initSupabase после успешного подключения
async function reloadEventChatsFromDB() {
  if (!supabaseClient) return;
  const eventChatIds = Object.keys(contactBook).filter(k => k.startsWith('event_'));
  if (!eventChatIds.length) return;
  for (const chatId of eventChatIds) {
    await loadEventChatFromServer(chatId, chatId);
  }
  // Инициализируем курсоры и запускаем фоновый polling
  initEventLastIds();
  startBgEventPolling();
  renderPrivateChats();
}

// ============================================================
// SUPABASE CONFIG (вместо Railway + Ably)
// ============================================================
const SUPABASE_URL = 'https://nxrztljcxphkdfbfubba.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cnp0bGpjeHBoa2RmYmZ1YmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDkzNzQsImV4cCI6MjA4ODYyNTM3NH0.nCunfVYOwBKAMbbuDu4zTQ0tZhjNoWk680VFSWPwuUk';

// Загружаем Supabase SDK
if (!window.supabaseLoaded) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js';
  script.onload = async () => { 
    window.supabaseLoaded = true; 
    await initSupabase(); 
  };
  script.onerror = () => {
    console.error('❌ Failed to load Supabase SDK');
    // Fallback - идём на login без Supabase
    setTimeout(() => nav('login'), 2000);
  };
  document.head.appendChild(script);
}

// ── PUSH-УВЕДОМЛЕНИЯ (Web Push API + Service Worker) ─────────────
const VAPID_PUBLIC_KEY = 'BI8_NAdekNyDnzqz8NAqHvNeUzmFzjJZtZpybpxPOdszWLPUnaMJnJZNckK5vGDj0L-AN9DmkcC5DaCes2CHspg';

let swRegistration = null;

async function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[SW] ✅ Зарегистрирован');
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const { chatId, type } = event.data.data || {};
        if (chatId) openPrivateChat(chatId);
        else if (type === 'event') nav('events');
      }
    });
    return swRegistration;
  } catch (error) {
    console.error('[SW] ❌ Ошибка:', error);
    return null;
  }
}

let pushSubscription = null;

async function subscribeToPush() {
  if (!swRegistration) swRegistration = await initServiceWorker();
  if (!swRegistration) return null;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  try {
    pushSubscription = await swRegistration.pushManager.getSubscription();
    if (!pushSubscription) {
      pushSubscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log('[Push] ✅ Подписка создана');
    }
    await savePushSubscription(pushSubscription);
    return pushSubscription;
  } catch (error) {
    console.error('[Push] ❌ Ошибка подписки:', error);
    return null;
  }
}

async function savePushSubscription(subscription) {
  if (!supabaseClient || !currentUser) return;
  const sub = subscription.toJSON();
  const { error } = await supabaseClient.from('push_subscriptions').upsert({
    user_id: currentUser.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth_key: sub.keys.auth,
    user_agent: navigator.userAgent.substring(0, 200),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,endpoint' });
  if (error) console.error('[Push] ❌ Ошибка сохранения:', error);
  else console.log('[Push] ✅ Подписка сохранена в Supabase');
}

async function sendPushToUser(targetUserId, { title, message, url, chatId, type }) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.functions.invoke('send-push', {
      body: { target_user_id: targetUserId, title, message, url, chatId, type }
    });
  } catch (e) {
    console.error('[Push] ❌ Ошибка отправки:', e);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

let supabaseClient = null;
let currentUser = null;
let currentUserProfile = null;

async function initSupabase() {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase connected');
    // checkAuth вызывается из splash-таймера
  }
}

// Проверка авторизации при загрузке
async function checkAuth() {
  // Если Supabase ещё не готов — подождём и попробуем снова
  if (!supabaseClient) {
    setTimeout(() => checkAuth(), 300);
    return;
  }

  console.log('🔍 Checking auth...');

  // Запасной таймер — никогда не зависнем на сплэше
  const fallback = setTimeout(() => {
    const active = document.querySelector('.screen.active');
    if (active && active.id === 'splash') {
      nav(localStorage.getItem('df_registered') === '1' ? 'home' : 'login');
    }
  }, 5000);

  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    clearTimeout(fallback);

    if (error) {
      console.error('❌ Auth error:', error);
      nav('login');
      return;
    }

    if (session) {
      console.log('✅ User authenticated:', session.user.email);
      currentUser = session.user;
      try { await loadUserProfile(); } catch(e) { console.warn('loadUserProfile:', e); }
      
      // Запускаем Realtime подписку на новые сообщения (заменяет polling)
      stopRealtimeDMSubscription(); // Сбрасываем если была старая
      startRealtimeDMSubscription();
      
      // Подписываемся только на личные чаты broadcast-каналы
      Object.keys(privateChats).forEach(chatId => {
        if (!chatId.startsWith('event_')) subscribeToPrivateChat(chatId);
      });

      // Загружаем event-чаты из БД (единственный источник истины)
      reloadEventChatsFromDB();

      // Проверяем бизнес сразу после авторизации
      checkUserBusiness();

      nav('home');
      // Инициализируем push-уведомления
      setTimeout(async () => { await initServiceWorker(); if (currentUser) subscribeToPush(); }, 3000);
    } else {
      console.log('❌ No session found');
      const oldRegistered = localStorage.getItem('df_registered');
      if (oldRegistered === '1') {
        console.log('🔄 Using localStorage auth');
        nav('home');
      } else {
        console.log('→ Redirecting to login');
        nav('login');
      }
    }
  } catch(e) {
    clearTimeout(fallback);
    console.error('❌ checkAuth exception:', e);
    nav(localStorage.getItem('df_registered') === '1' ? 'home' : 'login');
  }
}

// Вход через Supabase
async function supabaseLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  if (!email || !password) {
    alert('❌ Заполните все поля');
    return;
  }
  
  // Try Supabase first, fall back to localStorage if network unavailable
  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (!error && data && data.user) {
        currentUser = data.user;
        localStorage.setItem('df_registered', '1');
        localStorage.setItem('df_email', email);
        try { loadUserProfile(); } catch(e) {}
        
        // Запускаем Realtime подписку вместо polling
        stopRealtimeDMSubscription();
        startRealtimeDMSubscription();
        Object.keys(privateChats).forEach(chatId => {
          if (!chatId.startsWith('event_')) subscribeToPrivateChat(chatId);
        });
        
        // Проверяем бизнес
        checkUserBusiness();
        
        nav('home');
        return;
      }
    }
  } catch (err) {
    console.warn('Supabase unavailable, using local auth:', err.message);
  }
  
  // Local fallback — works offline / in preview
  const stored = localStorage.getItem('df_local_pass_' + email);
  if (stored && stored === password) {
    localStorage.setItem('df_registered', '1');
    localStorage.setItem('df_email', email);
    nav('home');
    return;
  }
  // Auto-login if no password stored yet (first time, demo mode)
  if (!stored) {
    localStorage.setItem('df_registered', '1');
    localStorage.setItem('df_email', email);
    localStorage.setItem('df_local_pass_' + email, password);
    nav('home');
    return;
  }
  alert('❌ Неверный пароль');
}

// Регистрация через Supabase
async function supabaseRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  
  if (!name || !email || !password) {
    alert('❌ Заполните все поля');
    return;
  }
  
  // Try Supabase, fall back to local
  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (!error && data && data.user) {
        localStorage.setItem('df_registered', '1');
        localStorage.setItem('df_email', email);
        localStorage.setItem('df_local_pass_' + email, password);
        const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
        p.name = name;
        localStorage.setItem('df_profile', JSON.stringify(p));
        nav('home');
        return;
      }
    }
  } catch(err) {
    console.warn('Supabase unavailable, local register:', err.message);
  }
  
  // Local fallback
  localStorage.setItem('df_registered', '1');
  localStorage.setItem('df_email', email);
  localStorage.setItem('df_local_pass_' + email, password);
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  p.name = name;
  localStorage.setItem('df_profile', JSON.stringify(p));
  nav('home');
}


// Загрузка профиля пользователя
async function loadUserProfile() {
  if (!currentUser || !supabaseClient) return;
  
  try {
    console.log('📥 Loading profile from Supabase for user:', currentUser.id);
    
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found, это норм для нового юзера
      console.error('❌ Load profile error:', error);
      return;
    }
    
    if (data) {
      console.log('✅ Profile loaded from Supabase:', data);
      currentUserProfile = data;
      
      // Обновляем localStorage для совместимости
      const profileData = { 
        name: data.name || '', 
        district: data.district || '',
        dogname: data.dogname || '',
        dogbreed: data.dog_breed || '',
        dogage: data.dog_age || ''
      };
      localStorage.setItem('df_profile', JSON.stringify(profileData));
      
      // Аватарка из Supabase Storage
      if (data.avatar_url) {
        localStorage.setItem('df_avatar', data.avatar_url);
      }
      
      // Обновляем UI
      loadProfile();
    } else {
      console.log('ℹ️ No profile found in Supabase, using localStorage');
    }
  } catch (err) {
    console.error('❌ Load profile exception:', err);
  }
}
// ============================================================

// Уникальный ID комнаты из двух userId (всегда одинаковый порядок)
function getRoomId(a, b) {
  return [String(a), String(b)].sort().join('__');
}

// In-app уведомление — работает везде без разрешений
function showInAppNotification(title, body) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; top:16px; left:50%; transform:translateX(-50%);
    background:#1A1A1A; color:white; padding:12px 18px; border-radius:16px;
    font-size:14px; font-weight:600; z-index:99999; max-width:300px;
    box-shadow:0 4px 20px rgba(0,0,0,0.3); display:flex; gap:10px; align-items:center;
    animation:slideDown 0.3s ease;
  `;
  el.innerHTML = `<span style="font-size:20px;">💬</span><div><div style="font-size:13px;opacity:0.7;margin-bottom:2px;">${title}</div><div>${body.substring(0,50)}${body.length>50?'...':''}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity 0.3s'; setTimeout(()=>el.remove(), 300); }, 3500);
}

// Browser Push Notification (работает даже когда приложение закрыто)
function showBrowserNotification(title, options) {
  // Проверяем поддержку
  if (!('Notification' in window)) return;
  
  // Запрашиваем разрешение если ещё не дано
  if (Notification.permission === 'default') {
    Notification.requestPermission();
    return;
  }
  
  // Показываем уведомление если разрешено
  if (Notification.permission === 'granted') {
    try {
      // Вибрация на мобильных
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      
      // Уникальный tag для каждого чата - чтобы каждое сообщение показывалось
      const tag = options.tag || `dogfriend-msg-${Date.now()}`;
      
      new Notification(title, {
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">🐕</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="75" font-size="75">🐾</text></svg>',
        tag: tag,
        renotify: true,
        requireInteraction: false,
        silent: false,
        ...options
      });
    } catch(e) {
      console.log('Notification error:', e);
    }
  }
}

// Запрашиваем разрешение на уведомления при первом открытии чата
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        showInAppNotification('✅ Уведомления включены', 'Теперь вы будете получать уведомления о новых сообщениях');
      }
    });
  }
}

let supabasePublicChannel = null;
let supabasePrivateChannels = {};
let chatNick    = '';
let typingTimer = null;
let typingUsers = new Set();
let chatInited  = false;
// userId — постоянный (один человек), sessionId — уникален для каждой вкладки
let userId = localStorage.getItem('df_user_id');
if (!userId) {
  userId = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('df_user_id', userId);
}
// sessionId уникален для каждой вкладки — чтобы тестировать в двух вкладках
const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

// Единый источник правды для ID текущего пользователя
// Всегда Supabase UUID если залогинен, иначе локальный fallback
function getMyId() {
  return currentUser?.id || userId;
}

function getChatNick() {
  try {
    const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
    return (p.name || 'Гость').split(' ')[0];
  } catch { return 'Гость'; }
}

function openPublicChat() {
  chatNick = getChatNick();
  document.getElementById('chat-conv-name').textContent = '🐾 Общий чат Dogly';
  document.getElementById('chat-conv-av').style.background = 'linear-gradient(135deg,#4A90D9,#7B5EA7)';
  document.getElementById('chat-conv-av').textContent = '💬';
  document.getElementById('chat-conv-subtitle').innerHTML = '<span style="color:#aaa">● подключение...</span>';
  
  // Очищаем старые сообщения и загружаем историю из БД
  const wrap = document.getElementById('chat-messages');
  if (wrap) wrap.innerHTML = '';
  loadPublicChatHistory();
  
  nav('chatConv');
  
  // Запрашиваем разрешение на уведомления при первом открытии
  requestNotificationPermission();
  
  // Всегда проверяем подключение
  if (!chatInited) {
    initSupabaseChat();
  } else if (!supabasePublicChannel) {
    // Если канал отключился - переподключаем
    console.log('🔄 Reconnecting to public chat...');
    connectSupabaseRealtime();
  } else {
    scrollChatBottom();
  }
}

function initSupabaseChat() {
  chatInited = true;
  if (!supabaseClient) {
    setTimeout(initSupabaseChat, 500);
    return;
  }
  
  connectSupabaseRealtime();
}


// Фоновая инициализация ЛС — работает без захода в публичный чат
function initBackgroundDM() {
  if (!supabaseClient) {
    setTimeout(initBackgroundDM, 600);
    return;
  }
  chatNick = getChatNick();
  
  // Подписываемся на broadcast каналы существующих чатов
  Object.keys(privateChats).forEach(chatId => {
    if (!chatId.startsWith('event_')) subscribeToPrivateChat(chatId);
  });
  
  // Запускаем Realtime подписку на БД (заменяет polling)
  startRealtimeDMSubscription();
}
function connectSupabaseRealtime() {
  try {
    console.log('🔌 Connecting to Supabase Realtime...');
    
    // Создаём Realtime канал для общего чата
    supabasePublicChannel = supabaseClient.channel('dogfriend-public-chat', {
      config: { broadcast: { self: false, ack: false } }
    });

    // Таймаут на подключение (10 сек)
    const connectionTimeout = setTimeout(() => {
      console.error('⏱️ Connection timeout!');
      setChatStatus('error');
      
      // Retry через 3 секунды
      setTimeout(() => {
        console.log('🔄 Retrying connection...');
        if (supabasePublicChannel) {
          supabasePublicChannel.unsubscribe();
        }
        connectSupabaseRealtime();
      }, 3000);
    }, 10000);

    supabasePublicChannel
      .on('broadcast', { event: 'message' }, (payload) => {
        const d = payload.payload;
        const myId = currentUser?.id || userId;
        if (d.senderId !== myId) appendMessage(d.nick, d.text, d.time, false, d.senderId);
        typingUsers.delete(d.nick);
        renderTyping();
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const d = payload.payload;
        if (d.nick === chatNick) return;
        if (d.isTyping) typingUsers.add(d.nick);
        else typingUsers.delete(d.nick);
        renderTyping();
      })
      .on('broadcast', { event: 'system' }, (payload) => {
        const d = payload.payload;
        if (d.nick !== chatNick) appendSysMsg(d.text);
      })
      .subscribe((status) => {
        console.log('📡 Realtime status:', status);
        
        if (status === 'SUBSCRIBED') {
          clearTimeout(connectionTimeout); // Отменяем таймаут
          setChatStatus('online');
          supabasePublicChannel.send({
            type: 'broadcast',
            event: 'system',
            payload: { nick: chatNick, text: `🐾 ${chatNick} присоединился к чату` }
          });
          
          // Подписываемся на все приватные чаты (broadcast каналы для мгновенной доставки)
          Object.keys(privateChats).forEach(chatId => {
            if (!chatId.startsWith('event_')) subscribeToPrivateChat(chatId);
          });
          
          // Запускаем Realtime подписку на БД (если ещё не запущена)
          startRealtimeDMSubscription();
          
          refreshOnlineCount();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(connectionTimeout);
          console.error('❌ Connection failed:', status);
          setChatStatus('error');
          
          // Retry через 3 секунды
          setTimeout(() => {
            console.log('🔄 Retrying after error...');
            connectSupabaseRealtime();
          }, 3000);
        }
      });

  } catch(e) {
    setChatStatus('error');
    console.error('❌ Realtime error:', e);
    appendSysMsg('⚠️ Ошибка: ' + e.message);
    
    // Retry через 5 секунд
    setTimeout(() => {
      console.log('🔄 Retrying after exception...');
      connectSupabaseRealtime();
    }, 5000);
  }
}

// ============================================================
// REALTIME ПОДПИСКА НА НОВЫЕ СООБЩЕНИЯ (заменяет polling)
// Одна подписка ловит ВСЕ новые сообщения: личные, event, публичные
// ============================================================
let realtimeDMChannel = null;

function startRealtimeDMSubscription() {
  if (realtimeDMChannel || !supabaseClient) return;
  
  const myUserId = currentUser?.id || userId;
  if (!myUserId) return;
  
  console.log('🔔 Starting Realtime subscription for direct_messages');
  
  realtimeDMChannel = supabaseClient
    .channel('dm-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'direct_messages'
    }, (payload) => {
      const msg = payload.new;
      if (!msg) return;
      
      const myId = currentUser?.id || userId;
      const myIds = [myId];
      if (currentUser?.id && userId && currentUser.id !== userId) myIds.push(userId);
      
      // Пропускаем свои сообщения
      if (myIds.includes(msg.sender_id)) return;
      
      const roomId = msg.room_id;
      
      // ── Общий чат ──
      if (roomId === 'public_chat') {
        // Общий чат обрабатывается через broadcast (мгновенно), пропускаем
        return;
      }
      
      // ── Event-чат ──
      if (roomId && roomId.startsWith('event_')) {
        const chatId = roomId;
        // Проверяем что мы подписаны на этот event-чат
        if (!contactBook[chatId]) return;
        
        if (!privateChats[chatId]) privateChats[chatId] = [];
        
        // Дубль?
        const dup = privateChats[chatId].some(x => x.dbId === msg.id);
        if (dup) return;
        
        privateChats[chatId].push({
          text: msg.text, sender: 'other',
          time: msg.time, senderName: msg.sender_name,
          senderId: msg.sender_id, dbId: msg.id,
          created_at: msg.created_at,
        });
        
        if (currentPrivateChatId === chatId) {
          renderPrivateChatMessages(chatId);
        } else {
          addUnreadMessage(chatId);
          playNotificationSound();
          showInAppNotification('💬 ' + msg.sender_name, msg.text);
        }
        renderPrivateChats();
        return;
      }
      
      // ── Личный чат ──
      const isMyRoom = myIds.some(id => roomId && roomId.includes(id));
      if (!isMyRoom) return;
      
      const chatId = msg.sender_id;
      if (!privateChats[chatId]) privateChats[chatId] = [];
      
      // Дубль? (может прийти и через broadcast и через postgres_changes)
      const exists = privateChats[chatId].some(m => 
        m.text === msg.text && m.time === msg.time && m.senderId === msg.sender_id
      );
      if (exists) return;
      
      privateChats[chatId].push({
        text: msg.text,
        sender: 'other',
        time: msg.time,
        senderName: msg.sender_name,
        senderId: msg.sender_id,
        created_at: msg.created_at,
        dbId: msg.id,
      });
      savePrivateChatsToStorage();
      
      // Запоминаем контакт
      if (!contactBook[chatId]) {
        contactBook[chatId] = { 
          name: msg.sender_name, 
          initials: msg.sender_name.slice(0,2).toUpperCase(), 
          grad: 'linear-gradient(135deg,#4A90D9,#7B5EA7)' 
        };
        localStorage.setItem('df_contacts', JSON.stringify(contactBook));
      }
      
      // Подписываемся на broadcast-канал для мгновенной доставки
      if (!chatId.startsWith('event_')) subscribeToPrivateChat(chatId);
      
      if (currentPrivateChatId !== chatId) {
        addUnreadMessage(chatId);
        playNotificationSound();
        showInAppNotification('💬 ' + msg.sender_name, msg.text);
        showBrowserNotification('Новое от ' + msg.sender_name, { body: msg.text.substring(0, 80) });
        sendPushToUser(msg.sender_id, { title: '💬 ' + msg.sender_name, message: msg.text.substring(0, 100), url: '/', chatId: chatId, type: 'message' });
      } else {
        renderPrivateChatMessages(chatId);
      }
      renderPrivateChats();
    })
    .subscribe((status) => {
      console.log('📡 Realtime DM subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime DM subscription active');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('❌ Realtime DM subscription failed:', status);
        // Retry
        realtimeDMChannel = null;
        setTimeout(startRealtimeDMSubscription, 3000);
      }
    });
}

function stopRealtimeDMSubscription() {
  if (realtimeDMChannel) {
    realtimeDMChannel.unsubscribe();
    realtimeDMChannel = null;
  }
}

// ============================================================
// LEGACY POLLING — ОТКЛЮЧЁН (заменён на Realtime выше)
// Оставлен как fallback на случай если Realtime не поддерживается
// ============================================================
let incomingMsgPollInterval = null;
let lastCheckedTime = Date.now();
let processedMessageIds = new Set();

function startIncomingMessagesPolling() {
  // Polling отключён — используем Realtime Postgres Changes
  // Запускаем Realtime подписку вместо polling
  startRealtimeDMSubscription();
}

function sendChatMsg() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text || !supabasePublicChannel) return;
  const now  = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  appendMessage(chatNick, text, time, true, currentUser?.id || userId);
  input.value = '';
  chatInputResize(input);
  
  // Broadcast для мгновенной доставки (typing + сообщение)
  supabasePublicChannel.send({
    type: 'broadcast',
    event: 'message',
    payload: { nick: chatNick, text, time, senderId: currentUser?.id || userId }
  });
  
  clearTimeout(typingTimer);
  supabasePublicChannel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { nick: chatNick, isTyping: false }
  });

  // Сохраняем в БД для истории общего чата
  if (supabaseClient) {
    const myUserId = currentUser?.id || userId;
    const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
    supabaseClient.from('direct_messages').insert({
      room_id: 'public_chat',
      sender_id: myUserId,
      sender_name: p.name || chatNick,
      text: text,
      time: time
    }).then(({ error }) => {
      if (error) console.error('❌ Failed to save public msg:', error);
    });
  }
}

// Загрузка истории общего чата из БД
async function loadPublicChatHistory() {
  if (!supabaseClient) return;
  try {
    const { data } = await supabaseClient
      .from('direct_messages')
      .select('*')
      .eq('room_id', 'public_chat')
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (!data || !data.length) return;
    const myUserId = currentUser?.id || userId;
    const wrap = document.getElementById('chat-messages');
    if (!wrap) return;
    
    data.forEach(m => {
      const isMine = m.sender_id === myUserId;
      appendMessage(m.sender_name, m.text, m.time, isMine, m.sender_id);
    });
  } catch(e) {
    console.error('loadPublicChatHistory error:', e);
  }
}

function appendMessage(nick, text, time, isMine, senderId) {
  const wrap  = document.getElementById('chat-messages');
  const row   = document.createElement('div');
  row.className = 'cmsg-row ' + (isMine ? 'mine' : 'theirs');
  const initials = nick.slice(0,2).toUpperCase();
  const colors   = ['#4A90D9','#E91E63','#9C27B0','#00BCD4','#FF5722','#4CAF50'];
  const color    = colors[nick.charCodeAt(0) % colors.length];
  const grad = `linear-gradient(135deg,${color},${color}99)`;
  // клик по имени → запоминаем пользователя и открываем профиль
  // senderId здесь — всегда Supabase UUID (или локальный fallback)
  const safeSenderId = senderId ? String(senderId).replace(/'/g, "\\'") : '';
  const safeNick = escHtml(nick).replace(/'/g, "\\'");
  const clickHandler = safeSenderId
    ? `_lastClickedUser={senderId:'${safeSenderId}',senderName:'${safeNick}'};openUserProfile('${safeNick}')`
    : `openUserProfile('${safeNick}')`;
  row.innerHTML = `
    ${!isMine ? `<div class="cmsg-nick" style="cursor:pointer;color:var(--primary);" onclick="${clickHandler}">${escHtml(nick)}</div>` : ''}
    <div style="display:flex;align-items:flex-end;gap:6px;${isMine?'flex-direction:row-reverse':''}">
      ${!isMine ? `<div class="avatar" style="width:28px;height:28px;font-size:10px;flex-shrink:0;background:${grad};cursor:pointer;" onclick="${clickHandler}">${initials}</div>` : ''}
      <div class="cmsg-bubble">${escHtml(text)}</div>
    </div>
    <div class="cmsg-time">${time}</div>
  `;
  wrap.appendChild(row);
  scrollChatBottom();
}

function appendSysMsg(text) {
  const wrap = document.getElementById('chat-messages');
  const el   = document.createElement('div');
  el.className = 'cmsg-sys';
  el.textContent = text;
  wrap.appendChild(el);
  scrollChatBottom();
}

function renderTyping() {
  const el = document.getElementById('chat-typing');
  if (typingUsers.size > 0) {
    const names = [...typingUsers].join(', ');
    el.innerHTML = `<span>${escHtml(names)} печатает<span class="tdt"><i></i><i></i><i></i></span></span>`;
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

function setChatStatus(s) {
  const sub = document.getElementById('chat-conv-subtitle');
  if (!sub) return;
  if (s === 'online')     sub.innerHTML = '<span style="color:#7ED321">● онлайн</span>';
  else if (s === 'error') sub.innerHTML = '<span style="color:#D0021B">● ошибка</span>';
  else                    sub.innerHTML = '<span style="color:#aaa">● подключение...</span>';
}

function scrollChatBottom() {
  const wrap = document.getElementById('chat-messages');
  if (wrap) wrap.scrollTop = wrap.scrollHeight;
}

function chatInputResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 96) + 'px';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function openChat() { openPublicChat(); }
function renderDialogList() {}

// ============================================================
// SUPABASE DATABASE API (замена Railway API)
// ============================================================

// Загрузить историю с сервера
async function loadPrivateChatFromServer(chatId) {
  if (!supabaseClient) return;
  const myUserId = currentUser?.id || userId;
  const roomId = getRoomId(myUserId, String(chatId));
  
  try {
    const { data, error } = await supabaseClient
      .from('direct_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (data && data.length > 0) {
      privateChats[chatId] = data.map(m => ({
        text: m.text,
        sender: m.sender_id === myUserId ? 'user' : 'other',
        time: m.time,
        senderName: m.sender_name,
        senderId: m.sender_id,
        created_at: m.created_at,
        dbId: m.id,
      }));
      savePrivateChatsToStorage();
      if (currentPrivateChatId == chatId) renderPrivateChatMessages(chatId);
    }
  } catch(e) {
    console.error('Load chat error:', e);
  }
}

// Сохранить сообщение на сервере
async function savePrivateMsgToServer(chatId, text, time) {
  if (!supabaseClient) return;
  const myUserId = currentUser?.id || userId;
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');

  // Для чатов событий room_id = chatId напрямую (event_XXX)
  // Для личных чатов — sorted join
  const isEventChat = String(chatId).startsWith('event_');
  const roomId = isEventChat ? String(chatId) : getRoomId(myUserId, String(chatId));

  // Для event чатов broadcast идёт в channel dogfriend-dm-{roomId}
  const channelName = 'dogfriend-dm-' + roomId;

  try {
    // Сохраняем в БД
    const { error } = await supabaseClient.from('direct_messages').insert({
      room_id: roomId,
      sender_id: myUserId,
      sender_name: p.name || 'Гость',
      text: text,
      time: time
    });
    if (error) { console.error('❌ Failed to save message:', error); return; }

    // Для личных чатов — broadcast через Realtime для мгновенной доставки
    // Для event-чатов — получатели сами опрашивают БД через polling
    if (!isEventChat) {
      const ch = supabasePrivateChannels[channelName] || supabaseClient.channel(channelName);
      ch.send({
        type: 'broadcast',
        event: 'message',
        payload: { text, time, senderId: myUserId, senderName: p.name || 'Гость' }
      });
      savePrivateChatsToStorage();
    }
  } catch(e) {
    console.error('❌ Save message error:', e);
  }
}

// Счётчик онлайн в шапке общего чата
function refreshOnlineCount() {
  // Упрощённо: показываем статус онлайн
  const sub = document.getElementById('chat-conv-subtitle');
  if (sub) sub.innerHTML = '<span style="color:#7ED321">● онлайн</span>';
}

// Экстренный вызов на сервер
function sendEmergencyToServer(address, problem) {
  if (!supabaseClient) return null;
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  
  try {
    const { data, error } = supabaseClient.from('emergency_calls').insert({
      user_id: userId,
      name: p.name || 'Не указано',
      petname: p.dogname || 'Не указано',
      address: address,
      problem: problem
    });
    return data;
  } catch(e) {
    console.error('Emergency error:', e);
    return null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadPrivateChatsFromStorage();
  renderCatalog();
  renderHealth();

  // ⚡ Запускаем Supabase сразу при загрузке
  chatNick = getChatNick();
  if (window.supabaseLoaded) initSupabase();

  // ⚡ Фоновые ЛС-уведомления — без захода в публичный чат
  initBackgroundDM();

  const inp = document.getElementById('chat-input');
  if (!inp) return;
  inp.addEventListener('input', () => {
    chatInputResize(inp);
    if (!supabasePublicChannel) return;
    clearTimeout(typingTimer);
    supabasePublicChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { nick: chatNick, isTyping: true }
    });
    typingTimer = setTimeout(() => {
      if (supabasePublicChannel) {
        supabasePublicChannel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { nick: chatNick, isTyping: false }
        });
      }
    }, 2500);
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMsg(); }
  });
});

// ════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════
function showToast(msg, bg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:'+(bg||'#1A1A1A')+';color:white;padding:10px 20px;border-radius:20px;font-size:14px;font-weight:700;z-index:99999;white-space:nowrap;max-width:90vw;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.25);';
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300);},2500);
}

// ════════════════════════════════════════════════════════════
// CLINIC BOOKING  (called by button in m-clinic modal)
// ════════════════════════════════════════════════════════════
let _currentBookingItem = null;
// Monkey-patch openClinicModal to capture current item
(function(){
  const orig = window.openClinicModal;
  window.openClinicModal = function(id) {
    if (typeof HEALTH_DATA !== 'undefined') {
      _currentBookingItem = HEALTH_DATA.find(x => x.id === id) || null;
    }
    orig && orig(id);
  };
})();

function bookFromClinicModal() {
  const item = _currentBookingItem;
  const name = item ? item.name : 'Специалист';
  const now  = new Date();
  const dateStr = now.toLocaleDateString('ru-RU');

  // save to localStorage (CRM feed)
  let appts = JSON.parse(localStorage.getItem('df_appointments') || '[]');
  const rec = {
    id: Date.now(),
    name,
    type: item ? (item.type === 'clinic' ? 'Клиника' : 'Специалист') : '—',
    spec: item ? (item.subtitle || item.spec || '') : '',
    addr: item ? (item.addr || item.dist || '') : '',
    date: dateStr, time: '10:00', status: 'pending',
    createdAt: now.toISOString()
  };
  appts.push(rec);
  localStorage.setItem('df_appointments', JSON.stringify(appts));

  // auto-add med record
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  let recs = JSON.parse(localStorage.getItem('df_med_records') || '[]');
  recs.unshift({ id: Date.now()+1, type:'Приём', petName: p.dogname||'', title:'Запись: '+name, date: now.toISOString().split('T')[0], doctor: name, notes: 'Создано через Dogly' });
  localStorage.setItem('df_med_records', JSON.stringify(recs));

  closeModal('m-clinic');

  // show success screen
  document.getElementById('appt-success-text').textContent = 'Заявка на приём в «' + name + '» отправлена.';
  document.getElementById('appt-success-card').innerHTML =
    '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;">'
    + '<div style="width:44px;height:44px;background:'+(item&&item.grad?item.grad:'linear-gradient(135deg,#4A90D9,#7B5EA7)')+';border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">'+(item&&item.icon?item.icon:(item&&item.initials?item.initials:'🏥'))+'</div>'
    + '<div><div style="font-weight:800;font-size:15px;">'+name+'</div><div style="font-size:13px;color:var(--text-secondary);">'+(rec.spec)+'</div></div></div>'
    + '<div style="font-size:13px;color:var(--text-secondary);line-height:1.9;">'
    + '📅 Дата заявки: <strong>'+dateStr+'</strong><br>'
    + '🕐 Ориентировочно: <strong>10:00–12:00</strong><br>'
    + (rec.addr ? '📍 '+rec.addr+'<br>' : '')
    + '📞 Менеджер свяжется для подтверждения времени</div>';
  nav('apptSuccess');
}

// ════════════════════════════════════════════════════════════
// PLACES DATA & RENDER
// ════════════════════════════════════════════════════════════
const PLACES_DATA = [
  {id:'p1',name:'Кофе & Лапки',icon:'☕',type:'Кафе',addr:'Сокольнический вал, 1',dist:'0.3 км',rating:'4.8',tags:['Питомцы welcome','Веранда','Wi-Fi'],desc:'Уютная кофейня с отдельным меню для собак. Миски с водой и лакомства на стойке. Просторная летняя веранда.',hours:'Пн–Вс 8:00–22:00',ymaps:'https://yandex.ru/maps/213/moscow/?text=Сокольнический+вал+1',color:'#FF9800',promo:null},
  {id:'p2',name:'Парк Сокольники',icon:'🌳',type:'Парк',addr:'Сокольнический вал, 1',dist:'0.5 км',rating:'4.9',tags:['Зоны без поводка','3 площадки','Водоёмы'],desc:'Один из лучших парков Москвы. 3 специальные площадки для собак без поводка, водоёмы, широкие аллеи.',hours:'Круглосуточно',ymaps:'https://yandex.ru/maps/org/park_sokolniki/1018907069/',color:'#4CAF50',promo:null},
  {id:'p3',name:'PawStyle Груминг',icon:'✂️',type:'Грумер',addr:'Стромынка, 10',dist:'0.8 км',rating:'4.7',tags:['Стрижка','Купание','Укладка'],desc:'Профессиональный груминг-салон. Работают с собаками всех пород. Скидка 15% для жителей ЖК Сокольники Парк.',hours:'Пн–Сб 9:00–20:00',ymaps:'https://yandex.ru/maps/213/moscow/?text=Стромынка+10',color:'#9C27B0',promo:'SOKOL15'},
  {id:'p4',name:'Хвост & Лапа',icon:'🛍️',type:'Магазин',addr:'Преображенская пл., 8',dist:'1.2 км',rating:'4.6',tags:['Корм','Аксессуары','Игрушки'],desc:'Зоомагазин с широким выбором кормов премиум-класса. Онлайн-заказ с доставкой за 2 часа.',hours:'Пн–Вс 9:00–22:00',ymaps:'https://yandex.ru/maps/213/moscow/?text=Преображенская+площадь+8',color:'#2196F3',promo:null},
  {id:'p5',name:'Площадка Огородная',icon:'🏃',type:'Парк',addr:'Огородный пр., 15',dist:'1.5 км',rating:'4.5',tags:['Без поводка','Освещение','Скамейки'],desc:'Оборудованная площадка с препятствиями для аджилити. Работает до 23:00, есть освещение.',hours:'6:00–23:00',ymaps:'https://yandex.ru/maps/213/moscow/?text=Огородный+проезд+15',color:'#009688',promo:null},
  {id:'p6',name:'Собачья жизнь',icon:'🍽️',type:'Кафе',addr:'Проспект Мира, 34',dist:'2.1 км',rating:'4.8',tags:['Dog-friendly','Меню для собак','Веранда'],desc:'Ресторан, где у собак есть собственное меню от шеф-повара. Резервация обязательна.',hours:'Пн–Вс 12:00–23:00',ymaps:'https://yandex.ru/maps/213/moscow/?text=Проспект+Мира+34',color:'#E91E63',promo:'DOGTABLE'},
  {id:'p7',name:'Измайловский парк',icon:'🌲',type:'Парк',addr:'Измайловское ш., 71',dist:'3.4 км',rating:'4.7',tags:['Лес','Без поводка','Озёра'],desc:'Огромный лесопарк с озёрами. Популярен для утренних пробежек. Несколько зон без поводка.',hours:'Круглосуточно',ymaps:'https://yandex.ru/maps/213/moscow/?text=Измайловское+шоссе+71',color:'#388E3C',promo:null},
  {id:'p8',name:'Zoobox Аксессуары',icon:'🎀',type:'Магазин',addr:'Богородский вал, 3',dist:'1.9 км',rating:'4.5',tags:['Одежда','Ошейники','Переноски'],desc:'Бутик с дизайнерскими аксессуарами. Индивидуальный пошив ошейников и поводков. Постоянная скидка 10%.',hours:'Пн–Сб 10:00–20:00',ymaps:'https://yandex.ru/maps/213/moscow/?text=Богородский+вал+3',color:'#FF5722',promo:'DOGFRIEND10'},
];
let _placesFilter = 'Все';
let _currentPlace = null;

function filterPlaces(val, el) {
  _placesFilter = val;
  document.querySelectorAll('#dogmap .chips .chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  renderCafes(); // Загружаем из БД
}
function renderPlaces() {
  renderCafes(); // Используем новую функцию
}

function openPlaceModal(id) {
  _currentPlace = PLACES_DATA.find(x=>x.id===id);
  if (!_currentPlace) return;
  const p = _currentPlace;
  document.getElementById('m-place-body').innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
      <div style="width:56px;height:56px;background:${p.color};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;">${p.icon}</div>
      <div><div style="font-size:18px;font-weight:800;">${p.name}</div><div style="font-size:13px;color:var(--text-secondary);">${p.type} · ⭐ ${p.rating}</div></div>
    </div>
    <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px;">${p.desc}</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
      <div style="font-size:14px;">📍 ${p.addr} · ${p.dist} от вас</div>
      <div style="font-size:14px;">🕐 ${p.hours}</div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px;">${p.tags.map(t=>`<span class="tag tag-b">${t}</span>`).join('')}</div>
    ${p.promo?`<div style="background:rgba(126,211,33,0.12);border-radius:12px;padding:12px;"><div style="font-size:13px;font-weight:700;color:#5a9c18;">🎁 Промокод жителям ЖК:</div><div style="font-size:24px;font-weight:900;font-family:'Nunito',sans-serif;color:#5a9c18;letter-spacing:2px;">${p.promo}</div></div>`:''}
  `;
  openModal('m-place');
}
function openYandexMap() {
  if (_currentPlace) window.open(_currentPlace.ymaps,'_blank');
}

// ════════════════════════════════════════════════════════════
// DISCOUNTS DATA & RENDER
// ════════════════════════════════════════════════════════════
const DISCOUNTS_DATA = [
  {id:'d1',partner:'PawStyle Груминг',icon:'✂️',cat:'Груминг',pct:'-15%',short:'Скидка 15% на все услуги для жителей ЖК',code:'SOKOL15',valid:'до 31.12.2026',color:'linear-gradient(135deg,#9C27B0,#E91E63)',addr:'Стромынка, 10 · 0.8 км',full:'Профессиональная стрижка, купание, чистка ушей и когтей. Работаем с породами любой сложности. Предъявите промокод при оплате или назовите кассиру.'},
  {id:'d2',partner:'Хвост & Лапа',icon:'🛍️',cat:'Питание',pct:'-20%',short:'Скидка 20% на первый заказ кормов Royal Canin и Hills',code:'FIRSTORDER',valid:'Однократно',color:'linear-gradient(135deg,#2196F3,#00BCD4)',addr:'Преображенская пл., 8 · 1.2 км',full:'Широкий выбор кормов премиум-класса. Скидка 20% распространяется на первый заказ кормов Royal Canin и Hill\'s в магазине или онлайн.'},
  {id:'d3',partner:'Zoobox Аксессуары',icon:'🎀',cat:'Аксессуары',pct:'-10%',short:'Постоянная скидка 10% на все аксессуары',code:'DOGFRIEND10',valid:'Бессрочно',color:'linear-gradient(135deg,#FF5722,#FF9800)',addr:'Богородский вал, 3 · 1.9 км',full:'Дизайнерские ошейники, поводки, одежда и переноски. Промокод действует на весь ассортимент магазина при любой покупке от 500 ₽.'},
  {id:'d4',partner:'Статус-Вет',icon:'🏥',cat:'Ветеринар',pct:'-25%',short:'Скидка 25% на первичный приём терапевта',code:'VETFIRST25',valid:'до 30.06.2026',color:'linear-gradient(135deg,#D0021B,#FF5252)',addr:'Профсоюзная, 58к4 · 8.1 км',full:'Скидка 25% на первичный приём ветеринара-терапевта в любом отделении сети Статус-Вет. Не распространяется на экстренную помощь и операции.'},
  {id:'d5',partner:'Собачья жизнь',icon:'🍽️',cat:'Кафе',pct:'-10%',short:'Скидка 10% и бесплатный десерт для питомца',code:'DOGTABLE',valid:'Пн–Пт до 17:00',color:'linear-gradient(135deg,#E91E63,#FF5722)',addr:'Проспект Мира, 34 · 2.1 км',full:'При предъявлении промокода скидка 10% на счёт и бесплатный фирменный десерт для вашей собаки. Действует только при предварительном бронировании.'},
  {id:'d6',partner:'Медвет',icon:'🩺',cat:'Ветеринар',pct:'-15%',short:'Скидка 15% на чипирование + ветпаспорт',code:'CHIP15',valid:'до 31.05.2026',color:'linear-gradient(135deg,#4CAF50,#009688)',addr:'Героев Панфиловцев, 24 · 13.5 км',full:'Скидка 15% на комплекс: чипирование + ветеринарный паспорт + первичная вакцинация. Идеально для новых питомцев.'},
];
let _discFilter = 'Все';
let _currentDisc = null;

function filterDiscounts(val, el) {
  _discFilter = val;
  document.querySelectorAll('#discounts .chips .chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  renderDiscounts();
}
function renderDiscounts() {
  const list = document.getElementById('discounts-list');
  if (!list) return;
  const data = _discFilter==='Все' ? DISCOUNTS_DATA : DISCOUNTS_DATA.filter(d=>d.cat===_discFilter);
  list.innerHTML = data.map(d=>`
    <div class="card" style="cursor:pointer;margin-bottom:10px;" onclick="openDiscountModal('${d.id}')">
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="width:52px;height:52px;background:${d.color};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${d.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
            <div style="font-weight:800;font-size:15px;">${d.partner}</div>
            <div style="background:var(--secondary);color:white;border-radius:10px;padding:4px 10px;font-size:14px;font-weight:900;font-family:'Nunito',sans-serif;flex-shrink:0;">${d.pct}</div>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);margin:4px 0;">${d.short}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
            <span class="tag tag-b" style="font-size:11px;letter-spacing:1px;">${d.code}</span>
            <span style="font-size:11px;color:var(--text-secondary);">⏰ ${d.valid}</span>
          </div>
        </div>
      </div>
    </div>`).join('')||'<div style="padding:40px;text-align:center;color:var(--text-secondary);">Ничего не найдено</div>';
}
function openDiscountModal(id) {
  _currentDisc = DISCOUNTS_DATA.find(x=>x.id===id);
  if (!_currentDisc) return;
  const d = _currentDisc;
  document.getElementById('m-discount-body').innerHTML = `
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
      <div style="width:56px;height:56px;background:${d.color};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:28px;">${d.icon}</div>
      <div><div style="font-size:18px;font-weight:800;">${d.partner}</div><div style="font-size:13px;color:var(--text-secondary);">${d.cat}</div></div>
    </div>
    <div style="background:rgba(245,166,35,0.12);border-radius:12px;padding:12px;text-align:center;margin-bottom:14px;">
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Скидка</div>
      <div style="font-size:36px;font-weight:900;font-family:'Nunito',sans-serif;color:var(--secondary);">${d.pct}</div>
    </div>
    <div style="font-size:14px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px;">${d.full}</div>
    <div style="font-size:14px;margin-bottom:6px;">📍 ${d.addr}</div>
    <div style="font-size:14px;margin-bottom:14px;">⏰ ${d.valid}</div>
    <div style="background:rgba(74,144,217,0.08);border-radius:12px;padding:14px;text-align:center;">
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">Ваш промокод</div>
      <div style="font-size:26px;font-weight:900;font-family:'Nunito',sans-serif;color:var(--primary);letter-spacing:3px;">${d.code}</div>
    </div>
  `;
  openModal('m-discount');
}
function copyPromoCode() {
  if (!_currentDisc) return;
  navigator.clipboard.writeText(_currentDisc.code)
    .then(()=>showToast('✅ Промокод '+_currentDisc.code+' скопирован!','#7ED321'))
    .catch(()=>showToast('Промокод: '+_currentDisc.code));
}

// ════════════════════════════════════════════════════════════
// PETS
// ════════════════════════════════════════════════════════════
let _petSex = 'м';
function selectPetSex(s) {
  _petSex = s;
  document.getElementById('pet-sex-m').classList.toggle('on', s==='м');
  document.getElementById('pet-sex-f').classList.toggle('on', s==='ж');
}
function savePet() {
  const name  = document.getElementById('new-pet-name').value.trim();
  const breed = document.getElementById('new-pet-breed').value.trim();
  if (!name) { showToast('❌ Введите кличку'); return; }
  let pets = JSON.parse(localStorage.getItem('df_pets')||'[]');
  const GRADS=['linear-gradient(135deg,#4A90D9,#7B5EA7)','linear-gradient(135deg,#E91E63,#FF9800)','linear-gradient(135deg,#00BCD4,#4CAF50)','linear-gradient(135deg,#FF5722,#FF9800)','linear-gradient(135deg,#9C27B0,#E91E63)'];
  const EMOJIS=['🐕','🦮','🐩','🐕‍🦺','🐶'];
  pets.push({id:Date.now(),name,breed,age:document.getElementById('new-pet-age').value.trim(),weight:document.getElementById('new-pet-weight').value.trim(),sex:_petSex,dob:document.getElementById('new-pet-dob').value,notes:document.getElementById('new-pet-notes').value.trim(),color:GRADS[pets.length%GRADS.length],emoji:EMOJIS[pets.length%EMOJIS.length]});
  localStorage.setItem('df_pets',JSON.stringify(pets));
  closeModal('m-add-pet');
  renderPets();
  showToast('🐾 '+name+' добавлен!','#7ED321');
}
function deletePet(id) {
  let pets = JSON.parse(localStorage.getItem('df_pets')||'[]').filter(p=>p.id!==id);
  localStorage.setItem('df_pets',JSON.stringify(pets));
  renderPets();
  showToast('Питомец удалён');
}
function togglePetCard(idx) {
  const b=document.getElementById('pet-bdy-'+idx), a=document.getElementById('pet-arr-'+idx);
  const open=b.style.display==='none';
  b.style.display=open?'block':'none'; a.textContent=open?'⌄':'›';
}
function renderPets() {
  const list = document.getElementById('pets-list');
  if (!list) return;
  let pets = JSON.parse(localStorage.getItem('df_pets')||'[]');
  // seed from profile if empty
  if (!pets.length) {
    const p=JSON.parse(localStorage.getItem('df_profile')||'{}');
    if (p.dogname) pets=[{id:1,name:p.dogname,breed:p.dogbreed||'Порода не указана',age:p.dogage||'',sex:'м',color:'linear-gradient(135deg,#4A90D9,#7B5EA7)',emoji:'🐕',weight:'',notes:''}];
  }
  if (!pets.length) {
    list.innerHTML='<div style="text-align:center;padding:60px 20px;color:var(--text-secondary);"><div style="font-size:64px;margin-bottom:16px;">🐾</div><div style="font-size:16px;font-weight:700;margin-bottom:8px;">Питомцев пока нет</div><div style="font-size:13px;">Нажмите «+ Добавить»</div></div>';
    return;
  }
  const recs=JSON.parse(localStorage.getItem('df_med_records')||'[]');
  list.innerHTML=pets.map((pet,i)=>{
    const cnt=recs.filter(r=>r.petName===pet.name).length;
    return `<div class="pet-card">
      <div class="pet-hdr" onclick="togglePetCard(${i})">
        <div style="width:52px;height:52px;background:${pet.color};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;">${pet.emoji}</div>
        <div style="flex:1;">
          <div style="font-size:16px;font-weight:800;">${pet.name} ${pet.sex==='ж'?'♀':'♂'}</div>
          <div style="font-size:13px;color:var(--text-secondary);">${pet.breed}${pet.age?' · '+pet.age:''}</div>
        </div>
        <div style="font-size:22px;color:var(--border);" id="pet-arr-${i}">›</div>
      </div>
      <div id="pet-bdy-${i}" class="pet-bdy" style="display:none;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;padding-top:12px;">
          ${pet.weight?`<div style="background:var(--bg);border-radius:10px;padding:8px 12px;text-align:center;"><div style="font-size:16px;font-weight:800;">${pet.weight} кг</div><div style="font-size:11px;color:var(--text-secondary);">Вес</div></div>`:''}
          ${pet.dob?`<div style="background:var(--bg);border-radius:10px;padding:8px 12px;text-align:center;"><div style="font-size:13px;font-weight:800;">${pet.dob}</div><div style="font-size:11px;color:var(--text-secondary);">Дата рожд.</div></div>`:''}
          <div style="background:var(--bg);border-radius:10px;padding:8px 12px;text-align:center;"><div style="font-size:16px;font-weight:800;">${cnt}</div><div style="font-size:11px;color:var(--text-secondary);">Мед. записей</div></div>
        </div>
        ${pet.notes?`<div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">⚠️ ${pet.notes}</div>`:''}
        <div style="display:flex;gap:8px;">
          <button class="btn btn-g btn-sm" style="flex:1;" onclick="nav('medRecords')">🏥 Мед. записи</button>
          <button class="btn btn-sm" style="flex:1;background:rgba(208,2,27,0.08);color:var(--error);border-radius:10px;height:38px;font-size:13px;font-weight:700;" onclick="deletePet(${pet.id})">🗑️ Удалить</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════════
// MED RECORDS
// ════════════════════════════════════════════════════════════
const MED_ICONS={'Вакцинация':'💉','Приём':'🏥','Анализ':'🔬','Операция':'🔪','Другое':'📋'};
const MED_BG={'Вакцинация':'rgba(74,144,217,.12)','Приём':'rgba(76,175,80,.12)','Анализ':'rgba(156,39,176,.12)','Операция':'rgba(208,2,27,.12)','Другое':'rgba(0,0,0,.06)'};
let _medType='Вакцинация';
function selectMedType(t,el){_medType=t;document.querySelectorAll('#med-type-chips .chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');}
function saveMedRecord(){
  const title=document.getElementById('med-title').value.trim();
  if(!title){showToast('❌ Укажите название/диагноз');return;}
  let recs=JSON.parse(localStorage.getItem('df_med_records')||'[]');
  recs.unshift({id:Date.now(),type:_medType,petName:document.getElementById('med-pet-name').value.trim(),title,date:document.getElementById('med-date').value,doctor:document.getElementById('med-doctor').value.trim(),notes:document.getElementById('med-notes').value.trim()});
  localStorage.setItem('df_med_records',JSON.stringify(recs));
  closeModal('m-add-med');renderMedRecords();showToast('✅ Запись сохранена','#7ED321');
}
function renderMedRecords(){
  const list=document.getElementById('med-records-list');
  if(!list)return;
  let recs=JSON.parse(localStorage.getItem('df_med_records')||'[]');
  // seed sample data
  if(!recs.length){
    const p=JSON.parse(localStorage.getItem('df_profile')||'{}');
    const pet=p.dogname||'Питомец';
    recs=[
      {id:1,type:'Вакцинация',petName:pet,title:'Нобивак DHPPi+L',date:'2025-09-15',doctor:'Др. Орлов, Статус-Вет',notes:'Следующая через 1 год — сентябрь 2026'},
      {id:2,type:'Приём',petName:pet,title:'Плановый осмотр терапевта',date:'2025-11-20',doctor:'Др. Белова, Зоовет',notes:'Всё в норме, вес 8.2 кг'},
      {id:3,type:'Анализ',petName:pet,title:'Общий анализ крови',date:'2025-11-20',doctor:'Зоовет, лаборатория',notes:'Результаты в норме'},
    ];
    // СОХРАНЯЕМ sample данные чтобы можно было удалять!
    localStorage.setItem('df_med_records', JSON.stringify(recs));
  }
  list.innerHTML=recs.map(r=>`
    <div id="med-${r.id}" class="med-record-item" onclick="openMedRecord(${r.id})" style="background:var(--white);border-radius:var(--radius);margin-bottom:10px;box-shadow:var(--shadow);padding:14px 16px;display:flex;gap:12px;align-items:flex-start;cursor:pointer;position:relative;transition:transform 0.2s;">
      <div style="width:44px;height:44px;background:${MED_BG[r.type]||'rgba(0,0,0,.06)'};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${MED_ICONS[r.type]||'📋'}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div style="font-weight:800;font-size:14px;">${r.title}</div>
          <span class="tag tag-b" style="font-size:11px;flex-shrink:0;">${r.type}</span>
        </div>
        ${r.petName?`<div style="font-size:12px;color:var(--primary);font-weight:600;margin-top:2px;">🐕 ${r.petName}</div>`:''}
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">📅 ${r.date}${r.doctor?' · '+r.doctor:''}</div>
        ${r.notes?`<div style="font-size:12px;color:var(--text-secondary);margin-top:3px;font-style:italic;">${r.notes}</div>`:''}
      </div>
      <button onclick="event.stopPropagation();deleteMedRecord(${r.id})" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);background:#FF3B30;color:white;border:none;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer;opacity:0;transition:opacity 0.2s;">Удалить</button>
    </div>`).join('');
    
  // Добавляем свайп для удаления
  document.querySelectorAll('.med-record-item').forEach(item => {
    let startX = 0;
    let currentX = 0;
    
    item.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
    });
    
    item.addEventListener('touchmove', (e) => {
      currentX = e.touches[0].clientX;
      const diff = startX - currentX;
      if (diff > 0 && diff < 100) {
        item.style.transform = `translateX(-${diff}px)`;
        item.querySelector('button').style.opacity = diff / 100;
      }
    });
    
    item.addEventListener('touchend', () => {
      const diff = startX - currentX;
      if (diff > 50) {
        item.style.transform = 'translateX(-80px)';
        item.querySelector('button').style.opacity = '1';
      } else {
        item.style.transform = 'translateX(0)';
        item.querySelector('button').style.opacity = '0';
      }
    });
  });
}

function openMedRecord(id) {
  const recs = JSON.parse(localStorage.getItem('df_med_records')||'[]');
  const rec = recs.find(r => r.id === id) || {id:1,type:'Вакцинация',petName:'Питомец',title:'Нобивак DHPPi+L',date:'2025-09-15',doctor:'Др. Орлов, Статус-Вет',notes:'Следующая через 1 год — сентябрь 2026'};
  
  let modal = document.getElementById('m-view-med');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'm-view-med';
    modal.className = 'modal-ov';
    modal.onclick = (e) => { if (e.target === modal) closeModal('m-view-med'); };
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `<div class="modal" onclick="event.stopPropagation()">
    <div class="mhandle"></div>
    <div style="padding:20px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:56px;height:56px;background:${MED_BG[rec.type]||'rgba(0,0,0,.06)'};border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:32px;">${MED_ICONS[rec.type]||'📋'}</div>
        <div style="flex:1;">
          <div style="font-weight:800;font-size:16px;margin-bottom:4px;">${rec.title}</div>
          <span class="tag tag-b">${rec.type}</span>
        </div>
      </div>
      ${rec.petName?`<div style="margin-bottom:12px;"><strong>🐕 Питомец:</strong> ${rec.petName}</div>`:''}
      <div style="margin-bottom:12px;"><strong>📅 Дата:</strong> ${rec.date}</div>
      ${rec.doctor?`<div style="margin-bottom:12px;"><strong>👨‍⚕️ Врач:</strong> ${rec.doctor}</div>`:''}
      ${rec.notes?`<div style="margin-bottom:16px;padding:12px;background:var(--bg);border-radius:10px;"><strong>📝 Заметки:</strong><br>${rec.notes}</div>`:''}
      <button class="btn btn-g" onclick="closeModal('m-view-med')">Закрыть</button>
    </div>
  </div>`;
  
  openModal('m-view-med');
}

function deleteMedRecord(id) {
  if (!confirm('Удалить запись?')) return;
  let recs = JSON.parse(localStorage.getItem('df_med_records')||'[]');
  recs = recs.filter(r => r.id !== id);
  localStorage.setItem('df_med_records', JSON.stringify(recs));
  renderMedRecords();
  showToast('🗑️ Запись удалена', '#FF3B30');
}

// ════════════════════════════════════════════════════════════
// LESSONS
// ════════════════════════════════════════════════════════════
const LESSONS=[
  {id:'l1',cat:'Щенки',title:'Первые команды для щенка',emoji:'🐾',color:'linear-gradient(135deg,#EEF6FF,#C9E4FA)',duration:'15 мин',level:'Начинающий',
   content:'Начните с команды «Сидеть» — самой простой. Держите лакомство над носом, медленно ведите назад. Когда сядет — скажите «Сидеть» и дайте угощение. Короткие сессии 3–5 мин, 5–10 раз в день. Ключ к успеху — последовательность и позитивное подкрепление.',
   steps:['Возьмите лакомство между пальцами','Поднесите к носу щенка','Медленно ведите руку назад — щенок сядет','В момент посадки скажите «Сидеть!»','Дайте лакомство и похвалите']},
  {id:'l2',cat:'Послушание',title:'Команда «Место»: пошаговый урок',emoji:'🏠',color:'linear-gradient(135deg,#FFF5E6,#FFD9A0)',duration:'20 мин',level:'Средний',
   content:'Команда «Место» даёт собаке безопасное пространство. Начните с обозначения подстилки. Подведите, скажите «Место» и укажите рукой. Когда ляжет — щедро похвалите. Постепенно увеличивайте расстояние до 5 метров.',
   steps:['Покажите подстилку','Скажите «Место!» и жестом укажите на коврик','Когда зайдёт — похвалите и дайте угощение','Отойдите на шаг, повторите','Постепенно увеличивайте дистанцию']},
  {id:'l3',cat:'Поведение',title:'Как остановить прыжки на людей',emoji:'🚫',color:'linear-gradient(135deg,#FFF0F0,#FFCDD2)',duration:'10 мин',level:'Начинающий',
   content:'Прыжки случаются, потому что собака получает внимание. Решение: полностью игнорировать прыжок. Отворачивайтесь, скрещивайте руки, не смотрите. Когда встанет на 4 лапы — сразу приветствуйте. 4 лапы на полу = внимание.',
   steps:['При прыжке отвернитесь, скрестите руки','Не смотрите, не говорите ничего','Когда встанет — радостно поздоровайтесь','Попросите сесть перед приветствием','Повторяйте с каждым гостем']},
  {id:'l4',cat:'Здоровье',title:'Уход за зубами: пошаговое руководство',emoji:'🦷',color:'linear-gradient(135deg,#F0FFF4,#C6F6D5)',duration:'12 мин',level:'Начинающий',
   content:'Чистка зубов 3 раза в неделю критически важна. Используйте только зубную пасту для собак. Начните с прикосновений пальцем к дёснам, постепенно переходя к щётке.',
   steps:['Дайте понюхать пасту','Нанесите на палец и потрите дёсны','Введите щётку под углом 45°','Чистите круговыми движениями 2 мин','Похвалите и дайте угощение']},
  {id:'l5',cat:'Аджилити',title:'Первые барьеры: введение в аджилити',emoji:'🏃',color:'linear-gradient(135deg,#E8EAF6,#C5CAE9)',duration:'25 мин',level:'Средний',
   content:'Аджилити — отличная физическая и ментальная нагрузка. Начните с минимальной высоты. На длинном поводке подведите к барьеру, скажите «Барьер!» и пройдите вместе.',
   steps:['Установите барьер на минимум','На длинном поводке подведите к снаряду','Скажите «Барьер!» и прыгните рядом','При успехе — щедрая похвала','Повторите 5–7 раз, затем перерыв']},
  {id:'l6',cat:'Щенки',title:'Социализация: новые запахи и звуки',emoji:'👂',color:'linear-gradient(135deg,#FCE4EC,#F8BBD9)',duration:'Ежедневно',level:'Начинающий',
   content:'Период социализации щенка (3–14 недель) — самый важный. Ежедневно знакомьте с 3–5 новыми стимулами: звуки, запахи, поверхности, люди разного возраста. Делайте это позитивно — лакомства и похвала.',
   steps:['Начните с тихих звуков на расстоянии','Постепенно приближайтесь к источнику','При спокойной реакции — лакомство','Знакомьте с разными поверхностями','Приглашайте друзей угостить щенка']},
  {id:'l7',cat:'Поведение',title:'Реактивность на поводке: решение',emoji:'⚠️',color:'linear-gradient(135deg,#FFF3E0,#FFE0B2)',duration:'30 мин',level:'Продвинутый',
   content:'Найдите расстояние, при котором собака замечает раздражитель, но ещё может сохранять спокойствие. На этом расстоянии кормите лакомствами. Постепенно (неделями!) уменьшайте дистанцию.',
   steps:['Определите «безопасную дистанцию»','На ней при виде другой собаки — лакомства','Постепенно уменьшайте дистанцию','При перевозбуждении — отойдите дальше','При отсутствии прогресса — к зоопсихологу']},
  {id:'l8',cat:'Здоровье',title:'Как правильно давать таблетки',emoji:'💊',color:'linear-gradient(135deg,#E0F2F1,#B2DFDB)',duration:'5 мин',level:'Начинающий',
   content:'Прячьте таблетку в лакомство: кусочек сыра, колбасы, хлеба. Если вылизывает — давайте 3 угощения подряд: первые два без таблетки, третье — с ней.',
   steps:['Заверните в небольшой кусочек сыра','Дайте 1–2 угощения без таблетки','Быстро дайте угощение с таблеткой','Проверьте, что проглотила','Похвалите и поиграйте']},
];
let _lessonsFilter='Все';
function filterLessons(v,el){_lessonsFilter=v;document.querySelectorAll('#lessons-chips .chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');renderLessons();}
function renderLessons(){
  const list=document.getElementById('lessons-list');
  if(!list)return;
  const data=_lessonsFilter==='Все'?LESSONS:LESSONS.filter(l=>l.cat===_lessonsFilter);
  list.innerHTML=data.map(l=>`
    <div class="lesson-card" onclick="openLesson('${l.id}')">
      <div class="lesson-banner" style="background:${l.color};">${l.emoji}</div>
      <div class="lesson-body">
        <div class="lesson-title">${l.title}</div>
        <div class="lesson-meta">⏱️ ${l.duration} · 📊 ${l.level} · 🏷️ ${l.cat}</div>
      </div>
    </div>`).join('')||'<div style="padding:40px;text-align:center;color:var(--text-secondary);">Ничего не найдено</div>';
}
function openLesson(id){
  const l=LESSONS.find(x=>x.id===id);if(!l)return;
  document.getElementById('m-lesson-body').innerHTML=`
    <div style="text-align:center;background:${l.color};border-radius:14px;padding:20px;margin-bottom:16px;">
      <div style="font-size:52px;margin-bottom:8px;">${l.emoji}</div>
      <div style="font-size:17px;font-weight:800;">${l.title}</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">⏱️ ${l.duration} · ${l.level}</div>
    </div>
    <div style="font-size:14px;line-height:1.7;color:var(--text-secondary);margin-bottom:16px;">${l.content}</div>
    <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:8px;">
      <div style="font-size:14px;font-weight:800;margin-bottom:10px;">📋 Шаги выполнения:</div>
      ${l.steps.map((s,i)=>`<div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start;"><div style="width:24px;height:24px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:white;flex-shrink:0;">${i+1}</div><div style="font-size:13px;line-height:1.5;padding-top:3px;">${s}</div></div>`).join('')}
    </div>`;
  openModal('m-lesson');
}

// ════════════════════════════════════════════════════════════
// NOTIF SETTINGS
// ════════════════════════════════════════════════════════════
function saveNotif(key,val){
  let s=JSON.parse(localStorage.getItem('df_notif')||'{}');
  s[key]=val;localStorage.setItem('df_notif',JSON.stringify(s));
  showToast(val?'🔔 Включено':'🔕 Отключено');
}

// ════════════════════════════════════════════════════════════
// PATCH nav() TO RENDER DATA ON SCREEN OPEN
// ════════════════════════════════════════════════════════════
(function(){
  const _orig=window.nav;
  window.nav=function(id){
    _orig(id);
    if(id==='dogmap')    renderPlaces();
    if(id==='discounts') renderDiscounts();
    if(id==='lessons')   renderLessons();
    if(id==='myPets')    renderPets();
    if(id==='medRecords')renderMedRecords();
  };
})();

// Initial render on DOMContentLoaded (after main listener)
window.addEventListener('load',()=>{
  setTimeout(()=>{
    renderPlaces();renderDiscounts();renderLessons();renderPets();renderMedRecords();
  },200);
});

