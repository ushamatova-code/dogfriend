// ============================================================
// GLOBALS.JS — Navigation, modals, tabs, avatar, profile, levels
// + all shared global variables
// Must be loaded FIRST before all other scripts
// ============================================================

// ============================================================
// SHARED VARIABLES (declared here so all modules can access)
// ============================================================
var _petsCache = [];
var _petSex = 'м';
var _medType = 'Приём';

// ============================================================
// NAVIGATION
// ============================================================
const histStack = [];

// ============================================================
// ADMIN / OWNER ACCOUNT
// ============================================================
// ВАЖНО: Замените на свой user_id из таблицы auth.users
const OWNER_USER_ID = 'de1e5bb9-1904-4d78-8be4-7543151cf1fe'; // Ваш UUID из Supabase

// Приветственные сообщения для новых пользователей
const WELCOME_MESSAGES = [
  {
    text: `Привет! 👋 

Я Егор, создатель Dogly. Спасибо, что присоединились к нашему сообществу владельцев собак!

Рад видеть вас здесь 🐕`,
    delay: 1000 // 1 секунда после регистрации
  },
  {
    text: `Несколько советов для начала:

📍 Укажите ваш район в профиле — так вы увидите места и услуги рядом с вами

🐕 Добавьте своего питомца — это поможет кинологам и ветеринарам подобрать подходящие услуги

💬 Загляните в чаты по районам — там много полезной информации и дружелюбных собачников

Если будут вопросы — пишите мне прямо сюда, отвечу как можно быстрее!`,
    delay: 4000 // 4 секунды после первого
  }
];

// Отправить приветственные сообщения новому пользователю
async function sendWelcomeMessages(newUserId) {
  if (!supabaseClient || !newUserId || newUserId === OWNER_USER_ID) return;
  
  try {
    console.log('🎉 Sending welcome messages to new user:', newUserId);
    
    // Формируем room_id (всегда сортированные ID через underscore)
    const roomId = [OWNER_USER_ID, newUserId].sort().join('_');
    
    // Отправляем сообщения с задержками
    for (const msg of WELCOME_MESSAGES) {
      await new Promise(resolve => setTimeout(resolve, msg.delay));
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      const { error } = await supabaseClient
        .from('direct_messages')
        .insert({
          room_id: roomId,
          sender_id: OWNER_USER_ID,
          recipient_id: newUserId,
          text: msg.text,
          sender_name: 'Егор',
          time: timeStr,
          is_read: false,
          created_at: now.toISOString()
        });
      
      if (error) {
        console.error('❌ Welcome message error:', error);
      } else {
        console.log('✅ Welcome message sent to', newUserId);
      }
    }
    
  } catch(e) {
    console.error('❌ Send welcome messages error:', e);
  }
}

