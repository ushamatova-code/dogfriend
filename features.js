// ============================================================
// FEATURES.JS — Lessons, settings, PWA, districts, community,
// feedback, deeplink, reply, swipe, reactions
// Depends on: globals.js, chat.js
// ============================================================


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
        <div class="lesson-meta">${l.duration} · ${l.level} · ${l.cat}</div>
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
      <div style="font-size:14px;font-weight:800;margin-bottom:10px;">Шаги выполнения:</div>
      ${l.steps.map((s,i)=>`<div style="display:flex;gap:10px;margin-bottom:8px;align-items:flex-start;"><div style="width:24px;height:24px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:white;flex-shrink:0;">${i+1}</div><div style="font-size:13px;line-height:1.5;padding-top:3px;">${s}</div></div>`).join('')}
    </div>`;
  openModal('m-lesson');
}

// ════════════════════════════════════════════════════════════
// NOTIF SETTINGS
// ════════════════════════════════════════════════════════════
function saveNotifSetting(key, val) {
  let s = JSON.parse(localStorage.getItem('df_notif') || '{}');
  s[key] = val;
  localStorage.setItem('df_notif', JSON.stringify(s));
  showToast(val ? 'Включено' : 'Отключено');
}

function getNotifSettings() {
  return JSON.parse(localStorage.getItem('df_notif') || '{"messages":true,"lessons":true,"events":true,"promos":true,"vaccine":true,"checkup":true,"sound":true,"vibro":true}');
}

function loadNotifScreen() {
  const s = getNotifSettings();
  const el = (id) => document.getElementById(id);
  if (el('ntf-messages')) el('ntf-messages').checked = s.messages !== false;
  if (el('ntf-lessons')) el('ntf-lessons').checked = s.lessons !== false;
  if (el('ntf-events')) el('ntf-events').checked = s.events !== false;
  if (el('ntf-promos')) el('ntf-promos').checked = s.promos !== false;
  if (el('ntf-vaccine')) el('ntf-vaccine').checked = s.vaccine !== false;
  if (el('ntf-checkup')) el('ntf-checkup').checked = s.checkup !== false;
  if (el('ntf-sound')) el('ntf-sound').checked = s.sound !== false;
  if (el('ntf-vibro')) el('ntf-vibro').checked = s.vibro !== false;
  
  // Show push status
  const statusEl = el('notif-push-status');
  if (!statusEl) return;
  
  const permission = 'Notification' in window ? Notification.permission : 'unsupported';
  
  if (permission === 'granted') {
    statusEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:44px;height:44px;border-radius:14px;background:rgba(52,199,89,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34C759" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        </div>
        <div>
          <div style="font-size:15px;font-weight:800;color:#34C759;">Push включены</div>
          <div style="font-size:12px;color:var(--text-secondary);">Уведомления приходят даже когда приложение закрыто</div>
        </div>
      </div>`;
  } else if (permission === 'denied') {
    statusEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:44px;height:44px;border-radius:14px;background:rgba(208,2,27,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D0021B" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        </div>
        <div>
          <div style="font-size:15px;font-weight:800;color:#D0021B;">Push заблокированы</div>
          <div style="font-size:12px;color:var(--text-secondary);">Откройте настройки браузера → сайт dogfriend.vercel.app → разрешите уведомления</div>
        </div>
      </div>`;
  } else {
    statusEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:44px;height:44px;border-radius:14px;background:rgba(74,144,217,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        </div>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:800;">Push не включены</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">Включите чтобы получать уведомления когда приложение закрыто</div>
          <button class="btn btn-p" style="width:100%;height:44px;" onclick="enablePushFromSettings()">Включить push-уведомления</button>
        </div>
      </div>`;
  }
}

async function enablePushFromSettings() {
  try {
    if (window.OneSignal) {
      await OneSignal.Notifications.requestPermission();
    } else {
      await Notification.requestPermission();
    }
    loadNotifScreen(); // refresh status
  } catch(e) {
    showToast('Ошибка: ' + (e.message || ''));
  }
}

// ════════════════════════════════════════════════════════════
// PATCH nav() TO RENDER DATA ON SCREEN OPEN
// ════════════════════════════════════════════════════════════
(function(){
  const _orig=window.nav;
  window.nav=function(id){
    _orig(id);
    if(id==='home')      { if(typeof renderHomeSpecialists==='function') renderHomeSpecialists(); if(typeof loadProfileStats==='function') loadProfileStats(); if(typeof renderHomeProducts==='function') renderHomeProducts(); }
    if(id==='profile')   { setTimeout(() => { if(typeof checkUserBusiness==='function' && currentUser) checkUserBusiness(); loadProfileMenuStats(); }, 200); }
    if(id==='dogmap')    { renderPlaces(); setTimeout(() => { if (_placesMap) _placesMap.invalidateSize(); }, 300); }
    if(id==='discounts') renderDiscounts();
    if(id==='lessons')   renderLessons();
    if(id==='myPets')    renderPets();
    if(id==='medRecords')renderMedRecords();
    if(id==='notifSettings') loadNotifScreen();
  };
})();

