// ============================================================
// CHAT.JS — All messaging: private, public, district, event,
// realtime subscriptions, Supabase init/auth, push notifications
// Depends on: globals.js, notifications.js
// ============================================================


function loadContactBook() {
  try { contactBook = JSON.parse(localStorage.getItem('df_contacts') || '{}'); } catch(e) { contactBook = {}; }
}

// Открыть чат с реальным пользователем
function openChatWithUser(theirUserId, theirName, theirInitials, theirGrad) {
  const myUserId = currentUser?.id || userId;
  console.log('? openChatWithUser: theirUserId=', theirUserId, 'myUserId=', myUserId);
  if (!theirUserId || theirUserId === myUserId) return;
  currentPrivateChatId = theirUserId;
  console.log('Set currentPrivateChatId =', currentPrivateChatId);

  // Запомним контакт
  contactBook[theirUserId] = { name: theirName, initials: theirInitials || theirName.slice(0,2).toUpperCase(), grad: theirGrad || 'linear-gradient(135deg,#4A90D9,#7B5EA7)' };
  localStorage.setItem('df_contacts', JSON.stringify(contactBook));

  if (!privateChats[theirUserId]) privateChats[theirUserId] = [];

  const av = document.getElementById('pc-avatar');
  av.textContent = contactBook[theirUserId].initials;
  av.style.background = contactBook[theirUserId].grad;
  av.style.overflow = 'hidden';
  document.getElementById('pc-name').textContent = theirName;
  document.getElementById('pc-online').innerHTML = '<span style="color:#34C759;">●</span> онлайн';

  // Async load avatar
  if (theirUserId.length > 10) {
    getUserAvatarUrl(theirUserId).then(url => {
      if (url) {
        av.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='${contactBook[theirUserId].initials}'">`;
        av.style.background = 'none';
        av.style.padding = '0';
      }
    });
  }

  renderPrivateChatMessages(theirUserId);
  loadPrivateChatFromServer(theirUserId);
  subscribeToPrivateChat(theirUserId);
  clearUnreadMessages(theirUserId);
  nav('privateChat');
}

// Открыть чат со специалистом
function openPrivateChat(specId) {
  console.log('💬 openPrivateChat called with specId:', specId);
  // Сначала ищем в бизнесах из БД
  const business = loadedBusinesses.find(b => b.user_id === specId);
  if (business) {
    console.log('Found business:', business.name || business.business_name, 'user_id:', business.user_id);
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
    
    return; // уже подписаны
  }

  console.log(' Subscribing to private chat:', channelName, 'for user:', theirId);

  const channel = supabaseClient.channel(channelName, {
    config: { broadcast: { self: false } }
  });

  channel.on('broadcast', { event: 'message' }, (payload) => {
    
    const data = payload.payload;
    // Игнорируем свои (уже отображены локально)
    const myUserId = currentUser?.id || userId;
    if (data.senderId === myUserId) return;

    const chatId = data.senderId; // сообщение от него — ключ = его userId
    if (!privateChats[chatId]) privateChats[chatId] = [];
    
    // Проверяем дубликаты (broadcast + postgres_changes может доставить одно и то же)
    const isDuplicate = privateChats[chatId].some(m => 
      (m.text === data.text && m.senderId === data.senderId && Math.abs(Date.now() - new Date(m.created_at || 0).getTime()) < 10000)
    );
    
    if (isDuplicate) {
      
      return;
    }
    
    privateChats[chatId].push({
      text: data.text,
      sender: 'other',
      time: data.time,
      senderName: data.senderName,
      senderId: data.senderId,
      created_at: new Date().toISOString(),
      // Поля ответа - оба варианта для совместимости
      replyToId: data.replyToId || null,
      replyToText: data.replyToText || null,
      replyToName: data.replyToName || null,
      reply_to_id: data.replyToId || null,
      reply_to_text: data.replyToText || null,
      reply_to_name: data.replyToName || null,
    });
    savePrivateChatsToStorage();

    // Запоминаем контакт если не знаем
    if (!contactBook[chatId]) {
      contactBook[chatId] = { name: data.senderName, initials: data.senderName.slice(0,2).toUpperCase(), grad: 'linear-gradient(135deg,#4A90D9,#7B5EA7)' };
      localStorage.setItem('df_contacts', JSON.stringify(contactBook));
    }

    if (currentPrivateChatId !== chatId) {
      
      addUnreadMessage(chatId);
      playNotificationSound();
      showInAppNotification(data.senderName, data.text);
      showBrowserNotification('Новое от ' + data.senderName, { body: data.text.substring(0, 80) });
      sendPushToUser(data.senderId, { title: data.senderName, message: data.text.substring(0, 100), url: '/', chatId: chatId, type: 'message' });
    } else {
      renderPrivateChatMessages(chatId);
    }
    renderPrivateChats();
  }).subscribe((status) => {
    console.log(' Private channel subscribe status:', status, 'for', channelName);
    if (status === 'SUBSCRIBED') {
      console.log('Successfully subscribed to private chat:', channelName);
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error('Failed to subscribe to private chat:', channelName, status);
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

  console.log('🔍 renderPrivateChatMessages:', chatId, 'messages:', messages.length);
  
  // Проверяем сколько сообщений имеют ответы
  const withReply = messages.filter(m => m.replyToText || m.reply_to_text || m.replyToId || m.reply_to_id);
  if (withReply.length > 0) {
    console.log(`  ✅ ${withReply.length} сообщений с ответами`);
    withReply.slice(0, 3).forEach((msg, idx) => {
      console.log(`    Msg с ответом #${idx}:`, {
        text: msg.text?.substring(0, 20),
        replyToId: msg.replyToId || msg.reply_to_id,
        replyToText: (msg.replyToText || msg.reply_to_text || '').substring(0, 20),
        replyToName: msg.replyToName || msg.reply_to_name
      });
    });
  } else {
    console.log('  ℹ️ Нет сообщений с ответами');
  }

  if (messages.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-secondary);font-size:14px;">Напишите первое сообщение</div>';
    return;
  }

  container.innerHTML = messages.map((msg, idx) => {
    const isMine = msg.sender === 'user';
    const content = formatMsgContent(msg.text);
    
    // Уникальный ID: используем dbId если есть, иначе индекс
    const msgUniqueId = msg.dbId || `idx-${idx}`;

    // Блок цитаты если это ответ - проверяем ОБА варианта названий полей
    const hasReply = msg.replyToText || msg.reply_to_text || msg.replyToId || msg.reply_to_id;
    const replyBlock = hasReply ? `
      <div style="background:${isMine ? 'rgba(255,255,255,0.2)' : 'var(--bg)'};border-left:3px solid ${isMine ? 'rgba(255,255,255,0.7)' : 'var(--primary)'};border-radius:6px;padding:6px 10px;margin-bottom:6px;cursor:pointer;" onclick="scrollToMsg('${msg.replyToId || msg.reply_to_id || ''}')">
        <div style="font-size:11px;font-weight:700;color:${isMine ? 'rgba(255,255,255,0.85)' : 'var(--primary)'};margin-bottom:2px;">${escHtml(msg.replyToName || msg.reply_to_name || 'Пользователь')}</div>
        <div style="font-size:12px;color:${isMine ? 'rgba(255,255,255,0.75)' : 'var(--text-secondary)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${escHtml((msg.replyToText || msg.reply_to_text || '').substring(0, 80))}</div>
      </div>` : '';

    // Блок реакций (будет заполнен динамически)
    const reactionsBlock = msg.dbId ? `<div class="msg-reactions" id="reactions-${msg.dbId}" style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;"></div>` : '';

    return `<div id="msg-${msgUniqueId}" class="swipeable-msg" data-msg-idx="${idx}" data-msg-dbid="${msg.dbId || ''}" style="display:flex;justify-content:${isMine ? 'flex-end' : 'flex-start'};align-items:flex-end;gap:6px;position:relative;margin-bottom:6px;">
      <div class="swipe-reply-icon" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);opacity:0;transition:opacity 0.2s;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2">
          <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>
        </svg>
      </div>
      <div class="msg-bubble" data-message-id="${msg.dbId || ''}" style="max-width:75%;background:${isMine ? 'var(--primary)' : 'var(--white)'};color:${isMine ? 'white' : 'var(--text-primary)'};padding:10px 14px;border-radius:${isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};word-wrap:break-word;font-size:14px;box-shadow:var(--shadow);transform:translateX(0);transition:transform 0.2s ease-out;">
        ${!isMine ? `<div style="font-size:11px;font-weight:700;color:var(--primary);margin-bottom:4px;">${escHtml(msg.senderName || '')}</div>` : ''}
        ${replyBlock}
        ${content}
        <div style="font-size:11px;${isMine ? 'color:rgba(255,255,255,0.7)' : 'color:var(--text-secondary)'};margin-top:4px;text-align:right;">${msg.time}</div>
        ${reactionsBlock}
      </div>
    </div>`;
  }).join('');

  container.scrollTop = container.scrollHeight;
  
  // Инициализируем свайп для всех сообщений
  initSwipeToReply();
  
  // Инициализируем реакции для всех сообщений
  initMessageReactions();
  
  // Загружаем реакции для всех сообщений с dbId
  messages.forEach(msg => {
    if (msg.dbId) loadReactionsForMessage(msg.dbId);
  });
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
  console.log('📤 Creating reply message, _replyTo:', {
    dbId: _replyTo?.dbId,
    _index: _replyTo?._index,
    text: _replyTo?.text?.substring(0, 20),
    senderName: _replyTo?.senderName
  });
  
  const newMsg = {
    text, sender: 'user', time, senderName: myName, senderId: myUserId,
    created_at: new Date().toISOString(),
    // Оба варианта для совместимости
    replyToId: _replyTo?.dbId || (_replyTo?._index !== undefined ? `idx-${_replyTo._index}` : null),
    replyToText: _replyTo?.text || null,
    replyToName: _replyTo?.senderName || null,
    reply_to_id: _replyTo?.dbId || (_replyTo?._index !== undefined ? `idx-${_replyTo._index}` : null),
    reply_to_text: _replyTo?.text || null,
    reply_to_name: _replyTo?.senderName || null,
  };
  
  console.log('📤 New message created:', {
    text: newMsg.text.substring(0, 20),
    replyToId: newMsg.replyToId,
    replyToText: newMsg.replyToText?.substring(0, 20)
  });
  
  privateChats[chatId].push(newMsg);

  // Для личных чатов — кэшируем в localStorage
  if (!isEventChat) {
    savePrivateChatsToStorage();
  }

  // ВАЖНО: сохраняем в БД ДО cancelReply(), иначе _replyTo будет null!
  savePrivateMsgToServer(chatId, text, time, _replyTo);

  input.value = '';
  input.style.height = 'auto';
  cancelReply();
  renderPrivateChatMessages(chatId);
  renderPrivateChats();

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
      payload: {
        text, senderName: myName, senderId: myUserId, time,
        replyToId: newMsg.replyToId,
        replyToText: newMsg.replyToText,
        replyToName: newMsg.replyToName,
      }
    });
  }
}

