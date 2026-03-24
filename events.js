// ════════════════════════════════════════════════════════════
// EVENTS ENGINE
// ════════════════════════════════════════════════════════════

let allEvents = [];
let currentEvent = null;
let myParticipations = {}; // eventId -> status
let currentEventFilter = 'all';

const EVENT_TYPES = {
  walk:     { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>', label: 'Прогулка',      color: '#7ED321' },
  meetup:   { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>', label: 'Встреча',        color: '#F5A623' },
  training: { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>', label: 'Тренировка',     color: '#4A90D9' },
  promo:    { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>', label: 'Акция',           color: '#9B59B6' },
  openday:  { icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', label: 'Открытый день',  color: '#E74C3C' },
};

// ── Форматирование даты ──────────────────────────────────────
function formatEventDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d - now;
  const days = Math.floor(diff / 86400000);
  const time = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  const dateOnly = d.toLocaleDateString('ru', { day: 'numeric', month: 'long' });
  if (days === 0) return `Сегодня, ${time}`;
  if (days === 1) return `Завтра, ${time}`;
  if (days > 1 && days < 7) return `${dateOnly}, ${time}`;
  return `${dateOnly} ${d.getFullYear()}, ${time}`;
}

function formatEventDateFull(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru', { weekday: 'long', day: 'numeric', month: 'long' }) +
    ', ' + d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

// ── Загрузка событий ─────────────────────────────────────────
async function loadEvents() {
  if (!supabaseClient) return;
  try {
    const now = new Date().toISOString();
    // Загружаем события
    const { data, error } = await supabaseClient
      .from('events')
      .select('*, businesses(name, type)')
      .gte('event_date', now)
      .order('event_date', { ascending: true })
      .limit(50);
    if (error) throw error;
    allEvents = data || [];

    // Загружаем количество участников для каждого события одним запросом
    if (allEvents.length > 0) {
      const eventIds = allEvents.map(e => e.id);
      const { data: parts } = await supabaseClient
        .from('event_participants')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('status', 'going');

      // Считаем участников по event_id
      const counts = {};
      (parts || []).forEach(p => {
        counts[p.event_id] = (counts[p.event_id] || 0) + 1;
      });
      allEvents.forEach(ev => { ev.participants_count = counts[ev.id] || 0; });
    }

    renderHomeEvents();
    if (document.getElementById('events')?.classList.contains('active') ||
        document.getElementById('events')?.style.display !== 'none') {
      renderEventsList();
    }
    if (currentUser) loadMyParticipations();
  } catch(e) {
    console.error('loadEvents error:', e);
  }
}

async function loadMyParticipations() {
  if (!supabaseClient || !currentUser) return;
  try {
    const { data } = await supabaseClient
      .from('event_participants')
      .select('event_id, status')
      .eq('user_id', currentUser.id);
    myParticipations = {};
    (data || []).forEach(p => { myParticipations[p.event_id] = p.status; });
  } catch(e) {}
}

// ── Блок на главной (горизонтальный скролл) ──────────────────
function renderHomeEvents() {
  const row = document.getElementById('home-events-row');
  if (!row) return;
  const upcoming = allEvents.slice(0, 6);
  if (!upcoming.length) {
    row.innerHTML = `<div class="ec" style="align-items:center;justify-content:center;color:var(--text-secondary);">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
      <div style="font-size:13px;text-align:center;">Событий пока нет.<br>Создайте первое!</div>
      <button class="btn btn-p btn-sm" style="margin-top:6px;" onclick="nav('createEvent')">+ Создать</button>
    </div>`;
    return;
  }
  row.innerHTML = upcoming.map(ev => {
    const t = EVENT_TYPES[ev.type] || EVENT_TYPES.meetup;
    const going = myParticipations[ev.id] === 'going';
    return `<div class="ec" onclick="openEventDetail('${ev.id}')">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
        <span style="color:${t.color};">${t.icon}</span>
        <span style="font-size:13px;font-weight:800;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ev.title}</span>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ${ev.address}</div>
      <div style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ${formatEventDate(ev.event_date)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px;">
        <span style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> ${ev.participants_count || 0} идут</span>
        <span style="font-size:11px;font-weight:700;color:${going ? 'var(--success)' : 'var(--primary)'};">${going ? '✓ Иду' : 'Записаться'}</span>
      </div>
    </div>`;
  }).join('');
}

// ── Список событий (отдельный экран) ─────────────────────────
function filterEvents(type, btn) {
  currentEventFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderEventsList();
}

function renderEventsList() {
  const list = document.getElementById('events-list');
  if (!list) return;
  const filtered = currentEventFilter === 'all'
    ? allEvents
    : allEvents.filter(ev => ev.type === currentEventFilter);

  if (!filtered.length) {
    list.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--text-secondary);">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--border)" stroke-width="1.5" stroke-linecap="round" style="margin-bottom:12px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <div style="font-size:16px;font-weight:700;">Событий нет</div>
      <div style="font-size:13px;margin-top:6px;">Создайте первое в вашем районе!</div>
      <button class="btn btn-p" style="margin-top:16px;max-width:200px;" onclick="nav('createEvent')">+ Создать событие</button>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(ev => {
    const t = EVENT_TYPES[ev.type] || EVENT_TYPES.meetup;
    const going = myParticipations[ev.id] === 'going';
    const isFull = ev.max_participants && (ev.participants_count || 0) >= ev.max_participants;
    const isOwn = currentUser && ev.creator_id === currentUser.id;
    return `<div class="ev-full-card" onclick="openEventDetail('${ev.id}')">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="width:48px;height:48px;border-radius:14px;background:${t.color}22;display:flex;align-items:center;justify-content:center;color:${t.color};flex-shrink:0;">${t.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span class="ev-type-badge" style="background:${t.color}22;color:${t.color};">${t.label}</span>
            ${isOwn ? '<span class="ev-type-badge" style="background:#F5A62322;color:#F5A623;">Моё</span>' : ''}
            ${going ? '<span class="ev-type-badge" style="background:#7ED32122;color:#7ED321;">✓ Иду</span>' : ''}
          </div>
          <div style="font-size:15px;font-weight:800;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ev.title}</div>
          <div style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ${ev.address}</div>
          <div style="font-size:12px;color:var(--text-secondary);display:flex;align-items:center;gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> ${formatEventDate(ev.event_date)}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border);">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> ${ev.participants_count || 0}${ev.max_participants ? '/' + ev.max_participants : ''}</span>
          ${ev.price && ev.price !== 'Бесплатно' ? `<span style="font-size:13px;color:var(--text-secondary);">· ${ev.price}</span>` : '<span style="font-size:12px;font-weight:700;color:var(--success);">Бесплатно</span>'}
        </div>
        <span style="font-size:13px;font-weight:700;color:${isFull ? 'var(--text-secondary)' : 'var(--primary)'};">${isFull ? 'Мест нет' : going ? '✓ Записан' : 'Подробнее →'}</span>
      </div>
    </div>`;
  }).join('');
}

// ── Детальный экран события ───────────────────────────────────
async function openEventDetail(eventId) {
  let ev = allEvents.find(e => e.id === eventId);
  if (!ev) {
    try {
      const { data } = await supabaseClient.from('events').select('*, businesses(name,type)').eq('id', eventId).single();
      ev = data;
      if (ev) allEvents.push(ev);
    } catch(e) { return; }
  }
  if (!ev) return;
  currentEvent = ev;

  const t = EVENT_TYPES[ev.type] || EVENT_TYPES.meetup;
  document.getElementById('ev-topbar-title').textContent = ev.title;
  document.getElementById('ev-type-icon').innerHTML = t.icon;
  document.getElementById('ev-type-icon').style.color = t.color;
  document.getElementById('ev-title').textContent = ev.title;
  document.getElementById('ev-type-label').textContent = t.label;
  document.getElementById('ev-date-badge').textContent = formatEventDate(ev.event_date);
  document.getElementById('ev-price-badge').textContent = ev.price || 'Бесплатно';
  document.getElementById('ev-address').textContent = ev.address;
  document.getElementById('ev-datetime').textContent = formatEventDateFull(ev.event_date);

  // Описание
  const descBlock = document.getElementById('ev-desc-block');
  if (ev.description) {
    document.getElementById('ev-desc').textContent = ev.description;
    descBlock.style.display = '';
  } else {
    descBlock.style.display = 'none';
  }

  // Кнопка редактирования для организатора
  const editBtn = document.getElementById('ev-edit-btn');
  editBtn.style.display = (currentUser && ev.creator_id === currentUser.id) ? '' : 'none';

  // Фото блок — всегда показываем если есть фото или если организатор
  const photoBlock = document.getElementById('ev-photo-block');
  const photoImg = document.getElementById('ev-photo');
  const photoUploadBtn = document.getElementById('ev-photo-upload-btn');
  const eventPast = new Date(ev.event_date) < new Date();
  if (ev.photo_url) {
    photoImg.src = ev.photo_url;
    photoBlock.style.display = '';
    photoUploadBtn.style.display = 'none';
  } else if (eventPast && currentUser && ev.creator_id === currentUser.id) {
    photoBlock.style.display = '';
    photoImg.style.display = 'none';
    photoUploadBtn.style.display = '';
  } else {
    photoBlock.style.display = 'none';
  }

  // Организатор
  const orgBlock = document.getElementById('ev-organizer-block');
  if (ev.business_id && ev.businesses) {
    const biz = ev.businesses;
    const typeLabels = { trainer: 'Кинолог', clinic: 'Клиника', cafe: 'Кафе' };
    document.getElementById('ev-org-avatar').textContent = (biz.name || '?').substring(0,2).toUpperCase();
    document.getElementById('ev-org-name').textContent = biz.name;
    document.getElementById('ev-org-type').textContent = typeLabels[biz.type] || '';
    orgBlock.style.display = '';
  } else {
    orgBlock.style.display = 'none';
  }

  // Загружаем участников
  await loadEventParticipants(ev.id);
  nav('eventDetail');
}

async function loadEventParticipants(eventId) {
  try {
    const { data } = await supabaseClient
      .from('event_participants')
      .select('user_id, status')
      .eq('event_id', eventId)
      .eq('status', 'going');

    const count = (data || []).length;
    const ev = allEvents.find(e => e.id === eventId);
    if (ev) ev.participants_count = count;

    const isFull = currentEvent?.max_participants && count >= currentEvent.max_participants;
    const going = myParticipations[eventId] === 'going';
    const onWaitlist = myParticipations[eventId] === 'waitlist';

    document.getElementById('ev-count').textContent =
      `${count}${currentEvent?.max_participants ? '/' + currentEvent.max_participants : ''} идут`;

    // Аватары участников
    const avatarsEl = document.getElementById('ev-participants-avatars');
    const shown = (data || []).slice(0, 12);
    avatarsEl.innerHTML = shown.map((p, i) => {
      const letters = p.user_id.substring(0, 2).toUpperCase();
      const hue = (p.user_id.charCodeAt(0) * 47) % 360;
      return `<div style="width:36px;height:36px;border-radius:50%;background:hsl(${hue},60%,60%);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:white;border:2px solid var(--white);">${letters}</div>`;
    }).join('') + (count > 12 ? `<div style="width:36px;height:36px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text-secondary);">+${count - 12}</div>` : '');

    // RSVP кнопка
    const btn = document.getElementById('ev-rsvp-btn');
    if (going) {
      btn.textContent = '✓ Я иду (отменить)';
      btn.className = 'btn btn-g';
    } else if (onWaitlist) {
      btn.textContent = '⏳ Лист ожидания';
      btn.className = 'btn btn-g';
    } else if (isFull) {
      btn.textContent = 'Записаться в очередь';
      btn.className = 'btn btn-o';
    } else {
      btn.textContent = '✓ Иду!';
      btn.className = 'btn btn-p';
    }
  } catch(e) {
    console.error('loadEventParticipants error:', e);
  }
}

// ── RSVP ─────────────────────────────────────────────────────
async function toggleRSVP() {
  if (!currentUser) { showToast('Войдите чтобы записаться'); return; }
  if (!currentEvent) return;

  const eventId = currentEvent.id;
  const going = myParticipations[eventId] === 'going';
  const isFull = currentEvent.max_participants &&
    (currentEvent.participants_count || 0) >= currentEvent.max_participants;

  try {
    if (going) {
      // Отменяем запись
      await supabaseClient.from('event_participants')
        .delete().eq('event_id', eventId).eq('user_id', currentUser.id);
      delete myParticipations[eventId];
      showToast('Запись отменена');
    } else if (isFull) {
      // Лист ожидания
      await supabaseClient.from('event_participants')
        .upsert({ event_id: eventId, user_id: currentUser.id, status: 'waitlist' });
      myParticipations[eventId] = 'waitlist';
      showToast('⏳ Добавлены в лист ожидания');
    } else {
      // Записываемся
      await supabaseClient.from('event_participants')
        .upsert({ event_id: eventId, user_id: currentUser.id, status: 'going' });
      myParticipations[eventId] = 'going';
      showToast('✅ Вы записаны!', '#7ED321');
    }
    await loadEventParticipants(eventId);
    renderHomeEvents();
    renderEventsList();
  } catch(e) {
    console.error('RSVP error:', e);
    showToast('❌ Ошибка. Попробуйте ещё раз.');
  }
}

// ── Чат события ───────────────────────────────────────────────
function openEventChat() {
  if (!currentEvent) return;
  if (!currentUser) { showToast('Войдите чтобы открыть чат'); return; }
  openEventGroupChat(currentEvent);
}

function openEventGroupChat(ev) {
  const roomId = 'event_' + ev.id;
  const chatId = roomId;
  const name = '📅 ' + ev.title;

  contactBook[chatId] = {
    name: name, initials: '📅',
    grad: 'linear-gradient(135deg,#4A90D9,#7B5EA7)',
    isEventChat: true, roomId: roomId
  };
  localStorage.setItem('df_contacts', JSON.stringify(contactBook));

  currentPrivateChatId = chatId;
  privateChats[chatId] = []; // очищаем — сейчас загрузим из БД

  document.getElementById('pc-avatar').textContent = '📅';
  document.getElementById('pc-avatar').style.background = 'linear-gradient(135deg,#4A90D9,#7B5EA7)';
  document.getElementById('pc-name').textContent = name;
  document.getElementById('pc-online').textContent = '👥 Групповой чат';

  renderPrivateChatMessages(chatId);
  loadEventChatFromServer(chatId, roomId);
  // Убеждаемся что фоновый polling запущен (запускается один раз)
  initEventLastIds();
  startBgEventPolling();
  clearUnreadMessages(chatId);
  nav('privateChat');
}

// Загружаем всю историю из БД — единственный источник истины
async function loadEventChatFromServer(chatId, roomId) {
  if (!supabaseClient) return;
  try {
    const { data } = await supabaseClient
      .from('direct_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(500);

    const myUserId = currentUser?.id || userId;
    privateChats[chatId] = (data || []).map(m => ({
      text: m.text,
      sender: m.sender_id === myUserId ? 'user' : 'other',
      time: m.time,
      senderName: m.sender_name,
      senderId: m.sender_id,
      dbId: m.id,
    }));
    if (currentPrivateChatId === chatId) renderPrivateChatMessages(chatId);
  } catch(e) { console.error('loadEventChat error:', e); }
}

// ── Фоновый polling event-чатов — ОТКЛЮЧЁН ──────────────────
// Заменён на единую Realtime подписку (startRealtimeDMSubscription)
let bgEventPollInterval = null;
const eventLastIds = {};

function startBgEventPolling() {
  // Event-чаты теперь получают сообщения через Realtime Postgres Changes
  startRealtimeDMSubscription();
}

// Инициализируем курсоры lastId из уже загруженных сообщений
function initEventLastIds() {
  Object.keys(privateChats).forEach(chatId => {
    if (!chatId.startsWith('event_')) return;
    const msgs = privateChats[chatId];
    if (!msgs.length) return;
    const maxId = Math.max(...msgs.map(m => m.dbId || 0).filter(Boolean));
    if (maxId > 0) eventLastIds[chatId] = maxId;
  });
}

// startEventChatPolling теперь просто запускает фоновый polling
// (оставляем для обратной совместимости вызовов)
function startEventChatPolling(chatId, roomId) {
  initEventLastIds();
  startBgEventPolling();
}

// ── Профиль организатора ──────────────────────────────────────
function openOrganizerProfile() {
  if (!currentEvent?.business_id) return;
  openBusinessProfile(currentEvent.business_id);
}

// ── Создание события ─────────────────────────────────────────
function initCreateEvent() {
  // Тип-пикер
  const opts = document.querySelectorAll('.ev-type-opt');
  opts.forEach(opt => {
    opt.addEventListener('click', () => {
      opts.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });
  // Выбираем первый по умолчанию
  if (opts[0]) opts[0].classList.add('active');

  // Дата по умолчанию = завтра
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateInput = document.getElementById('ev-create-date');
  if (dateInput) dateInput.value = tomorrow.toISOString().split('T')[0];
  const timeInput = document.getElementById('ev-create-time');
  if (timeInput) timeInput.value = '10:00';

  // Привязка к бизнесу
  const bizAttach = document.getElementById('ev-biz-attach');
  const bizPicker = document.getElementById('ev-biz-picker');
  if (userBusinesses.length > 0) {
    bizAttach.style.display = '';
    bizPicker.innerHTML = `<label class="ev-type-opt active" data-biz-id="">👤 Лично</label>` +
      userBusinesses.map(b => `<label class="ev-type-opt" data-biz-id="${b.id}">${b.name}</label>`).join('');
    bizPicker.querySelectorAll('.ev-type-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        bizPicker.querySelectorAll('.ev-type-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });
  } else {
    bizAttach.style.display = 'none';
  }
}

async function submitCreateEvent() {
  if (!currentUser) { showToast('Войдите чтобы создать событие'); return; }

  const typeOpt = document.querySelector('.ev-type-opt.active');
  const type = typeOpt?.dataset.type || 'meetup';
  const title = document.getElementById('ev-create-title')?.value.trim();
  const desc = document.getElementById('ev-create-desc')?.value.trim();
  const address = document.getElementById('ev-create-address')?.value.trim();
  const date = document.getElementById('ev-create-date')?.value;
  const time = document.getElementById('ev-create-time')?.value;
  const price = document.getElementById('ev-create-price')?.value.trim() || 'Бесплатно';
  const limit = document.getElementById('ev-create-limit')?.value;
  const recur = document.getElementById('ev-create-recur')?.value;

  if (!title) { showToast('❌ Укажите название'); return; }
  if (!address) { showToast('❌ Укажите место'); return; }
  if (!date || !time) { showToast('❌ Укажите дату и время'); return; }

  // Бизнес-организатор
  const activeBizOpt = document.querySelector('#ev-biz-picker .ev-type-opt.active');
  const businessId = activeBizOpt?.dataset.bizId || null;

  const eventDate = new Date(date + 'T' + time);
  if (eventDate < new Date()) { showToast('❌ Дата уже прошла'); return; }

  try {
    const { data, error } = await supabaseClient.from('events').insert({
      creator_id: currentUser.id,
      business_id: businessId || null,
      type,
      title,
      description: desc,
      address,
      event_date: eventDate.toISOString(),
      price,
      max_participants: limit ? parseInt(limit) : null,
      is_recurring: !!recur,
      recur_rule: recur || null,
    }).select().single();

    if (error) throw error;

    // Сразу записываемся сами
    await supabaseClient.from('event_participants').insert({
      event_id: data.id,
      user_id: currentUser.id,
      status: 'going'
    });
    myParticipations[data.id] = 'going';
    allEvents.unshift({ ...data, participants_count: 1 });
    allEvents.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

    showToast('✅ Событие создано!', '#7ED321');
    renderHomeEvents();
    nav('events');
    renderEventsList();
  } catch(e) {
    console.error('createEvent error:', e);
    showToast('❌ ' + (e.message || 'Ошибка создания'));
  }
}

// ── Загрузка событий в профиле бизнеса ───────────────────────
async function loadBusinessEvents(businessId) {
  if (!supabaseClient) return [];
  try {
    const now = new Date().toISOString();
    const { data } = await supabaseClient
      .from('events')
      .select('*')
      .eq('business_id', businessId)
      .gte('event_date', now)
      .order('event_date', { ascending: true })
      .limit(5);
    return data || [];
  } catch(e) { return []; }
}

// Патчим openBusinessProfile чтобы показывать события бизнеса
const _origOpenBizProfile = window.openBusinessProfile;
window.openBusinessProfile = async function(id) {
  await _origOpenBizProfile(id);
  // Добавляем блок событий
  const bizObj = loadedBusinesses.find(b => b.id === id);
  if (!bizObj?.id) return;
  const events = await loadBusinessEvents(bizObj.id);
  if (!events.length) return;
  const overviewEl = document.getElementById('tc-spec-overview');
  if (!overviewEl) return;
  const old = document.getElementById('biz-events-block');
  if (old) old.remove();
  const div = document.createElement('div');
  div.id = 'biz-events-block';
  div.className = 'card';
  div.innerHTML = `<h3 style="margin-bottom:12px;">📅 Ближайшие события</h3>` +
    events.map(ev => {
      const t = EVENT_TYPES[ev.type] || EVENT_TYPES.meetup;
      return `<div onclick="openEventDetail('${ev.id}')" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;">
        <div style="width:40px;height:40px;border-radius:12px;background:${t.color}22;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${t.icon}</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:700;">${ev.title}</div>
          <div style="font-size:12px;color:var(--text-secondary);">🕐 ${formatEventDate(ev.event_date)}</div>
        </div>
        <span style="font-size:13px;color:var(--primary);font-weight:700;">›</span>
      </div>`;
    }).join('') +
    `<button class="btn btn-o" style="margin-top:10px;" onclick="nav('createEvent')">+ Добавить событие</button>`;
  overviewEl.appendChild(div);
};

// ── Nav патч — инициализация событий ─────────────────────────
const _origNavEvents = window.nav;
window.nav = function(id) {
  _origNavEvents(id);
  if (id === 'events') {
    renderEventsList();
    if (supabaseClient) loadEvents();
  }
  if (id === 'createEvent') {
    setTimeout(initCreateEvent, 50);
  }
  if (id === 'home' && supabaseClient) {
    loadEvents();
  }
  // Заполняем экран бронирования реальными данными
  if (id === 'booking') {
    setTimeout(populateBookingScreen, 30);
  }
};

// Загружаем события при старте (после инициализации Supabase)
setTimeout(() => { if (supabaseClient) loadEvents(); }, 2000);

// ══════════════════════════════════════════════════════════════
// ══  СИСТЕМА ОТЗЫВОВ  ════════════════════════════════════════
// ══════════════════════════════════════════════════════════════

let reviewModalBizId = null;
let reviewModalBizName = '';

// Создаём модальное окно для отзыва
(function createReviewModal() {
  const shell = document.querySelector('.phone-shell');
  if (!shell) return;
  const modal = document.createElement('div');
  modal.id = 'review-modal';
  modal.className = 'modal-ov';
  modal.innerHTML = `
    <div class="modal" style="padding:20px;">
      <div class="mhandle"></div>
      <h2 style="margin-bottom:4px;">⭐ Оставить отзыв</h2>
      <p id="review-modal-biz" style="font-size:14px;color:var(--text-secondary);margin-bottom:16px;"></p>
      
      <div style="margin-bottom:16px;">
        <label class="lbl">Ваша оценка</label>
        <div id="review-stars-pick" style="display:flex;gap:6px;font-size:32px;cursor:pointer;">
          <span data-star="1" onclick="pickReviewStar(1)">☆</span>
          <span data-star="2" onclick="pickReviewStar(2)">☆</span>
          <span data-star="3" onclick="pickReviewStar(3)">☆</span>
          <span data-star="4" onclick="pickReviewStar(4)">☆</span>
          <span data-star="5" onclick="pickReviewStar(5)">☆</span>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label class="lbl">Ваш отзыв</label>
        <textarea id="review-text" class="input" style="height:100px;padding:12px 16px;resize:none;line-height:1.5;" placeholder="Расскажите о вашем опыте..."></textarea>
      </div>

      <div style="display:flex;gap:10px;">
        <button class="btn btn-g" style="flex:1;" onclick="closeReviewModal()">Отмена</button>
        <button class="btn btn-p" style="flex:1;" onclick="submitReview()">Отправить ⭐</button>
      </div>
    </div>
  `;
  shell.appendChild(modal);
  
  // Закрытие по тапу на фон
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeReviewModal();
  });
})();

let selectedReviewStars = 0;

function pickReviewStar(n) {
  selectedReviewStars = n;
  document.querySelectorAll('#review-stars-pick span').forEach(s => {
    const v = parseInt(s.dataset.star);
    s.textContent = v <= n ? '⭐' : '☆';
  });
}

function openReviewForm(bizId, bizName) {
  // Можно вызвать из success-экрана или из профиля бизнеса
  if (!bizId && !bizName) {
    // Из success-экрана
    const btn = document.getElementById('succ-review-btn');
    bizId = btn?.dataset.bizId || localStorage.getItem('last_booking_biz_id');
    bizName = btn?.dataset.bizName || localStorage.getItem('last_booking_biz_name');
  }
  
  if (!bizId && !bizName) {
    showToast('Ошибка: бизнес не найден');
    return;
  }
  
  reviewModalBizId = bizId;
  reviewModalBizName = bizName;
  selectedReviewStars = 0;
  
  document.getElementById('review-modal-biz').textContent = bizName;
  document.getElementById('review-text').value = '';
  document.querySelectorAll('#review-stars-pick span').forEach(s => s.textContent = '☆');
  
  document.getElementById('review-modal').classList.add('open');
}

function closeReviewModal() {
  document.getElementById('review-modal').classList.remove('open');
}

async function submitReview() {
  if (!currentUser) {
    showToast('Войдите чтобы оставить отзыв');
    return;
  }
  
  if (selectedReviewStars === 0) {
    showToast('⭐ Поставьте оценку');
    return;
  }
  
  const text = document.getElementById('review-text').value.trim();
  if (!text) {
    showToast('✍️ Напишите отзыв');
    return;
  }

  if (!supabaseClient) {
    showToast('Нет подключения к серверу');
    return;
  }
  
  const profile = JSON.parse(localStorage.getItem('df_profile') || '{}');
  const userName = profile.name || 'Пользователь';
  
  // Находим booking_id для подтверждения что реальный клиент
  let bookingId = lastBookingId || localStorage.getItem('last_booking_id') || null;
  
  try {
    // Если нет bookingId — пробуем найти в БД
    if (!bookingId && supabaseClient && reviewModalBizId) {
      const { data: bk } = await supabaseClient
        .from('bookings')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('business_id', reviewModalBizId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (bk && bk.length) bookingId = bk[0].id;
    }
    
    const { data, error } = await supabaseClient
      .from('reviews')
      .insert({
        user_id: currentUser.id,
        business_id: reviewModalBizId,
        booking_id: bookingId,
        user_name: userName,
        rating: selectedReviewStars,
        text: text
      })
      .select()
      .single();
    
    if (error) {
      console.error('Review save error:', error);
      if (error.code === '42P01') {
        showToast('⚠️ Таблица отзывов не создана');
      } else if ((error.message || '').includes('unique') || (error.message || '').includes('duplicate') || error.code === '23505') {
        showToast('Вы уже оставляли отзыв этому специалисту');
      } else {
        showToast('❌ Ошибка: ' + (error.message || 'Не удалось сохранить'));
      }
      return;
    }
    
    // Рейтинг пересчитается триггером автоматически,
    // но обновим локальный кеш
    await refreshBusinessRatingLocal(reviewModalBizId);
    
    showToast('✅ Отзыв опубликован!', '#7ED321');
    closeReviewModal();
    
    // Если мы на экране specialist — обновляем отзывы
    const specScreen = document.getElementById('specialist');
    if (specScreen && specScreen.classList.contains('active')) {
      await loadAndRenderReviews(reviewModalBizId);
    }
    // Если на success — обновляем тоже
    const succScreen = document.getElementById('success');
    if (succScreen && succScreen.classList.contains('active')) {
      const reviewBtn = document.getElementById('succ-review-btn');
      if (reviewBtn) {
        reviewBtn.style.display = 'none';
        reviewBtn.insertAdjacentHTML('afterend', '<div style="padding:10px;background:rgba(126,211,33,0.1);border-radius:12px;text-align:center;font-size:13px;color:#5a9c18;font-weight:600;">✅ Спасибо за отзыв!</div>');
      }
    }
    
  } catch(e) {
    console.error('Review submit error:', e);
    showToast('❌ Ошибка отправки отзыва');
  }
}

// Обновляем локальный кеш рейтинга (БД обновляет триггер автоматически)
async function refreshBusinessRatingLocal(bizId) {
  if (!supabaseClient || !bizId) return;
  try {
    const { data } = await supabaseClient
      .from('businesses')
      .select('rating, reviews_count')
      .eq('id', bizId)
      .single();
    
    if (data) {
      const biz = loadedBusinesses.find(b => b.id === bizId);
      if (biz) {
        biz.rating = data.rating;
        biz.reviews_count = data.reviews_count;
      }
    }
  } catch(e) {
    console.error('Rating refresh error:', e);
  }
}

// Загрузка и отрисовка отзывов для бизнеса
async function loadAndRenderReviews(bizId) {
  const rb = document.getElementById('spec-reviews-block');
  if (!rb) return;
  
  // Ищем бизнес
  const biz = loadedBusinesses.find(b => b.id === bizId);
  const rating = biz?.rating || 0;
  const reviewsCount = biz?.reviews_count || 0;
  
  let reviewsHtml = '';
  let realReviews = [];
  
  // Загружаем из Supabase
    if (supabaseClient && bizId) {
    try {
      const { data, error } = await supabaseClient
        .from('reviews')
        .select('*')
        .eq('business_id', bizId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!error && data) {
        realReviews = data;
        
        // Если user_name отсутствует — подтягиваем имена из profiles
        const needNames = realReviews.filter(r => !r.user_name);
        if (needNames.length > 0) {
          const userIds = [...new Set(needNames.map(r => r.user_id))];
          try {
            const { data: profiles } = await supabaseClient
              .from('profiles')
              .select('user_id, name')
              .in('user_id', userIds);
            if (profiles) {
              const nameMap = {};
              profiles.forEach(p => { nameMap[p.user_id] = p.name; });
              realReviews.forEach(r => {
                if (!r.user_name && nameMap[r.user_id]) {
                  r.user_name = nameMap[r.user_id];
                }
              });
            }
          } catch(e) { /* profiles lookup optional */ }
        }
      }
    } catch(e) {
      console.error('Load reviews error:', e);
    }
  }
  
  // Проверяем, может ли текущий пользователь оставить отзыв (есть бронирование)
  let canReview = false;
  let alreadyReviewed = false;
  
  if (currentUser && supabaseClient && bizId) {
    try {
      // Проверяем наличие бронирования
      const { data: bookings } = await supabaseClient
        .from('bookings')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('business_id', bizId)
        .limit(1);
      
      canReview = bookings && bookings.length > 0;
      
      // Проверяем, не оставлял ли уже отзыв
      if (canReview) {
        const { data: existing } = await supabaseClient
          .from('reviews')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('business_id', bizId)
          .limit(1);
        
        alreadyReviewed = existing && existing.length > 0;
      }
    } catch(e) {
      console.error('Check review eligibility error:', e);
    }
  }
  
  // Формируем блок кнопки
  let reviewBtnHtml = '';
  if (currentUser && bizId) {
    if (alreadyReviewed) {
      reviewBtnHtml = `<div style="padding:12px;background:rgba(126,211,33,0.1);border-radius:12px;margin-bottom:14px;text-align:center;font-size:13px;color:#5a9c18;font-weight:600;">✅ Вы уже оставили отзыв</div>`;
    } else if (canReview) {
      reviewBtnHtml = `<button class="btn btn-p" style="margin-bottom:14px;" onclick="openReviewForm('${bizId}', '${(biz?.name || '').replace(/'/g, "\\'")}')">⭐ Оставить отзыв</button>`;
    } else {
      reviewBtnHtml = `<div style="padding:12px;background:rgba(74,144,217,0.08);border-radius:12px;margin-bottom:14px;text-align:center;font-size:13px;color:var(--text-secondary);">📋 Запишитесь на услугу, чтобы оставить отзыв</div>`;
    }
  }

  // Рендерим
  const starsDisplay = rating > 0 ? '⭐'.repeat(Math.round(rating)) : '☆☆☆☆☆';
  const totalReviews = realReviews.length || reviewsCount || 0;
  
  rb.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
      <div style="font-size:40px;font-weight:900;font-family:'Nunito',sans-serif;color:var(--primary);">${rating || '—'}</div>
      <div>
        <div class="stars">${starsDisplay}</div>
        <div style="font-size:13px;color:var(--text-secondary);">${totalReviews} отзыв${getReviewWord(totalReviews)}</div>
      </div>
    </div>
    ${reviewBtnHtml}
    <div style="border-top:1px solid var(--border);padding-top:14px;display:flex;flex-direction:column;gap:16px;">
      ${realReviews.length > 0 ? realReviews.map(r => renderReviewCard(r)).join('') : '<p style="font-size:13px;color:var(--text-secondary);text-align:center;">Пока нет отзывов. Будьте первым!</p>'}
    </div>`;
}

function renderReviewCard(r) {
  const name = r.user_name || r.author_name || 'Пользователь';
  const initials = getInitials(name);
  const stars = '⭐'.repeat(r.rating);
  const date = r.created_at ? new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const gradients = [
    'linear-gradient(135deg,#4A90D9,#7B5EA7)',
    'linear-gradient(135deg,#E91E63,#FF9800)',
    'linear-gradient(135deg,#00BCD4,#3F51B5)',
    'linear-gradient(135deg,#9C27B0,#E91E63)',
    'linear-gradient(135deg,#FF5722,#FF9800)',
    'linear-gradient(135deg,#4CAF50,#009688)',
  ];
  const grad = gradients[(name.length + (r.rating || 0)) % gradients.length];
  
  return `
    <div style="display:flex;gap:12px;">
      <div class="avatar" style="width:38px;height:38px;font-size:13px;background:${grad};flex-shrink:0;">${initials}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
          <div style="font-size:14px;font-weight:700;">${name}</div>
          <div style="font-size:11px;color:var(--text-secondary);">${date}</div>
        </div>
        <div class="stars" style="font-size:12px;margin-bottom:4px;">${stars}</div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;">${escapeHtml(r.text)}</div>
      </div>
    </div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getReviewWord(n) {
  if (n === 0) return 'ов';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'ов';
  if (mod10 === 1) return '';
  if (mod10 >= 2 && mod10 <= 4) return 'а';
  return 'ов';
}

// ── Патчим openBusinessProfile для загрузки реальных отзывов ──
const _origOpenBizProfileReviews = window.openBusinessProfile;
window.openBusinessProfile = async function(id) {
  await _origOpenBizProfileReviews(id);
  // Загружаем реальные отзывы вместо заглушки
  await loadAndRenderReviews(id);
};

// ── Патчим openSpecialist для загрузки отзывов (фоллбэк для статических кинологов) ──
const _origOpenSpecialist = window.openSpecialist;
window.openSpecialist = function(id) {
  _origOpenSpecialist(id);
  // Для статических кинологов — ищем их бизнес в БД
  const spec = SPECIALISTS.find(s => s.id === id);
  if (spec) {
    // Пытаемся найти бизнес с таким user_id
    const biz = loadedBusinesses.find(b => b.user_id === id);
    if (biz) {
      loadAndRenderReviews(biz.id);
    }
    // Если бизнеса нет, оставляем статичные отзывы из SPECIALISTS
  }
};

// ── Редактирование своего события ───────────────────────────
function editMyEvent() {
  if (!currentEvent || !currentUser) return;
  if (currentEvent.creator_id !== currentUser.id) { showToast('Вы не организатор'); return; }
  
  const ev = currentEvent;
  const eDate = ev.event_date ? ev.event_date.substring(0,10) : '';
  const eTime = ev.event_date ? ev.event_date.substring(11,16) : '';
  
  // Create modal dynamically
  let modal = document.getElementById('m-edit-event');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal-ov';
    modal.id = 'm-edit-event';
    modal.onclick = function(e) { if (e.target === this) closeModal('m-edit-event'); };
    modal.innerHTML = '<div class="modal" onclick="event.stopPropagation()" style="max-height:90%;overflow-y:auto;"><div class="mhandle"></div><div id="m-edit-event-body"></div></div>';
    document.querySelector('.phone-shell').appendChild(modal);
  }
  
  document.getElementById('m-edit-event-body').innerHTML = `
    <h3 style="margin-bottom:16px;">Редактировать событие</h3>
    <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px;">
      <div><label class="lbl">Название</label><input class="input" id="ee-title" value="${(ev.title||'').replace(/"/g,'&quot;')}"></div>
      <div><label class="lbl">Адрес</label><input class="input" id="ee-address" value="${(ev.address||'').replace(/"/g,'&quot;')}"></div>
      <div style="display:flex;gap:8px;">
        <div style="flex:1;"><label class="lbl">Дата</label><input class="input" id="ee-date" type="date" value="${eDate}"></div>
        <div style="flex:1;"><label class="lbl">Время</label><input class="input" id="ee-time" type="time" value="${eTime}"></div>
      </div>
      <div><label class="lbl">Цена</label><input class="input" id="ee-price" value="${(ev.price||'').replace(/"/g,'&quot;')}" placeholder="Бесплатно"></div>
      <div><label class="lbl">Макс. участников</label><input class="input" id="ee-max" type="number" value="${ev.max_participants||''}" placeholder="Без ограничений"></div>
      <div><label class="lbl">Описание</label><textarea class="input" id="ee-desc" style="min-height:70px;padding:12px;">${ev.description||''}</textarea></div>
    </div>
    <button class="btn btn-p" onclick="saveMyEvent('${ev.id}')" style="margin-bottom:8px;">Сохранить</button>
    <button class="btn btn-g" onclick="closeModal('m-edit-event')" style="margin-bottom:8px;">Отмена</button>
    <button class="btn" style="background:rgba(255,59,48,0.08);color:var(--error);width:100%;" onclick="deleteMyEvent('${ev.id}')">Удалить событие</button>
  `;
  openModal('m-edit-event');
}

async function saveMyEvent(id) {
  if (!supabaseClient) return;
  const d = document.getElementById('ee-date').value;
  const t = document.getElementById('ee-time').value;
  const eventDate = d && t ? d+'T'+t+':00' : d ? d+'T00:00:00' : null;
  
  const update = {
    title: document.getElementById('ee-title').value.trim(),
    address: document.getElementById('ee-address').value.trim(),
    price: document.getElementById('ee-price').value.trim() || 'Бесплатно',
    max_participants: parseInt(document.getElementById('ee-max').value) || null,
    description: document.getElementById('ee-desc').value.trim(),
  };
  if (eventDate) update.event_date = eventDate;
  
  if (!update.title) { showToast('Введите название'); return; }
  
  try {
    const { error } = await supabaseClient.from('events').update(update).eq('id', id).eq('creator_id', currentUser.id);
    if (error) throw error;
    closeModal('m-edit-event');
    showToast('Событие обновлено', '#34C759');
    // Reload
    Object.assign(currentEvent, update);
    if (eventDate) currentEvent.event_date = eventDate;
    openEventDetail(id);
    loadEvents();
  } catch(e) {
    showToast('Ошибка: ' + (e.message || ''));
  }
}

async function deleteMyEvent(id) {
  if (!confirm('Удалить событие? Это необратимо.')) return;
  try {
    await supabaseClient.from('event_participants').delete().eq('event_id', id);
    const { error } = await supabaseClient.from('events').delete().eq('id', id).eq('creator_id', currentUser.id);
    if (error) throw error;
    closeModal('m-edit-event');
    showToast('Событие удалено');
    back();
    loadEvents();
  } catch(e) {
    showToast('Ошибка: ' + (e.message || ''));
  }
}