// Initial render on DOMContentLoaded (after main listener)
window.addEventListener('load',()=>{
  setTimeout(()=>{
    if(typeof renderHomeSpecialists==='function') renderHomeSpecialists();
    if(typeof renderHomeProducts==='function') renderHomeProducts();
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
  const feed = document.getElementById('comm-panel-feed');
  const tabD = document.getElementById('comm-tab-districts');
  const tabDM = document.getElementById('comm-tab-dms');
  const tabFeed = document.getElementById('comm-tab-feed');
  if (!districts || !dms) return;

  // Скрываем все панели
  districts.style.display = 'none';
  dms.style.display = 'none';
  if (feed) feed.style.display = 'none';

  // Сбрасываем все табы
  const resetTab = (t) => { if(t) { t.style.color = 'var(--text-secondary)'; t.style.borderBottom = '2.5px solid var(--border)'; }};
  resetTab(tabD); resetTab(tabDM); resetTab(tabFeed);

  if (tab === 'districts') {
    districts.style.display = 'block';
    if (tabD) { tabD.style.color = 'var(--primary)'; tabD.style.borderBottom = '2.5px solid var(--primary)'; }
  } else if (tab === 'feed') {
    if (feed) feed.style.display = 'block';
    if (tabFeed) { tabFeed.style.color = 'var(--primary)'; tabFeed.style.borderBottom = '2.5px solid var(--primary)'; }
    if (typeof renderFeed === 'function') renderFeed();
  } else {
    dms.style.display = 'block';
    if (tabDM) { tabDM.style.color = 'var(--primary)'; tabDM.style.borderBottom = '2.5px solid var(--primary)'; }
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


// ════════════════════════════════════════════════════════════
// PWA INSTALL PROMPT
// ════════════════════════════════════════════════════════════
let _deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  const row = document.getElementById('pwa-install-row');
  if (row) row.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
  _deferredInstallPrompt = null;
  const row = document.getElementById('pwa-install-row');
  if (row) row.style.display = 'none';
  showToast('Приложение установлено!', '#34C759');
});

function installPWA() {
  if (_deferredInstallPrompt) {
    _deferredInstallPrompt.prompt();
    _deferredInstallPrompt.userChoice.then(choice => {
      if (choice.outcome === 'accepted') showToast('Установка...', '#34C759');
      _deferredInstallPrompt = null;
    });
  } else {
    showToast('Нажмите «Поделиться» → «На экран Домой»');
  }
}

// ════════════════════════════════════════════════════════════
// SERVICES HUB — category navigation
// ════════════════════════════════════════════════════════════
const SERVICE_CATEGORIES = {
  trainer: { title: 'Кинологи', type: 'trainer' },
  grooming: { title: 'Груминг', type: 'grooming' },
  dogsitting: { title: 'Передержка', type: 'dogsitting' },
  boarding: { title: 'Передержка', type: 'boarding' },
  psychologist: { title: 'Зоопсихолог', type: 'psychologist' },
  walking: { title: 'Выгул собак', type: 'walking' },
  training_ground: { title: 'Площадки', type: 'training_ground' },
  all: { title: 'Все специалисты', type: null },
};

let _currentServiceCategory = 'all';

async function openServiceCategory(catKey) {
  const cat = SERVICE_CATEGORIES[catKey] || SERVICE_CATEGORIES.all;
  _currentServiceCategory = catKey;
  
  document.getElementById('catalog-filter-title').textContent = cat.title;
  
  const chipsEl = document.getElementById('catalog-chips');
  if (chipsEl) {
    chipsEl.style.display = (catKey === 'all' || catKey === 'trainer') ? 'flex' : 'none';
  }
  
  nav('catalogFiltered');
  
  // Показываем загрузку
  const list = document.getElementById('catalog-trainers-list');
  if (list) list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">Загружаем...</div>';
  
  // Всегда загружаем свежие данные всех trainer-бизнесов
  await loadBusinesses('trainer');
  
  renderCatalog();
}

// Patch renderCatalog to filter by service category + geo
window.renderCatalog = function() {
  const list = document.getElementById('catalog-trainers-list');
  if (!list) return;
  
  const cat = SERVICE_CATEGORIES[_currentServiceCategory];
  const searchVal = (document.getElementById('catalog-search')?.value || '').toLowerCase();
  
  // Filter businesses by category — trainer-type бизнесы фильтруем по services (выбранным категориям)
  // Остальные типы (clinic, cafe, shop) фильтруем по type
  let filtered = loadedBusinesses.filter(b => b.is_approved);
  
  if (cat && cat.type) {
    if (cat.type === 'trainer') {
      // Кинологи — у кого type=trainer И нет доп. категорий, или services содержит 'trainer'
      filtered = filtered.filter(b => b.type === 'trainer' && (
        !b.services || !b.services.length ||
        b.services.some(s => (typeof s === 'string' ? s : s.name) === 'trainer') ||
        // Если services пустой или не содержит специализаций — показываем как кинолога
        !b.services.some(s => ['grooming','boarding','psychologist','walking'].includes(typeof s === 'string' ? s : s.name))
      ));
    } else if (['grooming','boarding','dogsitting','psychologist','walking','training_ground'].includes(cat.type)) {
      // Специализации — ищем всех у кого в services есть эта категория (тип trainer)
      // dogsitting = boarding (алиасы)
      const serviceKey = cat.type === 'dogsitting' ? 'boarding' : cat.type;
      filtered = filtered.filter(b => b.type === 'trainer' && b.services && b.services.some(s => (typeof s === 'string' ? s : s.name) === serviceKey));
    } else {
      // Другие типы (clinic, cafe, shop) — фильтруем по type
      filtered = filtered.filter(b => b.type === cat.type);
    }
  }
  
  // Geo sort — сортируем по расстоянию если есть геолокация
  // Бизнесы без координат показываем тоже (в конце списка)
  if (userLat && userLng) {
    filtered = filtered.map(b => {
      const locs = b.business_locations || [];
      let minDist = (b.location_lat && b.location_lng) ? calcDistance(userLat, userLng, b.location_lat, b.location_lng) : null;
      locs.forEach(l => {
        if (l.location_lat && l.location_lng) {
          const d = calcDistance(userLat, userLng, l.location_lat, l.location_lng);
          if (minDist === null || d < minDist) minDist = d;
        }
      });
      return { ...b, _dist: minDist };
    }).sort((a, b) => {
      // Сначала те у кого есть координаты и они ближе
      if (a._dist === null && b._dist === null) return 0;
      if (a._dist === null) return 1;
      if (b._dist === null) return -1;
      return a._dist - b._dist;
    });
  }
  
  // Apply search
  if (searchVal) {
    filtered = filtered.filter(b => 
      (b.name || '').toLowerCase().includes(searchVal) ||
      (b.description || '').toLowerCase().includes(searchVal) ||
      (b.address || '').toLowerCase().includes(searchVal) ||
      (b.services || []).some(s => (typeof s === 'string' ? s : s.name).toLowerCase().includes(searchVal))
    );
  }
  
  // Apply chip filter
  if (typeof catalogFilter !== 'undefined' && catalogFilter !== 'Все') {
    filtered = filtered.filter(b => 
      (b.services || []).some(s => (typeof s === 'string' ? s : s.name).includes(catalogFilter))
    );
  }
  
  if (!filtered.length) {
    list.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" style="margin-bottom:12px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <div style="font-size:16px;font-weight:700;margin-bottom:6px;">Пока нет специалистов</div>
      <div style="font-size:13px;">В этой категории ещё никто не зарегистрировался</div>
    </div>`;
    return;
  }
  
  list.innerHTML = filtered.map(b => {
    const initials = (b.name || 'XX').substring(0,2).toUpperCase();
    const distText = b._dist < 1 ? (b._dist * 1000).toFixed(0) + ' м' : b._dist.toFixed(1) + ' км';
    // Определяем специализацию из services
    const CAT_LABELS = {trainer:'Кинолог',grooming:'Груминг',boarding:'Передержка',psychologist:'Зоопсихолог',walking:'Выгул'};
    const specLabel = b.services && b.services.length
      ? b.services.map(s => CAT_LABELS[typeof s === 'string' ? s : s.name]).filter(Boolean).join(' · ') || 'Кинолог'
      : 'Кинолог';
    return `<div class="card" style="margin:0 16px 10px;cursor:pointer;" onclick="openBusinessProfile('${b.id}')">
      <div style="display:flex;gap:14px;align-items:center;">
        <div class="avatar" style="width:52px;height:52px;font-size:18px;flex-shrink:0;overflow:hidden;${b.cover_url?'padding:0;background:none;':''}">
          ${b.cover_url ? '<img src="' + b.cover_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' : initials}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:800;">${b.name}</div>
          <div style="font-size:11px;color:var(--primary);font-weight:700;margin-top:1px;">${specLabel}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${b.address || ''}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
            <span style="font-size:12px;font-weight:700;color:var(--primary);">${b.rating || '5.0'}</span>
            ${b.price_from ? '<span style="font-size:12px;color:var(--text-secondary);">от ' + b.price_from + '</span>' : ''}
            ${b._dist !== null && b._dist !== undefined ? '<span style="font-size:11px;color:var(--text-secondary);">' + distText + '</span>' : ''}
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>
    </div>`;
  }).join('');
};

// ════════════════════════════════════════════════════════════
// PULL TO REFRESH (только на главной)
// ════════════════════════════════════════════════════════════
let _pullStart = 0;
let _pulling = false;
let _refreshing = false;

document.addEventListener('touchstart', (e) => {
  // Только на главном экране
  const homeScreen = document.getElementById('home');
  if (!homeScreen || homeScreen.style.display === 'none') return;
  
  // Проверяем что скролл вверху
  const scroll = homeScreen.querySelector('.scroll');
  if (scroll && scroll.scrollTop <= 0) {
    _pullStart = e.touches[0].clientY;
    _pulling = true;
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (!_pulling || _refreshing) return;
  const dy = e.touches[0].clientY - _pullStart;
  if (dy > 80) {
    let indicator = document.getElementById('pull-refresh-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pull-refresh-indicator';
      indicator.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;text-align:center;padding:12px;font-size:13px;font-weight:600;color:var(--primary);background:var(--white);box-shadow:0 2px 8px rgba(0,0,0,0.05);transition:opacity 0.3s;';
      document.body.appendChild(indicator);
    }
    indicator.textContent = 'Отпустите для обновления';
    indicator.style.opacity = '1';
  }
}, { passive: true });

document.addEventListener('touchend', () => {
  if (!_pulling) return;
  _pulling = false;
  const indicator = document.getElementById('pull-refresh-indicator');
  if (indicator && indicator.style.opacity === '1') {
    _refreshing = true;
    indicator.textContent = 'Обновляем...';
    
    Promise.all([
      typeof loadEvents === 'function' ? loadEvents() : Promise.resolve(),
      typeof renderHomeSpecialists === 'function' ? renderHomeSpecialists() : Promise.resolve(),
      typeof renderPlaces === 'function' ? renderPlaces() : Promise.resolve(),
      typeof renderDiscounts === 'function' ? renderDiscounts() : Promise.resolve(),
      typeof renderPets === 'function' ? renderPets() : Promise.resolve(),
      typeof loadProfileStats === 'function' ? loadProfileStats() : Promise.resolve(),
    ]).then(() => {
      indicator.textContent = 'Обновлено';
      setTimeout(() => { indicator.style.opacity = '0'; setTimeout(() => indicator.remove(), 300); _refreshing = false; }, 800);
    }).catch(() => {
      indicator.textContent = 'Ошибка';
      setTimeout(() => { indicator.style.opacity = '0'; setTimeout(() => indicator.remove(), 300); _refreshing = false; }, 1000);
    });
  }
});

// ════════════════════════════════════════════════════════════
// FIX: Mobile keyboard — scroll to bottom when input focused
// ════════════════════════════════════════════════════════════
document.getElementById('pc-input')?.addEventListener('focus', () => {
  setTimeout(() => {
    const msgs = document.getElementById('pc-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 300);
});

// ════════════════════════════════════════════════════════════
// iOS INSTALL BANNER + ПОСЛЕ УСТАНОВКИ → ЗАПРОС УВЕДОМЛЕНИЙ
// ════════════════════════════════════════════════════════════
function showIOSInstallBanner() {
  const banner = document.getElementById('ios-install-banner');
  const overlay = document.getElementById('ios-install-overlay');
  if (banner) banner.style.display = 'block';
  if (overlay) overlay.style.display = 'block';
}

function dismissIOSBanner() {
  const banner = document.getElementById('ios-install-banner');
  const overlay = document.getElementById('ios-install-overlay');
  if (banner) banner.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
  // Запоминаем на 3 дня
  localStorage.setItem('ios_banner_dismissed', Date.now().toString());
}

function checkIOSInstallBanner() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!isIOS) return;

  // Уже установлено как PWA
  if (window.navigator.standalone === true) {
    // Приложение открыто как PWA — сразу просим уведомления
    // Небольшая задержка чтобы не пугать сразу
    setTimeout(() => askPushPermission(), 2000);
    return;
  }

  // В браузере — показываем баннер установки
  // Закрыл недавно — не показываем
  const dismissed = localStorage.getItem('ios_banner_dismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < 3 * 24 * 60 * 60 * 1000) return;

  // Показываем сразу через 3 секунды — не сразу чтобы человек успел увидеть приложение
  setTimeout(showIOSInstallBanner, 3000);
}

window.addEventListener('load', () => {
  setTimeout(checkIOSInstallBanner, 1000);
});

// ════════════════════════════════════════════════════════════
// PUSH PERMISSION — красивый баннер вместо системного промпта
// ════════════════════════════════════════════════════════════
function askPushPermission() {
  // Не показываем если уже подписан или уже отказался
  if (localStorage.getItem('push_asked')) return;
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') return;
  
  const banner = document.createElement('div');
  banner.id = 'push-banner';
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:var(--white);padding:20px 16px;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px));box-shadow:0 -4px 24px rgba(0,0,0,0.1);z-index:9999;border-radius:20px 20px 0 0;animation:slideUp 0.3s ease;';
  banner.innerHTML = `
    <div style="display:flex;gap:14px;align-items:flex-start;">
      <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#4A90D9,#7B5EA7);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      </div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:800;margin-bottom:4px;">Включить уведомления?</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.4;">Узнавайте о новых сообщениях, акциях и событиях рядом с вами</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:16px;">
      <button onclick="dismissPushBanner()" style="flex:1;padding:14px;border-radius:14px;border:none;background:var(--bg);font-size:14px;font-weight:700;color:var(--text-secondary);cursor:pointer;">Позже</button>
      <button onclick="acceptPushBanner()" style="flex:1;padding:14px;border-radius:14px;border:none;background:var(--primary);color:white;font-size:14px;font-weight:700;cursor:pointer;">Включить</button>
    </div>
  `;
  document.body.appendChild(banner);
}

function dismissPushBanner() {
  localStorage.setItem('push_asked', '1');
  const b = document.getElementById('push-banner');
  if (b) { b.style.opacity = '0'; b.style.transition = 'opacity 0.3s'; setTimeout(() => b.remove(), 300); }
}

async function acceptPushBanner() {
  localStorage.setItem('push_asked', '1');
  const b = document.getElementById('push-banner');
  if (b) { b.style.opacity = '0'; b.style.transition = 'opacity 0.3s'; setTimeout(() => b.remove(), 300); }
  
  // Запрашиваем нативное разрешение браузера через OneSignal
  try {
    if (window.OneSignal) {
      await OneSignal.Notifications.requestPermission();
    } else {
      await Notification.requestPermission();
    }
  } catch(e) {
    console.log('Push permission error:', e);
  }
}

// ════════════════════════════════════════════════════════════
// NETWORK RESILIENCE — работа при плохой сети / VPN
// ════════════════════════════════════════════════════════════

// Показываем баннер когда нет сети
window.addEventListener('offline', () => {
  showNetworkBanner(false);
});

window.addEventListener('online', () => {
  showNetworkBanner(true);
  // Переподключаемся к Supabase Realtime
  if (typeof startRealtimeDMSubscription === 'function') {
    stopRealtimeDMSubscription();
    startRealtimeDMSubscription();
  }
});

function showNetworkBanner(isOnline) {
  let banner = document.getElementById('network-banner');
  if (isOnline) {
    if (banner) { banner.style.opacity = '0'; setTimeout(() => banner.remove(), 300); }
    return;
  }
  if (banner) return; // already showing
  banner = document.createElement('div');
  banner.id = 'network-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#FF3B30;color:white;text-align:center;padding:8px 16px;font-size:13px;font-weight:700;z-index:99999;transition:opacity 0.3s;';
  banner.textContent = 'Нет подключения к интернету';
  document.body.appendChild(banner);
}

// Retry wrapper для Supabase запросов
async function supabaseRetry(fn, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch(e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

// Check on load
if (!navigator.onLine) showNetworkBanner(false);

// ════════════════════════════════════════════════════════════
// FEEDBACK — обратная связь от пользователей
// ════════════════════════════════════════════════════════════
function openFeedbackForm() {
  let modal = document.getElementById('m-feedback');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'm-feedback';
    modal.className = 'modal-ov';
    modal.onclick = (e) => { if (e.target === modal) closeModal('m-feedback'); };
    modal.innerHTML = '<div class="modal" onclick="event.stopPropagation()"><div class="mhandle"></div><div id="m-feedback-body"></div></div>';
    document.body.appendChild(modal);
  }
  document.getElementById('m-feedback-body').innerHTML = `
    <h3 style="margin-bottom:16px;">Обратная связь</h3>
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">Расскажите о проблеме, предложите идею или пожалуйтесь</p>
    <textarea class="input" id="feedback-text" placeholder="Ваше сообщение..." style="min-height:100px;padding:12px;resize:none;margin-bottom:16px;"></textarea>
    <button class="btn btn-p" onclick="sendFeedback()" style="margin-bottom:8px;">Отправить</button>
    <button class="btn btn-g" onclick="closeModal('m-feedback')">Отмена</button>
  `;
  openModal('m-feedback');
}

async function sendFeedback() {
  const text = document.getElementById('feedback-text').value.trim();
  if (!text) { showToast('Напишите сообщение'); return; }
  
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  
  if (supabaseClient && currentUser) {
    try {
      const { error } = await supabaseClient.from('feedback').insert({
        user_id: currentUser.id,
        user_name: p.name || 'Аноним',
        text: text
      });
      if (error) throw error;
    } catch(e) {
      console.error('Feedback error:', e);
    }
  }
  
  closeModal('m-feedback');
  showToast('Спасибо за обратную связь!', '#34C759');
}

// ════════════════════════════════════════════════════════════
// DEEPLINK — открыть чат по параметру ?chat=userId
// Используется из админки кнопкой "Написать"
// ════════════════════════════════════════════════════════════
async function handleChatDeeplink() {
  const params = new URLSearchParams(window.location.search);
  const chatUserId = params.get('chat');
  if (!chatUserId) return;

  // Убираем параметр из URL чтобы не мешал при обновлении
  window.history.replaceState({}, '', window.location.pathname);

  // Ждём пока supabaseClient будет готов (макс 10 сек)
  let waited = 0;
  while (!supabaseClient && waited < 10000) {
    await new Promise(r => setTimeout(r, 200));
    waited += 200;
  }
  if (!supabaseClient) return;

  // Небольшая задержка чтобы home успел отрисоваться
  await new Promise(r => setTimeout(r, 500));

  let name = 'Пользователь';
  try {
    // Пробуем сначала по user_id, потом по id
    let { data } = await supabaseClient
      .from('profiles')
      .select('name')
      .eq('user_id', chatUserId)
      .maybeSingle();
    if (!data || !data.name) {
      const r2 = await supabaseClient
        .from('profiles')
        .select('name')
        .eq('id', chatUserId)
        .maybeSingle();
      data = r2.data;
    }
    if (data && data.name) name = data.name;
  } catch(e) { console.warn('Deeplink profile load error:', e); }

  const initials = name.substring(0, 2).toUpperCase();
  openChatWithUser(chatUserId, name, initials, 'linear-gradient(135deg,#4A90D9,#7B5EA7)');
}

// ════════════════════════════════════════════════════════════
// SHARE & DEEPLINKS — магазины, товары, специалисты
// ════════════════════════════════════════════════════════════
const APP_BASE_URL = 'https://dogfriend.vercel.app';

function shareLink(url, text) {
  if (navigator.share) {
    navigator.share({ title: 'Dogly', text: text, url: url }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(url).then(() => {
      showToast('Ссылка скопирована');
    }).catch(() => {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      showToast('Ссылка скопирована');
    });
  }
}

function shareShop() {
  if (!_currentShop) return;
  const url = `${APP_BASE_URL}/share?shop=${_currentShop.id}`;
  const text = `${_currentShop.name} — магазин на Dogly`;
  shareLink(url, text);
}

function shareProduct() {
  if (!_currentProduct) return;
  const shopId = _currentProduct.business_id || (_currentShop ? _currentShop.id : '');
  const url = `${APP_BASE_URL}/share?product=${_currentProduct.id}` + (shopId ? `&shop=${shopId}` : '');
  const text = `${_currentProduct.name} — ${_currentProduct.price?.toLocaleString('ru')} ₽ на Dogly`;
  shareLink(url, text);
}

function shareSpecialist() {
  const specId = currentSpecId;
  if (!specId) return;
  // Берём имя из DOM
  const nameEl = document.getElementById('spec-name');
  const name = nameEl ? nameEl.textContent : 'Специалист';
  const url = `${APP_BASE_URL}/share?spec=${specId}`;
  const text = `${name} — специалист на Dogly`;
  shareLink(url, text);
}

// Обработка deeplink'ов при загрузке — работает как посты: по таймеру, без зависимости от авторизации
var _hasDeeplink = false;
(function() {
  const params = new URLSearchParams(window.location.search);
  const shopId = params.get('shop');
  const productId = params.get('product');
  const specId = params.get('spec');

  if (!shopId && !productId && !specId) return;
  _hasDeeplink = true;

  window.addEventListener('load', () => {
    setTimeout(async () => {
      // Убираем параметры из URL
      window.history.replaceState({}, '', window.location.pathname);

      // Ждём Supabase
      let waited = 0;
      while (!supabaseClient && waited < 10000) {
        await new Promise(r => setTimeout(r, 200));
        waited += 200;
      }
      if (!supabaseClient) return;
      await new Promise(r => setTimeout(r, 300));

      try {
        if (productId) {
          if (shopId) {
            await openShop(shopId);
            await new Promise(r => setTimeout(r, 300));
          }
          openShopProduct(productId);
        } else if (shopId) {
          await openShop(shopId);
        } else if (specId) {
          await openBusinessProfile(specId);
        }
      } catch(e) {
        console.warn('Deeplink error:', e);
      }

      // Показываем баннер регистрации через 3 сек если не залогинен
      setTimeout(() => {
        if (!currentUser && !localStorage.getItem('df_registered')) {
          showDeeplinkAuthBanner();
        }
      }, 3000);
    }, 1500);
  });
})();

// Баннер «Войдите чтобы купить / записаться» поверх deeplink контента
function showDeeplinkAuthBanner() {
  if (document.getElementById('deeplink-auth-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'deeplink-auth-banner';
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:var(--white);border-radius:20px 20px 0 0;box-shadow:0 -4px 24px rgba(0,0,0,0.12);padding:20px 16px;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:9999;';
  banner.innerHTML = `
    <div style="font-size:16px;font-weight:800;margin-bottom:6px;">Нравится? Войдите в Dogly!</div>
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;">Чтобы купить, записаться или написать — нужен аккаунт</div>
    <div style="display:flex;gap:8px;">
      <button onclick="document.getElementById('deeplink-auth-banner').remove();nav('login')" style="flex:1;height:48px;background:linear-gradient(135deg,var(--primary),#6B5CE7);color:white;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">Войти / Регистрация</button>
      <button onclick="document.getElementById('deeplink-auth-banner').remove()" style="width:48px;height:48px;background:var(--bg);border:none;border-radius:14px;cursor:pointer;font-size:18px;">✕</button>
    </div>`;
  document.body.appendChild(banner);
}

// ════════════════════════════════════════════════════════════
// ONESIGNAL — сохраняем player_id в Supabase для серверных пушей
// ════════════════════════════════════════════════════════════
async function saveOneSignalPlayerId() {
  if (!window.OneSignal || !supabaseClient || !currentUser) return;
  try {
    // Ждём пока OneSignal инициализируется
    await OneSignal.Notifications.requestPermission();
    const playerId = await OneSignal.User.PushSubscription.id;
    if (!playerId) {
      // Попробуем через 3 сек ещё раз
      setTimeout(() => saveOneSignalPlayerId(), 3000);
      return;
    }
    console.log('[OneSignal] player_id:', playerId);
    // Сохраняем в profiles
    const { error } = await supabaseClient
      .from('profiles')
      .upsert({ id: currentUser.id, user_id: currentUser.id, onesignal_player_id: playerId, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) console.error('[OneSignal] Save error:', error);
    else console.log('[OneSignal] ✅ player_id сохранён');
  } catch(e) {
    console.error('[OneSignal] Error:', e);
  }
}

// ════════════════════════════════════════════════════════════
// REPLY — ответ на сообщение
// ════════════════════════════════════════════════════════════
let _replyTo = null; // текущее сообщение на которое отвечаем

function startReply(msgIndex) {
  const chatId = currentPrivateChatId;
  if (!chatId) return;
  const messages = privateChats[chatId] || [];
  const msg = messages[msgIndex];
  if (!msg) return;

  // Сохраняем сообщение и индекс для fallback
  _replyTo = { ...msg, _index: msgIndex };

  const bar = document.getElementById('pc-reply-bar');
  const nameEl = document.getElementById('pc-reply-name');
  const textEl = document.getElementById('pc-reply-text');

  if (bar && nameEl && textEl) {
    nameEl.textContent = msg.senderName || 'Пользователь';
    textEl.textContent = (msg.text || '').substring(0, 100);
    bar.style.display = 'block';
  }

  // Фокус на поле ввода
  const input = document.getElementById('pc-input');
  if (input) input.focus();
}

function cancelReply() {
  _replyTo = null;
  const bar = document.getElementById('pc-reply-bar');
  if (bar) bar.style.display = 'none';
}

function scrollToMsg(msgId) {
  console.log('📍 scrollToMsg called with msgId:', msgId);
  
  if (!msgId) {
    console.log('  ❌ msgId is empty');
    return;
  }
  
  let el = null;
  
  // 1. Пробуем найти по точному ID
  el = document.getElementById('msg-' + msgId);
  if (el) console.log('  ✅ Found by exact ID');
  
  // 2. Если не нашли, ищем по data-msg-dbid
  if (!el) {
    el = document.querySelector(`[data-msg-dbid="${msgId}"]`);
    if (el) console.log('  ✅ Found by data-msg-dbid');
  }
  
  // 3. Если это похоже на индекс (idx-123), ищем по индексу
  if (!el && String(msgId).startsWith('idx-')) {
    const idx = msgId.replace('idx-', '');
    el = document.querySelector(`[data-msg-idx="${idx}"]`);
    if (el) console.log('  ✅ Found by idx');
  }
  
  // 4. Последняя попытка - ищем в массиве сообщений
  if (!el && currentPrivateChatId) {
    const messages = privateChats[currentPrivateChatId] || [];
    console.log('  🔍 Searching in messages array, total messages:', messages.length);
    const msgIndex = messages.findIndex(m => m.dbId == msgId || m.id == msgId);
    if (msgIndex !== -1) {
      console.log('  ✅ Found in array at index:', msgIndex);
      el = document.querySelector(`[data-msg-idx="${msgIndex}"]`);
    }
  }
  
  if (el) {
    console.log('  ✅ Element found, scrolling...');
    // Скроллим к элементу
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Подсвечиваем
    const bubble = el.querySelector('.msg-bubble');
    if (bubble) {
      const isMine = bubble.style.background.includes('var(--primary)');
      const originalBg = bubble.style.background;
      
      // Анимация подсветки
      bubble.style.transition = 'background 0.3s';
      bubble.style.background = isMine ? 'rgba(74,144,217,0.8)' : 'rgba(74,144,217,0.15)';
      
      setTimeout(() => { 
        bubble.style.background = originalBg; 
      }, 1500);
    }
  } else {
    console.log('  ❌ Element NOT found!');
  }
}

// ════════════════════════════════════════════════════════════
// SWIPE TO REPLY — механика свайпа как в Telegram
// ════════════════════════════════════════════════════════════
function initSwipeToReply() {
  const messages = document.querySelectorAll('.swipeable-msg');
  
  messages.forEach(msgEl => {
    const bubble = msgEl.querySelector('.msg-bubble');
    const icon = msgEl.querySelector('.swipe-reply-icon');
    if (!bubble || !icon) return;
    
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let swipeStarted = false; // Флаг что свайп действительно начался
    let startTime = 0;
    
    const maxSwipe = 80; // максимальное расстояние свайпа
    const threshold = 60; // порог для активации ответа
    const minMoveToStart = 10; // минимальное движение для начала свайпа
    
    bubble.addEventListener('touchstart', (e) => {
      // Блокируем свайп если идёт двойной тап
      if (_doubleTapInProgress) {
        isDragging = false;
        swipeStarted = false;
        return;
      }
      
      startX = e.touches[0].clientX;
      startTime = Date.now();
      isDragging = true;
      swipeStarted = false; // Свайп ещё не начался
      bubble.style.transition = 'none';
      icon.style.transition = 'none';
    }, { passive: true });
    
    bubble.addEventListener('touchmove', (e) => {
      if (!isDragging || _doubleTapInProgress) return;
      
      currentX = e.touches[0].clientX;
      const deltaX = currentX - startX;
      const swipeDistance = -deltaX; // свайп влево
      
      // Свайп начинается только если движение больше minMoveToStart
      if (!swipeStarted && Math.abs(swipeDistance) > minMoveToStart) {
        swipeStarted = true;
      }
      
      // Применяем визуальные эффекты только если свайп начался
      if (swipeStarted && swipeDistance > 0 && swipeDistance < maxSwipe) {
        const actualSwipe = Math.min(swipeDistance, maxSwipe);
        bubble.style.transform = `translateX(-${actualSwipe}px)`;
        
        // Показываем иконку по мере свайпа
        const opacity = Math.min(actualSwipe / threshold, 1);
        icon.style.opacity = opacity;
      }
    }, { passive: true });
    
    const endTouch = () => {
      if (!isDragging || _doubleTapInProgress) {
        // Всё равно сбрасываем
        isDragging = false;
        swipeStarted = false;
        bubble.style.transition = 'transform 0.2s ease-out';
        icon.style.transition = 'opacity 0.2s';
        bubble.style.transform = 'translateX(0)';
        icon.style.opacity = '0';
        startX = 0;
        currentX = 0;
        return;
      }
      isDragging = false;
      
      const deltaX = currentX - startX;
      const swipeDistance = -deltaX; // свайп влево
      const swipeTime = Date.now() - startTime;
      
      // Активируем ответ ТОЛЬКО если:
      // 1. Свайп действительно начался (движение > 10px)
      // 2. Достигнут порог (60px) ИЛИ быстрый свайп (>40px за <200ms)
      if (swipeStarted && ((swipeDistance > threshold) || (swipeDistance > 40 && swipeTime < 200))) {
        const msgIdx = msgEl.getAttribute('data-msg-idx');
        startReply(parseInt(msgIdx));
        
        // Небольшая вибрация
        if (navigator.vibrate) navigator.vibrate(50);
      }
      
      // Возвращаем на место
      bubble.style.transition = 'transform 0.2s ease-out';
      icon.style.transition = 'opacity 0.2s';
      bubble.style.transform = 'translateX(0)';
      icon.style.opacity = '0';
      
      swipeStarted = false;
      startX = 0;
      currentX = 0;
    };
    
    bubble.addEventListener('touchend', endTouch);
    bubble.addEventListener('touchcancel', endTouch);
  });
}

// ════════════════════════════════════════════════════════════
// MESSAGE REACTIONS — реакции на сообщения
// ════════════════════════════════════════════════════════════
const REACTIONS = {
  heart: '❤️',
  happy: '🐶',
  sad: '😢'
};

let _reactionMenuTimeout = null;
let _reactionMenuVisible = false;
let _doubleTapInProgress = false; // Флаг для блокировки свайпа при двойном тапе

function initMessageReactions() {
  const bubbles = document.querySelectorAll('.msg-bubble[data-message-id]');
  
  bubbles.forEach(bubble => {
    const messageId = bubble.getAttribute('data-message-id');
    if (!messageId || messageId === '') return;
    
    let tapCount = 0;
    let tapTimer = null;
    let longPressTimer = null;
    let touchStartTime = 0;
    
    bubble.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      
      // Long press для меню реакций
      longPressTimer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(50);
        const touch = e.touches[0];
        showReactionMenu(messageId, touch.clientX, touch.clientY);
      }, 500);
      
      // Двойной тап
      tapCount++;
      if (tapCount === 1) {
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 300);
      } else if (tapCount === 2) {
        clearTimeout(tapTimer);
        clearTimeout(longPressTimer);
        tapCount = 0;
        
        // Устанавливаем флаг чтобы заблокировать свайп
        _doubleTapInProgress = true;
        setTimeout(() => { _doubleTapInProgress = false; }, 500);
        
        // Останавливаем всплытие чтобы не сработал свайп
        e.preventDefault();
        e.stopPropagation();
        
        toggleReaction(messageId, 'heart');
        if (navigator.vibrate) navigator.vibrate(30);
      }
    }, { passive: false });
    
    bubble.addEventListener('touchend', (e) => {
      clearTimeout(longPressTimer);
      
      // Если это был быстрый двойной тап - останавливаем событие
      const touchDuration = Date.now() - touchStartTime;
      if (tapCount === 2 || touchDuration < 100) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { passive: false });
    
    bubble.addEventListener('touchmove', () => {
      clearTimeout(longPressTimer);
      // При движении сбрасываем счётчик тапов
      tapCount = 0;
      clearTimeout(tapTimer);
    });
  });
}

function showReactionMenu(messageId, x, y) {
  // Удаляем старое меню если есть
  hideReactionMenu();
  
  const menu = document.createElement('div');
  menu.id = 'reaction-menu';
  menu.style.cssText = `
    position: fixed;
    z-index: 99999;
    background: var(--white);
    border-radius: 24px;
    padding: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    display: flex;
    gap: 4px;
    animation: scaleIn 0.2s ease;
  `;
  
  // Позиционируем меню
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.left = Math.min(x - rect.width / 2, window.innerWidth - rect.width - 10) + 'px';
  menu.style.top = Math.max(y - rect.height - 10, 10) + 'px';
  
  // Добавляем кнопки реакций
  Object.entries(REACTIONS).forEach(([type, emoji]) => {
    const btn = document.createElement('button');
    btn.textContent = emoji;
    btn.style.cssText = `
      width: 48px;
      height: 48px;
      border: none;
      background: var(--bg);
      border-radius: 50%;
      font-size: 24px;
      cursor: pointer;
      transition: transform 0.2s, background 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    btn.onclick = () => {
      toggleReaction(messageId, type);
      hideReactionMenu();
    };
    btn.onmousedown = (e) => e.preventDefault(); // Предотвращаем потерю фокуса
    menu.appendChild(btn);
  });
  
  _reactionMenuVisible = true;
  
  // Закрываем при клике вне меню
  setTimeout(() => {
    document.addEventListener('click', hideReactionMenu, { once: true });
  }, 100);
}

function hideReactionMenu() {
  const menu = document.getElementById('reaction-menu');
  if (menu) {
    menu.style.animation = 'scaleOut 0.15s ease';
    setTimeout(() => menu.remove(), 150);
  }
  _reactionMenuVisible = false;
}

async function toggleReaction(messageId, reactionType) {
  if (!supabaseClient || !messageId) return;
  const myUserId = currentUser?.id || userId;
  const myName = (JSON.parse(localStorage.getItem('df_profile') || '{}')).name || 'Гость';
  
  console.log('🎭 Toggle reaction:', reactionType, 'for message:', messageId);
  
  try {
    // Проверяем есть ли уже реакция от этого пользователя
    const { data: existing, error: fetchError } = await supabaseClient
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId)
      .eq('user_id', myUserId);
    
    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return;
    }
    
    const existingReaction = existing && existing.length > 0 ? existing[0] : null;
    
    if (existingReaction) {
      console.log('  Found existing reaction:', existingReaction.reaction_type);
      
      if (existingReaction.reaction_type === reactionType) {
        // Удаляем если нажали на ту же реакцию
        console.log('  ❌ Removing reaction');
        await supabaseClient
          .from('message_reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Обновляем на другую реакцию
        console.log('  🔄 Updating to:', reactionType);
        await supabaseClient
          .from('message_reactions')
          .update({ reaction_type: reactionType })
          .eq('id', existingReaction.id);
      }
    } else {
      // Создаём новую реакцию
      console.log('  ➕ Creating new reaction');
      await supabaseClient
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: myUserId,
          user_name: myName,
          reaction_type: reactionType
        });
    }
    
    // Обновляем отображение
    loadReactionsForMessage(messageId);
  } catch(e) {
    console.error('❌ Toggle reaction error:', e);
  }
}