// Отправка фото в чат
function triggerChatPhoto() {
  const input = document.getElementById('pc-photo-input');
  if (input) input.click();
}

async function sendChatPhoto(fileInput) {
  const file = fileInput.files[0];
  if (!file || !currentPrivateChatId || !supabaseClient || !currentUser) return;
  fileInput.value = '';
  
  showToast('Отправляем фото...', 'var(--primary)');
  
  try {
    const ext = file.type.includes('png') ? 'png' : 'jpg';
    const filePath = `chat/${currentUser.id}_${Date.now()}.${ext}`;
    
    const { error: uploadError } = await supabaseClient.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type });
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabaseClient.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    const photoUrl = urlData.publicUrl;
    
    // Send as a message with [photo] prefix
    const chatId = currentPrivateChatId;
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const myProfile = JSON.parse(localStorage.getItem('df_profile') || '{}');
    const myName = myProfile.name || 'Гость';
    const myUserId = currentUser.id;
    
    if (!privateChats[chatId]) privateChats[chatId] = [];
    const msgText = '[photo]' + photoUrl;
    privateChats[chatId].push({ text: msgText, sender: 'user', time, senderName: myName, senderId: myUserId, created_at: new Date().toISOString() });
    
    if (!String(chatId).startsWith('event_')) savePrivateChatsToStorage();
    renderPrivateChatMessages(chatId);
    renderPrivateChats();
    
    savePrivateMsgToServer(chatId, msgText, time);
    
    // Broadcast
    if (!String(chatId).startsWith('event_')) {
      const roomId = [myUserId, String(chatId)].sort().join('__');
      const channelName = 'dogfriend-dm-' + roomId;
      let channel = supabasePrivateChannels[channelName];
      if (!channel) {
        channel = supabaseClient.channel(channelName, { config: { broadcast: { self: false } } });
        channel.subscribe();
        supabasePrivateChannels[channelName] = channel;
      }
      channel.send({ type: 'broadcast', event: 'message', payload: { text: msgText, senderName: myName, senderId: myUserId, time } });
    }
  } catch(e) {
    console.error('Chat photo error:', e);
    showToast('Ошибка отправки фото');
  }
}

