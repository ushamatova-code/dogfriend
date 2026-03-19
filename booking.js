// ── Текущий бизнес для бронирования ──
let currentBookingBiz = null;
let currentBookingSvc = null;
let lastBookingId = null;

// Заполняем экран бронирования реальными данными при переходе
function populateBookingScreen() {
  let biz = loadedBusinesses.find(b => b.user_id === currentSpecId) || loadedBusinesses.find(b => b.id === currentSpecId);
  const spec = SPECIALISTS.find(s => s.id === currentSpecId);
  
  let selectedService = null;
  let bizName = '';
  
  if (biz) {
    bizName = biz.name;
    const selEl = document.querySelector('#spec-services .pr.sel');
    const selIdx = selEl ? parseInt(selEl.id.replace('svc','')) - 1 : 0;
    const svcList = biz.services && biz.services.length
      ? biz.services.map(s => typeof s === 'string' ? { name: s, price: biz.price_from || 'По запросу' } : s)
      : [{ name: 'Консультация', price: biz.price_from || 'По запросу' }];
    selectedService = svcList[selIdx] || svcList[0];
  } else if (spec) {
    bizName = spec.name;
    const selEl = document.querySelector('#spec-services .pr.sel');
    const selIdx = selEl ? parseInt(selEl.id.replace('svc','')) - 1 : 0;
    selectedService = spec.services[selIdx] || spec.services.find(s => s.sel) || spec.services[0];
  }
  
  if (!selectedService) selectedService = { name: 'Услуга', price: 'По запросу' };
  
  currentBookingBiz = biz || spec;
  currentBookingSvc = selectedService;
  
  const priceStr = selectedService.price || 'По запросу';
  const amount = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
  const charity = Math.round(amount * 0.025);
  
  document.getElementById('book-spec-name').textContent = bizName || '—';
  document.getElementById('book-svc-name').textContent = selectedService.name || '—';
  document.getElementById('book-total').textContent = amount ? amount.toLocaleString('ru-RU') + ' ₽' : priceStr;
  document.getElementById('book-charity').textContent = charity ? charity.toLocaleString('ru-RU') + ' ₽' : '—';

  // Показываем номер телефона для СБП если есть
  const phone = (biz || spec)?.phone;
  const phoneBlock = document.getElementById('book-sbp-phone-block');
  const phoneEl = document.getElementById('book-sbp-phone');
  if (phone && phoneBlock && phoneEl) {
    phoneEl.textContent = formatPhone(phone);
    phoneBlock.style.display = 'block';
  }

  // Сброс кнопок
  const payBtn = document.getElementById('book-pay-btn');
  const paidBtn = document.getElementById('book-paid-btn');
  if (payBtn) { payBtn.style.display = ''; payBtn.disabled = false; }
  if (paidBtn) paidBtn.style.display = 'none';
}

function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `+${digits[0]} (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7,9)}-${digits.slice(9,11)}`;
  }
  return phone;
}

// Шаг 1 — открываем банк через СБП диплинк
async function startSBPPayment() {
  const biz = currentBookingBiz;
  const svc = currentBookingSvc;
  if (!biz || !svc) return;

  const phone = biz.phone ? biz.phone.replace(/\D/g, '') : '';
  const priceStr = svc.price || '0';
  const amount = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
  const bizName = biz.name || biz.business_name || 'Специалист';

  // Показываем кнопку «Я оплатил» СРАЗУ
  const payBtn = document.getElementById('book-pay-btn');
  const paidBtn = document.getElementById('book-paid-btn');
  if (payBtn) payBtn.style.display = 'none';
  if (paidBtn) paidBtn.style.display = '';

  // Открываем банк через location.href — работает на мобильном без блокировки
  if (phone) {
    const normalizedPhone = phone.startsWith('7') ? phone : '7' + phone.slice(-10);
    const sbpUrl = `https://qr.nspk.ru/pay?phone=%2B${normalizedPhone}&amount=${amount * 100}&purpose=${encodeURIComponent(svc.name + ' — ' + bizName)}`;
    setTimeout(() => { window.location.href = sbpUrl; }, 100);
  } else {
    showToast('Номер СБП не указан — уточните у специалиста', '#888');
  }

  // Сохраняем заказ в фоне
  await createBookingRecord('pending_payment');
}

// Шаг 2 — пользователь подтверждает что оплатил
async function confirmPayment() {
  // Обновляем статус на pending_confirmation — ждём подтверждения от бизнеса
  if (supabaseClient && lastBookingId) {
    await supabaseClient.from('bookings').update({ status: 'pending_confirmation' }).eq('id', lastBookingId);
  }
  await sendBookingNotification();
}

