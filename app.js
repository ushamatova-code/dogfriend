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
  const firstName = name.split(' ')[0];
  const initials = p.name ? getInitials(p.name) : '👤';
  const homeGreeting = document.getElementById('home-greeting');
  const homeNameSub = document.getElementById('home-name-sub');
  const homeAvatar = document.getElementById('home-avatar');
  if (homeGreeting) homeGreeting.textContent = 'Привет, ' + firstName + '! 👋';
  if (homeNameSub) {
    // Берём кличку первого питомца из кэша если есть
    const petName = (_petsCache && _petsCache.length) ? _petsCache[0].name : (p.dogname || '');
    homeNameSub.textContent = petName ? 'Что нового у ' + petName + '?' : 'Что нового у вашего питомца?';
  }
  if (homeAvatar) homeAvatar.textContent = initials;
  const profName = document.getElementById('prof-name');
  const profAvatar = document.getElementById('prof-avatar');
  if (profName) profName.textContent = name;
  if (profAvatar) profAvatar.textContent = initials;
  
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
}

function loadProfileForm() {
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  document.getElementById('ep-name').value = p.name || '';
  document.getElementById('ep-district').value = p.district || '';
  const av = document.getElementById('ep-avatar');
  if (av) av.textContent = p.name ? getInitials(p.name) : '👤';
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
  const msgData = _lastClickedUser || {};
  const theirUserId = msgData.senderId || nick;
  const theirName = msgData.senderName || nick;
  const colors = ['#4A90D9','#E91E63','#9C27B0','#00BCD4','#FF5722','#4CAF50'];
  const color = colors[(nick||'A').charCodeAt(0) % colors.length];
  const initials = (nick||'??').slice(0,2).toUpperCase();

  // Если есть Supabase userId — загружаем полный профиль
  if (theirUserId && theirUserId.length > 10 && supabaseClient) {
    // Временно показываем базовую модалку
    let modal = document.getElementById('m-user-profile');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'm-user-profile';
      modal.className = 'modal-ov';
      modal.onclick = function(e) { if (e.target === this) closeModal('m-user-profile'); };
      modal.innerHTML = '<div class="modal" onclick="event.stopPropagation()" style="max-height:85%;overflow-y:auto;"><div class="mhandle"></div><div id="m-user-profile-body"></div><button class="btn btn-g" onclick="closeModal(\'m-user-profile\')">Закрыть</button></div>';
      document.body.appendChild(modal);
    }
    // Используем полную загрузку профиля
    const savedChat = currentPrivateChatId;
    currentPrivateChatId = theirUserId;
    openChatUserProfile();
    currentPrivateChatId = savedChat;
    return;
  }

  // Fallback — простая модалка без Supabase
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
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">Участник сообщества</div>
      <button class="btn btn-p" style="margin-bottom:10px;" onclick="openChatWithUser('${escHtml(theirUserId)}','${escHtml(theirName)}','${initials}','linear-gradient(135deg,${color},${color}99)');closeModal('m-user-profile')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" style="margin-right:8px;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        Написать
      </button>
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
    showToast('Заполните все поля');
    return;
  }
  
  try {
    if (!supabaseClient) throw new Error('Нет подключения к серверу');
    
    showToast('Входим...', 'var(--primary)');
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (error) {
      const msg = error.message || '';
      if (msg.includes('Email not confirmed')) {
        showToast('Подтвердите email — проверьте почту');
        return;
      }
      if (msg.includes('Invalid login')) {
        showToast('Неверный email или пароль');
        return;
      }
      throw error;
    }
    
    if (data && data.user) {
      currentUser = data.user;
      localStorage.setItem('df_registered', '1');
      localStorage.setItem('df_email', email);
      try { loadUserProfile(); } catch(e) {}
      
      // Запускаем Realtime подписку
      stopRealtimeDMSubscription();
      startRealtimeDMSubscription();
      Object.keys(privateChats).forEach(chatId => {
        if (!chatId.startsWith('event_')) subscribeToPrivateChat(chatId);
      });
      
      checkUserBusiness();
      nav('home');
    }
  } catch (err) {
    console.error('Login error:', err);
    showToast('Ошибка: ' + (err.message || 'Попробуйте позже'));
  }
}