// Нажатие Enter в поле приватного чата
document.addEventListener('DOMContentLoaded', () => {
  const pcInput = document.getElementById('pc-input');
  if (pcInput) {
    pcInput.addEventListener('keydown', e => {
      // Enter отправляет только на десктопе (без тач-экрана)
      const isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); sendPrivateMessage(); }
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
  const grad = `linear-gradient(135deg,${color},${color}99)`;

  // Ensure modal exists
  let modal = document.getElementById('m-user-profile');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'm-user-profile';
    modal.className = 'modal-ov';
    modal.onclick = function(e) { if (e.target === this) closeModal('m-user-profile'); };
    modal.innerHTML = '<div class="modal" onclick="event.stopPropagation()" style="max-height:85%;overflow-y:auto;"><div class="mhandle"></div><div id="m-user-profile-body"></div></div>';
    document.body.appendChild(modal);
  }
  
  const body = document.getElementById('m-user-profile-body');
  
  // Show immediately with basic info
  body.innerHTML = `<div style="text-align:center;padding:20px;">
    <div class="avatar" style="width:72px;height:72px;font-size:28px;margin:0 auto 12px;background:${grad};">${initials}</div>
    <h2 style="margin-bottom:4px;">${escHtml(theirName)}</h2>
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">Загрузка...</div>
  </div>`;
  openModal('m-user-profile');

  // If we have a real Supabase UUID — load full profile
  if (theirUserId && theirUserId.length > 10 && supabaseClient) {
    loadFullUserProfile(theirUserId, theirName, initials, grad);
  } else {
    // Fallback — simple modal
    body.innerHTML = `<div style="text-align:center;padding:20px;">
      <div class="avatar" style="width:72px;height:72px;font-size:28px;margin:0 auto 12px;background:${grad};">${initials}</div>
      <h2 style="margin-bottom:4px;">${escHtml(theirName)}</h2>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">Участник сообщества</div>
      <button class="btn btn-p" style="margin-bottom:10px;" onclick="closeModal('m-user-profile');openChatWithUser('${escHtml(theirUserId)}','${escHtml(theirName)}','${initials}','${grad}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" style="margin-right:8px;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        Написать
      </button>
      <button class="btn btn-g" onclick="closeModal('m-user-profile')">Закрыть</button>
    </div>`;
  }
}

async function loadFullUserProfile(userId, fallbackName, fallbackInitials, fallbackGrad) {
  const body = document.getElementById('m-user-profile-body');
  if (!body || !supabaseClient) return;

  try {
    const [profileRes, petsRes, bookingsRes] = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('user_id', userId).single(),
      supabaseClient.from('pets').select('*').eq('user_id', userId),
      supabaseClient.from('bookings').select('id').eq('user_id', userId),
    ]);

    const profile = profileRes.data;
    const pets = petsRes.data || [];
    const bookings = bookingsRes.data || [];

    const name = profile?.name || fallbackName || 'Пользователь';
    const initials = name.substring(0,2).toUpperCase();
    const district = profile?.district || '';
    const avatarUrl = profile?.avatar_url;
    const ordersCount = bookings.length;
    const charityAmount = ordersCount * 150;

    body.innerHTML = `<div style="text-align:center;padding:8px 0;">
      <div class="avatar" style="width:72px;height:72px;font-size:28px;margin:0 auto 12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.1);">
        ${avatarUrl ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.textContent='${initials}'">` : initials}
      </div>
      <div style="font-size:20px;font-weight:900;font-family:'Nunito',sans-serif;">${escHtml(name)}</div>
      ${district ? `<div style="display:flex;align-items:center;justify-content:center;gap:4px;color:var(--text-secondary);font-size:13px;margin-top:4px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
        ${escHtml(district)}
      </div>` : ''}
    </div>
    
    <div style="display:flex;gap:0;background:var(--bg);border-radius:14px;padding:12px;margin:16px 0;">
      <div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:900;color:var(--primary);">${ordersCount}</div><div style="font-size:11px;color:var(--text-secondary);">заказов</div></div>
      <div style="width:1px;background:var(--border);"></div>
      <div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:900;color:var(--primary);">${charityAmount} ₽</div><div style="font-size:11px;color:var(--text-secondary);">приютам</div></div>
      <div style="width:1px;background:var(--border);"></div>
      <div style="flex:1;text-align:center;"><div style="font-size:18px;font-weight:900;color:var(--primary);">${pets.length}</div><div style="font-size:11px;color:var(--text-secondary);">питомцев</div></div>
    </div>
    
    ${pets.length ? `<div style="text-align:left;margin-bottom:12px;">
      <div style="font-size:14px;font-weight:800;margin-bottom:8px;">Питомцы</div>
      ${pets.map(p => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
        <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#4A90D9,#7B5EA7);color:white;font-weight:700;font-size:15px;flex-shrink:0;">
          ${p.photo_url ? `<img src="${p.photo_url}" style="width:100%;height:100%;object-fit:cover;">` : p.name.substring(0,1).toUpperCase()}
        </div>
        <div><div style="font-weight:700;font-size:13px;">${escHtml(p.name)} ${p.sex==='ж'?'♀':'♂'}</div><div style="font-size:12px;color:var(--text-secondary);">${escHtml(p.breed||'')}${p.age?' · '+p.age:''}</div></div>
      </div>`).join('')}
    </div>` : ''}
    
    <button class="btn btn-p" style="margin-bottom:8px;" onclick="closeModal('m-user-profile');openChatWithUser('${userId}','${escHtml(name)}','${initials}','${fallbackGrad}')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" style="margin-right:8px;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      Написать
    </button>
    <button class="btn btn-g" onclick="closeModal('m-user-profile')">Закрыть</button>`;
  } catch(e) {
    console.error('Load user profile error:', e);
    body.innerHTML = `<div style="text-align:center;padding:20px;">
      <div class="avatar" style="width:72px;height:72px;font-size:28px;margin:0 auto 12px;background:${fallbackGrad};">${fallbackInitials}</div>
      <h2 style="margin-bottom:4px;">${escHtml(fallbackName)}</h2>
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">Участник сообщества</div>
      <button class="btn btn-p" style="margin-bottom:10px;" onclick="closeModal('m-user-profile');openChatWithUser('${userId}','${escHtml(fallbackName)}','${fallbackInitials}','${fallbackGrad}')">Написать</button>
      <button class="btn btn-g" onclick="closeModal('m-user-profile')">Закрыть</button>
    </div>`;
  }
}


function startPrivateChatWithUser(nick) {
  // Если есть _lastClickedUser с senderId — используем его (Supabase UUID)
  const msgData = _lastClickedUser || {};
  const theirUserId = msgData.senderId || nick;
  const theirName = msgData.senderName || nick;
  openChatWithUser(theirUserId, theirName, theirName.slice(0,2).toUpperCase(), 'linear-gradient(135deg,#4A90D9,#7B5EA7)');
}