// Создаём запись бронирования в Supabase
async function createBookingRecord(status = 'pending_payment') {
  if (!currentUser || !supabaseClient) return;
  const biz = currentBookingBiz;
  const svc = currentBookingSvc;
  if (!biz || !svc) return;

  const bizName = biz.name || biz.business_name || 'Специалист';
  const priceStr = svc.price || '0';
  const amount = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;

  try {
    const { data, error } = await supabaseClient
      .from('bookings')
      .insert({
        user_id: currentUser.id,
        business_id: biz.id || null,
        business_name: bizName,
        service_name: svc.name,
        amount: amount,
        status: status
      })
      .select()
      .single();

    if (error) { console.error('Failed to save booking:', error); return; }
    lastBookingId = data.id;
    localStorage.setItem('last_booking_id', data.id);
    localStorage.setItem('last_booking_biz_id', biz.id || '');
    localStorage.setItem('last_booking_biz_name', bizName);
  } catch(e) {
    console.error('Booking error:', e);
  }
}

async function sendBookingNotification() {
  if (!currentUser) { alert('Пожалуйста, войдите в систему для записи.'); return; }

  const biz = currentBookingBiz;
  const svc = currentBookingSvc;
  if (!biz || !svc) { showToast('Ошибка: не выбран специалист или услуга'); return; }

  const bizName = biz.name || biz.business_name || 'Специалист';
  const priceStr = svc.price || '0';
  const amount = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
  const charity = Math.round(amount * 0.025);
  const profile = JSON.parse(localStorage.getItem('df_profile') || '{}');

  // Отправляем сообщение специалисту в чат
  const message = `💳 Оплата через СБП!\nУслуга: ${svc.name}\nСумма: ${amount ? amount.toLocaleString('ru-RU') + ' ₽' : 'По запросу'}\nКлиент: ${profile.name || 'Не указано'}\nСобака: ${profile.dogname || 'Не указано'}\n⏳ Ожидает подтверждения`;

  try {
    const now = new Date();
    const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    const myUserId = currentUser?.id || userId;

    if (!privateChats[currentSpecId]) privateChats[currentSpecId] = [];
    privateChats[currentSpecId].push({
      text: message, sender: 'user', time,
      senderName: profile.name || 'Клиент', senderId: myUserId
    });
    savePrivateChatsToStorage();
    await savePrivateMsgToServer(currentSpecId, message, time);

    const roomId = getRoomId(myUserId, String(currentSpecId));
    const channelName = `dogfriend-dm-${roomId}`;
    let channel = supabasePrivateChannels[channelName];
    if (!channel) {
      channel = supabaseClient.channel(channelName, { config: { broadcast: { self: false } } });
      channel.subscribe();
      supabasePrivateChannels[channelName] = channel;
    }
    channel.send({
      type: 'broadcast', event: 'message',
      payload: { senderId: myUserId, senderName: profile.name || 'Клиент', text: message, time }
    });
  } catch(e) {
    console.error('Failed to send booking notification:', e);
  }

  // Экран успеха
  document.getElementById('succ-text').textContent = `Заявка отправлена. Специалист подтвердит получение оплаты.`;
  document.getElementById('succ-charity').textContent = charity ? charity.toLocaleString('ru-RU') + ' ₽' : '—';

  const reviewBtn = document.getElementById('succ-review-btn');
  if (reviewBtn) {
    reviewBtn.style.display = '';
    reviewBtn.dataset.bizId = biz.id || '';
    reviewBtn.dataset.bizName = bizName;
  }

  nav('success');
}