// Регистрация через Supabase
async function supabaseRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  
  if (!name) { showToast('Введите имя'); return; }
  if (!email) { showToast('Введите email'); return; }
  if (!password || password.length < 6) { showToast('Пароль минимум 6 символов'); return; }
  
  // Простая проверка email
  if (!email.includes('@') || !email.includes('.')) {
    showToast('Введите корректный email');
    return;
  }
  
  try {
    if (!supabaseClient) throw new Error('Нет подключения');
    
    showToast('Регистрация...', 'var(--primary)');
    
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { name: name }
      }
    });
    
    if (error) throw error;
    
    // Сохраняем имя локально
    const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
    p.name = name;
    localStorage.setItem('df_profile', JSON.stringify(p));
    localStorage.setItem('df_email', email);
    
    // Проверяем — если email confirmation включён, user будет не подтверждён
    if (data && data.user && !data.user.confirmed_at && !data.session) {
      // Email не подтверждён — показываем экран подтверждения
      nav('emailConfirm');
      document.getElementById('confirm-email-display').textContent = email;
    } else {
      // Email подтверждён сразу (или confirmation выключен)
      localStorage.setItem('df_registered', '1');
      nav('home');
    }
  } catch(err) {
    console.error('Register error:', err);
    const msg = err.message || '';
    if (msg.includes('already registered')) {
      showToast('Этот email уже зарегистрирован');
    } else if (msg.includes('valid email')) {
      showToast('Некорректный email');
    } else {
      showToast('Ошибка: ' + msg);
    }
  }
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
      };
      localStorage.setItem('df_profile', JSON.stringify(profileData));
      
      // Аватарка из Supabase Storage
      if (data.avatar_url) {
        localStorage.setItem('df_avatar', data.avatar_url);
      }
      
      // Обновляем UI
      loadProfile();
    } else {
      // Новый пользователь — создаём профиль в Supabase из localStorage / метаданных регистрации
      console.log('ℹ️ No profile in Supabase, creating...');
      const localProfile = JSON.parse(localStorage.getItem('df_profile') || '{}');
      const regName = currentUser.user_metadata?.name || localProfile.name || '';
      
      if (regName) {
        try {
          await supabaseClient.from('profiles').upsert({
            id: currentUser.id,
            user_id: currentUser.id,
            name: regName,
            district: localProfile.district || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
          console.log('✅ Profile created in Supabase with name:', regName);
          
          // Обновляем localStorage
          localProfile.name = regName;
          localStorage.setItem('df_profile', JSON.stringify(localProfile));
        } catch(e) {
          console.error('Create profile error:', e);
        }
      }
      loadProfile();
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

// Текущий тип открытого чата: 'global' или 'district'
let currentChatType = 'global';
let supabaseDistrictChannel = null;

function getDistrictRoomId() {
  const district = userLocationName || localStorage.getItem('df_user_geo') || '';
  if (!district) return 'district_general';
  return 'district_' + district.toLowerCase().replace(/\s+/g, '_').replace(/[^a-zа-я0-9_]/gi, '');
}

// Обновляем название района в списке чатов
function updateDistrictChatLabel() {
  const district = userLocationName || localStorage.getItem('df_user_geo') || '';
  const nameEl = document.getElementById('community-district-name');
  const subEl  = document.getElementById('community-district-sub');
  if (nameEl) nameEl.textContent = district ? '📍 ' + district : '📍 Мой район';
  if (subEl)  subEl.textContent  = district ? 'Владельцы района ' + district : 'Укажите район в профиле';
}

// Открыть общий чат (все пользователи)
function openGlobalChat() {
  currentChatType = 'global';
  chatNick = getChatNick();
  document.getElementById('chat-conv-name').textContent = '🌍 Общий чат Dogly';
  document.getElementById('chat-conv-av').style.background = 'linear-gradient(135deg,#4A90D9,#7B5EA7)';
  document.getElementById('chat-conv-av').textContent = '🌍';
  document.getElementById('chat-conv-subtitle').innerHTML = '<span style="color:#aaa">● подключение...</span>';
  const wrap = document.getElementById('chat-messages');
  if (wrap) wrap.innerHTML = '';
  loadPublicChatHistory('public_chat');
  nav('chatConv');
  requestNotificationPermission();
  if (!chatInited) initSupabaseChat();
  else if (!supabasePublicChannel) connectSupabaseRealtime();
  else scrollChatBottom();
}

// Открыть чат района
function openDistrictChat() {
  const district = userLocationName || localStorage.getItem('df_user_geo') || '';
  if (!district) {
    showToast('Укажите район в профиле → Редактировать', '#F5A623');
    return;
  }
  currentChatType = 'district';
  chatNick = getChatNick();
  document.getElementById('chat-conv-name').textContent = '📍 ' + district;
  document.getElementById('chat-conv-av').style.background = 'linear-gradient(135deg,#F5A623,#F07B3F)';
  document.getElementById('chat-conv-av').textContent = '📍';
  document.getElementById('chat-conv-subtitle').innerHTML = '<span style="color:#aaa">● подключение...</span>';
  const wrap = document.getElementById('chat-messages');
  if (wrap) wrap.innerHTML = '';
  loadPublicChatHistory(getDistrictRoomId());
  nav('chatConv');
  requestNotificationPermission();
  connectDistrictRealtime(district);
}

// Подключение к каналу района
function connectDistrictRealtime(district) {
  if (!supabaseClient) { setTimeout(() => connectDistrictRealtime(district), 500); return; }
  
  // Отписываемся от предыдущего районного канала
  if (supabaseDistrictChannel) {
    supabaseDistrictChannel.unsubscribe();
    supabaseDistrictChannel = null;
  }

  const channelName = 'dogfriend-district-' + district.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zа-я0-9-]/gi, '');
  
  const connectionTimeout = setTimeout(() => {
    setChatStatus('error');
    setTimeout(() => connectDistrictRealtime(district), 3000);
  }, 10000);

  supabaseDistrictChannel = supabaseClient.channel(channelName, {
    config: { broadcast: { self: false, ack: false } }
  });

  supabaseDistrictChannel
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
      clearTimeout(connectionTimeout);
      if (status === 'SUBSCRIBED') {
        setChatStatus('online');
        scrollChatBottom();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setChatStatus('error');
        setTimeout(() => connectDistrictRealtime(district), 3000);
      }
    });
}