// Удалить чат только локально (БД не трогаем — собеседник ничего не теряет)
function deleteLocalChat(chatId) {
  const isEventChat = String(chatId).startsWith('event_');

  delete privateChats[chatId];
  
  // FIX: для event-чатов удаляем и из contactBook, 
  // иначе пустой чат продолжит показываться в списке
  if (isEventChat) {
    delete contactBook[chatId];
    localStorage.setItem('df_contacts', JSON.stringify(contactBook));
  }
  
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
  // Debounce — не рендерим чаще чем раз в 300ms
  if (_renderChatsTimer) clearTimeout(_renderChatsTimer);
  _renderChatsTimer = setTimeout(_doRenderPrivateChats, 300);
}
function _doRenderPrivateChats() {
  const list = document.getElementById('private-chats-list');
  const noChats = document.getElementById('no-private-chats');
  const eventKeys = Object.keys(contactBook).filter(k => k.startsWith('event_'));
  const personalKeys = Object.keys(privateChats).filter(k => !k.startsWith('event_') && privateChats[k].length > 0);
  const keys = [...new Set([...personalKeys, ...eventKeys])];

  if (!keys.length) {
    list.innerHTML = '';
    if (noChats) noChats.style.display = 'block';
    return;
  }
  if (noChats) noChats.style.display = 'none';

  // Preload avatars for chat contacts
  const contactIds = keys.filter(k => !k.startsWith('event_') && k.length > 10);
  if (contactIds.length) preloadAvatars(contactIds);

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
    // Format last message preview
    let lastPreview = '';
    if (last) {
      if (last.text && (last.text.startsWith('[photo]') || last.text.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
        lastPreview = 'Фото';
      } else {
        lastPreview = escHtml((last.text || '').substring(0, 50));
      }
    }
    const cachedAv = _avatarCache[id];
    const avContent = cachedAv ? `<img src="${cachedAv}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='${safeInitials}'">` : safeInitials;
    const avBg = cachedAv ? 'background:none;padding:0;overflow:hidden;' : `background:${contact.grad};`;
    return `
    <div style="position:relative;overflow:hidden;" id="ci-wrap-${safeId}">
      <div style="position:absolute;right:0;top:0;bottom:0;width:80px;background:#FF3B30;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px;cursor:pointer;" onclick="deleteLocalChat('${safeId}')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        <span style="color:white;font-size:11px;font-weight:700;">Удалить</span>
      </div>
      <div class="ci" id="ci-row-${safeId}" style="gap:14px;position:relative;background:var(--white);transform:translateX(0);transition:transform 0.25s ease;will-change:transform;">
        <div class="avatar" style="width:52px;height:52px;font-size:20px;${avBg}flex-shrink:0;">${avContent}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-weight:800;font-size:15px;">${safeName}</span>
            <span style="font-size:11px;color:var(--text-secondary);">${last?.time || ''}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${lastPreview}</span>
            ${unread ? `<span style="min-width:20px;height:20px;background:var(--primary);color:white;border-radius:10px;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 6px;">${unread}</span>` : ''}
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
          openEventGroupChat({ id: evId, title: evContact.name.replace('', '') });
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
  if (!supabaseClient || !currentUser) return;

  // Берём только события где пользователь реально участвует (из БД, не из localStorage)
  const { data: participations, error } = await supabaseClient
    .from('event_participants')
    .select('event_id')
    .eq('user_id', currentUser.id)
    .eq('status', 'going');

  if (error) { console.error('reloadEventChatsFromDB error:', error); return; }
  
  const activeParticipations = participations || [];

  // Загружаем название событий для отображения в списке чатов
  const eventIds = activeParticipations.map(p => p.event_id);
  let eventNames = {};
  if (eventIds.length) {
    try {
      const { data: events } = await supabaseClient
        .from('events')
        .select('id, title')
        .in('id', eventIds);
      (events || []).forEach(ev => { eventNames[ev.id] = ev.title; });
    } catch(e) {}
  }

  for (const p of activeParticipations) {
    const chatId = 'event_' + p.event_id;
    const evTitle = eventNames[p.event_id] || 'Событие';
    // Добавляем/обновляем в contactBook с реальным названием
    contactBook[chatId] = {
      name: '📅 ' + evTitle.replace(/^(📅\s*)+/, ''),
      initials: '📅',
      grad: 'linear-gradient(135deg,#4A90D9,#7B5EA7)',
      isEventChat: true, roomId: chatId
    };
    await loadEventChatFromServer(chatId, chatId);
  }

  // Удаляем из contactBook event-чаты где пользователь больше не участвует
  const activeIds = new Set(activeParticipations.map(p => 'event_' + p.event_id));
  Object.keys(contactBook).forEach(k => {
    if (k.startsWith('event_') && !activeIds.has(k)) {
      delete contactBook[k];
      // Также чистим privateChats чтобы не было мусора
      delete privateChats[k];
    }
  });
  localStorage.setItem('df_contacts', JSON.stringify(contactBook));

  initEventLastIds();
  startBgEventPolling();
  renderPrivateChats();
}

// ════════════════════════════════════════════════════════════
// ЗАГРУЗКА ВСЕХ ДИАЛОГОВ ИЗ БД
// Вызывается при каждом входе — восстанавливает список чатов
// даже после переустановки PWA или очистки localStorage
// ════════════════════════════════════════════════════════════
async function loadAllDialogsFromDB() {
  if (!supabaseClient || !currentUser) return;
  const myUserId = currentUser.id;

  try {
    // Получаем все сообщения где участвует текущий пользователь
    // room_id для личных чатов содержит myUserId
    const { data, error } = await supabaseClient
      .from('direct_messages')
      .select('*')
      .like('room_id', '%' + myUserId + '%')
      .not('room_id', 'like', 'event_%')
      .not('room_id', 'eq', 'public_chat')
      .order('created_at', { ascending: true });

    if (error) { console.error('loadAllDialogsFromDB error:', error); return; }
    if (!data || !data.length) return;

    // Группируем сообщения по room_id
    const rooms = {};
    data.forEach(m => {
      if (!rooms[m.room_id]) rooms[m.room_id] = [];
      rooms[m.room_id].push(m);
    });

    // Для каждой комнаты определяем собеседника и восстанавливаем чат
    for (const [roomId, messages] of Object.entries(rooms)) {
      // chatId = userId собеседника
      // room_id формат: uuid1_uuid2
      const parts = roomId.split('_').filter(p => p.length === 36 && p.includes('-'));
      const theirId = parts.find(p => p !== myUserId);
      
      // Пропускаем если не нашли валидный UUID собеседника
      if (!theirId) {
        console.log(`⚠️ Skipping room ${roomId}: no valid UUID found`);
        continue;
      }

      // Восстанавливаем сообщения — мержим с существующими чтобы не потерять
      // optimistic-сообщения которые ещё не успели сохраниться в БД
      const dbMessages = messages.map(m => ({
        text: m.text,
        sender: m.sender_id === myUserId ? 'user' : 'other',
        time: m.time,
        senderName: m.sender_name,
        senderId: m.sender_id,
        created_at: m.created_at,
        dbId: m.id,
        replyToId: m.reply_to_id || null,
        replyToText: m.reply_to_text || null,
        replyToName: m.reply_to_name || null,
        reply_to_id: m.reply_to_id || null,
        reply_to_text: m.reply_to_text || null,
        reply_to_name: m.reply_to_name || null,
      }));
      const dbIds = new Set(dbMessages.map(m => m.dbId).filter(Boolean));
      // Сохраняем optimistic-сообщения (без dbId) которых ещё нет в БД
      const optimistic = (privateChats[theirId] || []).filter(m => !m.dbId && !dbIds.has(m.dbId));
      privateChats[theirId] = [...dbMessages, ...optimistic];

      // Восстанавливаем контакт если не знаем
      if (!contactBook[theirId]) {
        // Берём имя из последнего сообщения от собеседника
        const theirMsg = messages.find(m => m.sender_id === theirId);
        const name = theirMsg ? theirMsg.sender_name : 'Пользователь';
        contactBook[theirId] = {
          name: name,
          initials: name.slice(0, 2).toUpperCase(),
          grad: 'linear-gradient(135deg,#4A90D9,#7B5EA7)'
        };
      }

      // Подписываемся на новые сообщения в этом чате
      subscribeToPrivateChat(theirId);
    }

    // Сохраняем и обновляем UI
    localStorage.setItem('df_contacts', JSON.stringify(contactBook));
    savePrivateChatsToStorage();
    renderPrivateChats();

    console.log('✅ Loaded', Object.keys(rooms).length, 'dialogs from DB');
    
    // Загружаем реальные имена из profiles для всех контактов
    // Проверяем что это UUID (формат: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const contactIds = Object.keys(contactBook).filter(id => {
      return id.length === 36 && id.includes('-') && !id.includes('_');
    });
    for (const userId of contactIds) {
      loadContactName(userId);
    }
  } catch(e) {
    console.error('loadAllDialogsFromDB exception:', e);
  }
}

// ============================================================
// SUPABASE CONFIG (вместо Railway + Ably)
// ============================================================




// Загружаем Supabase SDK
if (!window.supabaseLoaded) {
  const cdns = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js',
    'https://unpkg.com/@supabase/supabase-js@2.39.0/dist/umd/supabase.min.js',
  ];
  let loaded = false;
  function tryLoadSupabase(i) {
    if (i >= cdns.length || loaded) {
      if (!loaded) console.error('All Supabase CDNs failed');
      return;
    }
    const s = document.createElement('script');
    s.src = cdns[i];
    s.onload = async () => { loaded = true; window.supabaseLoaded = true; await initSupabase(); };
    s.onerror = () => { console.warn('CDN failed:', cdns[i]); tryLoadSupabase(i + 1); };
    document.head.appendChild(s);
  }
  // Если SDK уже загружен из HTML — не грузим повторно
  if (window.supabase) {
    window.supabaseLoaded = true;
    initSupabase();
  } else {
    tryLoadSupabase(0);
  }
}

// ── PUSH-УВЕДОМЛЕНИЯ (Web Push API + Service Worker) ─────────────


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

async function initSupabase() {
  if (supabaseClient) return; // уже инициализирован — не создаём второй клиент
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase connected');

    // Подписываемся ДО checkAuth — Supabase сразу эмитит события при создании клиента
    supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);

      // Резолвим защёлку при первом любом событии
      if (!_authStateResolved) {
        _authStateResolved = true;
        _authStateResolve(event);
      }

      if (event === 'PASSWORD_RECOVERY') {
        if (_isPasswordRecovery && currentUser) return; // защита от повторного вызова при двойном клиенте
        _isPasswordRecovery = true;
        if (session) currentUser = session.user;
        // Чистим хэш из URL
        history.replaceState(null, '', window.location.pathname);
        // nav() сам скроет текущий экран (splash), просто вызываем
        nav('resetPassword');
      }
    });

    // checkAuth вызывается из splash-таймера
  }
}

// Проверка авторизации при загрузке
async function checkAuth() {
  // Если Supabase ещё не готов — подождём и попробуем снова (макс 15 сек)
  if (!supabaseClient) {
    _authRetries++;
    if (_authRetries > 30) {
      // 30 * 500ms = 15 сек — Supabase не загрузился
      if (typeof showVPNError === 'function') showVPNError();
      else nav(localStorage.getItem('df_registered') === '1' ? 'home' : 'login');
      return;
    }
    setTimeout(() => checkAuth(), 500);
    return;
  }

  console.log('Checking auth...');

  // Если в URL был recovery-хэш — ждём onAuthStateChange (он придёт почти сразу после createClient)
  // Это гарантирует что PASSWORD_RECOVERY событие обработается ДО любого nav()
  if (_isPasswordRecovery) {
    console.log('🔑 Recovery URL detected — waiting for onAuthStateChange...');
    await Promise.race([
      _authStatePromise,
      new Promise(r => setTimeout(r, 4000)) // страховочный таймаут 4 сек
    ]);
    // К этому моменту onAuthStateChange уже вызвал nav('resetPassword')
    // Просто выходим — не трогаем навигацию
    console.log('🔑 Auth state resolved, staying on resetPassword');
    return;
  }

  // Запасной таймер — никогда не зависнем на сплэше
  const fallback = setTimeout(() => {
    if (_isPasswordRecovery) return;
    const active = document.querySelector('.screen.active');
    if (active && active.id === 'splash') {
      nav(localStorage.getItem('df_registered') === '1' ? 'home' : 'login');
    }
  }, 5000);

  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    clearTimeout(fallback);

    if (error) {
      console.error('Auth error:', error);
      nav('login');
      return;
    }

    if (session) {
      console.log('User authenticated:', session.user.email);
      currentUser = session.user;

      // Если пришли по ссылке восстановления — onAuthStateChange уже открыл resetPassword,
      // не перебиваем его редиректом на home
      if (_isPasswordRecovery) {
        console.log('Password recovery mode — skipping nav to home');
        return;
      }

      try { await loadUserProfile(); } catch(e) { console.warn('loadUserProfile:', e); }
      
      // Запускаем Realtime подписку на новые сообщения
      stopRealtimeDMSubscription(); // Сбрасываем если была старая
      startRealtimeDMSubscription();
      
      // Запускаем Realtime подписку на реакции
      stopRealtimeReactionsSubscription();
      startRealtimeReactionsSubscription();
      
      // Polling fallback — страховка если Realtime упал
      stopMessagePolling();
      startMessagePolling();

      // Загружаем ВСЕ диалоги из БД — чтобы они появились даже после
      // переустановки PWA или очистки localStorage
      loadAllDialogsFromDB();

      // Загружаем event-чаты из БД (единственный источник истины)
      reloadEventChatsFromDB();

      // Проверяем бизнес сразу после авторизации
      checkUserBusiness();

      nav('home');
      // Записываем визит
      trackVisit();
      // Обновляем статистику после входа (charity block)
      setTimeout(() => loadProfileStats(), 1000);
      // Если открыли с параметром ?chat=userId — сразу открываем чат
      handleChatDeeplink();
      // Инициализируем push-уведомления (VAPID для Android)
      setTimeout(async () => { await initServiceWorker(); if (currentUser) subscribeToPush(); }, 3000);
      // OneSignal — сохраняем player_id и показываем промпт
      setTimeout(() => { saveOneSignalPlayerId(); askPushPermission(); }, 5000);
    } else {
      console.log('No session found');
      const oldRegistered = localStorage.getItem('df_registered');
      if (oldRegistered === '1') {
        console.log(' Using localStorage auth');
        nav('home');
        trackVisit();
      } else {
        console.log('→ Redirecting to login');
        nav('login');
      }
    }
  } catch(e) {
    clearTimeout(fallback);
    console.error('checkAuth exception:', e);
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
      stopMessagePolling();
      startMessagePolling();

      // Загружаем все диалоги из БД
      loadAllDialogsFromDB();
      
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
    // Сбрасываем флаг — новый пользователь должен увидеть запрос уведомлений
    localStorage.removeItem('push_asked');
    
    // Проверяем — если email confirmation включён, user будет не подтверждён
    if (data && data.user && !data.user.confirmed_at && !data.session) {
      // Email не подтверждён — показываем экран подтверждения
      nav('emailConfirm');
      document.getElementById('confirm-email-display').textContent = email;
    } else {
      // Email подтверждён сразу (или confirmation выключен)
      // ФИКС: устанавливаем currentUser сразу после регистрации
      if (data && data.user) {
        window.currentUser = data.user;
        currentUser = data.user;
        
        // Отправляем приветственные сообщения от владельца
        console.log('📧 Registered new user:', data.user.id, 'Sending welcome messages...');
        sendWelcomeMessages(data.user.id).catch(e => console.error('Failed to send welcome:', e));
      }
      if (data && data.session) {
        try { await loadUserProfile(); } catch(e) {}
        stopRealtimeDMSubscription();
        startRealtimeDMSubscription();
        stopMessagePolling();
        startMessagePolling();
        checkUserBusiness();
      }
      localStorage.setItem('df_registered', '1');
      nav('home');
      setTimeout(() => askPushPermission(), 1500);
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


// ============================================================
// ВОССТАНОВЛЕНИЕ ПАРОЛЯ
// ============================================================

async function sendPasswordReset() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email || !email.includes('@')) { showToast('Введите корректный email'); return; }

  const btn = document.getElementById('forgot-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Отправляем...'; }

  try {
    if (!supabaseClient) throw new Error('Нет подключения к серверу');
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    document.getElementById('forgot-sent-email').textContent = email;
    nav('forgotSent');
  } catch(err) {
    console.error('Reset password error:', err);
    document.getElementById('forgot-sent-email').textContent = email;
    nav('forgotSent');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Отправить ссылку'; }
  }
}

async function confirmPasswordReset() {
  const newPwd = document.getElementById('reset-new-password').value;
  const confirmPwd = document.getElementById('reset-confirm-password').value;

  if (!newPwd || newPwd.length < 6) { showToast('Пароль минимум 6 символов'); return; }
  if (newPwd !== confirmPwd) { showToast('Пароли не совпадают'); return; }

  const btn = document.getElementById('reset-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Сохраняем...'; }

  try {
    if (!supabaseClient) throw new Error('Нет подключения');
    const { error } = await supabaseClient.auth.updateUser({ password: newPwd });
    if (error) throw error;
    _isPasswordRecovery = false;
    showToast('Пароль успешно изменён', '#34C759');
    setTimeout(() => nav('login'), 1200);
  } catch(err) {
    console.error('Update password error:', err);
    showToast('Ошибка: ' + (err.message || 'Попробуйте ещё раз'));
    if (btn) { btn.disabled = false; btn.textContent = 'Сохранить пароль'; }
  }
}

// Загрузка профиля пользователя
async function loadUserProfile() {
  if (!currentUser || !supabaseClient) return;
  
  try {
    console.log(' Loading profile from Supabase for user:', currentUser.id);
    
    // Пробуем загрузить по user_id (основное поле), потом по id (fallback)
    let data, error;
    ({ data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single());
    
    if (error && error.code === 'PGRST116') {
      // Не нашли по user_id — пробуем по id
      ({ data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single());
    }
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found, это норм для нового юзера
      console.error('Load profile error:', error);
      return;
    }
    
    if (data) {
      console.log('Profile loaded from Supabase:', data);
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
      
      // Подсчитываем непрочитанные сообщения
      updateUnreadCount();
    } else {
      // Новый пользователь — создаём профиль в Supabase из localStorage / метаданных регистрации
      console.log(' No profile in Supabase, creating...');
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
          console.log('Profile created in Supabase with name:', regName);
          
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
    console.error('Load profile exception:', err);
  }
}
// ============================================================

// Уникальный ID комнаты из двух userId (всегда одинаковый порядок)
function getRoomId(a, b) {
  return [String(a), String(b)].sort().join('__');
}

// In-app уведомление — работает везде без разрешений
function showInAppNotification(title, body) {
  // Check if messages notifications are enabled
  const s = JSON.parse(localStorage.getItem('df_notif') || '{}');
  if (s.messages === false) return;
  
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
        showInAppNotification('Уведомления включены', 'Теперь вы будете получать уведомления о новых сообщениях');
      }
    });
  }
}


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
  document.getElementById('chat-conv-name').textContent = 'Общий чат Dogly';
  document.getElementById('chat-conv-av').style.background = 'linear-gradient(135deg,#4A90D9,#7B5EA7)';
  document.getElementById('chat-conv-av').textContent = '';
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
  if (!supabaseClient) { 
    if (_districtRetries++ < 5) setTimeout(() => connectDistrictRealtime(district), 500); 
    return; 
  }
  _districtRetries = 0;
  
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
  stopRealtimeDMSubscription();
  startRealtimeDMSubscription();
}
function connectSupabaseRealtime() {
  try {
    console.log(' Connecting to Supabase Realtime...');
    
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
        console.log(' Retrying connection...');
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
        console.log(' Realtime status:', status);
        
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
          if (!realtimeDMChannel) startRealtimeDMSubscription();
          
          refreshOnlineCount();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(connectionTimeout);
          console.error('Connection failed:', status);
          setChatStatus('error');
          
          // Retry через 3 секунды
          setTimeout(() => {
            console.log(' Retrying after error...');
            connectSupabaseRealtime();
          }, 3000);
        }
      });

  } catch(e) {
    setChatStatus('error');
    console.error('Realtime error:', e);
    appendSysMsg('Ошибка: ' + e.message);
    
    // Retry через 5 секунд
    setTimeout(() => {
      console.log(' Retrying after exception...');
      connectSupabaseRealtime();
    }, 5000);
  }
}

// ============================================================
// REALTIME ПОДПИСКА НА НОВЫЕ СООБЩЕНИЯ (заменяет polling)
// Одна подписка ловит ВСЕ новые сообщения: личные, event, публичные
// ============================================================

function startRealtimeDMSubscription() {
  // Защита от дублирования подписок
  if (realtimeDMChannel) {
    
    return;
  }
  if (!supabaseClient || !currentUser) return;
  
  const myUserId = currentUser?.id || userId;
  if (!myUserId) return;
  
  console.log(' Starting Realtime subscription for direct_messages');
  
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
          // Поля ответа - оба варианта
          replyToId: msg.reply_to_id || null,
          replyToText: msg.reply_to_text || null,
          replyToName: msg.reply_to_name || null,
          reply_to_id: msg.reply_to_id || null,
          reply_to_text: msg.reply_to_text || null,
          reply_to_name: msg.reply_to_name || null,
        });
        
        if (currentPrivateChatId === chatId) {
          renderPrivateChatMessages(chatId);
        } else {
          addUnreadMessage(chatId);
          playNotificationSound();
          showInAppNotification(msg.sender_name, msg.text);
        }
        renderPrivateChats();
        return;
      }
      
      // ── Личный чат ──
      const isMyRoom = myIds.some(id => roomId && roomId.includes(id));
      if (!isMyRoom) return;
      
      const chatId = msg.sender_id;
      if (!privateChats[chatId]) privateChats[chatId] = [];
      
      // Дубль? проверяем по dbId и по тексту/времени
      const myId2 = currentUser?.id || userId;
      const exists = privateChats[chatId].some(m => 
        m.dbId === msg.id ||
        (m.text === msg.text && Math.abs(new Date(m.created_at || 0) - new Date(msg.created_at || 0)) < 5000)
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
        // Поля ответа - оба варианта
        replyToId: msg.reply_to_id || null,
        replyToText: msg.reply_to_text || null,
        replyToName: msg.reply_to_name || null,
        reply_to_id: msg.reply_to_id || null,
        reply_to_text: msg.reply_to_text || null,
        reply_to_name: msg.reply_to_name || null,
      });
      savePrivateChatsToStorage();
      
      // Запоминаем контакт и загружаем имя из profiles если нужно
      if (!contactBook[chatId]) {
        const senderName = msg.sender_name || 'Пользователь';
        contactBook[chatId] = { 
          name: senderName, 
          initials: senderName.slice(0,2).toUpperCase(), 
          grad: 'linear-gradient(135deg,#4A90D9,#7B5EA7)' 
        };
        localStorage.setItem('df_contacts', JSON.stringify(contactBook));
        
        // Загружаем реальное имя из profiles асинхронно
        // Проверяем что это UUID
        if (chatId.length === 36 && chatId.includes('-') && !chatId.includes('_')) {
          loadContactName(chatId);
        }
      }
      
      // Подписываемся на broadcast-канал для мгновенной доставки
      if (!chatId.startsWith('event_')) subscribeToPrivateChat(chatId);
      
      if (currentPrivateChatId !== chatId) {
        addUnreadMessage(chatId);
        playNotificationSound();
        showInAppNotification(msg.sender_name, msg.text);
        showBrowserNotification('Новое от ' + msg.sender_name, { body: msg.text.substring(0, 80) });
        sendPushToUser(myUserId, { title: msg.sender_name, message: msg.text.substring(0, 100), url: '/', chatId: chatId, type: 'message' });
      } else {
        renderPrivateChatMessages(chatId);
      }
      renderPrivateChats();
    })
    .subscribe((status) => {
      console.log(' Realtime DM subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime DM subscription active');
        // Обновляем счётчик непрочитанных при подключении
        updateUnreadCount();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('Realtime DM subscription failed:', status);
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
// REALTIME ПОДПИСКА НА РЕАКЦИИ
// ============================================================

function startRealtimeReactionsSubscription() {
  if (realtimeReactionsChannel || !supabaseClient) return;
  
  console.log('🎭 Starting Realtime subscription for reactions');
  
  realtimeReactionsChannel = supabaseClient
    .channel('reactions-changes')
    .on('postgres_changes', {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'message_reactions'
    }, (payload) => {
      console.log('🎭 Reaction change:', payload);
      
      const reaction = payload.new || payload.old;
      if (!reaction) return;
      
      const myUserId = currentUser?.id || userId;
      const messageId = reaction.message_id;
      
      // Обновляем отображение реакций для этого сообщения
      loadReactionsForMessage(messageId);
      
      // Если это не моя реакция - показываем уведомление
      if (payload.eventType === 'INSERT' && reaction.user_id !== myUserId) {
        const emoji = {
          'heart': '❤️',
          'happy': '🐶',
          'sad': '😢'
        }[reaction.reaction_type] || '👍';
        
        showInAppNotification(
          reaction.user_name || 'Кто-то',
          `${emoji} отреагировал на ваше сообщение`
        );
      }
    })
    .subscribe((status) => {
      console.log('🎭 Reactions subscription status:', status);
    });
}

function stopRealtimeReactionsSubscription() {
  if (realtimeReactionsChannel) {
    realtimeReactionsChannel.unsubscribe();
    realtimeReactionsChannel = null;
  }
}

// ============================================================
// POLLING FALLBACK — каждые 5 сек проверяем новые сообщения
// Страховка на случай если Realtime упал или завис
// ============================================================

function startMessagePolling() {
  if (_pollInterval) return; // уже запущен
  _lastPollTime = new Date(Date.now() - 10000).toISOString(); // берём с запасом 10 сек назад
  _pollInterval = setInterval(pollNewMessages, 5000);
  console.log('[Poll] ✅ Polling запущен каждые 5 сек');
}

function stopMessagePolling() {
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
}

async function pollNewMessages() {
  if (!supabaseClient || !currentUser) return;
  const myUserId = currentUser.id;

  try {
    const { data: msgs, error } = await supabaseClient
      .from('direct_messages')
      .select('*')
      .gt('created_at', _lastPollTime)
      .or(`room_id.like.%${myUserId}%,room_id.like.event_%`)
      .order('created_at', { ascending: true });

    if (error || !msgs || msgs.length === 0) return;

    // Обновляем время последней проверки
    _lastPollTime = msgs[msgs.length - 1].created_at;

    msgs.forEach(msg => {
      // Пропускаем свои сообщения
      if (msg.sender_id === myUserId) return;

      // Пропускаем если room_id не содержит наш userId (не наш чат)
      if (!msg.room_id) return;
      // Для event чатов — показываем только если пользователь в contactBook этого чата (т.е. участник)
      if (msg.room_id.startsWith('event_')) {
        if (!contactBook[msg.room_id]) return; // не участник — пропускаем
      } else {
        if (!msg.room_id.includes(myUserId)) return; // не наш личный чат
      }

      // Определяем chatId
      const chatId = msg.room_id.startsWith('event_') ? msg.room_id : msg.sender_id;

      // Дубль?
      if (!privateChats[chatId]) privateChats[chatId] = [];
      const exists = privateChats[chatId].some(m =>
        m.dbId === msg.id ||
        (m.text === msg.text && Math.abs(new Date(m.created_at || 0) - new Date(msg.created_at || 0)) < 5000)
      );
      if (exists) return;

      const time = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

      privateChats[chatId].push({
        text: msg.text,
        sender: 'other',
        time: msg.time || time,
        senderName: msg.sender_name,
        senderId: msg.sender_id,
        created_at: msg.created_at,
        dbId: msg.id,
        // Поля ответа
        replyToId: msg.reply_to_id || null,
        replyToText: msg.reply_to_text || null,
        replyToName: msg.reply_to_name || null,
        reply_to_id: msg.reply_to_id || null,
        reply_to_text: msg.reply_to_text || null,
        reply_to_name: msg.reply_to_name || null,
      });

      // Запоминаем контакт
      if (!contactBook[chatId] && !chatId.startsWith('event_')) {
        contactBook[chatId] = {
          name: msg.sender_name,
          initials: (msg.sender_name || '??').slice(0, 2).toUpperCase(),
          grad: 'linear-gradient(135deg,#4A90D9,#7B5EA7)'
        };
        localStorage.setItem('df_contacts', JSON.stringify(contactBook));
      }

      if (!chatId.startsWith('event_')) savePrivateChatsToStorage();

      if (currentPrivateChatId === chatId) {
        renderPrivateChatMessages(chatId);
      } else {
        addUnreadMessage(chatId);
        playNotificationSound();
        showInAppNotification(msg.sender_name, msg.text);
        showBrowserNotification('Новое от ' + msg.sender_name, { body: msg.text.substring(0, 80) });
        sendPushToUser(myUserId, { title: msg.sender_name, message: msg.text.substring(0, 100), url: '/', chatId: chatId, type: 'message' });
      }
      renderPrivateChats();
    });
  } catch(e) {
    console.error('[Poll] Ошибка:', e);
  }
}

// ============================================================
// LEGACY POLLING — ОТКЛЮЧЁН (заменён на Realtime выше)
// Оставлен как fallback на случай если Realtime не поддерживается
// ============================================================

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
      recipient_id: null,   // FIX: общий/районный чат — нет конкретного получателя
      sender_name: p.name || chatNick,
      text: text,
      time: time
    }).then(({ error }) => {
      if (error) console.error('Failed to save public msg:', error);
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
    
    // Preload all avatars in one batch
    const senderIds = [...new Set(data.map(m => m.sender_id).filter(Boolean))];
    await preloadAvatars(senderIds);
    
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

// Batch preload avatars — one query instead of N
async function preloadAvatars(userIds) {
  if (!supabaseClient || !userIds.length) return;
  const uncached = userIds.filter(id => !_avatarCache[id] && id.length > 10);
  if (!uncached.length) return;
  try {
    const { data } = await supabaseClient
      .from('profiles')
      .select('user_id, avatar_url')
      .in('user_id', uncached);
    if (data) {
      data.forEach(p => {
        if (p.avatar_url) _avatarCache[p.user_id] = p.avatar_url;
        else _avatarCache[p.user_id] = ''; // mark as no-avatar to avoid re-query
      });
    }
    // Mark missing ones too
    uncached.forEach(id => { if (!_avatarCache[id]) _avatarCache[id] = ''; });
  } catch(e) {}
}

function appendMessage(nick, text, time, isMine, senderId) {
  const wrap  = document.getElementById('chat-messages');
  const row   = document.createElement('div');
  row.className = 'cmsg-row ' + (isMine ? 'mine' : 'theirs');
  const initials = nick.slice(0,2).toUpperCase();
  const colors   = ['#4A90D9','#E91E63','#9C27B0','#00BCD4','#FF5722','#4CAF50'];
  const color    = colors[nick.charCodeAt(0) % colors.length];
  const grad = `linear-gradient(135deg,${color},${color}99)`;
  const safeSenderId = senderId ? String(senderId).replace(/'/g, "\\'") : '';
  const safeNick = escHtml(nick).replace(/'/g, "\\'");
  const clickHandler = safeSenderId
    ? `_lastClickedUser={senderId:'${safeSenderId}',senderName:'${safeNick}'};openUserProfile('${safeNick}')`
    : `openUserProfile('${safeNick}')`;
  
  // Use cached avatar synchronously if available
  const cachedAv = senderId ? _avatarCache[senderId] : null;
  const avId = 'av-' + Date.now() + '-' + Math.random().toString(36).substr(2,4);
  const avatarContent = cachedAv 
    ? `<img src="${cachedAv}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='${initials}'">`
    : initials;
  const avatarBg = cachedAv ? 'background:none;padding:0;' : `background:${grad};`;
  
  row.innerHTML = `
    ${!isMine ? `<div class="cmsg-nick" style="cursor:pointer;color:var(--primary);" onclick="${clickHandler}">${escHtml(nick)}</div>` : ''}
    <div style="display:flex;align-items:flex-end;gap:6px;${isMine?'flex-direction:row-reverse':''}">
      ${!isMine ? `<div class="avatar" id="${avId}" style="width:28px;height:28px;font-size:10px;flex-shrink:0;${avatarBg}cursor:pointer;overflow:hidden;" onclick="${clickHandler}">${avatarContent}</div>` : ''}
      <div class="cmsg-bubble">${formatMsgContent(text)}</div>
    </div>
    <div class="cmsg-time">${time}</div>
  `;
  wrap.appendChild(row);
  scrollChatBottom();
  
  // Only async load if not cached and not already checked
  if (!isMine && senderId && senderId.length > 10 && _avatarCache[senderId] === undefined) {
    getUserAvatarUrl(senderId).then(url => {
      if (url) {
        const el = document.getElementById(avId);
        if (el) {
          el.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.textContent='${initials}'">`;
          el.style.background = 'none';
          el.style.padding = '0';
        }
      }
    });
  }
}