async function loadReactionsForMessage(messageId) {
  if (!supabaseClient || !messageId) return;
  
  try {
    const { data, error } = await supabaseClient
      .from('message_reactions')
      .select('*')
      .eq('message_id', messageId);
    
    if (error) throw error;
    
    renderReactions(messageId, data || []);
  } catch(e) {
    console.error('Load reactions error:', e);
  }
}

function renderReactions(messageId, reactions) {
  const container = document.getElementById(`reactions-${messageId}`);
  if (!container) return;
  
  if (reactions.length === 0) {
    container.style.display = 'none';
    return;
  }
  
  // Группируем по типу
  const grouped = {};
  reactions.forEach(r => {
    if (!grouped[r.reaction_type]) {
      grouped[r.reaction_type] = [];
    }
    grouped[r.reaction_type].push(r);
  });
  
  const myUserId = currentUser?.id || userId;
  
  container.innerHTML = Object.entries(grouped).map(([type, list]) => {
    const hasMyReaction = list.some(r => r.user_id === myUserId);
    const names = list.map(r => r.user_name || 'Пользователь').join(', ');
    
    return `
      <div 
        onclick="toggleReaction('${messageId}', '${type}')"
        title="${names}"
        style="
          display: flex;
          align-items: center;
          gap: 4px;
          background: ${hasMyReaction ? 'rgba(74,144,217,0.15)' : 'rgba(0,0,0,0.05)'};
          border: 1.5px solid ${hasMyReaction ? 'var(--primary)' : 'transparent'};
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        "
        onmouseover="this.style.transform='scale(1.1)'"
        onmouseout="this.style.transform='scale(1)'"
      >
        <span>${REACTIONS[type]}</span>
        <span style="font-size: 12px; font-weight: 600; color: ${hasMyReaction ? 'var(--primary)' : 'var(--text-secondary)'};">${list.length}</span>
      </div>
    `;
  }).join('');
  
  container.style.display = 'flex';
}