// Обратная совместимость
function openPublicChat() { openGlobalChat(); }

function initSupabaseChat() {
  chatInited = true;
  if (!supabaseClient) { setTimeout(initSupabaseChat, 500); return; }
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
  const activeChannel = currentChatType === 'district' ? supabaseDistrictChannel : supabasePublicChannel;
  if (!text || !activeChannel) return;
  const now  = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  appendMessage(chatNick, text, time, true, currentUser?.id || userId);
  input.value = '';
  chatInputResize(input);
  
  activeChannel.send({
    type: 'broadcast', event: 'message',
    payload: { nick: chatNick, text, time, senderId: currentUser?.id || userId }
  });
  
  clearTimeout(typingTimer);
  activeChannel.send({
    type: 'broadcast', event: 'typing',
    payload: { nick: chatNick, isTyping: false }
  });

  // Сохраняем в БД для истории
  if (supabaseClient) {
    const myUserId = currentUser?.id || userId;
    const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
    const roomId = currentChatType === 'district' ? getDistrictRoomId() : 'public_chat';
    supabaseClient.from('direct_messages').insert({
      room_id: roomId,
      sender_id: myUserId,
      sender_name: p.name || chatNick,
      text: text,
      time: time
    }).then(({ error }) => {
      if (error) console.error('❌ Failed to save public msg:', error);
    });
  }
}