// Format message content — detect images
function formatMsgContent(text) {
  if (!text) return '';
  // Check if it's a photo URL from storage
  if (text.match(/^https:\/\/.*\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i) || text.startsWith('[photo]')) {
    const url = text.replace('[photo]', '').trim();
    // Only allow https URLs for safety
    if (!url.startsWith('https://')) return escHtml(text);
    const safeUrl = url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    return `<img src="${safeUrl}" style="max-width:100%;border-radius:10px;cursor:pointer;max-height:240px;" onclick="window.open('${safeUrl}','_blank')" onerror="this.outerHTML='Фото не загрузилось'">`;
  }
  return escHtml(text);
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
  
  console.log('📥 Loading messages from DB for chatId:', chatId, 'roomId:', roomId);
  
  try {
    const { data, error } = await supabaseClient
      .from('direct_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(500);
    
    if (error) {
      console.error('❌ DB load error:', error);
      return;
    }
    
    console.log('✅ Loaded', data?.length || 0, 'messages from DB');
    
    if (data && data.length > 0) {
      // Мержим с существующими — сохраняем optimistic-сообщения без dbId
      const dbMessages = data.map(m => {
        const hasReply = m.reply_to_id || m.reply_to_text;
        if (hasReply) {
          console.log('  📎 Message with reply:', {
            id: m.id,
            text: m.text?.substring(0, 20),
            reply_to_id: m.reply_to_id,
            reply_to_text: m.reply_to_text?.substring(0, 20)
          });
        }
        return {
          text: m.text,
          sender: m.sender_id === myUserId ? 'user' : 'other',
          time: m.time,
          senderName: m.sender_name,
          senderId: m.sender_id,
          created_at: m.created_at,
          dbId: m.id,
          replyToId: m.reply_to_id || null,
          replyToText: m.reply_to_text || null,
          replyToName: m.reply_to_name || null,
          reply_to_id: m.reply_to_id || null,
          reply_to_text: m.reply_to_text || null,
          reply_to_name: m.reply_to_name || null,
        };
      });
      const dbIds = new Set(dbMessages.map(m => m.dbId).filter(Boolean));
      const optimistic = (privateChats[chatId] || []).filter(m => !m.dbId && !dbIds.has(m.dbId));
      privateChats[chatId] = [...dbMessages, ...optimistic];

      savePrivateChatsToStorage();
      // Обновляем _lastPollTime чтобы polling не добавлял уже загруженные сообщения
      if (data.length > 0) {
        const lastMsg = data[data.length - 1];
        if (lastMsg.created_at > _lastPollTime) {
          _lastPollTime = lastMsg.created_at;
        }
      }
      if (currentPrivateChatId == chatId) renderPrivateChatMessages(chatId);
    }
  } catch(e) {
    console.error('Load chat error:', e);
  }
}

// Сохранить сообщение на сервере
async function savePrivateMsgToServer(chatId, text, time, replyTo = null) {
  if (!supabaseClient) return;
  const myUserId = currentUser?.id || userId;
  const p = JSON.parse(localStorage.getItem('df_profile') || '{}');

  const isEventChat = String(chatId).startsWith('event_');
  const roomId = isEventChat ? String(chatId) : getRoomId(myUserId, String(chatId));

  try {
    const msgData = {
      room_id: roomId,
      sender_id: myUserId,
      sender_name: p.name || 'Гость',
      text: text,
      time: time,
    };

    // FIX: устанавливаем recipient_id
    if (isEventChat) {
      msgData.recipient_id = null; // Event-чат: групповой, нет конкретного получателя
    } else {
      msgData.recipient_id = chatId; // Личный чат: получатель = собеседник
    }

    if (replyTo) {
      let actualReplyToId = replyTo.dbId;
      
      // Исключаем временные ID формата idx-*
      if (actualReplyToId && String(actualReplyToId).startsWith('idx-')) {
        actualReplyToId = null;
      }
      
      // Если нет dbId но есть _index - пытаемся найти реальный dbId
      if (!actualReplyToId && replyTo._index !== undefined) {
        const messages = privateChats[chatId] || [];
        const replyMsg = messages[replyTo._index];
        if (replyMsg && replyMsg.dbId && !String(replyMsg.dbId).startsWith('idx-')) {
          actualReplyToId = replyMsg.dbId;
          console.log('💾 Found real dbId from index:', replyTo._index, '→', actualReplyToId);
        }
      }
      
      msgData.reply_to_id = actualReplyToId || null;
      msgData.reply_to_text = replyTo.text || null;
      msgData.reply_to_name = replyTo.senderName || null;
      
      console.log('💾 Saving reply data:', {
        reply_to_id: msgData.reply_to_id,
        reply_to_text: msgData.reply_to_text?.substring(0, 30),
        reply_to_name: msgData.reply_to_name
      });
    }
    const { data: inserted, error } = await supabaseClient.from('direct_messages').insert(msgData).select('id').single();
    if (error) { console.error('Failed to save message:', error); return; }

    // Сохраняем dbId в локальном сообщении чтобы polling не создавал дубль
    if (inserted && inserted.id) {
      const msgs = privateChats[chatId] || [];
      const localMsg = msgs.find(m => !m.dbId && m.text === text && m.senderId === myUserId);
      if (localMsg) localMsg.dbId = inserted.id;
    }

    if (!isEventChat) {
      savePrivateChatsToStorage();
    }
  } catch(e) {
    console.error('Save message error:', e);
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
  if (window.supabaseLoaded && !supabaseClient) initSupabase();

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