// Добавляем CSS анимации для меню
if (!document.getElementById('reaction-animations')) {
  const style = document.createElement('style');
  style.id = 'reaction-animations';
  style.textContent = `
    @keyframes scaleIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    @keyframes scaleOut {
      from { transform: scale(1); opacity: 1; }
      to { transform: scale(0.8); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ════════════════════════════════════════════════════════════
// МОИ ПУБЛИКАЦИИ В ПРОФИЛЕ
// ════════════════════════════════════════════════════════════

async function loadMyProfilePosts() {
  const list = document.getElementById('prof-posts-list');
  const countEl = document.getElementById('prof-posts-count');
  if (!list) return;

  if (!supabaseClient || !currentUser) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;">Войдите в аккаунт</div>';
    return;
  }

  list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;">Загружаем...</div>';

  try {
    const { data: posts, error } = await supabaseClient
      .from('posts')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    if (countEl) countEl.textContent = posts && posts.length ? posts.length + ' публ.' : '';

    if (!posts || !posts.length) {
      list.innerHTML = `
        <div style="text-align:center;padding:32px 0;color:var(--text-secondary);">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" style="display:block;margin:0 auto 8px;"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          <div style="font-size:14px;font-weight:600;margin-bottom:4px;">Публикаций пока нет</div>
          <div style="font-size:12px;">Напишите первый пост в ленте!</div>
        </div>`;
      return;
    }

    // Используем buildPostCard из feed.js если доступна, иначе простой рендер
    if (typeof buildPostCard === 'function') {
      // Получаем лайки
      var myLikes = new Set();
      if (typeof getMyLikes === 'function') {
        myLikes = await getMyLikes(posts.map(p => p.id));
      }
      // Добавляем посты в _feedPosts чтобы лайки/комменты работали
      if (typeof _feedPosts !== 'undefined') {
        posts.forEach(post => {
          if (!_feedPosts.find(fp => fp.id === post.id)) _feedPosts.push(post);
        });
      }
      list.innerHTML = posts.map(post =>
        '<div id="feed-post-' + post.id + '">' + buildPostCard(post, myLikes.has(post.id)) + '</div>'
      ).join('');
    } else {
      // Простой fallback рендер
      list.innerHTML = posts.map(post => {
        const timeStr = post.created_at ? new Date(post.created_at).toLocaleDateString('ru-RU') : '';
        const photosHtml = post.photos && post.photos.length
          ? '<div style="margin:8px 0;border-radius:10px;overflow:hidden;"><img src="' + post.photos[0] + '" style="width:100%;max-height:200px;object-fit:cover;border-radius:10px;"></div>'
          : '';
        return '<div style="background:var(--white);border-radius:16px;box-shadow:var(--shadow);padding:14px 16px;margin-bottom:10px;border:0.5px solid var(--border);">' +
          (post.text ? '<div style="font-size:14px;line-height:1.6;margin-bottom:6px;">' + post.text + '</div>' : '') +
          photosHtml +
          '<div style="font-size:11px;color:var(--text-secondary);margin-top:6px;">' + timeStr +
          ' · ❤️ ' + (post.likes_count || 0) + ' · 💬 ' + (post.comments_count || 0) + '</div>' +
          '</div>';
      }).join('');
    }
  } catch(e) {
    console.error('loadMyProfilePosts error:', e);
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;">Ошибка загрузки</div>';
  }
}

window.loadMyProfilePosts = loadMyProfilePosts;

// ════════════════════════════════════════════════════════════
// PROFILE SOCIAL DATA — питомцы, друзья, район, приюты
// ════════════════════════════════════════════════════════════

async function loadProfileMenuStats() {
  if (!supabaseClient || !currentUser) return;

  var p = JSON.parse(localStorage.getItem('df_profile') || '{}');
  var distEl = document.getElementById('prof-district-display');
  if (distEl) {
    distEl.innerHTML = p.district
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ' + (p.district || '')
      : '';
  }

  // Питомцы count
  try {
    var petsResult = await supabaseClient.from('pets').select('id').eq('user_id', currentUser.id);
    var petsStatEl = document.getElementById('prof-stat-pets');
    if (petsStatEl) petsStatEl.textContent = (petsResult.data || []).length;
  } catch(e) { console.error('Profile pets count error:', e); }
}

// Открыть свой профиль как социальную страницу (через openFullUserProfile)
function openMyProfilePage() {
  if (!currentUser) { showToast('Войдите в аккаунт'); return; }
  if (typeof openFullUserProfile === 'function') {
    openFullUserProfile(currentUser.id);
  }
}

window.loadProfileMenuStats = loadProfileMenuStats;
window.loadProfileSocialData = loadProfileMenuStats; // backward compat
window.openMyProfilePage = openMyProfilePage;