function nav(id) {
  const curr = document.querySelector('.screen.active');
  const next = document.getElementById(id);
  if (!next) return;
  if (curr === next) return;
  
  // Сбрасываем currentPrivateChatId когда уходим с экрана личного чата
  if (curr && curr.id === 'privateChat' && id !== 'privateChat') {
    console.log(' Closing private chat, resetting currentPrivateChatId');
    currentPrivateChatId = null;
  }
  
  // Загружаем бизнесы при открытии экранов
  if (id === 'catalog') {
    renderCatalogTrainers();
  } else if (id === 'health') {
    renderHealthClinics();
  } else if (id === 'dogmap') {
    if (typeof renderPlaces === 'function') renderPlaces();
  }
  
  if (curr) {
    histStack.push(curr.id);
    curr.classList.remove('active');
    curr.style.display = 'none';
  }
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
    console.log(' Going back from private chat, resetting currentPrivateChatId');
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
  if (!file.type.startsWith('image/')) { showToast('Выберите изображение', '#FF3B30'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('Макс. размер 5 МБ', '#FF3B30'); return; }

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
        .upsert({ id: currentUser.id, user_id: currentUser.id, avatar_url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (updateError) console.error('Avatar URL save error:', updateError);

      // Обновляем UI и кэш
      applyAvatar(publicUrl);
      localStorage.setItem('df_avatar', publicUrl);
      if (currentUserProfile) currentUserProfile.avatar_url = publicUrl;
      showToast('Аватарка обновлена!', '#34C759');
    } catch(e) {
      console.error('Avatar upload error:', e);
      showToast('Ошибка загрузки', '#FF3B30');
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
  const img = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='?'">`;
  ['prof-avatar','home-avatar','ep-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.innerHTML = img; el.style.padding = '0'; }
  });
}

// Получить URL аватарки другого пользователя (с кэшем)
const _avatarCache = {};
async function getUserAvatarUrl(userId) {
  if (_avatarCache[userId] !== undefined) return _avatarCache[userId] || null;
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('avatar_url, name')
      .eq('user_id', userId)
      .single();
    if (error || !data || !data.avatar_url) { _avatarCache[userId] = ''; return null; }
    _avatarCache[userId] = data.avatar_url;
    return data.avatar_url;
  } catch(e) { _avatarCache[userId] = ''; return null; }
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
  if (!name) return '?';
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
  
  const name = p.name || 'Гость';
  const firstName = name.split(' ')[0];
  const initials = p.name ? getInitials(p.name) : '?';
  const homeGreeting = document.getElementById('home-greeting');
  const homeNameSub = document.getElementById('home-name-sub');
  const homeAvatar = document.getElementById('home-avatar');
  if (homeGreeting) homeGreeting.textContent = 'Привет, ' + firstName + '!';
  if (homeNameSub) {
    const petName = (_petsCache && _petsCache.length) ? _petsCache[0].name : (p.dogname || '');
    homeNameSub.textContent = petName ? 'Что нового у ' + petName + '?' : 'Что нового у вашего питомца?';
  }
  // Аватарка: если есть URL — показываем фото, если нет — инициалы
  if (avatarUrl) {
    applyAvatar(avatarUrl);
  } else {
    if (homeAvatar) homeAvatar.textContent = initials;
    const profAvatar = document.getElementById('prof-avatar');
    if (profAvatar) profAvatar.textContent = initials;
  }
  const profName = document.getElementById('prof-name');
  if (profName) profName.textContent = name;
  
  // Обновляем гео на главном экране
  const geoDisplay = document.getElementById('home-geo-display');
  if (geoDisplay) {
    const geo = p.district || '';
    if (geo) {
      geoDisplay.textContent = geo;
      if (!userLocationName) userLocationName = geo;
    } else if (userLocationName) {
      geoDisplay.textContent = userLocationName;
    } else {
      geoDisplay.textContent = 'Укажите район →';
    }
  }
  
  // Обновляем статистику профиля из реальных данных
  loadProfileStats();
}

async function loadProfileStats() {
  let petsCount = 0;
  let ordersCount = 0;
  let charityAmount = 0;
  
  if (supabaseClient && currentUser) {
    try {
      const { data: pets } = await supabaseClient
        .from('pets')
        .select('id')
        .eq('user_id', currentUser.id);
      petsCount = (pets || []).length;
      
      const { data: bookings } = await supabaseClient
        .from('bookings')
        .select('id')
        .eq('user_id', currentUser.id);
      ordersCount = (bookings || []).length;
      charityAmount = ordersCount * 150;
    } catch(e) {
      console.warn('Profile stats error:', e);
    }
  }
  
  const petsStat = document.getElementById('prof-stat-pets');
  if (petsStat) petsStat.textContent = petsCount;
  
  const ordersStat = document.getElementById('prof-stat-orders');
  if (ordersStat) ordersStat.textContent = ordersCount;

  // Обновляем бейдж "Мои заказы" — показываем только если есть заказы
  const ordersBadge = document.getElementById('orders-badge');
  if (ordersBadge) {
    if (ordersCount > 0) {
      ordersBadge.textContent = ordersCount;
      ordersBadge.style.display = 'flex';
    } else {
      ordersBadge.style.display = 'none';
    }
  }
  
  const charityStat = document.getElementById('prof-stat-charity');
  if (charityStat) charityStat.textContent = charityAmount.toLocaleString('ru-RU') + ' ₽';
  
  // Обновляем плашку на главной
  const homeCharity = document.getElementById('home-charity-amount');
  if (homeCharity) homeCharity.textContent = charityAmount.toLocaleString('ru-RU') + ' ₽ собрано';
  
  const homeCharityBar = document.getElementById('home-charity-bar');
  if (homeCharityBar) {
    const pct = Math.min(100, (charityAmount / 2000) * 100);
    homeCharityBar.style.width = pct + '%';
  }
  
  // Обновляем уровень
  const level = getUserLevel(ordersCount);
  const levelBadge = document.getElementById('prof-level-badge');
  if (levelBadge) levelBadge.textContent = level.name;
  
  // Рендерим модалку уровня
  renderLevelModal(ordersCount, charityAmount, level);
}

// ═══ СИСТЕМА УРОВНЕЙ ═══
const LEVELS = [
  { min: 0,  name: 'Новичок',       icon: '🌱', color: '#8E8E93', next: 1 },
  { min: 1,  name: 'Друг собак',    icon: '🐕', color: '#4A90D9', next: 4 },
  { min: 4,  name: 'Защитник',      icon: '🛡️', color: '#F5A623', next: 10 },
  { min: 10, name: 'Чемпион',       icon: '🏆', color: '#FF6B35', next: 25 },
  { min: 25, name: 'Герой приютов', icon: '⭐', color: '#E91E63', next: null },
];

function getUserLevel(orders) {
  let lvl = LEVELS[0];
  for (const l of LEVELS) {
    if (orders >= l.min) lvl = l;
  }
  return lvl;
}

function renderLevelModal(orders, charity, level) {
  const body = document.getElementById('m-level-body');
  if (!body) return;
  
  const lvlIndex = LEVELS.indexOf(level);
  const nextLevel = lvlIndex < LEVELS.length - 1 ? LEVELS[lvlIndex + 1] : null;
  const progress = nextLevel ? Math.min(100, ((orders - level.min) / (nextLevel.min - level.min)) * 100) : 100;
  const remaining = nextLevel ? nextLevel.min - orders : 0;
  
  body.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:56px;margin-bottom:8px;">${level.icon}</div>
      <div style="font-size:22px;font-weight:900;font-family:'Nunito',sans-serif;color:${level.color};">${level.name}</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">${orders} заказов · ${charity.toLocaleString('ru-RU')} ₽ в приюты</div>
    </div>
    
    ${nextLevel ? `
    <div style="background:var(--bg);border-radius:16px;padding:16px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:13px;font-weight:700;">${level.name}</span>
        <span style="font-size:13px;font-weight:700;color:${nextLevel.color};">${nextLevel.name} ${nextLevel.icon}</span>
      </div>
      <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;margin-bottom:6px;">
        <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,${level.color},${nextLevel.color});border-radius:4px;transition:width 0.5s;"></div>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);text-align:center;">Ещё ${remaining} заказ${remaining===1?'':remaining<5?'а':'ов'} до уровня «${nextLevel.name}»</div>
    </div>` : `
    <div style="background:linear-gradient(135deg,${level.color}15,${level.color}08);border-radius:16px;padding:16px;margin-bottom:16px;text-align:center;">
      <div style="font-size:15px;font-weight:700;color:${level.color};">Максимальный уровень!</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">Вы настоящий герой</div>
    </div>`}
    
    <div style="font-size:15px;font-weight:800;margin-bottom:12px;">Все уровни</div>
    ${LEVELS.map((l, i) => {
      const isCurrent = l === level;
      const isLocked = l.min > orders;
      return `<div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;margin-bottom:6px;${isCurrent ? 'background:'+l.color+'10;border:1.5px solid '+l.color+'30;' : isLocked ? 'opacity:0.4;' : 'background:var(--bg);'}">
        <div style="font-size:28px;width:40px;text-align:center;">${l.icon}</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;${isCurrent ? 'color:'+l.color : ''}">${l.name}</div>
          <div style="font-size:12px;color:var(--text-secondary);">${l.min === 0 ? 'Начальный уровень' : 'От '+l.min+' заказов · '+(l.min*150)+' ₽ приютам'}</div>
        </div>
        ${isCurrent ? '<span style="font-size:12px;font-weight:700;color:'+l.color+';">Вы тут</span>' : isLocked ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="'+l.color+'" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'}
      </div>`;
    }).join('')}
    
    <div style="background:var(--bg);border-radius:14px;padding:14px;margin-top:12px;">
      <div style="font-size:13px;font-weight:700;margin-bottom:6px;">Как это работает?</div>
      <div style="font-size:12px;color:var(--text-secondary);line-height:1.6;">С каждого заказа 150 ₽ направляется в приюты для животных. Чем больше заказов — тем выше ваш уровень и вклад в помощь.</div>
    </div>
  `;
}

function loadProfileForm() {
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  document.getElementById('ep-name').value = p.name || '';
  document.getElementById('ep-district').value = p.district || '';
  const av = document.getElementById('ep-avatar');
  if (av) av.textContent = p.name ? getInitials(p.name) : '?';
}

async function saveProfile() {
  const p = {
    name: document.getElementById('ep-name').value.trim(),
    district: document.getElementById('ep-district').value.trim(),
  };
  
  // Сохраняем локально
  localStorage.setItem('df_profile', JSON.stringify(p));
  localStorage.setItem('df_user_geo', p.district);
  
  // Сохраняем в Supabase
  if (supabaseClient && currentUser) {
    try {
      const { error } = await supabaseClient
        .from('profiles')
        .upsert({
          id: currentUser.id,
          user_id: currentUser.id,
          name: p.name,
          district: p.district,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
      
      if (error) {
        console.error('Failed to save profile to Supabase:', error);
      } else {
        console.log('Profile saved to Supabase');
      }
    } catch(e) {
      console.error('Error saving profile:', e);
    }
  }
  
  loadProfile();
  back();
  
  // Обновляем геолокацию по новому району
  if (p.district) {
    localStorage.removeItem('df_user_location'); // сброс кэша
    getUserLocation(); // переопределит по новому району
  }
  
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
  
  // Обновляем счётчик непрочитанных — с задержкой чтобы не конкурировать с checkAuth
  setTimeout(() => {
    if (currentUser && supabaseClient) {
      updateUnreadCount();
    }
  }, 5000);
});

// ============================================================
// DATA — SPECIALISTS (кинологи)
// ============================================================
const SPECIALISTS = [];

// ============================================================
// DATA — HEALTH (ветеринары + клиники)
// ============================================================
const HEALTH_DATA = [];

let catalogFilter = 'Все';
let healthFilter = 'Все';
let currentSpecId = null;
let currentPrivateChatId = null;  // ID специалиста для приватного чата
let privateChats = {};  // {specialistId: [{text, sender, time}, ...]}

// Сохраняем в localStorage только личные чаты, event-чаты туда не пишем никогда
let _saveChatTimer = null;
function savePrivateChatsToStorage() {
  // Debounce — не сохраняем чаще чем раз в 500ms
  if (_saveChatTimer) clearTimeout(_saveChatTimer);
  _saveChatTimer = setTimeout(() => {
    const toSave = {};
    Object.keys(privateChats).forEach(k => {
      if (!k.startsWith('event_')) toSave[k] = privateChats[k];
    });
    try { localStorage.setItem('private_chats', JSON.stringify(toSave)); } catch(e) {}
  }, 500);
}
let unreadCount = parseInt(localStorage.getItem('unread_count') || '0');
let unreadChats = JSON.parse(localStorage.getItem('unread_chats') || '{}');

// ============================================================
// SHARED GLOBAL VARIABLES (moved from chat/supabase sections)
// ============================================================
let contactBook = {}; // { userId: {name, initials, grad} }
let _lastClickedUser = null;
let _renderChatsTimer = null;

// Supabase
const SUPABASE_URL = 'https://nxrztljcxphkdfbfubba.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cnp0bGpjeHBoa2RmYmZ1YmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDkzNzQsImV4cCI6MjA4ODYyNTM3NH0.nCunfVYOwBKAMbbuDu4zTQ0tZhjNoWk680VFSWPwuUk';
let supabaseClient = null;
let currentUser = null;
let currentUserProfile = null;

// Auth state
let _isPasswordRecovery = (function() {
  try {
    const hash = window.location.hash;
    if (!hash) return false;
    const p = new URLSearchParams(hash.replace(/^#/, ''));
    if (p.get('type') === 'recovery' && p.get('access_token')) {
      console.log('🔑 Recovery detected in URL');
      return true;
    }
  } catch(e) {}
  return false;
})();
let _authStateResolved = false;
let _authStateResolve = null;
const _authStatePromise = new Promise(r => { _authStateResolve = r; });

// Push
const VAPID_PUBLIC_KEY = 'BNKlgs_70LJigJbbEx14m_j38oCZAmkXzxDr6-w8ra_Pc612uMVS1R9vprRQ6aSwyZRCSULW_lmX2N52Ic7WBzo';
let swRegistration = null;
let pushSubscription = null;

// Chat state
let supabasePublicChannel = null;
let supabasePrivateChannels = {};
let chatNick    = '';
let typingTimer = null;
let typingUsers = new Set();
let chatInited  = false;
let userId = localStorage.getItem('df_user_id');
if (!userId) {
  userId = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('df_user_id', userId);
}
const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
let currentChatType = 'global';
let supabaseDistrictChannel = null;
let realtimeDMChannel = null;
let realtimeReactionsChannel = null;
let _pollInterval = null;
let _lastPollTime = new Date().toISOString();
let incomingMsgPollInterval = null;
let lastCheckedTime = Date.now();
let processedMessageIds = new Set();
let _authRetries = 0;
let _districtRetries = 0;

// Geo
let userLat = null;
let userLng = null;
let userLocationName = '';

// Places
let _placesFilter = 'Все';
let _currentPlace = null;
let _loadedPlaces = [];
let _placesMap = null;
let _placesMapMarkers = [];

// Clinic booking
let _currentBookingItem = null;

// Discounts
let _discFilter = 'Все';

// ════════════════════════════════════════════════════════════
// TOAST — должен быть в globals.js чтобы все файлы могли использовать
// ════════════════════════════════════════════════════════════
function showToast(msg, bg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:'+(bg||'#1A1A1A')+';color:white;padding:10px 20px;border-radius:20px;font-size:14px;font-weight:700;z-index:99999;white-space:nowrap;max-width:90vw;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.25);';
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300);},2500);
}

// ============================================================
// VISIT TRACKING
// ============================================================
async function trackVisit() {
  if (!supabaseClient) return;
  const uid = currentUser?.id || userId;
  if (!uid) return;

  // Не записываем чаще чем раз в 5 минут (чтобы не спамить при перезагрузках)
  const lastVisit = localStorage.getItem('df_last_visit');
  const now = Date.now();
  if (lastVisit && now - parseInt(lastVisit) < 5 * 60 * 1000) return;
  localStorage.setItem('df_last_visit', now.toString());

  try {
    await supabaseClient.from('visits').insert({
      user_id: uid,
      visited_at: new Date().toISOString(),
      user_agent: navigator.userAgent || ''
    });
  } catch(e) {
    // Таблица может не существовать — молча игнорируем
    console.log('Visit track:', e.message || '');
  }
}
