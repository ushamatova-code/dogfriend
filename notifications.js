// ============================================================
// NOTIFICATION FUNCTIONS
// ============================================================
// (основные определения ниже в файле — строки ~1791-1836)

function playNotificationSound() {
  const s = JSON.parse(localStorage.getItem('df_notif') || '{}');
  
  // Vibration
  if (s.vibro !== false && navigator.vibrate) {
    navigator.vibrate([200, 100, 200]);
  }
  
  // Sound
  if (s.sound === false) return;
  
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
  } catch(e) {}
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
  
  // Отмечаем сообщения прочитанными в базе данных
  markMessagesAsRead(chatId);
}

// Отметить сообщения прочитанными в базе данных
async function markMessagesAsRead(senderId) {
  if (!supabaseClient || !currentUser) return;
  
  try {
    // Формируем room_id
    const roomId = [currentUser.id, senderId].sort().join('_');
    
    // Отмечаем все непрочитанные сообщения от этого отправителя как прочитанные
    const { error } = await supabaseClient
      .from('direct_messages')
      .update({ is_read: true })
      .eq('room_id', roomId)
      .eq('recipient_id', currentUser.id)
      .eq('is_read', false);
    
    if (error) {
      console.error('Mark as read error:', error);
    } else {
      console.log(`✅ Messages from ${senderId} marked as read`);
    }
  } catch(e) {
    console.error('Mark messages as read error:', e);
  }
}

function updateUnreadBadge() {
  // Обновляем все бейджи на странице (их может быть несколько в разных навигациях)
  const badges = document.querySelectorAll('.chat-unread-badge');
  badges.forEach(badge => {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  });
  
  // Обновляем badge в PWA
  if ('setAppBadge' in navigator) {
    if (unreadCount > 0) {
      navigator.setAppBadge(unreadCount).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }
}

// Подсчитать непрочитанные сообщения из базы данных
async function updateUnreadCount() {
  if (!supabaseClient || !currentUser) return;
  
  try {
    // Получаем все непрочитанные сообщения для текущего пользователя
    // НЕ считаем сообщения от самого себя
    const { data, error } = await supabaseClient
      .from('direct_messages')
      .select('sender_id, room_id')
      .eq('recipient_id', currentUser.id)
      .neq('sender_id', currentUser.id)
      .eq('is_read', false);
    
    if (error) throw error;
    
    // Группируем по отправителям (чтобы знать от кого сколько)
    const unreadBySender = {};
    let totalUnread = 0;
    
    (data || []).forEach(msg => {
      if (!unreadBySender[msg.sender_id]) {
        unreadBySender[msg.sender_id] = 0;
      }
      unreadBySender[msg.sender_id]++;
      totalUnread++;
    });
    
    // Обновляем глобальные переменные
    unreadChats = unreadBySender;
    unreadCount = totalUnread;
    
    // Сохраняем в localStorage
    localStorage.setItem('unread_chats', JSON.stringify(unreadChats));
    localStorage.setItem('unread_count', unreadCount.toString());
    
    // Обновляем UI
    updateUnreadBadge();
    
    console.log(`📬 Непрочитанных сообщений: ${totalUnread}`);
    
  } catch(e) {
    console.error('Update unread count error:', e);
  }
}

// Загрузить имя контакта из таблицы profiles
async function loadContactName(userId) {
  if (!supabaseClient || !userId || userId.length < 20) return;
  
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('name')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    if (data && data.name) {
      // Обновляем contactBook
      if (!contactBook[userId]) {
        contactBook[userId] = {
          name: data.name,
          initials: data.name.slice(0, 2).toUpperCase(),
          grad: 'linear-gradient(135deg,#4A90D9,#7B5EA7)'
        };
      } else {
        contactBook[userId].name = data.name;
        contactBook[userId].initials = data.name.slice(0, 2).toUpperCase();
      }
      
      localStorage.setItem('df_contacts', JSON.stringify(contactBook));
      
      // Перерисовываем список чатов
      renderPrivateChats();
      
      console.log(`✅ Loaded contact name for ${userId}: ${data.name}`);
    }
  } catch(e) {
    console.error('Load contact name error:', e);
  }
}