// Загрузка истории чата из БД (общий или районный)
async function loadPublicChatHistory(roomId = 'public_chat') {
  if (!supabaseClient) return;
  try {
    const { data } = await supabaseClient
      .from('direct_messages')
      .select('*')
      .eq('room_id', roomId)
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
  if (supabaseClient && currentUser) {
    supabaseClient.from('med_records').insert({
      user_id: currentUser.id,
      type: 'Приём',
      pet_name: p.dogname || '',
      title: 'Запись: ' + name,
      date: now.toISOString().split('T')[0],
      doctor: name,
      notes: 'Создано через Dogly'
    }).then(({ error }) => { if (error) console.error('Auto med record error:', error); });
  } else {
    let recs = JSON.parse(localStorage.getItem('df_med_records') || '[]');
    recs.unshift({ id: Date.now()+1, type:'Приём', petName: p.dogname||'', title:'Запись: '+name, date: now.toISOString().split('T')[0], doctor: name, notes: 'Создано через Dogly' });
    localStorage.setItem('df_med_records', JSON.stringify(recs));
  }

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
// GEOLOCATION — определение позиции пользователя
// Приоритет: 1) район из профиля  2) GPS  3) попросить указать
// ════════════════════════════════════════════════════════════
let userLat = null;
let userLng = null;
let userLocationName = '';

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

const PLACE_TYPE_MAP = { clinic: 'Клиника', cafe: 'Кафе' };
const PLACE_ICON_MAP = { clinic: '🏥', cafe: '☕' };
const PLACE_GRAD_MAP = {
  clinic: 'linear-gradient(135deg,#4CAF50,#009688)',
  cafe: 'linear-gradient(135deg,#FF9800,#FFD54F)'
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

  // Дожидаемся геолокации если ещё нет
  if (!userLat) await getUserLocation();

  try {
    // Загружаем только кафе и клиники (НЕ кинологов — они в каталоге)
    const { data, error } = await supabaseClient
      .from('businesses')
      .select('*')
      .eq('is_approved', true)
      .in('type', ['cafe', 'clinic'])
      .order('rating', { ascending: false });
    if (error) throw error;

    let businesses = data || [];

    // Фильтр по типу через чипсы
    if (_placesFilter !== 'Все') {
      const typeMap = { 'Кафе': 'cafe', 'Клиника': 'clinic' };
      const t = typeMap[_placesFilter];
      if (t) businesses = businesses.filter(b => b.type === t);
    }

    // Считаем расстояние и сортируем
    businesses = businesses.map(b => ({
      ...b,
      _dist: calcDistance(userLat, userLng, b.location_lat, b.location_lng)
    })).sort((a, b) => a._dist - b._dist);

    _loadedPlaces = businesses;

    // Обновляем карту-плашку
    const mapBlock = document.getElementById('dogmap-map-block');
    if (mapBlock) {
      const count = businesses.length;
      mapBlock.innerHTML = `
        <div style="font-size:32px;">📍</div>
        <div style="font-size:14px;font-weight:800;color:#2e7d32;">${count} ${count === 0 ? 'мест' : count === 1 ? 'место' : count < 5 ? 'места' : 'мест'} рядом с вами</div>
        <div style="font-size:12px;color:#388e3c;">${userLocationName || 'Определяем...'}</div>
      `;
    }

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

function openPlaceModal(id) {
  _currentPlace = _loadedPlaces.find(x => x.id === id);
  if (!_currentPlace) {
    // Попробуем открыть как бизнес-профиль
    if (typeof openBusinessProfile === 'function') openBusinessProfile(id);
    return;
  }
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
      ${b.phone ? `<div style="font-size:14px;">📞 <a href="tel:${b.phone}" style="color:var(--primary);text-decoration:none;font-weight:700;">${b.phone}</a></div>` : ''}
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
      <div style="font-size:32px;">🎁</div>
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
    .then(()=>showToast('✅ Промокод ' + _currentDisc.promo_code + ' скопирован!','#7ED321'))
    .catch(()=>showToast('Промокод: ' + _currentDisc.promo_code));
}

// ════════════════════════════════════════════════════════════
// PETS — Supabase (таблица pets + Storage для фото)
// ════════════════════════════════════════════════════════════
let _petSex = 'м';
let _petsCache = [];

function selectPetSex(s) {
  _petSex = s;
  document.getElementById('pet-sex-m').classList.toggle('on', s==='м');
  document.getElementById('pet-sex-f').classList.toggle('on', s==='ж');
}

async function savePet() {
  if (!currentUser) { showToast('Войдите в аккаунт'); return; }
  const name = document.getElementById('new-pet-name').value.trim();
  const breed = document.getElementById('new-pet-breed').value.trim();
  if (!name) { showToast('Введите кличку'); return; }

  showToast('Сохраняем...', 'var(--primary)');

  try {
    // 1. Создаём запись в Supabase
    const { data: pet, error } = await supabaseClient.from('pets').insert({
      user_id: currentUser.id,
      name: name,
      breed: breed,
      age: document.getElementById('new-pet-age').value.trim(),
      weight: document.getElementById('new-pet-weight').value.trim(),
      sex: _petSex,
      dob: document.getElementById('new-pet-dob').value || null,
      notes: document.getElementById('new-pet-notes').value.trim()
    }).select().single();
    if (error) throw error;

    // 2. Загружаем фото если есть
    if (_newPetPhotoData && pet) {
      await uploadPetPhoto(pet.id, _newPetPhotoData);
    }

    closeModal('m-add-pet');
    _newPetPhotoData = null;
    const preview = document.getElementById('new-pet-photo-preview');
    if (preview) {
      preview.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
      preview.style.border = '2px dashed var(--border)';
    }
    // Очищаем поля
    document.getElementById('new-pet-name').value = '';
    document.getElementById('new-pet-breed').value = '';
    document.getElementById('new-pet-age').value = '';
    document.getElementById('new-pet-weight').value = '';
    document.getElementById('new-pet-dob').value = '';
    document.getElementById('new-pet-notes').value = '';

    renderPets();
    showToast(name + ' добавлен!', '#34C759');
  } catch(e) {
    console.error('Save pet error:', e);
    showToast('Ошибка сохранения');
  }
}

async function uploadPetPhoto(petId, base64Data) {
  if (!supabaseClient || !petId) return;
  try {
    // Конвертируем base64 в blob
    const resp = await fetch(base64Data);
    const blob = await resp.blob();
    const ext = blob.type.includes('png') ? 'png' : 'jpg';
    const filePath = `pets/${petId}.${ext}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('avatars')
      .upload(filePath, blob, { upsert: true, contentType: blob.type });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabaseClient.storage
      .from('avatars')
      .getPublicUrl(filePath);
    const photoUrl = urlData.publicUrl + '?t=' + Date.now();

    // Обновляем запись питомца
    await supabaseClient.from('pets').update({ photo_url: photoUrl }).eq('id', petId);
  } catch(e) {
    console.error('Pet photo upload error:', e);
  }
}

async function deletePet(id) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient.from('pets').delete().eq('id', id);
    if (error) throw error;
    renderPets();
    showToast('Питомец удалён');
  } catch(e) {
    console.error('Delete pet error:', e);
    showToast('Ошибка удаления');
  }
}

function togglePetCard(idx) {
  const b=document.getElementById('pet-bdy-'+idx), a=document.getElementById('pet-arr-'+idx);
  const open=b.style.display==='none';
  b.style.display=open?'block':'none'; a.textContent=open?'⌄':'›';
}

async function renderPets() {
  const list = document.getElementById('pets-list');
  if (!list) return;

  if (!supabaseClient || !currentUser) {
    list.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-secondary);font-size:14px;">Войдите чтобы увидеть питомцев</div>';
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('pets')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: true });
    if (error) throw error;

    _petsCache = data || [];

    if (!_petsCache.length) {
      list.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-secondary);"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round" style="margin-bottom:16px;"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg><div style="font-size:16px;font-weight:700;margin-bottom:8px;">Питомцев пока нет</div><div style="font-size:13px;">Нажмите «+ Добавить»</div></div>';
      return;
    }

    const GRADS = ['linear-gradient(135deg,#4A90D9,#7B5EA7)','linear-gradient(135deg,#E91E63,#FF9800)','linear-gradient(135deg,#00BCD4,#4CAF50)','linear-gradient(135deg,#FF5722,#FF9800)','linear-gradient(135deg,#9C27B0,#E91E63)'];

    list.innerHTML = _petsCache.map((pet, i) => {
      const color = GRADS[i % GRADS.length];
      const initials = pet.name ? pet.name.substring(0,1).toUpperCase() : '?';
      return `<div class="pet-card">
        <div class="pet-hdr" onclick="togglePetCard(${i})">
          <div style="width:56px;height:56px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;flex-shrink:0;${pet.photo_url ? '' : 'background:'+color+';color:white;font-size:22px;font-weight:800;'}">
            ${pet.photo_url ? `<img src="${pet.photo_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.style.background='${color}';this.parentElement.textContent='${initials}'">` : initials}
          </div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:800;">${pet.name} ${pet.sex==='ж'?'♀':'♂'}</div>
            <div style="font-size:13px;color:var(--text-secondary);">${pet.breed || 'Порода не указана'}${pet.age ? ' · '+pet.age : ''}</div>
          </div>
          <div style="font-size:22px;color:var(--border);" id="pet-arr-${i}">›</div>
        </div>
        <div id="pet-bdy-${i}" class="pet-bdy" style="display:none;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;padding-top:12px;">
            ${pet.weight ? `<div style="background:var(--bg);border-radius:10px;padding:8px 12px;text-align:center;"><div style="font-size:16px;font-weight:800;">${pet.weight} кг</div><div style="font-size:11px;color:var(--text-secondary);">Вес</div></div>` : ''}
            ${pet.dob ? `<div style="background:var(--bg);border-radius:10px;padding:8px 12px;text-align:center;"><div style="font-size:13px;font-weight:800;">${pet.dob}</div><div style="font-size:11px;color:var(--text-secondary);">Дата рожд.</div></div>` : ''}
          </div>
          ${pet.notes ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">${pet.notes}</div>` : ''}
          <div style="display:flex;gap:8px;">
            <button class="btn btn-g btn-sm" style="flex:1;" onclick="nav('medRecords')">Мед. записи</button>
            <button class="btn btn-sm" style="flex:1;background:rgba(208,2,27,0.08);color:var(--error);border-radius:10px;height:38px;font-size:13px;font-weight:700;" onclick="deletePet('${pet.id}')">Удалить</button>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    console.error('Render pets error:', e);
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">Ошибка загрузки</div>';
  }
}

// ════════════════════════════════════════════════════════════
// MED RECORDS
// ════════════════════════════════════════════════════════════
const MED_ICONS={'Вакцинация':'💉','Приём':'🏥','Анализ':'🔬','Операция':'🔪','Другое':'📋'};
const MED_BG={'Вакцинация':'rgba(74,144,217,.12)','Приём':'rgba(76,175,80,.12)','Анализ':'rgba(156,39,176,.12)','Операция':'rgba(208,2,27,.12)','Другое':'rgba(0,0,0,.06)'};
let _medType='Вакцинация';
let _medRecordsCache = [];

function selectMedType(t,el){_medType=t;document.querySelectorAll('#med-type-chips .chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');}

async function saveMedRecord(){
  const title=document.getElementById('med-title').value.trim();
  if(!title){showToast('❌ Укажите название/диагноз');return;}
  
  const rec = {
    type: _medType,
    pet_name: document.getElementById('med-pet-name').value.trim(),
    title: title,
    date: document.getElementById('med-date').value,
    doctor: document.getElementById('med-doctor').value.trim(),
    notes: document.getElementById('med-notes').value.trim()
  };

  if (supabaseClient && currentUser) {
    try {
      const { error } = await supabaseClient.from('med_records').insert({
        ...rec,
        user_id: currentUser.id
      });
      if (error) throw error;
    } catch(e) {
      console.error('❌ Save med record error:', e);
      // Fallback — localStorage
      let recs = JSON.parse(localStorage.getItem('df_med_records')||'[]');
      recs.unshift({ id: Date.now(), ...rec, petName: rec.pet_name });
      localStorage.setItem('df_med_records', JSON.stringify(recs));
    }
  } else {
    let recs = JSON.parse(localStorage.getItem('df_med_records')||'[]');
    recs.unshift({ id: Date.now(), ...rec, petName: rec.pet_name });
    localStorage.setItem('df_med_records', JSON.stringify(recs));
  }
  
  closeModal('m-add-med');
  await renderMedRecords();
  showToast('✅ Запись сохранена','#7ED321');
}

async function renderMedRecords(){
  const list=document.getElementById('med-records-list');
  if(!list)return;
  
  let recs = [];
  
  if (supabaseClient && currentUser) {
    try {
      const { data, error } = await supabaseClient
        .from('med_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      recs = (data || []).map(r => ({
        id: r.id,
        type: r.type,
        petName: r.pet_name,
        title: r.title,
        date: r.date,
        doctor: r.doctor,
        notes: r.notes
      }));
      _medRecordsCache = recs;
    } catch(e) {
      console.error('❌ Load med records error:', e);
      recs = JSON.parse(localStorage.getItem('df_med_records')||'[]');
    }
  } else {
    recs = JSON.parse(localStorage.getItem('df_med_records')||'[]');
  }

  if(!recs.length){
    list.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--text-secondary);"><div style="font-size:48px;margin-bottom:12px;">📋</div><div style="font-weight:700;margin-bottom:4px;">Нет записей</div><div style="font-size:13px;">Добавьте первую медицинскую запись</div></div>';
    return;
  }

  list.innerHTML=recs.map(r=>`
    <div id="med-${r.id}" class="med-record-item" onclick="openMedRecord('${r.id}')" style="background:var(--white);border-radius:var(--radius);margin-bottom:10px;box-shadow:var(--shadow);padding:14px 16px;display:flex;gap:12px;align-items:flex-start;cursor:pointer;position:relative;transition:transform 0.2s;">
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
      <button onclick="event.stopPropagation();deleteMedRecord('${r.id}')" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);background:#FF3B30;color:white;border:none;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer;opacity:0;transition:opacity 0.2s;">Удалить</button>
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
  const rec = _medRecordsCache.find(r => String(r.id) === String(id));
  if (!rec) return;
  
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

async function deleteMedRecord(id) {
  if (!confirm('Удалить запись?')) return;
  
  if (supabaseClient && currentUser) {
    try {
      const { error } = await supabaseClient.from('med_records').delete().eq('id', id).eq('user_id', currentUser.id);
      if (error) throw error;
    } catch(e) {
      console.error('❌ Delete med record error:', e);
    }
  } else {
    let recs = JSON.parse(localStorage.getItem('df_med_records')||'[]');
    recs = recs.filter(r => String(r.id) !== String(id));
    localStorage.setItem('df_med_records', JSON.stringify(recs));
  }
  
  await renderMedRecords();
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
    if(id==='home')      { if(typeof renderHomeSpecialists==='function') renderHomeSpecialists(); }
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
    if(typeof renderHomeSpecialists==='function') renderHomeSpecialists();
    renderPlaces();renderDiscounts();renderLessons();renderPets();
    updateDistrictChatLabel();
    renderSavedDistrictChats();
  },200);

  // Закрываем результаты поиска при клике вне
  document.addEventListener('click', (e) => {
    const results = document.getElementById('district-search-results');
    const search = document.getElementById('district-search');
    if (results && !results.contains(e.target) && e.target !== search) {
      results.style.display = 'none';
    }
  });
});

// ════════════════════════════════════════════════════════════
// DISTRICT SEARCH — реальные данные из БД
// ════════════════════════════════════════════════════════════

// Кэш районов загруженных из БД
let _districtCache = null;

async function loadDistrictsFromDB() {
  if (_districtCache) return _districtCache;
  if (!supabaseClient) return [];
  try {
    const { data } = await supabaseClient
      .from('profiles')
      .select('district')
      .not('district', 'is', null)
      .neq('district', '');
    const unique = [...new Set((data || []).map(r => r.district).filter(Boolean))].sort();
    _districtCache = unique;
    return unique;
  } catch(e) {
    console.error('loadDistrictsFromDB error:', e);
    return [];
  }
}

async function searchDistricts(query) {
  const results = document.getElementById('district-search-results');
  const clearBtn = document.getElementById('district-search-clear');
  if (!results) return;
  if (clearBtn) clearBtn.style.display = query ? '' : 'none';
  if (!query || query.length < 1) { results.style.display = 'none'; return; }

  results.innerHTML = '<div style="padding:12px 16px;color:var(--text-secondary);font-size:13px;">Ищем...</div>';
  results.style.display = 'block';

  const all = await loadDistrictsFromDB();
  const q = query.toLowerCase();
  const matches = all.filter(d => d.toLowerCase().includes(q)).slice(0, 10);

  if (!matches.length) {
    // Если в БД не нашли — предлагаем открыть чат с любым введённым названием
    results.innerHTML = `
      <div onclick="selectDistrictFromSearch('${query.replace(/'/g,"\\'")}');"
        style="padding:12px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;"
        onmousedown="event.preventDefault()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <div>
          <div style="font-size:14px;font-weight:700;">${query}</div>
          <div style="font-size:12px;color:var(--text-secondary);">Открыть чат этого района</div>
        </div>
      </div>`;
    return;
  }

  results.innerHTML = matches.map(district => `
    <div onclick="selectDistrictFromSearch('${district.replace(/'/g,"\\'")}');"
      style="padding:12px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;border-bottom:1px solid var(--border);"
      onmousedown="event.preventDefault()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span style="font-size:14px;font-weight:600;">${district}</span>
    </div>
  `).join('');
}

function selectDistrictFromSearch(district) {
  const input = document.getElementById('district-search');
  const results = document.getElementById('district-search-results');
  const clearBtn = document.getElementById('district-search-clear');
  if (input) input.value = '';
  if (results) results.style.display = 'none';
  if (clearBtn) clearBtn.style.display = 'none';
  saveDistrictChat(district);
  openNamedDistrictChat(district);
}

function clearDistrictSearch() {
  const input = document.getElementById('district-search');
  const results = document.getElementById('district-search-results');
  const clearBtn = document.getElementById('district-search-clear');
  if (input) { input.value = ''; input.focus(); }
  if (results) results.style.display = 'none';
  if (clearBtn) clearBtn.style.display = 'none';
}

// Сохранённые районные чаты
function getSavedDistrictChats() {
  try { return JSON.parse(localStorage.getItem('saved_district_chats') || '[]'); } catch(e) { return []; }
}
function saveDistrictChat(district) {
  const saved = getSavedDistrictChats();
  if (!saved.includes(district)) {
    saved.push(district);
    localStorage.setItem('saved_district_chats', JSON.stringify(saved));
    renderSavedDistrictChats();
  }
}
function removeDistrictChat(district) {
  const saved = getSavedDistrictChats().filter(d => d !== district);
  localStorage.setItem('saved_district_chats', JSON.stringify(saved));
  renderSavedDistrictChats();
}
function renderSavedDistrictChats() {
  const container = document.getElementById('saved-district-chats');
  if (!container) return;
  const myDistrict = userLocationName || localStorage.getItem('df_user_geo') || '';
  const others = getSavedDistrictChats().filter(d => d !== myDistrict);
  if (!others.length) { container.innerHTML = ''; return; }
  container.innerHTML = others.map(district => `
    <div class="ci" style="gap:14px;" onclick="openNamedDistrictChat('${district.replace(/'/g,"\\'")}')">
      <div class="avatar" style="width:52px;height:52px;background:linear-gradient(135deg,#9C27B0,#673AB7);flex-shrink:0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
          <span style="font-weight:800;font-size:15px;">📍 ${district}</span>
          <button onclick="event.stopPropagation();removeDistrictChat('${district.replace(/'/g,"\\'")}');"
            style="background:none;border:none;color:var(--text-secondary);font-size:20px;cursor:pointer;padding:0 4px;line-height:1;">×</button>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);">Чат района</div>
      </div>
    </div>
  `).join('');
}

// Открыть чат любого района по имени
function openNamedDistrictChat(district) {
  currentChatType = 'district';
  chatNick = getChatNick();
  document.getElementById('chat-conv-name').textContent = '📍 ' + district;
  document.getElementById('chat-conv-av').style.background = 'linear-gradient(135deg,#F5A623,#F07B3F)';
  document.getElementById('chat-conv-av').textContent = '📍';
  document.getElementById('chat-conv-subtitle').innerHTML = '<span style="color:#aaa">● подключение...</span>';
  const wrap = document.getElementById('chat-messages');
  if (wrap) wrap.innerHTML = '';
  const roomId = 'district_' + district.toLowerCase().replace(/\s+/g, '_').replace(/[^a-zа-я0-9_]/gi, '');
  loadPublicChatHistory(roomId);
  nav('chatConv');
  requestNotificationPermission();
  connectDistrictRealtime(district);
}

// ════════════════════════════════════════════════════════════
// COMMUNITY TABS (Districts / DMs)
// ════════════════════════════════════════════════════════════
function switchCommTab(tab) {
  const districts = document.getElementById('comm-panel-districts');
  const dms = document.getElementById('comm-panel-dms');
  const tabD = document.getElementById('comm-tab-districts');
  const tabDM = document.getElementById('comm-tab-dms');
  if (!districts || !dms) return;
  
  if (tab === 'districts') {
    districts.style.display = 'block';
    dms.style.display = 'none';
    tabD.style.color = 'var(--primary)';
    tabD.style.borderBottom = '2.5px solid var(--primary)';
    tabDM.style.color = 'var(--text-secondary)';
    tabDM.style.borderBottom = '2.5px solid var(--border)';
  } else {
    districts.style.display = 'none';
    dms.style.display = 'block';
    tabDM.style.color = 'var(--primary)';
    tabDM.style.borderBottom = '2.5px solid var(--primary)';
    tabD.style.color = 'var(--text-secondary)';
    tabD.style.borderBottom = '2.5px solid var(--border)';
  }
}

// ════════════════════════════════════════════════════════════
// USER PROFILE (from chat — shows avatar, district, pets, stats)
// ════════════════════════════════════════════════════════════
async function openChatUserProfile() {
  const userId = currentPrivateChatId;
  if (!userId || !supabaseClient) return;
  
  const body = document.getElementById('m-user-profile-body');
  if (!body) return;
  
  body.innerHTML = '<div style="padding:20px;color:var(--text-secondary);">Загружаем профиль...</div>';
  openModal('m-user-profile');
  
  try {
    // Загружаем профиль пользователя
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Загружаем питомцев
    const { data: pets } = await supabaseClient
      .from('pets')
      .select('*')
      .eq('user_id', userId);
    
    // Загружаем заказы для статистики
    const { data: bookings } = await supabaseClient
      .from('bookings')
      .select('id')
      .eq('user_id', userId);
    
    const name = profile?.name || contactBook[userId]?.name || 'Пользователь';
    const initials = name.substring(0,2).toUpperCase();
    const district = profile?.district || '';
    const avatarUrl = profile?.avatar_url;
    const ordersCount = (bookings || []).length;
    const charityAmount = ordersCount * 150;
    const petsList = pets || [];
    
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:20px;">
        <div class="avatar" style="width:80px;height:80px;font-size:28px;box-shadow:0 4px 16px rgba(0,0,0,0.1);overflow:hidden;">
          ${avatarUrl ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initials}'">` : initials}
        </div>
        <div style="font-size:20px;font-weight:900;font-family:'Nunito',sans-serif;">${name}</div>
        ${district ? `<div style="display:flex;align-items:center;gap:4px;color:var(--text-secondary);font-size:13px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${district}
        </div>` : ''}
      </div>
      
      <!-- Stats -->
      <div style="display:flex;gap:0;background:var(--bg);border-radius:14px;padding:12px;margin-bottom:16px;">
        <div style="flex:1;text-align:center;">
          <div style="font-size:18px;font-weight:900;color:var(--primary);">${ordersCount}</div>
          <div style="font-size:11px;color:var(--text-secondary);">транзакций</div>
        </div>
        <div style="width:1px;background:var(--border);"></div>
        <div style="flex:1;text-align:center;">
          <div style="font-size:18px;font-weight:900;color:var(--primary);">${charityAmount} ₽</div>
          <div style="font-size:11px;color:var(--text-secondary);">приютам</div>
        </div>
        <div style="width:1px;background:var(--border);"></div>
        <div style="flex:1;text-align:center;">
          <div style="font-size:18px;font-weight:900;color:var(--primary);">${petsList.length}</div>
          <div style="font-size:11px;color:var(--text-secondary);">питомцев</div>
        </div>
      </div>
      
      <!-- Pets -->
      ${petsList.length ? `
        <div style="text-align:left;margin-bottom:12px;">
          <div style="font-size:15px;font-weight:800;margin-bottom:10px;">Питомцы</div>
          ${petsList.map(p => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
              <div style="width:44px;height:44px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#4A90D9,#7B5EA7);color:white;font-weight:700;font-size:16px;flex-shrink:0;">
                ${p.photo_url ? `<img src="${p.photo_url}" style="width:100%;height:100%;object-fit:cover;">` : p.name.substring(0,1).toUpperCase()}
              </div>
              <div>
                <div style="font-weight:700;font-size:14px;">${p.name} ${p.sex==='ж'?'♀':'♂'}</div>
                <div style="font-size:12px;color:var(--text-secondary);">${p.breed || ''}${p.age ? ' · '+p.age : ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<div style="color:var(--text-secondary);font-size:13px;margin-bottom:12px;">Питомцы не добавлены</div>'}
      
      <button class="btn btn-p" style="margin-bottom:8px;" onclick="closeModal('m-user-profile')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" style="margin-right:6px;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        Написать
      </button>
    `;
  } catch(e) {
    console.error('User profile error:', e);
    body.innerHTML = '<div style="padding:20px;color:var(--text-secondary);">Не удалось загрузить профиль</div>';
  }
}

// ════════════════════════════════════════════════════════════
// PET PHOTO
// ════════════════════════════════════════════════════════════
let _newPetPhotoData = null;

function previewPetPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    _newPetPhotoData = e.target.result;
    const preview = document.getElementById('new-pet-photo-preview');
    if (preview) {
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
      preview.style.border = 'none';
    }
  };
  reader.readAsDataURL(file);
}