// Заполняем экран бронирования реальными данными при переходе
function populateBookingScreen() {
  // Определяем бизнес: сначала ищем в loadedBusinesses по currentSpecId (user_id), потом по id
  let biz = loadedBusinesses.find(b => b.user_id === currentSpecId) || loadedBusinesses.find(b => b.id === currentSpecId);
  const spec = SPECIALISTS.find(s => s.id === currentSpecId);
  
  // Ищем выбранную услугу
  let selectedService = null;
  let bizName = '';
  
  if (biz) {
    bizName = biz.name;
    // Найти выделенный сервис в UI
    const selEl = document.querySelector('#spec-services .pr.sel');
    const selIdx = selEl ? parseInt(selEl.id.replace('svc','')) - 1 : 0;
    const svcList = biz.services && biz.services.length
      ? biz.services.map(s => typeof s === 'string' ? { name: s, price: biz.price_from || 'По запросу' } : s)
      : [{ name: 'Консультация', price: biz.price_from || 'По запросу' }];
    selectedService = svcList[selIdx] || svcList[0];
  } else if (spec) {
    bizName = spec.name;
    const selEl = document.querySelector('#spec-services .pr.sel');
    const selIdx = selEl ? parseInt(selEl.id.replace('svc','')) - 1 : 0;
    selectedService = spec.services[selIdx] || spec.services.find(s => s.sel) || spec.services[0];
  }
  
  if (!selectedService) {
    selectedService = { name: 'Услуга', price: 'По запросу' };
  }
  
  currentBookingBiz = biz || spec;
  currentBookingSvc = selectedService;
  
  const priceStr = selectedService.price || 'По запросу';
  const amount = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
  const firstPay = Math.round(amount / 4);
  const charity = Math.round(amount * 0.025);
  
  document.getElementById('book-spec-name').textContent = bizName || '—';
  document.getElementById('book-svc-name').textContent = selectedService.name || '—';
  document.getElementById('book-total').textContent = amount ? amount.toLocaleString('ru-RU') + ' ₽' : priceStr;
  document.getElementById('book-first-pay').textContent = firstPay ? firstPay.toLocaleString('ru-RU') + ' ₽' : priceStr;
  document.getElementById('book-charity').textContent = charity ? charity.toLocaleString('ru-RU') + ' ₽' : '—';
  document.getElementById('book-pay-btn').textContent = firstPay ? `Оплатить ${firstPay.toLocaleString('ru-RU')} ₽ 🔒` : 'Оплатить 🔒';
}

async function sendBookingNotification() {
  if (!currentUser) {
    alert('Пожалуйста, войдите в систему для записи.');
    return;
  }

  const biz = currentBookingBiz;
  const selectedService = currentBookingSvc;
  
  if (!biz || !selectedService) {
    showToast('Ошибка: не выбран специалист или услуга');
    return;
  }
  
  const bizName = biz.name || biz.business_name || 'Специалист';
  const priceStr = selectedService.price || '0';
  const amount = parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
  const charity = Math.round(amount * 0.025);

  const profile = JSON.parse(localStorage.getItem('df_profile') || '{}');

  // Сохраняем бронирование в Supabase
  if (supabaseClient) {
    try {
      const bizId = biz.id || null;
      const { data, error } = await supabaseClient
        .from('bookings')
        .insert({
          user_id: currentUser.id,
          business_id: bizId,
          business_name: bizName,
          service_name: selectedService.name,
          amount: amount,
          status: 'confirmed'
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save booking:', error);
        showToast('Ошибка сохранения записи', '#D0021B');
      } else {
        console.log('Booking saved to Supabase:', data.id);
        lastBookingId = data.id;
        localStorage.setItem('last_booking_id', data.id);
        localStorage.setItem('last_booking_biz_id', bizId || '');
        localStorage.setItem('last_booking_biz_name', bizName);
      }
    } catch (e) {
      console.error('Booking error:', e);
    }
  }

  // Отправляем сообщение в чат
  const message = `📅 Новая запись!\nУслуга: ${selectedService.name}\nКлиент: ${profile.name || 'Не указано'}\nСобака: ${profile.dogname || 'Не указано'}`;

  try {
    const now = new Date();
    const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    const myUserId = currentUser?.id || userId;

    if (!privateChats[currentSpecId]) privateChats[currentSpecId] = [];
    privateChats[currentSpecId].push({
      text: message,
      sender: 'user',
      time,
      senderName: profile.name || 'Клиент',
      senderId: myUserId
    });
    savePrivateChatsToStorage();

    await savePrivateMsgToServer(currentSpecId, message, time);

    const roomId = getRoomId(myUserId, String(currentSpecId));
    const channelName = `dogfriend-dm-${roomId}`;
    let channel = supabasePrivateChannels[channelName];
    if (!channel) {
      channel = supabaseClient.channel(channelName, { config: { broadcast: { self: false } } });
      channel.subscribe();
      supabasePrivateChannels[channelName] = channel;
    }
    channel.send({
      type: 'broadcast',
      event: 'message',
      payload: { senderId: myUserId, senderName: profile.name || 'Клиент', text: message, time }
    });
  } catch(e) {
    console.error('Failed to send booking notification:', e);
  }

  // Заполняем экран успеха
  document.getElementById('succ-text').textContent = `Запись к ${bizName} подтверждена.`;
  document.getElementById('succ-charity').textContent = charity ? charity.toLocaleString('ru-RU') + ' ₽' : '—';
  
  // Показываем кнопку "Оставить отзыв"
  const reviewBtn = document.getElementById('succ-review-btn');
  if (reviewBtn) {
    reviewBtn.style.display = '';
    reviewBtn.dataset.bizId = biz.id || '';
    reviewBtn.dataset.bizName = bizName;
  }

  nav('success');
}
